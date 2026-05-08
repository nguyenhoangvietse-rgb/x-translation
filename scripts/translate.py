import os
import re
import time
import json
import boto3
import requests
from botocore.client import Config

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")
R2_ENDPOINT = os.getenv("R2_ENDPOINT")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME")

s3 = boto3.client(
    's3',
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    config=Config(signature_version='s3v4'),
    region_name='auto'
)

def get_raw_file():
    """Lấy nội dung file txt gốc từ thư mục raw/"""
    response = s3.list_objects_v2(Bucket=R2_BUCKET_NAME, Prefix='raw/')
    for obj in response.get('Contents', []):
        if obj['Key'].endswith('.txt'):
            file_content = s3.get_object(Bucket=R2_BUCKET_NAME, Key=obj['Key'])['Body'].read().decode('utf-8')
            return obj['Key'], file_content
    return None, None

def split_chapters(content):
    """Tách chương bằng Regex tiếng Trung"""
    pattern = r'(第[\d一二三四五六七八九十百千万零]+[章回节卷].*)'
    parts = re.split(pattern, content)
    
    chapters = []
    # parts[0] thường là phần giới thiệu trước chương 1
    if parts[0].strip():
        chapters.append({"title": "Giới thiệu", "content": parts[0].strip()})
    
    for i in range(1, len(parts), 2):
        title = parts[i].strip()
        body = parts[i+1].strip() if i+1 < len(parts) else ""
        chapters.append({"title": title, "content": body})
    
    return chapters

def translate_deepseek(text):
    """Gọi DeepSeek API với prompt chuyên dụng cho Tiên Hiệp"""
    if not text.strip(): return ""
    
    url = "https://api.deepseek.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
    }

    # Nội dung System Prompt dựa trên yêu cầu của bạn
    system_instruction = (
        "Bạn là một dịch giả chuyên nghiệp, am hiểu sâu sắc về thể loại truyện Tiên Hiệp, Huyền Huyễn và văn hóa cổ phong Trung Hoa. "
        "Nhiệm vụ của bạn là dịch văn bản từ tiếng Trung sang tiếng Việt.\n\n"
        "MỤC TIÊU:\n"
        "1. Văn phong: Trang trọng, cổ kính, trôi chảy, giàu hình ảnh. Không dùng từ hiện đại, không để bị lỗi 'convert' (Hán Việt thô).\n"
        "2. Xưng hô: Linh hoạt theo vai vế (Bổn tọa, tại hạ, lão phu, tiểu tử, vãn bối, các hạ, sư phụ, đồ nhi...).\n"
        "3. Thuật ngữ: Bắt buộc dùng Hán - Việt chuẩn tu tiên (Luyện Khí, Trúc Cơ, Kim Đan, Tông môn, Động phủ, Đạo tâm, Pháp bảo...).\n"
        "4. Tên riêng: Giữ nguyên âm Hán - Việt cho tên người, chiêu thức, địa danh (Ví dụ: Lâm Phong, Thanh Vân Môn).\n\n"
        "QUY TẮC BẮT BUỘC:\n"
        "- KHÔNG lược bỏ chi tiết.\n"
        "- KHÔNG thêm lời bình luận của AI.\n"
        "- Chuyển ngữ từ lóng hiện đại (nếu có) sang văn phong cổ đại phù hợp.\n"
        "- Đảm bảo nhất quán tên gọi toàn văn bản.\n"
        "- CHỈ trả về bản dịch hoàn chỉnh."
    )

    payload = {
        "model": "deepseek-v4-flash",
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": f"Dịch đoạn truyện sau:\n\n{text}"}
        ],
        "temperature": 0.3,
        "max_tokens": 4096,
        "stream": False
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=360)
        response.raise_for_status()
        return response.json()['choices'][0]['message']['content'].strip()
    except Exception as e:
        print(f"Lỗi API tại chương: {e}")
        return None

def main():
    file_key, content = get_raw_file()
    if not file_key:
        print("Không tìm thấy file gốc trên R2.")
        return

    full_story_name = file_key.replace('raw/', '').replace('.txt', '')
    chapters = split_chapters(content)
    print(f"Tổng số chương tìm thấy: {len(chapters)}")

    translated_count = 0
    metadata = {"story_name": full_story_name, "chapters": []}

    for i, chap in enumerate(chapters):
        # Giới hạn 50 chương mỗi lần chạy
        if translated_count >= 50:
            print("Đã đạt giới hạn 50 chương cho lượt này. Dừng.")
            break

        output_key = f"translated/{full_story_name}/chapter_{i}.txt"
        
        try:
            s3.head_object(Bucket=R2_BUCKET_NAME, Key=output_key)
            metadata["chapters"].append({"id": i, "title": chap['title'], "path": output_key})
            continue 
        except:
            # Chưa tồn tại -> Tiến hành dịch
            print(f"Đang dịch chương {i}: {chap['title']}")
            
            combined_text = f"{chap['title']}\n\n{chap['content']}"
            translated_text = translate_deepseek(combined_text)
            
            if translated_text:
                s3.put_object(
                    Bucket=R2_BUCKET_NAME, 
                    Key=output_key, 
                    Body=translated_text.encode('utf-8')
                )
                metadata["chapters"].append({"id": i, "title": chap['title'], "path": output_key})
                translated_count += 1
                time.sleep(1.5)
            else:
                print(f"Bỏ qua chương {i} do lỗi API.")

    # Cập nhật file metadata.json lên R2 để Front-end sử dụng
    s3.put_object(
        Bucket=R2_BUCKET_NAME,
        Key=f"translated/{full_story_name}/metadata.json",
        Body=json.dumps(metadata, ensure_ascii=False, indent=2).encode('utf-8')
    )
    print("Hoàn tất cập nhật Metadata.")

if __name__ == "__main__":
    main()

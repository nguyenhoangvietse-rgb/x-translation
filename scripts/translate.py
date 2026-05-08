import os
import re
import time
import json
import hashlib
import boto3
import requests
from botocore.client import Config
from openai import OpenAI

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

deepseek = OpenAI(api_key=DEEPSEEK_API_KEY, base_url="https://api.deepseek.com")

SYSTEM_INSTRUCTION = (
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

def get_all_raw_files():
    """Lấy danh sách tất cả file txt gốc từ thư mục raw/"""
    files = []
    response = s3.list_objects_v2(Bucket=R2_BUCKET_NAME, Prefix='raw/')
    for obj in response.get('Contents', []):
        if obj['Key'].endswith('.txt'):
            content = s3.get_object(Bucket=R2_BUCKET_NAME, Key=obj['Key'])['Body'].read().decode('utf-8')
            files.append((obj['Key'], content))
    return files


def split_chapters(content):
    """
    Tối ưu hóa để nhận diện tiêu đề chương như: 第一章 我是喬峰？
    """

    print(f"chuẩn bị chia chương")
    # Regex này sẽ bắt: 第 + (số Hán/Số thường) + 章/回 + (Tên chương)
    # Nó cũng xử lý các dòng có chứa dấu hỏi, dấu chấm, khoảng trắng
    pattern = r'(^[\s\u3000]*第[\d一二三四五六七八九十百千万零]+[章回节卷].*)'
    
    parts = re.split(pattern, content, flags=re.MULTILINE)

    print(f"total chương {len(parts)}")
    
    chapters = []

    # Phần parts[0] luôn là nội dung TRƯỚC chương 1 (Giới thiệu, lời tựa)
    if parts[0].strip():
        chapters.append({
            "title": "Giới thiệu & Lời tựa", 
            "content": parts[0].strip()
        })
    
    # Duyệt qua các cặp (Tiêu đề, Nội dung)
    for i in range(1, len(parts), 2):
        title = parts[i].strip()
        # Nội dung nằm ngay sau tiêu đề
        body = parts[i+1].strip() if i+1 < len(parts) else ""
        
        # Nếu tiêu đề quá ngắn hoặc bị lỗi, có thể gộp lại, nhưng thường Regex trên là đủ
        chapters.append({
            "title": title, 
            "content": body
        })
        
    
    return chapters

def translate_deepseek(text):
    """Gọi DeepSeek API với prompt chuyên dụng cho Tiên Hiệp"""
    if not text.strip():
        return ""

    try:
        response = deepseek.chat.completions.create(
            model="deepseek-v4-flash",
            messages=[
                {"role": "system", "content": SYSTEM_INSTRUCTION},
                {"role": "user", "content": f"Dịch đoạn truyện sau:\n\n{text}"}
            ],
            temperature=0.3,
            max_tokens=32768,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Lỗi API tại chương: {e}")
        return None

def trigger_next_run():
    """Tự động lên lịch chạy lại workflow để tiếp tục xử lý."""
    token = os.getenv("GITHUB_TOKEN")
    repo = os.getenv("GITHUB_REPOSITORY")
    if not token or not repo:
        print("Thiếu GITHUB_TOKEN/GITHUB_REPOSITORY, không thể tự lên lịch.")
        return

    url = f"https://api.github.com/repos/{repo}/actions/workflows/translate.yml/dispatches"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3+json"
    }
    resp = requests.post(url, json={"ref": "main"}, headers=headers)
    if resp.status_code == 204:
        print("Đã lên lịch chạy lại workflow để tiếp tục.")
    else:
        print(f"Không thể lên lịch: {resp.status_code} {resp.text}")

def process_book(file_key, content, start_time):
    """Xử lý một cuốn sách: chia chương, dịch, lưu trữ.
    Trả về True nếu hoàn tất, False nếu hết thời gian cần reschedule."""
    story_name = file_key.replace('raw/', '').replace('.txt', '')

    raw_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()

    existing_metadata = {}
    existing_chapters = {}
    try:
        meta_obj = s3.get_object(Bucket=R2_BUCKET_NAME, Key=f"translated/{story_name}/metadata.json")
        existing_metadata = json.loads(meta_obj['Body'].read().decode('utf-8'))
        existing_chapters = {ch["id"]: ch for ch in existing_metadata.get("chapters", [])}
        if existing_metadata.get("raw_hash") == raw_hash:
            print(f"Bỏ qua [{story_name}] — không có thay đổi.")
            return True
        print(f"[{story_name}] Có thay đổi, đã có {len(existing_chapters)} chương cũ.")
    except:
        pass

    chapters = split_chapters(content)
    print(f"[{story_name}] Tổng số chương: {len(chapters)}")
    metadata = {"story_name": story_name, "chapters": [], "raw_hash": raw_hash}

    timeout_seconds = 5 * 3600
    new_count = 0
    updated_count = 0

    for i, chap in enumerate(chapters):
        if time.time() - start_time > timeout_seconds:
            print(f"Hết thời gian — dừng tại chương {i}/{len(chapters)} của [{story_name}].")
            if metadata["chapters"]:
                s3.put_object(
                    Bucket=R2_BUCKET_NAME,
                    Key=f"translated/{story_name}/metadata.json",
                    Body=json.dumps(metadata, ensure_ascii=False, indent=2).encode('utf-8')
                )
            return False

        combined_text = f"{chap['title']}\n\n{chap['content']}"
        chapter_hash = hashlib.sha256(combined_text.encode('utf-8')).hexdigest()

        if i in existing_chapters and existing_chapters[i].get("hash") == chapter_hash:
            metadata["chapters"].append(existing_chapters[i])
            continue

        output_key = f"translated/{story_name}/chapter_{i}.txt"

        if i in existing_chapters:
            print(f"Đang dịch lại [{story_name}] chương {i}: {chap['title']}")
            updated_count += 1
        else:
            print(f"Đang dịch [{story_name}] chương {i}: {chap['title']}")
            new_count += 1

        translated_text = translate_deepseek(combined_text)

        if translated_text:
            s3.put_object(
                Bucket=R2_BUCKET_NAME,
                Key=output_key,
                Body=translated_text.encode('utf-8')
            )
            metadata["chapters"].append({
                "id": i,
                "title": chap['title'],
                "path": output_key,
                "hash": chapter_hash
            })
            time.sleep(1.5)
        else:
            print(f"Lỗi API — bỏ qua chương {i} của [{story_name}].")
            if i in existing_chapters:
                metadata["chapters"].append(existing_chapters[i])

    s3.put_object(
        Bucket=R2_BUCKET_NAME,
        Key=f"translated/{story_name}/metadata.json",
        Body=json.dumps(metadata, ensure_ascii=False, indent=2).encode('utf-8')
    )
    print(f"Hoàn tất [{story_name}] — {len(metadata['chapters'])} chương ({new_count} mới, {updated_count} cập nhật).")
    return True


def main():
    start_time = time.time()
    raw_files = get_all_raw_files()
    if not raw_files:
        print("Không tìm thấy file gốc nào trên R2.")
        return

    print(f"Tìm thấy {len(raw_files)} file gốc trong raw/.")
    need_reschedule = False

    for file_key, content in raw_files:
        completed = process_book(file_key, content, start_time)
        if not completed:
            need_reschedule = True
            break

    if need_reschedule:
        trigger_next_run()

if __name__ == "__main__":
    main()

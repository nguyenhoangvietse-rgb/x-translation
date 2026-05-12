import os
import re
import sys
import time
import json
import argparse
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

def decode_content(raw_bytes):
    """Thử decode nội dung với nhiều encoding (tiếng Trung thường dùng GBK)"""
    for encoding in ['utf-8-sig', 'utf-8', 'gbk', 'gb18030', 'gb2312']:
        try:
            return raw_bytes.decode(encoding)
        except (UnicodeDecodeError, UnicodeError):
            continue
    return raw_bytes.decode('utf-8', errors='replace')


def split_chapters(content):
    """
    Tối ưu hóa để nhận diện tiêu đề chương như: 第一章 我是喬峰？
    """

    print(f"chuẩn bị chia chương")
    # Regex này sẽ bắt: 第 + (số Hán/Số thường) + 章/回 + (Tên chương)
    # Nó cũng xử lý các dòng có chứa dấu hỏi, dấu chấm, khoảng trắng
    pattern = r'(^[\s\u3000]*(?:第[\d一二三四五六七八九十百千万零]+[章回节卷]|最终章|终章|大结局|结局[篇章]?|番外篇?|序章|楔子|尾声|后记|完结).*)'
    
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
    """Gọi DeepSeek API với retry 3 lần."""
    if not text.strip():
        return ""

    for attempt in range(3):
        try:
            response = deepseek.chat.completions.create(
                model="deepseek-v4-flash",
                messages=[
                    {"role": "system", "content": SYSTEM_INSTRUCTION},
                    {"role": "user", "content": f"Dịch đoạn truyện sau:\n\n{text}"}
                ],
                temperature=0.3,
                max_tokens=32768,
                timeout=360,
            )
            translated = response.choices[0].message.content.strip()
            if translated == text.strip():
                if attempt < 2:
                    print(f"Output trùng input, retry ({attempt+1}/3)")
                    time.sleep(2 ** attempt)
                    continue
                else:
                    print(f"Output trùng input sau 3 lần, coi như fail.")
                    return None
            return translated
        except Exception as e:
            if attempt < 2:
                wait = 2 ** attempt
                print(f"Lỗi API, thử lại sau {wait}s ({attempt+1}/3): {e}")
                time.sleep(wait)
            else:
                print(f"Lỗi API sau 3 lần thử: {e}")
                return None

def is_likely_untranslated(text):
    """>25% CJK chars → likely still Chinese, not Vietnamese."""
    if not text:
        return True
    total = len(text.strip())
    if total == 0:
        return True
    cjk = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
    return (cjk / total) > 0.25

def trigger_next_run(book_name):
    """Tự động lên lịch chạy lại workflow cho sách này."""
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
    body = {"ref": "main", "inputs": {"book_name": book_name}}
    try:
        resp = requests.post(url, json=body, headers=headers, timeout=30)
        if resp.status_code == 204:
            print(f"Đã lên lịch chạy lại cho [{book_name}].")
        else:
            print(f"Không thể lên lịch: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"Lỗi khi tự lên lịch: {e}")

def process_book(file_key, content, start_time, chapter=None):
    """Xử lý một cuốn sách: chia chương, dịch, lưu trữ.
    chapter=None: dịch tất cả chương mới/cập nhật
    chapter=N: chỉ dịch chapter N (force re-translate), giữ nguyên các chapter khác
    Trả về (tiếp_tục, trạng_thái)."""
    story_name = file_key.replace('raw/', '').replace('.txt', '')

    raw_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()

    existing_metadata = {}
    existing_chapters = {}
    try:
        meta_obj = s3.get_object(Bucket=R2_BUCKET_NAME, Key=f"translated/{story_name}/metadata.json")
        existing_metadata = json.loads(meta_obj['Body'].read().decode('utf-8'))
        existing_chapters = {ch["hash"]: ch for ch in existing_metadata.get("chapters", []) if ch.get("hash")}
    except Exception:
        pass

    chapters = split_chapters(content)
    print(f"[{story_name}] Tổng số chương: {len(chapters)}")
    metadata = {"story_name": story_name, "chapters": [], "raw_hash": raw_hash, "translating": True}

    # Đánh dấu đang dịch
    try:
        s3.put_object(
            Bucket=R2_BUCKET_NAME,
            Key=f"translated/{story_name}/metadata.json",
            Body=json.dumps(metadata, ensure_ascii=False, indent=2).encode('utf-8')
        )
    except Exception:
        pass

    timeout_seconds = 5 * 3600
    new_count = 0
    skipped = 0

    for i, chap in enumerate(chapters):
        if time.time() - start_time > timeout_seconds:
            print(f"Hết thời gian — dừng tại chương {i}/{len(chapters)} của [{story_name}].")
            if metadata["chapters"]:
                s3.put_object(
                    Bucket=R2_BUCKET_NAME,
                    Key=f"translated/{story_name}/metadata.json",
                    Body=json.dumps(metadata, ensure_ascii=False, indent=2).encode('utf-8')
                )
            return False, "timeout"

        combined_text = f"{chap['title']}\n\n{chap['content']}"
        chapter_hash = hashlib.sha256(combined_text.encode('utf-8')).hexdigest()

        force_translate = (chapter is not None and i == chapter)

        if chapter is not None and i != chapter:
            # Single-chapter mode: preserve non-target chapters
            ex = existing_chapters.get(chapter_hash)
            if ex:
                metadata["chapters"].append(ex)
            else:
                metadata["chapters"].append({
                    "id": i,
                    "title": chap['title'],
                    "translated_title": chap['title'],
                    "path": "",
                    "hash": f"PENDING_{chapter_hash}"
                })
            continue

        if not force_translate and chapter_hash in existing_chapters:
            metadata["chapters"].append(existing_chapters[chapter_hash])
            skipped += 1
            continue

        output_key = f"translated/{story_name}/chapter_{i}.txt"

        print(f"Đang dịch [{story_name}] chương {i}: {chap['title']}")
        new_count += 1

        translated_text = translate_deepseek(combined_text)

        if translated_text and is_likely_untranslated(translated_text):
            cjk_ratio = sum(1 for c in translated_text if '\u4e00' <= c <= '\u9fff') / max(len(translated_text), 1)
            print(f"Chương {i}: bản dịch vẫn nhiều tiếng Trung ({cjk_ratio:.0%}), coi như fail.")
            translated_text = None

        if translated_text:
            s3.put_object(
                Bucket=R2_BUCKET_NAME,
                Key=output_key,
                Body=translated_text.encode('utf-8')
            )
            paras = translated_text.split('\n\n')
            translated_title = paras[0].strip() if paras else chap['title']
            if i == 0 and len(paras) > 1:
                metadata["translated_name"] = paras[1].strip().split('\n')[0].strip()[:80]
            metadata["chapters"].append({
                "id": i,
                "title": chap['title'],
                "translated_title": translated_title,
                "path": output_key,
                "hash": chapter_hash
            })
            s3.put_object(
                Bucket=R2_BUCKET_NAME,
                Key=f"translated/{story_name}/metadata.json",
                Body=json.dumps(metadata, ensure_ascii=False, indent=2).encode('utf-8')
            )
            time.sleep(1.5)

            # Check stop marker
            try:
                s3.head_object(Bucket=R2_BUCKET_NAME, Key=f"translated/{story_name}/_stop")
                s3.delete_object(Bucket=R2_BUCKET_NAME, Key=f"translated/{story_name}/_stop")
                metadata["translating"] = False
                s3.put_object(
                    Bucket=R2_BUCKET_NAME,
                    Key=f"translated/{story_name}/metadata.json",
                    Body=json.dumps(metadata, ensure_ascii=False, indent=2).encode('utf-8')
                )
                print(f"[{story_name}] Người dùng yêu cầu dừng. Đã dừng ở chương {i}.")
                sys.exit(0)
            except Exception:
                pass
        else:
            print(f"Lỗi API — bỏ qua chương {i} của [{story_name}].")
            if chapter_hash in existing_chapters:
                metadata["chapters"].append(existing_chapters[chapter_hash])
            else:
                metadata["chapters"].append({
                    "id": i,
                    "title": chap['title'],
                    "translated_title": chap['title'],
                    "path": "",
                    "hash": f"PENDING_{chapter_hash}"
                })

    if new_count == 0:
        metadata["translating"] = False
        try:
            s3.put_object(
                Bucket=R2_BUCKET_NAME,
                Key=f"translated/{story_name}/metadata.json",
                Body=json.dumps(metadata, ensure_ascii=False, indent=2).encode('utf-8')
            )
        except Exception:
            pass
        print(f"Bỏ qua [{story_name}] — {skipped} chương không thay đổi.")
        return True, "skipped"

    metadata["translating"] = False
    print(f"Hoàn tất [{story_name}] — {len(metadata['chapters'])} chương ({new_count} mới).")
    s3.put_object(
        Bucket=R2_BUCKET_NAME,
        Key=f"translated/{story_name}/metadata.json",
        Body=json.dumps(metadata, ensure_ascii=False, indent=2).encode('utf-8')
    )
    return True, "completed"


def main():
    parser = argparse.ArgumentParser(description="Dịch một cuốn sách từ raw/ sang translated/")
    parser.add_argument("--book", required=True, help="Tên sách (không có đuôi .txt)")
    parser.add_argument("--chapter", type=int, default=None, help="Chỉ dịch chapter này (0-index)")
    args = parser.parse_args()

    book_name = args.book
    raw_key = f"raw/{book_name}.txt"

    start_time = time.time()

    try:
        raw_bytes = s3.get_object(Bucket=R2_BUCKET_NAME, Key=raw_key)["Body"].read()
        content = decode_content(raw_bytes)
    except Exception as e:
        print(f"Không tìm thấy file gốc [{raw_key}] trên R2: {e}")
        sys.exit(1)

    print(f"Bắt đầu dịch [{book_name}]...")
    ok, status = process_book(raw_key, content, start_time, chapter=args.chapter)
    print(f"Kết quả: {status}")

    if not ok:
        trigger_next_run(book_name)


if __name__ == "__main__":
    main()
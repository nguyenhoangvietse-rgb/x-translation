import os
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
    "Bạn là một dịch giả văn học chuyên nghiệp Trung - Việt, am hiểu sâu sắc về thể loại truyện Tiên Hiệp, Huyền Huyễn và văn hóa cổ phong Trung Hoa. "
    "Nhiệm vụ của bạn là dịch văn bản từ tiếng Trung sang tiếng Việt. Tuyệt đối không giữ nguyên tiếng Trung, không tóm tắt, không bỏ sót bất kỳ đoạn nào.\n\n"
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

def sanitize_filename(title):
    return title.replace("\\", "-").replace("/", "-").replace(":", "-").replace("*", "-") \
        .replace("?", "-").replace('"', "-").replace("<", "-").replace(">", "-").replace("|", "-") \
        .replace(" ", "-")[:80]

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

def process_book(story_name, start_time, chapter=None, batch_size=0):
    """Dịch sách từ processed/ sang translated/.
    chapter=None, batch_size=0: dịch tất cả chương mới/cập nhật (full run)
    chapter=N: chỉ dịch chapter N (force re-translate)
    batch_size>0: dịch tối đa N chương mới, rồi trigger batch tiếp
    Trả về (tiếp_tục, trạng_thái)."""
    print(f"[{story_name}] Bắt đầu dịch...")

    # Read info.json
    try:
        info = json.loads(
            s3.get_object(Bucket=R2_BUCKET_NAME, Key=f"processed/{story_name}/info.json")['Body'].read().decode('utf-8'))
    except Exception:
        print(f"Không tìm thấy info.json cho [{story_name}].")
        return False, "no_info"

    chapters_info = info.get("chapters", [])
    total = info.get("total_chapters", len([c for c in chapters_info if c["id"] > 0]))
    print(f"[{story_name}] Tổng số chương: {total}")

    # Read existing metadata (if any)
    existing_metadata = {}
    existing_chapters = {}
    try:
        meta_obj = s3.get_object(Bucket=R2_BUCKET_NAME, Key=f"translated/{story_name}/metadata.json")
        existing_metadata = json.loads(meta_obj['Body'].read().decode('utf-8'))
        existing_chapters = {ch["hash"]: ch for ch in existing_metadata.get("chapters", []) if ch.get("hash")}
        print(f"[{story_name}] Đã có {len(existing_chapters)} chương trong metadata cũ.")
    except Exception:
        pass

    # Init metadata
    metadata = {"story_name": story_name, "chapters": [], "total_chapters": total, "translating": True}

    # Delete pending marker + save metadata BEFORE any API calls
    try:
        s3.delete_object(Bucket=R2_BUCKET_NAME, Key=f"translated/{story_name}/_translate_pending")
    except Exception:
        pass

    try:
        if existing_metadata:
            existing_metadata["translating"] = True
            s3.put_object(
                Bucket=R2_BUCKET_NAME,
                Key=f"translated/{story_name}/metadata.json",
                Body=json.dumps(existing_metadata, ensure_ascii=False, indent=2).encode('utf-8')
            )
        else:
            s3.put_object(
                Bucket=R2_BUCKET_NAME,
                Key=f"translated/{story_name}/metadata.json",
                Body=json.dumps(metadata, ensure_ascii=False, indent=2).encode('utf-8')
            )
    except Exception:
        pass

    # Merge info.json + translate author, volumes, intro
    try:
        metadata["novel_name"] = info.get("name", story_name)
        metadata["total_chapters"] = total

        author_cn = info.get("author", "")
        if author_cn:
            author_vi = translate_deepseek(f"Dịch tên tác giả sang tiếng Việt (chỉ trả về tên): {author_cn}")
            metadata["author"] = author_vi or author_cn

        vi_volumes = []
        for v in info.get("volumes", []):
            title_vi = translate_deepseek(f"Dịch tên quyển truyện sang tiếng Việt: {v['title']}")
            vi_volumes.append({
                "title_cn": v["title"],
                "title_vi": title_vi or v["title"],
                "start": v["start"],
                "end": v["end"],
            })
        metadata["volumes"] = vi_volumes

        name_cn = info.get("name", story_name)
        name_vi = translate_deepseek(f"Dịch tên truyện sau sang tiếng Việt (chỉ trả về tên): {name_cn}")
        metadata["story_name"] = name_vi or name_cn

        intro_cn = info.get("intro", "")
        if intro_cn:
            intro_vi = translate_deepseek(f"Dịch giới thiệu truyện sang tiếng Việt:\n\n{intro_cn[:2000]}")
            metadata["intro"] = intro_vi or intro_cn
    except Exception:
        pass

    # Mark translating — keep existing chapters
    try:
        if existing_metadata:
            existing_metadata.update({
                "translating": True,
                "story_name": metadata.get("story_name", story_name),
                "novel_name": metadata.get("novel_name", story_name),
                "total_chapters": metadata.get("total_chapters", 0),
                "author": metadata.get("author", ""),
                "volumes": metadata.get("volumes", []),
                "intro": metadata.get("intro", ""),
            })
            s3.put_object(
                Bucket=R2_BUCKET_NAME,
                Key=f"translated/{story_name}/metadata.json",
                Body=json.dumps(existing_metadata, ensure_ascii=False, indent=2).encode('utf-8')
            )
            metadata = existing_metadata
        else:
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

    for c in chapters_info:
        ch_id = c["id"]
        if ch_id == 0:
            continue  # intro, skip

        if time.time() - start_time > timeout_seconds:
            print(f"Hết thời gian.")
            if metadata["chapters"]:
                s3.put_object(
                    Bucket=R2_BUCKET_NAME,
                    Key=f"translated/{story_name}/metadata.json",
                    Body=json.dumps(metadata, ensure_ascii=False, indent=2).encode('utf-8')
                )
            return False, "timeout"

        # Build path: mirror processed/ structure
        ch_title = c["title"]
        ch_volume = c.get("volume")
        ch_file = c["file"]

        if ch_volume:
            trans_path = f"translated/{story_name}/{sanitize_filename(ch_volume)}/{ch_file}"
        else:
            trans_path = f"translated/{story_name}/{ch_file}"

        # Read raw content from processed/
        try:
            if ch_volume:
                proc_path = f"processed/{story_name}/{sanitize_filename(ch_volume)}/{ch_file}"
            else:
                proc_path = f"processed/{story_name}/{ch_file}"
            raw_text = s3.get_object(Bucket=R2_BUCKET_NAME, Key=proc_path)['Body'].read().decode('utf-8')
        except Exception:
            print(f"Chương {ch_id}: không tìm thấy file processed → bỏ qua.")
            continue

        combined_text = f"{ch_title}\n\n{raw_text}"
        chapter_hash = hashlib.sha256(combined_text.encode('utf-8')).hexdigest()

        force_translate = (chapter is not None and ch_id == chapter)

        if chapter is not None and ch_id != chapter:
            continue

        if not force_translate and chapter_hash in existing_chapters:
            skipped += 1
            continue

        print(f"Đang dịch [{story_name}] chương {ch_id}: {ch_title}")
        new_count += 1

        translated_text = translate_deepseek(combined_text)

        if translated_text and is_likely_untranslated(translated_text):
            cjk_ratio = sum(1 for cc in translated_text if '\u4e00' <= cc <= '\u9fff') / max(len(translated_text), 1)
            print(f"Chương {ch_id}: còn nhiều tiếng Trung ({cjk_ratio:.0%}), retry lần 2...")
            retry = translate_deepseek(combined_text)
            if retry and not is_likely_untranslated(retry):
                translated_text = retry
            else:
                print(f"Chương {ch_id}: retry vẫn fail, bỏ qua.")
                translated_text = None

        if translated_text:
            s3.put_object(
                Bucket=R2_BUCKET_NAME,
                Key=trans_path,
                Body=translated_text.encode('utf-8')
            )
            paras = translated_text.split('\n\n')
            translated_title = paras[0].strip() if paras else ch_title

            if is_likely_untranslated(translated_title):
                print(f"Chương {ch_id}: tên chương còn tiếng Trung, dịch lại tên...")
                retry_title = translate_deepseek(f"Dịch tên chương sau sang tiếng Việt (chỉ trả về tên): {ch_title}")
                if retry_title and not is_likely_untranslated(retry_title):
                    translated_title = retry_title
                    paras[0] = retry_title
                    translated_text = '\n\n'.join(paras)
                    s3.put_object(
                        Bucket=R2_BUCKET_NAME,
                        Key=trans_path,
                        Body=translated_text.encode('utf-8')
                    )

            entry = {
                "id": ch_id,
                "title": ch_title,
                "translated_title": translated_title,
                "path": trans_path,
                "hash": chapter_hash,
                "volume": ch_volume or "",
            }
            for i, c in enumerate(metadata["chapters"]):
                if c["id"] == ch_id:
                    metadata["chapters"][i] = entry
                    break
            else:
                metadata["chapters"].append(entry)
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
                print(f"[{story_name}] Người dùng yêu cầu dừng. Đã dừng ở chương {ch_id}.")
                sys.exit(0)
            except Exception:
                pass

            # Batch size limit
            if batch_size and new_count >= batch_size:
                print(f"Đạt batch limit {batch_size}.")
                break
        else:
            print(f"Lỗi API — bỏ qua chương {ch_id} của [{story_name}].")
            if chapter_hash in existing_chapters:
                entry = existing_chapters[chapter_hash]
            else:
                entry = {
                    "id": ch_id,
                    "title": ch_title,
                    "translated_title": ch_title,
                    "path": "",
                    "hash": f"PENDING_{chapter_hash}",
                    "volume": ch_volume or "",
                }
            for i, c in enumerate(metadata["chapters"]):
                if c["id"] == ch_id:
                    metadata["chapters"][i] = entry
                    break
            else:
                metadata["chapters"].append(entry)

    # After loop: trigger next batch if needed
    if batch_size and new_count > 0:
        print(f"Hoàn tất batch [{story_name}] — {len(metadata['chapters'])} chương ({new_count} mới).")
        if chapter is None:
            metadata["translating"] = True
            s3.put_object(
                Bucket=R2_BUCKET_NAME,
                Key=f"translated/{story_name}/metadata.json",
                Body=json.dumps(metadata, ensure_ascii=False, indent=2).encode('utf-8')
            )
            trigger_next_run(book_name=story_name)
            return True, "batch"
        return True, "completed"

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
    parser = argparse.ArgumentParser(description="Dịch sách từ processed/ sang translated/")
    parser.add_argument("--book", required=True, help="Tên sách (không có đuôi .txt)")
    parser.add_argument("--chapter", type=int, default=None, help="Chỉ dịch chapter này (ID)")
    parser.add_argument("--batch-size", type=int, default=20, help="Số chương mới tối đa mỗi lần chạy")
    args = parser.parse_args()

    book_name = args.book
    start_time = time.time()

    print(f"Bắt đầu dịch [{book_name}]...")
    ok, status = process_book(book_name, start_time, chapter=args.chapter, batch_size=args.batch_size)
    print(f"Kết quả: {status}")

    if not ok:
        trigger_next_run(book_name)


if __name__ == "__main__":
    main()
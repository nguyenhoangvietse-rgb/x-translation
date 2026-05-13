import os
import re
import sys
import json
import argparse
import boto3
from botocore.client import Config

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


def decode_content(raw_bytes):
    for encoding in ['utf-8-sig', 'utf-8', 'gbk', 'gb18030', 'gb2312']:
        try:
            return raw_bytes.decode(encoding)
        except (UnicodeDecodeError, UnicodeError):
            continue
    return raw_bytes.decode('utf-8', errors='replace')


def split_chapters(content):
    pattern = r'(^[\s\u3000]*(?:第[\d一二三四五六七八九十百千万零]+[章回节卷]|最终章|终章|大结局|结局[篇章]?|番外篇?|序章|楔子|尾声|后记|完结).*)'
    parts = re.split(pattern, content, flags=re.MULTILINE)

    chapters = []
    id_counter = 0

    if parts[0].strip():
        chapters.append({
            "id": id_counter,
            "title": "Giới thiệu & Lời tựa",
            "content": parts[0].strip(),
            "volume": None
        })
        id_counter += 1

    volume = None
    for i in range(1, len(parts), 2):
        title = parts[i].strip()
        body = parts[i+1].strip() if i+1 < len(parts) else ""

        if not body:
            volume = title
            continue

        chapters.append({
            "id": id_counter,
            "title": title,
            "content": body,
            "volume": volume
        })
        id_counter += 1

    return chapters


def sanitize_filename(title):
    return title.replace("\\", "-").replace("/", "-").replace(":", "-").replace("*", "-") \
        .replace("?", "-").replace('"', "-").replace("<", "-").replace(">", "-").replace("|", "-") \
        .replace(" ", "-")[:80]


def pad_id(n):
    return str(n).zfill(4)


def chapter_path(name, volume, ch_id, title):
    fname = sanitize_filename(title)
    key = f"{pad_id(ch_id)}_{fname}.txt"
    if volume:
        return f"processed/{name}/{sanitize_filename(volume)}/{key}"
    return f"processed/{name}/{key}"


def extract_author(intro):
    m = re.search(r'作者[：:]\s*(.+)', intro)
    if m:
        return m.group(1).strip()[:60]
    return ""


def update_info(name, info):
    s3.put_object(
        Bucket=R2_BUCKET_NAME,
        Key=f"processed/{name}/info.json",
        Body=json.dumps(info, ensure_ascii=False, indent=2).encode('utf-8')
    )


def main():
    parser = argparse.ArgumentParser(description="Split raw chapters into processed/")
    parser.add_argument("--book", required=True, help="Tên sách (không có đuôi .txt)")
    args = parser.parse_args()

    book_name = args.book
    raw_key = f"raw/{book_name}.txt"

    try:
        raw_bytes = s3.get_object(Bucket=R2_BUCKET_NAME, Key=raw_key)["Body"].read()
        content = decode_content(raw_bytes)
    except Exception as e:
        print(f"Không tìm thấy file gốc [{raw_key}]: {e}")
        sys.exit(1)

    print(f"Bắt đầu split [{book_name}]...")
    chapters = split_chapters(content)
    real_chs = [c for c in chapters if c["id"] > 0]
    total = len(real_chs)
    print(f"Tổng {total} chương thực.")

    # Create initial info.json
    intro_entry = next((c for c in chapters if c["id"] == 0), None)
    intro_text = intro_entry["content"] if intro_entry else ""

    info = {
        "name": book_name,
        "status": "processing",
        "progress": {"current": 0, "total": total},
        "author": extract_author(intro_text),
        "intro": intro_text[:2000],
    }
    update_info(book_name, info)

    # Save each chapter, update progress
    char_count = 0
    volume_map = {}
    saved = 0

    for c in chapters:
        if c["id"] == 0:
            continue

        path = chapter_path(book_name, c["volume"], c["id"], c["title"])
        s3.put_object(
            Bucket=R2_BUCKET_NAME,
            Key=path,
            Body=c["content"].encode('utf-8')
        )
        saved += 1
        char_count += len(c["content"])

        if c["volume"]:
            v = volume_map.get(c["volume"])
            if v:
                v["end"] = c["id"]
            else:
                volume_map[c["volume"]] = {"start": c["id"], "end": c["id"]}

        # Update progress every ~50 chapters
        if saved % 50 == 0 or saved == total:
            info["progress"]["current"] = saved
            update_info(book_name, info)

        if saved % 100 == 0:
            print(f"   {saved}/{total} chương...")

    # Final info.json
    info["status"] = "done"
    info["total_chapters"] = total
    info["char_count"] = char_count

    ch_list = []
    for c in chapters:
        fname = sanitize_filename(c["title"])
        ch_list.append({
            "id": c["id"],
            "file": f"{pad_id(c['id'])}_{fname}.txt",
            "title": c["title"],
            "volume": c["volume"]
        })
    info["chapters"] = ch_list

    volumes = []
    for title, rng in volume_map.items():
        volumes.append({"title": title, "start": rng["start"], "end": rng["end"]})
    info["volumes"] = volumes

    del info["progress"]
    update_info(book_name, info)

    print(f"Hoàn tất [{book_name}] — {total} chương, {char_count:,} ký tự.")


if __name__ == "__main__":
    main()

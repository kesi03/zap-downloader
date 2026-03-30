import os
import hashlib
import aiohttp
import requests
from pathlib import Path
from typing import Optional
from tqdm import tqdm


def get_proxy_url() -> Optional[str]:
    return (
        os.environ.get("HTTPS_PROXY")
        or os.environ.get("HTTP_PROXY")
        or os.environ.get("https_proxy")
        or os.environ.get("http_proxy")
    )


async def download_file(
    url: str,
    output_path: str,
    expected_hash: Optional[str] = None,
    chunk_size: int = 8192,
    proxy_url: Optional[str] = None,
) -> None:
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    print(f"Downloading {url}...")

    proxy = proxy_url or get_proxy_url()
    headers = {
        "User-Agent": "zap-downloader/1.0",
        "Accept": "application/octet-stream",
    }

    response = requests.get(
        url,
        headers=headers,
        proxies={"http": proxy, "https": proxy} if proxy else None,
        allow_redirects=True,
        stream=True,
        timeout=300,
    )
    print(f"Response URL: {response.url}")
    print(f"Response status: {response.status_code}")
    response.raise_for_status()

    total_size = int(response.headers.get("content-length", 0))
    print(f"Content-Length: {total_size}")

    if total_size == 0:
        raise ValueError(f"Server returned empty file (0 bytes). URL: {response.url}")

    with open(output_path, "wb") as f:
        with tqdm(
            total=total_size,
            unit="B",
            unit_scale=True,
            desc=os.path.basename(output_path),
        ) as pbar:
            for chunk in response.iter_content(chunk_size=chunk_size):
                if chunk:
                    f.write(chunk)
                    pbar.update(len(chunk))
        f.flush()
        os.fsync(f.fileno())

    print(f"Downloaded to {output_path}")

    if expected_hash:
        await validate_hash(output_path, expected_hash)


async def validate_hash(file_path: str, expected_hash: str) -> None:
    actual_hash = await calculate_hash(file_path)
    if actual_hash != expected_hash.lower():
        raise ValueError(
            f"Hash mismatch! Expected: {expected_hash}, Got: {actual_hash}"
        )
    print(f"Hash validation passed: {actual_hash}")


async def calculate_hash(file_path: str) -> str:
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256_hash.update(chunk)
    return sha256_hash.hexdigest()


def format_bytes(bytes_value: int) -> str:
    if bytes_value == 0:
        return "0 Bytes"
    k = 1024
    sizes = ["Bytes", "KB", "MB", "GB"]
    i = 0
    size = float(bytes_value)
    while size >= k and i < len(sizes) - 1:
        size /= k
        i += 1
    return f"{size:.2f} {sizes[i]}"

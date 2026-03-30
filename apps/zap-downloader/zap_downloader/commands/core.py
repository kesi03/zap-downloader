import typer
import asyncio
import os
from typing import Optional
from rich.console import Console

console = Console()


def core(
    platform: str = typer.Option(
        ..., "--platform", "-p", help="Platform: windows, windows32, linux, mac, daily"
    ),
    output: str = typer.Option(".", "--output", "-o", help="Output directory"),
    workspace: Optional[str] = typer.Option(
        None, "--workspace", "-w", help="Workspace directory"
    ),
    zap_version: Optional[str] = typer.Option(
        None, "--zap-version", "-v", help="Specific version to download"
    ),
    proxy: Optional[str] = typer.Option(None, "--proxy", "-x", help="Proxy URL"),
):
    """Download ZAP core."""
    asyncio.run(_download_core(platform, output, workspace, zap_version, proxy))


async def _download_core(
    platform: str,
    output: str,
    workspace: Optional[str],
    zap_version: Optional[str],
    proxy: Optional[str],
):
    from ..parser import fetch_zap_versions, get_proxy_url
    from ..downloader import download_file, format_bytes
    from ..workspace import get_workspace

    valid_platforms = ["windows", "windows32", "linux", "mac", "daily"]
    if platform not in valid_platforms:
        console.print(
            f"[red]Invalid platform. Choose: {', '.join(valid_platforms)}[/red]"
        )
        raise typer.Exit(1)

    if not workspace:
        workspace = get_workspace()

    if output == ".":
        output = os.path.join(workspace, "zap")

    if not os.path.exists(output):
        os.makedirs(output, exist_ok=True)

    console.print("Fetching ZAP versions...")
    zap_versions = await fetch_zap_versions(proxy)

    platform_key = platform
    platform_data = zap_versions.core.platforms.get(platform_key)
    if not platform_data:
        console.print(f"[red]Platform {platform} not available[/red]")
        raise typer.Exit(1)

    console.print(f"Platform: {platform}")
    console.print(f"Version: {zap_versions.core.version}")
    console.print(f"Size: {format_bytes(platform_data.size)}")
    console.print(f"Hash: {platform_data.hash}")

    output_path = os.path.join(output, platform_data.file)
    await download_file(platform_data.url, output_path, platform_data.hash, proxy)
    console.print("[green]Download complete![/green]")

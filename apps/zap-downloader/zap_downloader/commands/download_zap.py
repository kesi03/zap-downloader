import typer
import asyncio
import os
import yaml
from typing import Optional
from rich.console import Console

from ..workspace import ensure_workspace, get_workspace

console = Console()


def download_zap(
    config: str = typer.Option(..., "--config", "-c", help="Path to ZAP config file"),
    workspace: Optional[str] = typer.Option(
        None, "--workspace", "-w", help="Workspace directory"
    ),
    proxy: Optional[str] = typer.Option(None, "--proxy", "-x", help="Proxy URL"),
):
    """Download ZAP core and addons from config file."""
    asyncio.run(_download_zap(config, workspace, proxy))


async def _download_zap(
    config_path: str, workspace: Optional[str], proxy: Optional[str]
):
    from ..parser import fetch_zap_versions
    from ..downloader import download_file, format_bytes

    if not os.path.exists(config_path):
        console.print(f"[red]Config file not found: {config_path}[/red]")
        raise typer.Exit(1)

    with open(config_path, "r") as f:
        config = yaml.safe_load(f)

    if not config.get("zap") or not config.get("addons"):
        console.print("[red]Invalid config: missing zap or addons[/red]")
        raise typer.Exit(1)

    if not workspace:
        workspace = get_workspace()

    ensure_workspace(workspace)

    console.print("[blue]Fetching ZAP versions...[/blue]")
    zap_versions = await fetch_zap_versions(proxy)

    platform = config["zap"]["platform"]
    version = config["zap"]["version"]

    platform_data = zap_versions.core.platforms.get(platform)
    if not platform_data:
        console.print(f"[red]Platform {platform} not available[/red]")
        raise typer.Exit(1)

    zap_dir = os.path.join(workspace, "zap")
    if not os.path.exists(zap_dir):
        os.makedirs(zap_dir, exist_ok=True)

    console.print(f"[yellow]\nDownloading ZAP core: {platform} v{version}...[/yellow]")
    console.print(f"[gray]  Size: {format_bytes(platform_data.size)}[/gray]")

    zap_output_path = os.path.join(zap_dir, platform_data.file)
    await download_file(platform_data.url, zap_output_path, platform_data.hash, proxy)
    console.print("[green]ZAP core downloaded![/green]")

    addons_dir = os.path.join(zap_dir, "addons")
    if not os.path.exists(addons_dir):
        os.makedirs(addons_dir, exist_ok=True)

    addon_map = {addon.id: addon for addon in zap_versions.addons}

    to_download = []
    for request in config["addons"]:
        addon = addon_map.get(request["id"])
        if not addon:
            console.print(f"[yellow]Addon not found: {request['id']}[/yellow]")
            continue

        if request.get("status") and addon.status != request["status"]:
            console.print(f"[yellow]Skipping {addon.id}: status mismatch[/yellow]")
            continue

        to_download.append(addon)

    downloaded_ids = set()
    if to_download:
        console.print(f"[yellow]\nDownloading {len(to_download)} addons...[/yellow]")

        for addon in to_download:
            if addon.id in downloaded_ids:
                continue

            console.print(
                f"[gray]  - {addon.id} v{addon.version} ({addon.status})[/gray]"
            )

            addon_output_path = os.path.join(addons_dir, addon.file)
            await download_file(addon.url, addon_output_path, addon.hash, proxy)
            downloaded_ids.add(addon.id)

        console.print("[green]Addons downloaded![/green]")

    console.print("\n[green]=== Download Complete ===[/green]")
    console.print(f"[blue]Workspace: {os.path.abspath(workspace)}[/blue]")
    console.print(f"[blue]ZAP: {os.path.join(zap_dir, platform_data.file)}[/blue]")
    console.print(f"[blue]Addons: {addons_dir}[/blue]")

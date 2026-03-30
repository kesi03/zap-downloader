import typer
import asyncio
from typing import Optional
from rich.console import Console

console = Console()


def list_versions(
    addons: bool = typer.Option(False, "--addons", "-a", help="List addons only"),
    core: bool = typer.Option(False, "--core", "-c", help="List core versions only"),
    proxy: Optional[str] = typer.Option(None, "--proxy", "-x", help="Proxy URL"),
):
    """List available ZAP versions and addons."""
    asyncio.run(_list_versions(addons, core, proxy))


async def _list_versions(list_addons: bool, list_core: bool, proxy: Optional[str]):
    from ..parser import fetch_zap_versions
    from ..downloader import format_bytes

    console.print("Fetching ZAP versions...")
    zap_versions = await fetch_zap_versions(proxy)

    if not list_addons:
        console.print("\n[bold]=== ZAP Core ===[/bold]")
        console.print(f"Version: {zap_versions.core.version}")
        console.print(f"Daily: {zap_versions.core.daily_version}")
        console.print("\nPlatforms:")
        for platform, data in zap_versions.core.platforms.items():
            if data:
                console.print(f"  {platform}: {data.file} ({format_bytes(data.size)})")

    if not list_core:
        console.print("\n[bold]=== Addons ===[/bold]")
        sorted_addons = sorted(zap_versions.addons, key=lambda a: a.id)

        status_groups = {"release": [], "beta": [], "alpha": []}
        for addon in sorted_addons:
            status_groups[addon.status].append(addon)

        for status in ["release", "beta", "alpha"]:
            addons_list = status_groups[status]
            if not addons_list:
                continue
            console.print(f"\n--- {status.upper()} ---")
            for addon in addons_list:
                console.print(
                    f"  {addon.id} v{addon.version} ({format_bytes(addon.size)})"
                )

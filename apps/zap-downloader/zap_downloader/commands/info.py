import typer
import asyncio
from rich.console import Console

from ..parser import fetch_zap_versions

console = Console()


def info(
    addon_id: str = typer.Argument(..., help="Addon ID to get info about"),
):
    """Get detailed information about a specific addon."""
    asyncio.run(_get_info(addon_id))


async def _get_info(addon_id: str):
    from ..downloader import format_bytes

    console.print("Fetching ZAP versions...")
    zap_versions = await fetch_zap_versions()

    addon = None
    for a in zap_versions.addons:
        if a.id == addon_id:
            addon = a
            break

    if not addon:
        console.print(f"[red]Addon '{addon_id}' not found[/red]")
        raise typer.Exit(1)

    console.print(f"\n[bold]=== {addon.name} ===[/bold]")
    console.print(f"ID: {addon.id}")
    console.print(f"Version: {addon.version}")
    console.print(f"Status: {addon.status}")
    console.print(f"Author: {addon.author}")
    console.print(f"Description: {addon.description}")
    console.print(f"File: {addon.file}")
    console.print(f"Size: {format_bytes(addon.size)}")
    console.print(f"Date: {addon.date}")
    console.print(f"URL: {addon.url}")
    console.print(f"Hash: {addon.hash}")
    console.print(f"Min ZAP Version: {addon.not_before_version}")

    if addon.dependencies:
        console.print("\n[bold]Dependencies:[/bold]")
        for dep in addon.dependencies:
            console.print(f"  - {dep.id} ({dep.version})")

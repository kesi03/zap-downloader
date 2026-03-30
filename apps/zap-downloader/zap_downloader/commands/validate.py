import typer
import asyncio
import os
from typing import Optional
from rich.console import Console

console = Console()


def validate(
    file: str = typer.Argument(..., help="File path to validate"),
    addon_id: str = typer.Option(
        None, "--addon", "-a", help="Addon ID to compare hash against"
    ),
    platform: str = typer.Option(
        None,
        "--platform",
        "-p",
        help="Platform (windows, windows32, linux, mac, daily) to compare hash against",
    ),
    proxy: Optional[str] = typer.Option(None, "--proxy", "-x", help="Proxy URL"),
):
    """Validate a file's SHA256 hash against XML data or show the hash."""
    asyncio.run(_validate(file, addon_id, platform, proxy))


async def _validate(
    file_path: str,
    addon_id: Optional[str],
    platform: Optional[str],
    proxy: Optional[str],
):
    from ..downloader import calculate_hash

    if not os.path.exists(file_path):
        console.print(f"[red]File not found: {file_path}[/red]")
        raise typer.Exit(1)

    console.print(f"Calculating SHA256 for: {file_path}...")
    file_hash = await calculate_hash(file_path)
    console.print(f"\n[bold]File SHA256:[/bold] {file_hash}")

    if addon_id or platform:
        from ..parser import fetch_zap_versions
        from ..downloader import format_bytes

        console.print("\nFetching ZAP versions to compare...")
        zap_versions = await fetch_zap_versions(proxy)

        if addon_id:
            addon = None
            for a in zap_versions.addons:
                if a.id == addon_id:
                    addon = a
                    break

            if not addon:
                console.print(f"[red]Addon '{addon_id}' not found in XML[/red]")
                return

            console.print(
                f"\n[bold]Comparing with addon:[/bold] {addon.name} ({addon.version})"
            )
            console.print(f"Expected SHA256: {addon.hash}")
            console.print(f"Expected size: {format_bytes(addon.size)}")

            actual_size = os.path.getsize(file_path)
            console.print(f"Actual size: {format_bytes(actual_size)}")

            if file_hash.lower() == addon.hash.lower():
                console.print("\n[green]✓ Hash MATCHES![/green]")
            else:
                console.print("\n[red]✗ Hash MISMATCH![/red]")

        if platform:
            valid_platforms = ["windows", "windows32", "linux", "mac", "daily"]
            if platform not in valid_platforms:
                console.print(
                    f"[red]Invalid platform. Choose: {', '.join(valid_platforms)}[/red]"
                )
                raise typer.Exit(1)

            platform_data = zap_versions.core.platforms.get(platform)
            if not platform_data:
                console.print(f"[red]Platform {platform} not found in XML[/red]")
                return

            console.print(
                f"\n[bold]Comparing with ZAP core:[/bold] {platform} ({zap_versions.core.version})"
            )
            console.print(f"Expected SHA256: {platform_data.hash}")
            console.print(f"Expected size: {format_bytes(platform_data.size)}")

            actual_size = os.path.getsize(file_path)
            console.print(f"Actual size: {format_bytes(actual_size)}")

            if file_hash.lower() == platform_data.hash.lower():
                console.print("\n[green]✓ Hash MATCHES![/green]")
            else:
                console.print("\n[red]✗ Hash MISMATCH![/red]")

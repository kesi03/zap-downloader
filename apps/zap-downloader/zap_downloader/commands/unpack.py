import typer
import os
import tarfile
import shutil
import re
from rich.console import Console

console = Console()


def update_file_cache_size(zap_version_dir: str, cache_size: int) -> bool:
    script_path = os.path.join(zap_version_dir, "db", "zapdb.script")

    if not os.path.exists(script_path):
        console.print(
            "[yellow]zapdb.script not found, skipping cache size update[/yellow]"
        )
        return False

    with open(script_path, "r", encoding="utf-8") as f:
        content = f.read()

    original_content = content
    content = re.sub(
        r"SET FILES CACHE SIZE \d+", f"SET FILES CACHE SIZE {cache_size}", content
    )

    if content != original_content:
        with open(script_path, "w", encoding="utf-8") as f:
            f.write(content)
        console.print(f"[green]Updated file cache size to {cache_size}[/green]")
        return True

    console.print("[yellow]File cache size setting not found[/yellow]")
    return False


def unpack(
    input: str = typer.Option(None, "--input", "-i", help="Path to .tar package file"),
    output: str = typer.Option(None, "--output", "-o", help="Output directory"),
    file_cache_size: int = typer.Option(
        100000, "--file-cache-size", help="H2 database file cache size"
    ),
):
    """Unpack a ZAP package archive."""
    if not input:
        console.print("[red]Missing required option: -i/--input[/red]")
        raise typer.Exit(1)

    if not os.path.exists(input):
        console.print(f"[red]Package not found: {input}[/red]")
        raise typer.Exit(1)

    if output is None:
        output = os.path.splitext(os.path.basename(input))[0]

    if not os.path.exists(output):
        os.makedirs(output, exist_ok=True)

    console.print(f"Unpacking to {output}...")

    with tarfile.open(input, "r") as tar:
        tar.extractall(output)

    addons_dir = os.path.join(output, "addons")
    zap_dir = os.path.join(output, "zap")
    addons_in_zap_dir = (
        os.path.join(zap_dir, "addons") if os.path.exists(zap_dir) else None
    )
    zap_version_dir = None
    tar_gz_path = None

    if os.path.exists(zap_dir):
        for f in os.listdir(zap_dir):
            if f.startswith("ZAP_") and f.endswith(".tar.gz"):
                tar_gz_path = os.path.join(zap_dir, f)
                break
            elif f.startswith("ZAP_") and os.path.isdir(os.path.join(zap_dir, f)):
                zap_version_dir = os.path.join(zap_dir, f)
                break

    if tar_gz_path:
        console.print(f"Extracting {os.path.basename(tar_gz_path)}...")
        with tarfile.open(tar_gz_path, "r:gz") as tar_gz:
            tar_gz.extractall(zap_dir)
        os.remove(tar_gz_path)

        for f in os.listdir(zap_dir):
            if f.startswith("ZAP_") and os.path.isdir(os.path.join(zap_dir, f)):
                zap_version_dir = os.path.join(zap_dir, f)
                break

    if zap_version_dir:
        update_file_cache_size(zap_version_dir, file_cache_size)

        plugin_dir = os.path.join(zap_version_dir, "plugin")

        addons_to_process = None
        if addons_in_zap_dir and os.path.exists(addons_in_zap_dir):
            addons_to_process = addons_in_zap_dir
        elif os.path.exists(addons_dir):
            addons_to_process = addons_dir

        if addons_to_process:
            existing_addons = (
                set(os.listdir(plugin_dir)) if os.path.exists(plugin_dir) else set()
            )
            addons_to_move = [
                f for f in os.listdir(addons_to_process) if f not in existing_addons
            ]

            if addons_to_move:
                if not os.path.exists(plugin_dir):
                    os.makedirs(plugin_dir, exist_ok=True)
                for f in addons_to_move:
                    shutil.move(os.path.join(addons_to_process, f), plugin_dir)
                console.print(
                    f"[green]Moved {len(addons_to_move)} addons to {plugin_dir}[/green]"
                )
            else:
                console.print(
                    "[yellow]Addons already present in plugin folder[/yellow]"
                )

            if os.path.exists(addons_to_process):
                shutil.rmtree(addons_to_process)
    elif os.path.exists(addons_dir):
        console.print(
            f"[yellow]No ZAP version folder found, addons remain in: {addons_dir}[/yellow]"
        )

    console.print(f"[green]Unpack complete: {output}[/green]")

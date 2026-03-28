import os
from pathlib import Path
from dotenv import load_dotenv
from rich.console import Console

load_dotenv()

console = Console()

DEFAULT_WORKSPACE = "workspace"
DEFAULT_DOWNLOADS = "downloads"
DEFAULT_INSTALL = "install"
DEFAULT_PACKAGES = "packages"
DEFAULT_ZAP_HOME = ".zap"


def get_workspace() -> str:
    return os.environ.get("ZAP_DOWNLOADER_WORKSPACE", DEFAULT_WORKSPACE)


def get_downloads_dir() -> str:
    return os.environ.get("ZAP_DOWNLOADER_DOWNLOADS", DEFAULT_DOWNLOADS)


def get_install_dir() -> str:
    return os.environ.get("ZAP_DOWNLOADER_INSTALL", DEFAULT_INSTALL)


def get_packages_dir() -> str:
    return os.environ.get("ZAP_DOWNLOADER_PACKAGES", DEFAULT_PACKAGES)


def get_zap_home_dir() -> str:
    return os.environ.get("ZAP_DOWNLOADER_ZAP_HOME", DEFAULT_ZAP_HOME)


def ensure_workspace(workspace_path: str = None) -> str:
    workspace = workspace_path or get_workspace()
    if not os.path.exists(workspace):
        os.makedirs(workspace, exist_ok=True)
        console.print(f"[green]Created workspace: {workspace}[/green]")

    subdirs = [
        get_downloads_dir(),
        get_install_dir(),
        get_packages_dir(),
        get_zap_home_dir(),
    ]

    for subdir in subdirs:
        subdir_path = os.path.join(workspace, subdir)
        if not os.path.exists(subdir_path):
            os.makedirs(subdir_path, exist_ok=True)

    return workspace

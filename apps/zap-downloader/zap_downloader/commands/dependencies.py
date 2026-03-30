import typer
import subprocess
import platform
import os
from rich.console import Console

console = Console()


def is_windows() -> bool:
    return platform.system() == "Windows"


def install_choco() -> None:
    if is_windows():
        console.print("[blue]Installing Chocolatey...[/blue]")
        subprocess.run(
            [
                "powershell",
                "-Command",
                "Set-ExecutionPolicy Bypass -Scope Process -Force; "
                "[System.Net.ServicePointManager]::SecurityProtocol = "
                "[System.Net.SecurityProtocolType]::Tls12; "
                "iex ((New-Object System.Net.WebClient).DownloadString("
                "'https://community.chocolatey.org/install.ps1'))",
            ],
            check=True,
        )


def ensure_choco() -> None:
    try:
        subprocess.run(["choco", "--version"], check=True, capture_output=True)
    except FileNotFoundError:
        install_choco()


def chrome(
    version: str = typer.Option(
        None, "--version", "-v", help="Chrome version to install"
    ),
    os: str = typer.Option("ubuntu", "--os", "-o", help="Operating system"),
):
    """Install Chrome and chromedriver."""
    try:
        if os == "windows" or is_windows():
            console.print(
                "[blue]Installing Chrome and chromedriver on Windows...[/blue]"
            )
            ensure_choco()
            subprocess.run(["choco", "install", "googlechrome", "-y"], check=True)
            subprocess.run(["choco", "install", "chromedriver", "-y"], check=True)
            console.print("[green]Chrome and chromedriver installed[/green]")
        else:
            console.print("[blue]Installing Chrome and chromedriver...[/blue]")

            subprocess.run(["sudo", "apt-get", "update"], check=True)

            if version:
                console.print(f"[blue]Installing Chrome version {version}...[/blue]")
                subprocess.run(
                    [
                        "wget",
                        "-q",
                        "-O",
                        "/tmp/google-chrome-stable.deb",
                        "https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb",
                    ],
                    check=True,
                )
                subprocess.run(
                    [
                        "sudo",
                        "apt-get",
                        "install",
                        "-y",
                        "/tmp/google-chrome-stable.deb",
                    ],
                    check=True,
                )
            else:
                subprocess.run(
                    ["sudo", "apt-get", "install", "-y", "google-chrome-stable"],
                    check=True,
                )

            result = subprocess.run(
                ["google-chrome", "--version"],
                capture_output=True,
                text=True,
                check=True,
            )
            console.print(f"[green]Installed Chrome: {result.stdout.strip()}[/green]")

            subprocess.run(
                ["sudo", "apt-get", "install", "-y", "chromium-chromedriver"],
                check=True,
            )
            console.print("[green]chromedriver installed[/green]")

    except Exception as e:
        console.print(f"[red]Failed to install Chrome: {e}[/red]")
        raise typer.Exit(1)


def firefox(
    version: str = typer.Option(
        None, "--version", "-v", help="Firefox version to install"
    ),
    os: str = typer.Option("ubuntu", "--os", "-o", help="Operating system"),
):
    """Install Firefox and geckodriver."""
    try:
        if os == "windows" or is_windows():
            console.print(
                "[blue]Installing Firefox and geckodriver on Windows...[/blue]"
            )
            ensure_choco()
            subprocess.run(["choco", "install", "firefox", "-y"], check=True)
            subprocess.run(["choco", "install", "geckodriver", "-y"], check=True)
            console.print("[green]Firefox and geckodriver installed[/green]")
        else:
            console.print("[blue]Installing Firefox and geckodriver...[/blue]")

            subprocess.run(["sudo", "apt-get", "update"], check=True)

            if version:
                console.print(f"[blue]Installing Firefox version {version}...[/blue]")
            else:
                subprocess.run(
                    ["sudo", "apt-get", "install", "-y", "firefox"], check=True
                )

            result = subprocess.run(
                ["firefox", "--version"], capture_output=True, text=True, check=True
            )
            console.print(f"[green]Installed Firefox: {result.stdout.strip()}[/green]")

            subprocess.run(
                ["sudo", "apt-get", "install", "-y", "firefox-geckodriver"], check=True
            )
            console.print("[green]geckodriver installed[/green]")

    except Exception as e:
        console.print(f"[red]Failed to install Firefox: {e}[/red]")
        raise typer.Exit(1)

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

            result = subprocess.run(
                [
                    "powershell",
                    "-Command",
                    "(Get-Item 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe').VersionInfo.ProductVersion",
                ],
                capture_output=True,
                text=True,
                check=True,
            )
            version = result.stdout.strip()
            major_version = version.split(".")[0]
            console.print(f"[green]Installed Chrome: {version}[/green]")

            console.print(
                f"[blue]Installing matching chromedriver for Chrome {major_version}...[/blue]"
            )
            chromedriver_url = f"https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/{major_version}/win32/chromedriver-win32.zip"
            subprocess.run(
                [
                    "powershell",
                    "-Command",
                    f"Invoke-WebRequest '{chromedriver_url}' -OutFile chromedriver.zip",
                ],
                check=True,
            )
            subprocess.run(
                [
                    "powershell",
                    "-Command",
                    "Expand-Archive chromedriver.zip -DestinationPath C:\\tools\\chromedriver -Force",
                ],
                check=True,
            )
            subprocess.run(
                [
                    "powershell",
                    "-Command",
                    "$oldPath = [Environment]::GetEnvironmentVariable('PATH', 'User'); if ($oldPath -notlike '*C:\\tools\\chromedriver*') { [Environment]::SetEnvironmentVariable('PATH', \"$oldPath;C:\\tools\\chromedriver\", 'User') }",
                ],
                check=True,
            )
            console.print("[green]chromedriver installed[/green]")
        else:
            console.print("[blue]Installing Chrome and chromedriver...[/blue]")

            subprocess.run(["sudo", "apt-get", "update"], check=True)
            subprocess.run(
                [
                    "sudo",
                    "apt-get",
                    "install",
                    "-y",
                    "wget",
                    "gnupg",
                    "xvfb",
                    "libgtk-3-0",
                    "libdbus-glib-1-2",
                    "libnss3",
                    "libnspr4",
                    "libasound2t64",
                    "libatk-bridge2.0-0",
                    "libxkbcommon0",
                    "libgbm1",
                    "libxcomposite1",
                    "libxdamage1",
                    "libxrandr2",
                    "libpango-1.0-0",
                    "libcairo2",
                    "libatspi2.0-0",
                    "libcups2",
                    "libdrm2",
                    "libxfixes3",
                    "libxshmfence1",
                    "unzip",
                ],
                check=True,
            )

            subprocess.run(
                [
                    "wget",
                    "-q",
                    "-O",
                    "-",
                    "https://dl.google.com/linux/linux_signing_key.pub",
                ],
                check=True,
            )
            subprocess.run(
                ["sudo", "apt-key", "add", "-"],
                check=True,
            )
            with open("/tmp/google-chrome.list", "w") as f:
                f.write(
                    "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main\n"
                )
            subprocess.run(
                [
                    "sudo",
                    "cp",
                    "/tmp/google-chrome.list",
                    "/etc/apt/sources.list.d/google-chrome.list",
                ],
                check=True,
            )
            subprocess.run(["sudo", "apt-get", "update"], check=True)

            console.print(f"[blue]Installing latest Chrome...[/blue]")
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
                    [
                        "sudo",
                        "apt-get",
                        "install",
                        "-y",
                        "--upgrade",
                        "google-chrome-stable",
                    ],
                    check=True,
                )

            result = subprocess.run(
                ["google-chrome", "--version"],
                capture_output=True,
                text=True,
                check=True,
            )
            console.print(f"[green]Installed Chrome: {result.stdout.strip()}[/green]")

            import os

            chrome_paths = [
                "/usr/bin/google-chrome",
                "/snap/bin/chromium",
                "/usr/bin/chromium",
            ]
            chrome_path = ""
            for p in chrome_paths:
                if (
                    subprocess.run(["test", "-x", p], capture_output=True).returncode
                    == 0
                ):
                    chrome_path = p
                    break
            if chrome_path:
                console.print(f"[green]Chrome binary found at: {chrome_path}[/blue]")
                console.print(
                    f"[blue]Set CHROME_BIN={chrome_path} environment variable[/blue]"
                )

            import re

            match = re.search(r"Chrome (\d+)", result.stdout)
            major_version = match.group(1) if match else None

            if major_version:
                try:
                    console.print(
                        f"[blue]Installing matching chromedriver for Chrome {major_version}...[/blue]"
                    )
                    subprocess.run(
                        [
                            "wget",
                            "-q",
                            "-O",
                            "/tmp/chromedriver.zip",
                            f"https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/{major_version}/linux64/chromedriver-linux64.zip",
                        ],
                        check=True,
                    )
                    subprocess.run(
                        [
                            "sudo",
                            "unzip",
                            "-o",
                            "/tmp/chromedriver.zip",
                            "-d",
                            "/usr/local/bin/",
                        ],
                        check=True,
                    )
                    subprocess.run(
                        [
                            "sudo",
                            "mv",
                            "/usr/local/bin/chromedriver-linux64/chromedriver",
                            "/usr/local/bin/chromedriver",
                        ],
                        check=True,
                    )
                    subprocess.run(
                        ["sudo", "rm", "-rf", "/usr/local/bin/chromedriver-linux64"],
                        check=True,
                    )
                    console.print("[green]chromedriver installed[/green]")
                except Exception:
                    console.print(
                        f"[yellow]Chrome {major_version} not available on chrome-for-testing, falling back to apt[/yellow]"
                    )
                    subprocess.run(
                        ["sudo", "apt-get", "install", "-y", "chromium-chromedriver"],
                        check=True,
                    )
                    console.print("[green]chromedriver installed[/green]")
            else:
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
            import re

            version = "0.36.0"
            try:
                result = subprocess.run(
                    ["curl", "-sL", "https://github.com/mozilla/geckodriver/tags"],
                    capture_output=True,
                    text=True,
                    check=True,
                )
                match = re.search(r"geckodriver-v(\d+\.\d+\.\d+)", result.stdout)
                if match:
                    version = match.group(1)
            except Exception:
                console.print(
                    f"[yellow]Could not fetch latest version, using v{version}[/yellow]"
                )

            url = f"https://github.com/mozilla/geckodriver/releases/download/v{version}/geckodriver-v{version}-win64.zip"

            console.print(f"[blue]Installing geckodriver v{version}[/blue]")
            subprocess.run(
                [
                    "powershell",
                    "-Command",
                    f"Invoke-WebRequest '{url}' -OutFile geckodriver.zip",
                ],
                check=True,
            )
            console.print("[green]geckodriver installed[/green]")
        else:
            console.print("[blue]Installing Firefox and geckodriver...[/blue]")

            subprocess.run(["sudo", "apt-get", "update"], check=True)
            subprocess.run(
                [
                    "sudo",
                    "apt-get",
                    "install",
                    "-y",
                    "xvfb",
                    "libgtk-3-0",
                    "libdbus-glib-1-2",
                    "libnss3",
                    "libnspr4",
                    "libasound2t64",
                    "libatk-bridge2.0-0",
                    "libxkbcommon0",
                    "libgbm1",
                    "libxcomposite1",
                    "libxdamage1",
                    "libxrandr2",
                    "libpango-1.0-0",
                    "libcairo2",
                ],
                check=True,
            )

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

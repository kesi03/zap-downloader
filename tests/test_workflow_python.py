#!/usr/bin/env python3
"""
Workflow test for Python zap-downloader.
Tests: core -p linux -> addons -c config -> pack -> unpack -> daemon
"""

import os
import sys
import shutil
import time
import subprocess
import requests
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent.parent / "workspace"
ZAP_DIR = WORKSPACE / "zap"
ADDONS_DIR = ZAP_DIR / "addons"
PACKAGES_DIR = WORKSPACE / "packages"
INSTALL_DIR = WORKSPACE / "install"


# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------

def setup_workspace():
    if WORKSPACE.exists():
        shutil.rmtree(WORKSPACE)
    PACKAGES_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Created workspace: {WORKSPACE}")


def run_command(cmd, cwd=None):
    print(f"\n> {' '.join(cmd)}")
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd or os.getcwd(),
            capture_output=True,
            text=True,
            check=True
        )
        print(result.stdout)
        return result
    except subprocess.CalledProcessError as e:
        print("STDOUT:", e.stdout)
        print("STDERR:", e.stderr)
        raise


# ------------------------------------------------------------
# Steps
# ------------------------------------------------------------

def step_core():
    print("\n=== Step 1: core -p linux ===")

    run_command([
        sys.executable, "-m", "zap_downloader", "core",
        "-p", "linux",
        "-w", str(WORKSPACE)
    ])

    if not ZAP_DIR.exists():
        raise RuntimeError(f"ZAP directory not found: {ZAP_DIR}")

    if not any(f.name.endswith(".tar.gz") for f in ZAP_DIR.iterdir()):
        raise RuntimeError("No tar.gz file found")

    print("Step 1 PASSED: core downloaded")


def step_addons():
    print("\n=== Step 2: addons -c config ===")

    # Try Python config first, then Node config
    config_candidates = [
        Path(__file__).resolve().parent.parent / "apps" / "zap-downloader" / "config" / "release-config.yaml",
        Path(__file__).resolve().parent.parent / "apps" / "zap-downloader-node" / "config" / "release-config.yaml",
    ]

    config_path = next((p for p in config_candidates if p.exists()), None)
    if not config_path:
        raise RuntimeError("release-config.yaml not found in expected locations")

    run_command([
        sys.executable, "-m", "zap_downloader", "addons",
        "-c", str(config_path),
        "-w", str(WORKSPACE)
    ])

    print("Step 2 PASSED: addons downloaded")


def step_pack():
    print("\n=== Step 3: pack -> workspace/packages ===")

    output_path = PACKAGES_DIR / "zap-package.tar"

    run_command([
        sys.executable, "-m", "zap_downloader", "package",
        "-o", str(output_path),
        "-w", str(WORKSPACE)
    ])

    if not output_path.exists():
        raise RuntimeError(f"Package not found: {output_path}")

    print("Step 3 PASSED: package created")


def step_unpack():
    print("\n=== Step 4: unpack -> install ===")

    package_path = PACKAGES_DIR / "zap-package.tar"

    run_command([
        sys.executable, "-m", "zap_downloader", "unpack",
        "-i", str(package_path),
        "-o", str(INSTALL_DIR)
    ])

    if not INSTALL_DIR.exists():
        raise RuntimeError(f"Install directory not found: {INSTALL_DIR}")

    print("Step 4 PASSED: unpacked to install")


def step_daemon():
    print("\n=== Step 5: daemon -> curl version ===")

    # Find JAR
    jar_path = None
    for root, _, files in os.walk(INSTALL_DIR):
        for f in files:
            if f.startswith("zap") and f.endswith(".jar"):
                jar_path = Path(root) / f
                break
        if jar_path:
            break

    if not jar_path:
        print("JAR not found, skipping daemon test")
        return

    print(f"Found JAR: {jar_path}")

    # Start daemon
    proc = subprocess.Popen(
        [
            sys.executable, "-m", "zap_downloader", "start-daemon",
            "-d", str(jar_path.parent),
            "-w", str(WORKSPACE),
            "-P", "8080"
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    # Wait for ZAP to start
    max_wait = 60
    for _ in range(max_wait):
        try:
            resp = requests.get("http://localhost:8080/JSON/core/view/version/", timeout=2)
            if resp.status_code == 200:
                print(f"ZAP version: {resp.text}")
                print("Step 5 PASSED: daemon started and responding")
                break
        except Exception:
            pass
        time.sleep(1)
    else:
        proc.kill()
        raise RuntimeError("Daemon failed to start within timeout")

    # Stop daemon
    try:
        run_command([
            sys.executable, "-m", "zap_downloader", "stop-daemon",
            "-w", str(WORKSPACE)
        ])
    except Exception:
        pass

    time.sleep(2)
    if proc.poll() is None:
        proc.kill()


# ------------------------------------------------------------
# Main
# ------------------------------------------------------------

def main():
    print("=== ZAP Downloader Workflow Test (Python) ===")
    print(f"Python: {sys.version}")
    print(f"Workspace: {WORKSPACE}")

    try:
        setup_workspace()
        step_core()
        step_addons()
        step_pack()
        step_unpack()
        step_daemon()

        print("\n=== ALL TESTS PASSED ===")
        return 0

    except Exception as e:
        print(f"\n=== TEST FAILED: {e} ===")
        return 1


if __name__ == "__main__":
    sys.exit(main())
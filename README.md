
# ZAP Downloader

CLI tool to download OWASP ZAP versions and addons with SHA‑256 validation, package workspaces, and manage ZAP as a daemon using PM2.

---

## Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/zap-downloader.git
cd zap-downloader

# Install dependencies (uses pnpm)
pnpm install

# Build the project
pnpm run build
```

---

## Usage

### Global Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--workspace` | `-w` | Workspace directory | `zap-workspace` |
| `--help` | `-h` | Show help | |
| `--version` | `-V` | Show version | |

Set workspace via environment variable:

```bash
export ZAP_PACKAGES_WORKSPACE=/path/to/workspace
```

---

## Commands

### 1. List Available Versions

```bash
npm run list                    # List all
npm run list -- --addons       # Addons only
npm run list -- --core         # Core only
```

---

### 2. Show Addon Information

```bash
npm run info -- -a <addon-id>
```

Example:

```bash
npm run info -- -a ascanrules
```

---

### 3. Download ZAP Core

```bash
npm run core -- -p <platform> [-o <output-dir>]
```

Platforms: `windows`, `windows32`, `linux`, `mac`, `daily`

Examples:

```bash
npm run core -- -p windows
npm run core -- -p linux -o ./custom
npm run core -- -p daily
```

---

### 4. Create Addon Config Interactively

```bash
npm run create-config -- [-s <status>] [-o <output-file>]
```

Options:

- `-s, --status` — `release` (default), `beta`, `alpha`, `all`
- `-o, --output` — Output filename (default: `config.yaml`)

Examples:

```bash
npm run create-config
npm run create-config -- -s all
npm run create-config -- -s beta -o my-config.yaml
```

---

### 5. Download Addons

```bash
npm run addons -- -c <config-file> [-o <output-dir>]
```

Examples:

```bash
npm run addons -- -c ./config/config.yaml
npm run addons -- -c ./config.yaml -o ./custom-addons
```

---

### 6. Create Full ZAP Config (Platform + Version + Addons)

```bash
npm run create-zap-config -- [-s <status>] [-o <output-file>]
```

Example:

```bash
npm run create-zap-config -- -o my-zap.yaml
```

---

### 7. Download ZAP (Core + Addons)

```bash
npm run download-zap -- -c <config-file>
```

Example:

```bash
npm run download-zap -- -c my-zap.yaml
```

---

### 8. Package Workspace (.tar.gz)

```bash
npm run package -- [-o <output-file>] [-n <package-name>] [-t <toml>]
```

Examples:

```bash
npm run package
npm run package -- -n my-zap
npm run package -- -o custom-name.tar.gz
npm run package -- -t ./config/default.toml   # Include default.toml
```

---

### 9. Package Workspace (.tar)

```bash
npm run package -- [-o <output-file>] [-t <toml>]
```

Example:

```bash
npm run package -- -o my-zap.tar
npm run package -- -o my-zap.tar -t ./config/default.toml
```

---

### 10. Unpack Package

```bash
npm run unpack -- -i <input.tar> [-o output-dir]
```

Example:

```bash
npm run unpack -- -i linux-zap.tar -o ./zap-install
```

---

## 11. Daemon Management

Manage ZAP as a background daemon.

### Node.js (PM2)

```bash
npm run daemon -- <subcommand> [options]
```

### Python (subprocess)

```bash
zap-downloader <subcommand> [options]
```

### Daemon Summary Table

| Subcommand | Purpose | Key Options |
|-----------|----------|-------------|
| `start` | Start ZAP daemon | `--dir`, `--workspace`, `--port`, `--api-key`, `--toml`, `--name` |
| `stop` | Stop the daemon process | `--name` |
| `log` | View logs | `--lines`, `--json`, `--follow` (Node), `-e`/`-b` (Python), `--name` |
| `status` | Show daemon status | `--json`, `--name` |
| `ping` | Check if host:port is reachable | `--host`, `--port`, `--json`, `--timeout` |
| `health` | Call `/core/view/version/` | `--host`, `--port` |
| `started` | Wait until ZAP responds | `--host`, `--port`, `--timeout` |

---

## Daemon Quick Reference Cheat Sheet

### Start daemon
```bash
# Node.js (npm)
npm run daemon -- start -d ./install -w ./workspace -P 8080

# Node.js (pnpm)
pnpm daemon:start -d ./install -w ./workspace -P 8080
pnpm daemon:start -t ./workspace/default.toml

# Python
python -m zap_downloader daemon start -d ./install -w ./workspace -P 8080
python -m zap_downloader daemon start -t ./workspace/default.toml
```

### Stop daemon
```bash
# Node.js (npm)
npm run daemon -- stop

# Node.js (pnpm)
pnpm daemon:stop

# Python
python -m zap_downloader daemon stop
```

### Logs (last 200 lines)
```bash
# Node.js (npm)
npm run daemon -- log --lines 200

# Node.js (pnpm)
pnpm daemon:log

# Python
python -m zap_downloader daemon log -n 200
```

### Logs - error only
```bash
# Node.js (npm)
npm run daemon -- log --err

# Node.js (pnpm)
pnpm daemon:log -e

# Python
python -m zap_downloader daemon log -e
```

### Stream logs (Node.js only)
```bash
npm run daemon -- log --follow
pnpm daemon:log -f
```

### Logs as JSON (Node.js only)
```bash
npm run daemon -- log --json
pnpm daemon:log --json
```

### Status
```bash
# Node.js (npm)
npm run daemon -- status

# Node.js (pnpm)
pnpm daemon:status

# Python
python -m zap_downloader daemon status
```

### Ping host:port
```bash
# Node.js (npm)
npm run daemon -- ping -H 127.0.0.1 -P 8080

# Node.js (pnpm)
pnpm daemon:ping -H 127.0.0.1 -P 8080

# Python
python -m zap_downloader daemon ping -H 127.0.0.1 -P 8080
```

### Health check
```bash
# Node.js (npm)
npm run daemon -- health

# Node.js (pnpm)
pnpm daemon:health

# Python
python -m zap_downloader daemon health
```

### Wait until ZAP is ready
```bash
# Node.js (npm)
npm run daemon -- started -P 8080 -T 60

# Node.js (pnpm)
pnpm daemon:started -P 8080 -T 60

# Python
python -m zap_downloader daemon started -P 8080 -T 60
```

---

## TOML Configuration Example

Use with:

```bash
# Node.js
npm run daemon -- start --toml ./zap.toml

# Python
zap-downloader daemon start --toml ./zap.toml
```

### `zap.toml`

```toml
[ENV]
ZAP_DOWNLOADER_WORKSPACE = "workspace"
ZAP_DOWNLOADER_DOWNLOADS = "downloads"
ZAP_DOWNLOADER_INSTALL   = "install"
ZAP_DOWNLOADER_PACKAGES  = "packages"
ZAP_DOWNLOADER_ZAP_HOME  = ".zap"

[SERVER]
PORT = 8080
HOST = "0.0.0.0"

[PATHS]
JAR_PATH = ""
DIR = ".zap"
INSTALL_DIR = "workspace/install"

[JAVA_OPTIONS]
flags = [
  "-Xms4g",
  "-Xmx4g",
  "-XX:+UseZGC",
  "-Xss512k",
  "-XX:+UseContainerSupport",
  "-XX:MaxRAMPercentage=80",
  "-Dzap.session=/zap/wrk/session.data"
]

[CONFIG]
flags = [
  "-config api.disablekey = true",
  "-config api.addrs.addr.name = .*",
  "-config api.addrs.addr.regex = true",
  "-config database.response.bodysize = 104857600",
  "-config database.cache.size = 1000000",
  "-config database.recoverylog = false"
]
```

---

## 12. Package (Python)

```bash
zap-downloader package [-o <output-file>] [-w <workspace>] [-t <toml>]
```

Example:

```bash
zap-downloader package -o my-zap.tar -t ./config/default.toml
```

---

## 13. Workspace Management

```bash
# Node.js
npm run workspace
npm run workspace --show

# Python
zap-downloader workspace
zap-downloader workspace ./my-workspace
```

---

## Directory Structure

```
zap-workspace/
├── zap/
│   ├── ZAP_2.17.0_windows.exe
│   └── ...
└── addons/
    ├── ascanrules-release-80.zap
    └── ...
```

---

## NPM Scripts (Node.js)

| Script | Description |
|--------|-------------|
| `pnpm run build` | Build TypeScript |
| `pnpm run start` | Run with ts-node |
| `pnpm run list` | List available versions |
| `pnpm run info` | Show addon info |
| `pnpm run core` | Download ZAP core |
| `pnpm run addons` | Download addons |
| `pnpm run create-config` | Create addon config interactively |
| `pnpm run create-zap-config` | Create full ZAP config |
| `pnpm run download-zap` | Download core + addons |
| `pnpm run package` | Package workspace |
| `pnpm run unpack` | Unpack archive |
| `pnpm run daemon` | Manage ZAP daemon |
| `pnpm run daemon:start` | Start daemon |
| `pnpm run daemon:stop` | Stop daemon |
| `pnpm run daemon:log` | View logs |
| `pnpm run daemon:status` | Show status |
| `pnpm run daemon:ping` | Ping daemon |
| `pnpm run daemon:health` | Health check |
| `pnpm run daemon:started` | Wait for daemon |
| `pnpm run workspace` | Manage workspace |

## Python Scripts

All commands use `zap-downloader` CLI:

```bash
zap-downloader <command> [options]
```

---

## Quick Start

### Step-by-step

```bash
npm run workspace
npm run create-config -- -o ./config/my-addons.yaml
npm run core -- -p windows
npm run addons -- -c ./config/my-addons.yaml
```

### All-in-one

```bash
npm run create-zap-config -- -o my-zap.yaml
npm run download-zap -- -c my-zap.yaml
npm run package -- -n my-zap
```

This produces:

- `my-zap.tar.gz` containing the full workspace

---

## 13. Offline Package

Create a complete offline ZAP package that can run without internet. Downloads the latest ZAP core and ALL addons (release + beta + alpha), disables auto-update, and packages everything.

### Pack Offline Package

```bash
# Node.js (npm)
npm run offline -- pack -o zap-offline.tar

# Node.js (pnpm)
pnpm offline:pack -o zap-offline.tar

# Python
python -m zap_downloader offline pack -o zap-offline.tar
```

Options:
- `-o`, `--output` - Output `.tar` archive path
- `-p`, `--platform` - Platform (linux, windows, mac)

### Unpack Offline Package

```bash
# Node.js (npm)
npm run offline -- unpack -i zap-offline.tar -o /opt/zap

# Node.js (pnpm)
pnpm offline:unpack -i zap-offline.tar -o /opt/zap

# Python
python -m zap_downloader offline unpack -i zap-offline.tar -o /opt/zap
```

Then start ZAP:
```bash
# Node.js
npm run daemon -- start -t /opt/zap/workspace/default.toml

# Python
python -m zap_downloader daemon start -t /opt/zap/workspace/default.toml
```

---

## Publishing

Both Node.js and Python packages are published via GitHub Actions when version tags are pushed.

### Publishing Node.js Package

1. Update version in `apps/zap-downloader-node/package.json`
2. Create a tag: `git tag node-v1.0.0 && git push origin node-v1.0.0`

The package will be published to npm automatically.

### Publishing Python Package

1. Update version in `apps/zap-downloader/pyproject.toml`
2. Create a tag: `git tag python-v1.0.0 && git push origin python-v1.0.0`

The package will be published to PyPI automatically.

### Required Secrets

- **npm**: Add `NPM_TOKEN` to GitHub secrets (from npmjs.com settings)
- **PyPI**: Uses OIDC trusted publishing (configure in PyPI project settings)


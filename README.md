
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
npm run package -- [-o <output-file>] [-n <package-name>]
```

Examples:

```bash
npm run package
npm run package -- -n my-zap
npm run package -- -o custom-name.tar.gz
```

---

### 9. Package Workspace (.tar)

```bash
npm run package -- [-o <output-file>]
```

Example:

```bash
npm run package -- -o my-zap.tar
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

## 11. Daemon Management (PM2)

Manage ZAP as a background daemon.

```bash
npm run daemon -- <subcommand> [options]
```

### Daemon Summary Table

| Subcommand | Purpose | Key Options |
|-----------|----------|-------------|
| `start-daemon` | Start ZAP as a PM2 daemon | `--dir`, `--workspace`, `--port`, `--api-key`, `--toml`, `--name` |
| `stop-daemon` | Stop the PM2 process | `--name` |
| `logs-daemon` | View logs | `--lines`, `--json`, `--follow`, `--name` |
| `status-daemon` | Show PM2 status | `--json`, `--name` |
| `ping-daemon` | Check if host:port is reachable | `--host`, `--port`, `--json`, `--timeout` |
| `health-daemon` | Call `/core/view/version/` | `--host`, `--port` |
| `check-started-daemon` | Wait until ZAP responds | `--host`, `--port`, `--timeout` |

---

## Daemon Quick Reference Cheat Sheet

### Start daemon
```bash
npm run daemon -- start-daemon -d ./install -w ./workspace -P 8080
```

### Stop daemon
```bash
npm run daemon -- stop-daemon
```

### Logs (last 200 lines)
```bash
npm run daemon -- logs-daemon --lines 200
```

### Stream logs
```bash
npm run daemon -- logs-daemon --follow
```

### Logs as JSON
```bash
npm run daemon -- logs-daemon --json
```

### Status
```bash
npm run daemon -- status-daemon
```

### Ping host:port
```bash
npm run daemon -- ping-daemon -H 127.0.0.1 -P 8080
```

### Health check
```bash
npm run daemon -- health-daemon
```

### Wait until ZAP is ready
```bash
npm run daemon -- check-started-daemon -P 8080 -T 60
```

---

## TOML Configuration Example

Use with:

```bash
npm run daemon -- start-daemon --toml ./zap.toml
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

## 12. Workspace Management

```bash
npm run workspace
npm run workspace --show
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

## NPM Scripts

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
| `pnpm run workspace` | Manage workspace |

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


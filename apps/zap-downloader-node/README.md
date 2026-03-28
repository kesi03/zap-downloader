# ZAP Downloader

CLI tool to download OWASP ZAP versions and addons with SHA-256 validation.

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

### Commands

#### 1. List Available Versions

```bash
npm run list                    # List all
npm run list -- --addons       # Addons only
npm run list -- --core         # Core only
```

#### 2. Show Addon Information

```bash
npm run info -- -a <addon-id>
```

Example:
```bash
npm run info -- -a ascanrules
```

#### 3. Download ZAP Core

```bash
npm run core -- -p <platform> [-o <output-dir>]
```

Platforms: `windows`, `windows32`, `linux`, `mac`, `daily`

Examples:
```bash
npm run core -- -p windows              # Downloads to <workspace>/zap/
npm run core -- -p linux -o ./custom    # Downloads to custom directory
npm run core -- -p daily                # Download weekly build
```

#### 4. Create Addon Config Interactively

```bash
npm run create-config -- [-s <status>] [-o <output-file>]
```

Options:
- `-s, --status` - Filter by status: `release` (default), `beta`, `alpha`, `all`
- `-o, --output` - Output config filename (default: `config.yaml`)

Examples:
```bash
npm run create-config                                    # Select release addons
npm run create-config -- -s all                         # Show all statuses
npm run create-config -- -s beta -o my-config.yaml      # Beta addons to file
```

#### 5. Download Addons

```bash
npm run addons -- -c <config-file> [-o <output-dir>]
```

Examples:
```bash
npm run addons -- -c ./config/config.yaml              # Downloads to <workspace>/addons/
npm run addons -- -c ./config.yaml -o ./custom-addons  # Custom output directory
```

#### 6. Create ZAP Config (Platform + Version + Addons)

Interactive wizard to create a complete ZAP configuration:

```bash
npm run create-zap-config -- [-s <status>] [-o <output-file>]
```

Options:
- `-s, --status` - Filter addons by status: `release` (default), `beta`, `alpha`, `all`
- `-o, --output` - Output config filename (default: `zap-config.yaml`)

Example:
```bash
npm run create-zap-config -- -o my-zap.yaml
```

This will prompt for:
1. Platform selection (windows, linux, mac, etc.)
2. Version selection (stable or daily)
3. Addon selection

#### 7. Download ZAP (Core + Addons)

Download both ZAP core and addons from a config file:

```bash
npm run download-zap -- -c <config-file>
```

Example:
```bash
npm run download-zap -- -c my-zap.yaml
```

#### 8. Package Workspace

Create a tar.gz archive of the workspace:

```bash
npm run package -- [-o <output-file>] [-n <package-name>]
```

Options:
- `-o, --output` - Output package filename
- `-n, --name` - Package name (without extension, adds .tar.gz)

Examples:
```bash
npm run package                               # Creates zap-package.tar.gz
npm run package -- -n my-zap                  # Creates my-zap.tar.gz
npm run package -- -o custom-name.tar.gz     # Creates custom-name.tar.gz
```

#### 9. Package Workspace

Create a `.tar` archive of the workspace:

```bash
npm run package -- [-o <output-file>]
```

Options:
- `-o, --output` - Output `.tar` archive path (default: `zap-package.tar`)

Example:
```bash
npm run package -- -o my-zap.tar
```

#### 10. Unpack Package

Unpack a `.tar` package and organize addons:

```bash
npm run unpack -- -i <input.tar> [-o output-dir]
```

Options:
- `-i`, `--input` - Path to the `.tar` package file (required)
- `-o`, `--output` - Output directory (default: extracted archive name)

Example:
```bash
npm run unpack -- -i linux-zap.tar -o ./zap-install
```

#### 11. Start/Stop Daemon

Start or stop ZAP as a daemon using pm2:

```bash
npm run daemon -- start-daemon [-d dir] [-w workspace] [-P port] [-k api-key]
npm run daemon -- stop-daemon
```

Options:
- `-d`, `--dir` - ZAP installation directory (where zap.jar is)
- `-w`, `--workspace` - Working directory
- `-P`, `--port` - Proxy port (default: 8080)
- `-k`, `--api-key` - API key (optional, defaults to disabled)
- `-N`, `--name` - Process name (default: zap-daemon)

Examples:
```bash
# Start daemon
npm run daemon -- start-daemon -d ./zap/ZAP_2.17.0 -w ./workspace -P 8080

# Stop daemon
npm run daemon -- stop-daemon
```

The daemon runs with:
- API key disabled (`api.disablekey=true`)
- All hosts allowed (`api.addrs.addr.name=.*`)

#### 12. Workspace Management

```bash
npm run workspace              # Create workspace and addons directory
npm run workspace --show      # Show current workspace path
```

---

## Configuration File Formats

### Addon-Only Config

```yaml
addons:
  - id: ascanrules
    status: release
  - id: pscan
    status: release
  - id: fuzz
output: ./addons  # optional - defaults to <workspace>/addons
```

### Full ZAP Config (with Platform + Version)

```yaml
zap:
  platform: linux
  version: 2.17.0
addons:
  - id: ascanrules
    status: release
  - id: pscan
    status: release
```

---

## Directory Structure

```
zap-workspace/           # Default workspace
├── zap/                 # ZAP core downloads
│   ├── ZAP_2.17.0_windows.exe
│   └── ...
└── addons/              # Addon downloads
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
| `pnpm run create-zap-config` | Create full ZAP config (platform + addons) |
| `pnpm run download-zap` | Download ZAP core and addons |
| `pnpm run package` | Package workspace as .tar archive |
| `pnpm run unpack` | Unpack archive and organize addons |
| `pnpm run daemon` | Start/stop ZAP daemon |
| `pnpm run workspace` | Manage workspace |

---

## Quick Start

### Option 1: Step by Step

```bash
# 1. Create workspace
npm run workspace

# 2. Create addon config interactively
npm run create-config -- -o ./config/my-addons.yaml

# 3. Download ZAP core
npm run core -- -p windows

# 4. Download addons
npm run addons -- -c ./config/my-addons.yaml
```

### Option 2: All-in-One

```bash
# 1. Create complete ZAP config (interactive)
npm run create-zap-config -- -o my-zap.yaml

# 2. Download everything
npm run download-zap -- -c my-zap.yaml

# 3. Package it
npm run package -- -n my-zap
```

This creates:
- `my-zap.tar.gz` containing the workspace with ZAP and addons

# OWASP ZAP Downloader

A Python CLI tool for downloading and managing OWASP ZAP core and addons.

## Installation

### From PyPI (coming soon)

```bash
pip install zap-downloader
```

### From Source

```bash
cd apps/zap-downloader
pip install -e .
```

## Setup

### Workspace

The default workspace is `zap-workspace` in the current directory. You can customize it using:

- `--workspace` / `-w` option on any command
- `ZAP_PACKAGES_WORKSPACE` environment variable

```bash
export ZAP_PACKAGES_WORKSPACE=/path/to/workspace
```

### Create Workspace

```bash
zap-downloader workspace /path/to/workspace
```

## Usage

### List Available Versions

Show all available ZAP core versions and addons:

```bash
zap-downloader list
```

Options:
- `--addons` / `-a` - Show addons only
- `--core` / `-c` - Show core versions only

### Get Addon Info

Get detailed information about a specific addon:

```bash
zap-downloader info <addon-id>
```

Example:
```bash
zap-downloader info commonlib
zap-downloader info ascanrules
```

### Download ZAP Core

Download ZAP core for a specific platform:

```bash
zap-downloader core -p <platform> [-o output-dir] [-w workspace]
```

Platforms: `windows`, `windows32`, `linux`, `mac`, `daily`

Example:
```bash
zap-downloader core -p windows
zap-downloader core -p linux -o ./zap-install
```

### Download Addons

Download addons by ID or from a config file:

```bash
zap-downloader addons [-c config-file] [addon-id ...] [-s status] [-w workspace] [-o output-dir]
```

Options:
- `-c`, `--config` - Path to YAML or JSON config file
- `-s`, `--status` - Filter by status: `release`, `beta`, `alpha`
- `-o`, `--output` - Output directory for addons

Examples:
```bash
# Download by addon IDs
zap-downloader addons commonlib pscanrules
zap-downloader addons ascanrulesBeta -s beta

# Download from config file
zap-downloader addons -c my-addons.yaml
zap-downloader addons -c config.json -o ./my-addons
```

Config file example (`addons.yaml`):
```yaml
addons:
  - id: commonlib
  - id: pscanrules
    status: release
output: ./addons
```

### Create Config Files

#### Create Addon Config

```bash
zap-downloader create-config -a <addon-id> [<addon-id> ...] [-o output.yaml] [-s status]
```

Example:
```bash
zap-downloader create-config -a commonlib pscanrules -o my-addons.yaml
```

#### Create ZAP Config (Core + Addons)

```bash
zap-downloader create-zap-config -p <platform> [-a <addon-id> ...] [-o output.yaml]
```

Example:
```bash
zap-downloader create-zap-config -p windows -a commonlib pscanrules
```

### Download from Config

Download ZAP core and addons from a config file:

```bash
zap-downloader download-zap -c <config-file> [-w workspace]
```

Example config (`zap-config.yaml`):
```yaml
zap:
  platform: windows
  version: 2.17.0
addons:
  - id: commonlib
  - id: pscanrules
  - id: ascanrules
    status: release
```

```bash
zap-downloader download-zap -c zap-config.yaml
```

### Validate File Hash

Validate a downloaded file's SHA256 hash against the XML data:

```bash
zap-downloader validate <file> [-a addon-id] [-p platform]
```

Options:
- `-a`, `--addon` - Compare against addon hash
- `-p`, `--platform` - Compare against core platform hash

Examples:
```bash
# Just show the file's SHA256
zap-downloader validate ./zap/ZAP_2_17_0_windows.exe

# Validate against platform
zap-downloader validate ./zap/ZAP_2_17_0_windows.exe --platform windows

# Validate against addon
zap-downloader validate ./addons/commonlib-release-1.40.0.zap --addon commonlib
```

### Package Directory

Package ZAP core and addons into a `.tar` archive:

```bash
zap-downloader package [-o output.tar] [-w workspace]
```

Example:
```bash
zap-downloader package -o ./release-package.tar
```

### Unpack Package

Unpack a `.tar` package and organize addons:

```bash
zap-downloader unpack -i <input.tar> [-o output-dir]
```

Options:
- `-i`, `--input` - Path to the `.tar` package file (required)
- `-o`, `--output` - Output directory (default: extracted archive name)

Example:
```bash
zap-downloader unpack -i linux-zap.tar -o ./zap-install
```

This command:
1. Extracts the `.tar` archive
2. Extracts any `.tar.gz` ZAP core archive inside
3. Moves addons to the `plugin` folder (if not already present)
4. Removes the empty `addons` folder

### Start/Stop Daemon

Start or stop ZAP as a daemon:

```bash
zap-downloader start-daemon [-d dir] [-w workspace] [-P port] [-k api-key]
zap-downloader stop-daemon [-w workspace]
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
zap-downloader start-daemon -d ./zap/ZAP_2.17.0 -w ./workspace -P 8080

# Stop daemon
zap-downloader stop-daemon
```

The daemon runs with:
- API key disabled (`api.disablekey=true`)
- All hosts allowed (`api.addrs.addr.name=.*`)

### Workspace Management

Create or show workspace directory:

```bash
zap-downloader workspace [path]
```

Examples:
```bash
# Show current workspace
zap-downloader workspace

# Create specific workspace
zap-downloader workspace ./my-workspace
```

## Global Options

- `-w`, `--workspace` - Workspace directory (default: `zap-workspace` or `ZAP_PACKAGES_WORKSPACE` env var)

## Project Structure

```
zap-downloader/
├── zap_downloader/
│   ├── cli.py              # Main CLI entry point
│   ├── types.py            # Data models
│   ├── parser.py           # XML parsing
│   ├── downloader.py       # File download
│   ├── workspace.py        # Workspace management
│   └── commands/           # CLI commands
│       ├── core.py
│       ├── addons.py
│       ├── list_versions.py
│       ├── info.py
│       ├── download_zap.py
│       ├── create_config.py
│       ├── create_zap_config.py
│       ├── package.py
│       ├── unpack.py
│       ├── validate.py
│       └── workspace.py
└── pyproject.toml
```

## Development

### Install Dev Dependencies

```bash
pip install -e ".[dev]"
```

### Run Tests

```bash
pytest
```

### Type Checking

```bash
mypy zap_downloader/
```

### Formatting

```bash
black zap_downloader/
```

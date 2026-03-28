# OWASP ZAP Downloader

CLI tools for downloading and managing OWASP ZAP core and addons.

## Versions

This project has two implementations:

| Version | Language | Location |
|---------|----------|----------|
| Python | Python 3.10+ | `apps/zap-downloader` |
| Node.js | TypeScript/Node.js | `apps/zap-downloader-node` |

## Features

- **List** available ZAP core versions and addons
- **Download** ZAP core for Windows, Linux, macOS
- **Download** addons by ID or from config file (YAML/JSON)
- **Create** config files for automated downloads
- **Package** workspace into a `.tar` archive
- **Unpack** archives and organize addons into the plugin folder
- **Start/Stop** ZAP daemon with pm2 (Node.js) or as background process (Python)
- **Validate** file hashes

## Quick Start

### Python Version

```bash
cd apps/zap-downloader
pip install -e .

zap-downloader list
zap-downloader core -p linux
zap-downloader addons -c config.yaml
zap-downloader package -o output.tar
zap-downloader unpack -i input.tar -o output/
```

### Node.js Version

```bash
cd apps/zap-downloader-node
npm install
npm run build

zap-downloader list
zap-downloader core -p linux
zap-downloader addons -c config.yaml
zap-downloader package -o output.tar
zap-downloader unpack -i input.tar -o output/
```

## Commands

| Command | Description |
|---------|-------------|
| `list` | List available ZAP versions and addons |
| `core` | Download ZAP core for a specific platform |
| `addons` | Download addons by ID or from config file |
| `info` | Show information about a specific addon |
| `create-config` | Interactive: create addon config file |
| `create-zap-config` | Create ZAP config with platform and addons |
| `download-zap` | Download ZAP core and addons from config |
| `package` | Package workspace into `.tar` archive |
| `unpack` | Unpack archive and move addons to plugin folder |
| `start-daemon` | Start ZAP as a daemon |
| `stop-daemon` | Stop ZAP daemon |
| `workspace` | Create or show workspace directory |

## Daemon

Both versions support starting ZAP as a daemon:

```bash
# Python
zap-downloader start-daemon -d /path/to/zap -w /path/to/workspace -P 8080
zap-downloader stop-daemon

# Node.js
zap-downloader daemon start-daemon -d /path/to/zap -w /path/to/workspace -P 8080
zap-downloader daemon stop-daemon
```

Options:
- `-d, --dir` - ZAP installation directory (where zap.jar is)
- `-w, --workspace` - Working directory
- `-P, --port` - Proxy port (default: 8080)
- `-k, --api-key` - API key (optional, defaults to disabled)
- `-N, --name` - Process name (default: zap-daemon)

The daemon runs with:
- API key disabled (`api.disablekey=true`)
- All hosts allowed (`api.addrs.addr.name=.*`)

## Config File Format

```yaml
# addons.yaml
addons:
  - id: commonlib
  - id: pscanrules
    status: release
  - id: ascanrulesBeta
    status: beta
output: ./addons
```

## Workspace

Default workspace is `zap-workspace` in the current directory. Override with:

```bash
zap-downloader -w /path/to/workspace <command>
```

Or set the `ZAP_PACKAGES_WORKSPACE` environment variable.

## Development

### Python

```bash
cd apps/zap-downloader
pip install -e ".[dev]"
pytest
mypy zap_downloader/
```

### Node.js

```bash
cd apps/zap-downloader-node
npm install
npm run build
```

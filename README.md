# lasso

```
  ██╗      █████╗ ███████╗███████╗ ██████╗ 
  ██║     ██╔══██╗██╔════╝██╔════╝██╔═══██╗
  ██║     ███████║███████╗███████╗██║   ██║
  ██║     ██╔══██║╚════██║╚════██║██║   ██║
  ███████╗██║  ██║███████║███████║╚██████╔╝
  ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝ ╚═════╝
```

A TUI (Terminal User Interface) for managing Cloudflare Wrangler configs in monorepos. Navigate between workers, environments, and quickly run dev servers or deploy.

## Installation

### Quick Install (Recommended)

```bash
curl -fsSL https://github.com/mattbidewell/lasso/releases/latest/download/install.sh | bash
```

The install script automatically detects your platform, downloads the matching binary, and installs it to a writable directory already on your `PATH` when possible. If it needs to use `~/.local/bin`, it will also update your shell profile for you.

### Install Options

```bash
# Install specific version
curl -fsSL https://github.com/mattbidewell/lasso/releases/latest/download/install.sh | bash -s -- --version v1.0.0

# Install to custom path
curl -fsSL https://github.com/mattbidewell/lasso/releases/latest/download/install.sh | bash -s -- --path /custom/path

# Use with GITHUB_TOKEN (to avoid rate limits)
GITHUB_TOKEN=your_token curl -fsSL https://github.com/mattbidewell/lasso/releases/latest/download/install.sh | bash
```

### Manual Download

Download the latest binary from [GitHub Releases](https://github.com/mattbidewell/lasso/releases) for your platform:

- **macOS (Apple Silicon)**: `lasso-darwin-arm64`
- **macOS (Intel)**: `lasso-darwin-x64`
- **Linux (x64)**: `lasso-linux-x64`
- **Linux (ARM64)**: `lasso-linux-arm64`

### Update / Upgrade

Update to the latest version:

```bash
lasso upgrade
# or
lasso update
```

Options:
- `--yes` / `-y`: Skip confirmation prompt
- Run the install script again to upgrade (auto-detects existing installation)

## Usage

Run `lasso` in any directory containing `wrangler.toml` or `wrangler.json` files:

```bash
cd your-monorepo
lasso
```

### Keybindings

| Key | Action |
|-----|--------|
| `j/k` or `↑/↓` | Navigate up/down |
| `Tab` | Cycle focus between panels |
| `Enter` | Start action |
| `g` / `G` | Jump to top / bottom |
| `q` | Quit |

### Debug Logging

Run with `--debug` to show a debug log window in the UI. This captures program
logs (runner logs excluded) and keeps the normal UI unchanged when the flag is
not used.

## Features

- Discover all `wrangler.toml` and `wrangler.json` files in your project
- Navigate between workers and environments
- Run `wrangler dev` with a single keypress
- Deploy to Cloudflare with confirmation modal
- View command output in real-time
- File watching for automatic refresh

## Development

```bash
# Install dependencies
bun install

# Run in development
bun dev

# Type check
bun run typecheck

# Build standalone binary (current platform)
bun run build
```

## License

MIT

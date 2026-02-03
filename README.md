# lasso

A TUI (Terminal User Interface) for managing Cloudflare Wrangler configs in monorepos. Navigate between workers, environments, and quickly run dev servers or deploy.

## Installation

### Quick Install (Recommended)

```bash
curl -sSL https://raw.githubusercontent.com/mattbidewell/lasso/main/install.sh | bash
```

### Homebrew (macOS/Linux)

```bash
brew install mattbidewell/tap/lasso
```

### npm / bun

```bash
npm install -g lasso
# or
bun install -g lasso
```

### Manual Download

Download the latest binary from [GitHub Releases](https://github.com/mattbidewell/lasso/releases) for your platform:

- **macOS (Apple Silicon)**: `lasso-darwin-arm64.tar.gz`
- **macOS (Intel)**: `lasso-darwin-x64.tar.gz`
- **Linux (x64)**: `lasso-linux-x64.tar.gz`
- **Linux (ARM64)**: `lasso-linux-arm64.tar.gz`
- **Windows**: `lasso-windows-x64.zip`

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
| `Enter` | Select / Run dev server |
| `Ctrl+D` | Deploy selected environment |
| `g` / `G` | Jump to top / bottom |
| `r` | Refresh configs |
| `q` | Quit |

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

# Build for npm distribution
bun run build

# Build standalone binary (current platform)
bun run build:binary

# Build release binaries (all platforms)
bun run build:release
```

## License

MIT

#!/usr/bin/env bash
set -euo pipefail

# Configuration
REPO="mattbidewell/lasso"
BASE_URL="https://api.github.com/repos/${REPO}/releases"

# Parse command line arguments
VERSION=""
INSTALL_PATH=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --version)
      VERSION="$2"
      shift 2
      ;;
    --path)
      INSTALL_PATH="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Usage: install.sh [--version <tag>] [--path <directory>]" >&2
      exit 1
      ;;
  esac
done

# Detect OS and architecture
os="$(uname -s)"
arch="$(uname -m)"

case "${os}" in
  Darwin) os="darwin" ;;
  Linux) os="linux" ;;
  *)
    echo "Error: Unsupported OS: ${os}" >&2
    echo "Lasso supports macOS and Linux only." >&2
    exit 1
    ;;
esac

case "${arch}" in
  arm64|aarch64) arch="arm64" ;;
  x86_64|amd64) arch="x64" ;;
  *)
    echo "Error: Unsupported architecture: ${arch}" >&2
    echo "Lasso supports arm64 and x64 architectures only." >&2
    exit 1
    ;;
esac

asset="lasso-${os}-${arch}"

# Build curl headers (support GITHUB_TOKEN for rate limit avoidance)
curl_opts=(-fsSL)
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  curl_opts+=(-H "Authorization: Bearer ${GITHUB_TOKEN}")
fi

# Detect existing installation
existing_version=""
existing_path=""
if command -v lasso >/dev/null 2>&1; then
  existing_path="$(command -v lasso)"
  existing_version=$(lasso --version 2>/dev/null | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' || echo "")
  if [[ -n "${existing_version}" ]]; then
    echo "Existing installation found: lasso ${existing_version} at ${existing_path}"
  fi
fi

# Fetch release info
if [[ -n "${VERSION}" ]]; then
  echo "Fetching release ${VERSION}..."
  release_url="${BASE_URL}/tags/${VERSION}"
else
  echo "Checking latest release..."
  release_url="${BASE_URL}/latest"
fi

release_info=$(curl "${curl_opts[@]}" "${release_url}" 2>&1) || {
  error_msg="$release_info"
  if echo "$error_msg" | grep -q "rate limit"; then
    echo "Error: GitHub API rate limit exceeded" >&2
    echo "Try again later or set GITHUB_TOKEN environment variable for authenticated requests." >&2
    echo "  export GITHUB_TOKEN=your_token" >&2
    echo "  curl -fsSL ... | bash" >&2
  else
    echo "Error: Failed to fetch release info from GitHub" >&2
    echo "Could not reach GitHub API. Check your internet connection." >&2
  fi
  exit 1
}

# Extract version from release
latest_version=$(echo "${release_info}" | grep -oE '"tag_name":\s*"[^"]+"' | head -1 | sed -E 's/.*"(v[^"]+)".*/\1/')

if [[ -z "${latest_version}" ]]; then
  echo "Error: Could not parse version from GitHub response" >&2
  exit 1
fi

# Check if already up to date
if [[ -n "${existing_version}" && "${existing_version}" == "${latest_version}" ]]; then
  echo "lasso ${existing_version} is already installed and up to date."
  exit 0
fi

# Determine install action
if [[ -n "${existing_version}" ]]; then
  echo "Upgrading lasso ${existing_version} -> ${latest_version}..."
else
  echo "Installing lasso ${latest_version}..."
fi

# Extract download URL
download_url=$(echo "${release_info}" | grep -Eo '"browser_download_url":\s*"[^"]+"' | sed -E 's/"browser_download_url":\s*"(.*)"/\1/' | grep "${asset}$" | head -n 1)

if [[ -z "${download_url}" ]]; then
  echo "Error: Could not find a release asset for ${asset}" >&2
  echo "Available assets may not include your platform (${os}-${arch})." >&2
  exit 1
fi

# Determine install directory
if [[ -n "${INSTALL_PATH}" ]]; then
  install_dir="${INSTALL_PATH}"
elif [[ -n "${existing_path}" ]]; then
  install_dir="$(dirname "${existing_path}")"
else
  install_dir="${HOME}/.local/bin"
  if [[ ! -d "${install_dir}" ]]; then
    mkdir -p "${install_dir}" 2>/dev/null || true
  fi
  if [[ ! -w "${install_dir}" ]]; then
    install_dir="/usr/local/bin"
  fi
fi

# Verify we can write to install directory
if [[ ! -d "${install_dir}" ]]; then
  mkdir -p "${install_dir}" 2>/dev/null || {
    echo "Error: Cannot create directory ${install_dir}" >&2
    echo "Try running with --path to specify a different location, or:" >&2
    echo "  mkdir -p ~/.local/bin" >&2
    echo "  curl -fsSL ... | bash" >&2
    exit 1
  }
fi

# Check write permissions
needs_sudo=false
if [[ ! -w "${install_dir}" ]]; then
  if [[ "${install_dir}" == "/usr/local/bin" ]]; then
    needs_sudo=true
  else
    echo "Error: Permission denied" >&2
    echo "Cannot write to ${install_dir}" >&2
    echo "" >&2
    echo "Options:" >&2
    echo "  1. Create ~/.local/bin and ensure it's in your PATH:" >&2
    echo "     mkdir -p ~/.local/bin" >&2
    echo "  2. Run with sudo for /usr/local/bin:" >&2
    echo "     curl -fsSL ... | sudo bash" >&2
    echo "  3. Specify a custom path:" >&2
    echo "     curl -fsSL ... | bash -s -- --path /your/path" >&2
    exit 1
  fi
fi

# Download binary
echo "Downloading lasso ${latest_version} for ${os}-${arch}..."
tmp="$(mktemp)"
trap 'rm -f "${tmp}"' EXIT

curl "${curl_opts[@]}" "${download_url}" -o "${tmp}" || {
  echo "Error: Failed to download binary" >&2
  echo "Check your internet connection and try again." >&2
  exit 1
}

chmod +x "${tmp}"

# Install binary
target_path="${install_dir}/lasso"
if [[ "${needs_sudo}" == "true" ]]; then
  echo "Installing to ${target_path} (requires sudo)..."
  sudo mv "${tmp}" "${target_path}"
else
  echo "Installing to ${target_path}..."
  mv "${tmp}" "${target_path}"
fi

# Success message
if [[ -n "${existing_version}" ]]; then
  echo "Successfully upgraded to lasso ${latest_version}"
else
  echo "Successfully installed lasso ${latest_version}"
  echo ""
  echo "Run 'lasso' to get started."
fi

# Check if in PATH
if ! command -v lasso >/dev/null 2>&1; then
  echo ""
  echo "Note: ${install_dir} is not in your PATH."
  echo "Add it to your shell profile:"
  echo "  export PATH=\"${install_dir}:\$PATH\""
fi

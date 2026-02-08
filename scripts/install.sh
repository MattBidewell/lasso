#!/usr/bin/env bash
set -euo pipefail

BASE="https://api.github.com/repos/mattbidewell/lasso/releases/latest"

os="$(uname -s)"
arch="$(uname -m)"

case "${os}" in
  Darwin) os="darwin" ;;
  Linux) os="linux" ;;
  *) echo "Unsupported OS: ${os}"; exit 1 ;;
esac

case "${arch}" in
  arm64|aarch64) arch="arm64" ;;
  x86_64|amd64) arch="x64" ;;
  *) echo "Unsupported architecture: ${arch}"; exit 1 ;;
esac

asset="lasso-${os}-${arch}"

download_url=$(curl -fsSL "${BASE}" | grep -Eo '"browser_download_url":\s*"[^"]+"' | sed -E 's/"browser_download_url":\s*"(.*)"/\1/' | grep "${asset}$" | head -n 1)

if [[ -z "${download_url}" ]]; then
  echo "Could not find a release asset for ${asset}" >&2
  exit 1
fi

install_dir="${HOME}/.local/bin"
if [[ ! -w "${install_dir}" ]]; then
  install_dir="/usr/local/bin"
fi

mkdir -p "${install_dir}"

tmp="$(mktemp)"
curl -fsSL "${download_url}" -o "${tmp}"
chmod +x "${tmp}"

if [[ "${install_dir}" == "/usr/local/bin" && ! -w "${install_dir}" ]]; then
  sudo mv "${tmp}" "${install_dir}/lasso"
else
  mv "${tmp}" "${install_dir}/lasso"
fi

echo "Installed lasso to ${install_dir}/lasso"

if ! command -v lasso >/dev/null 2>&1; then
  echo "Add ${install_dir} to your PATH to use lasso."
fi

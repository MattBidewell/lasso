#!/usr/bin/env bash
set -euo pipefail

REPO="mattbidewell/lasso"
BASE_URL="https://api.github.com/repos/${REPO}/releases"

VERSION=""
INSTALL_PATH=""

needs_sudo=false
needs_path_update=false
path_config_status=""
shell_name=""
shell_profile=""
shell_reload_hint=""

usage() {
  echo "Usage: install.sh [--version <tag>] [--path <directory>]" >&2
}

fail() {
  echo "Error: $1" >&2
  exit 1
}

normalize_dir() {
  local dir="$1"

  while [[ "${dir}" != "/" && "${dir}" == */ ]]; do
    dir="${dir%/}"
  done

  printf '%s\n' "${dir}"
}

path_has_dir() {
  local needle
  local entry

  needle="$(normalize_dir "$1")"
  IFS=':' read -r -a path_entries <<< "${PATH:-}"

  for entry in "${path_entries[@]}"; do
    [[ -z "${entry}" ]] && continue
    if [[ "$(normalize_dir "${entry}")" == "${needle}" ]]; then
      return 0
    fi
  done

  return 1
}

can_prepare_without_sudo() {
  local dir="$1"

  if [[ -d "${dir}" ]]; then
    [[ -w "${dir}" ]]
    return
  fi

  mkdir -p "${dir}" 2>/dev/null || return 1
  [[ -w "${dir}" ]]
}

is_sudo_install_dir() {
  case "$1" in
    /usr/local/bin|/opt/homebrew/bin)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

detect_shell_profile() {
  shell_name="$(basename "${SHELL:-sh}")"

  case "${shell_name}" in
    zsh)
      shell_profile="${HOME}/.zprofile"
      shell_reload_hint="exec zsh -l"
      ;;
    bash)
      if [[ "$(uname -s)" == "Darwin" ]]; then
        shell_profile="${HOME}/.bash_profile"
      else
        shell_profile="${HOME}/.profile"
      fi
      shell_reload_hint="source ${shell_profile}"
      ;;
    fish)
      shell_profile="${HOME}/.config/fish/config.fish"
      shell_reload_hint="source ${shell_profile}"
      ;;
    *)
      shell_profile="${HOME}/.profile"
      shell_reload_hint="source ${shell_profile}"
      ;;
  esac
}

configure_path() {
  local install_dir="$1"
  local marker
  local profile_dir

  if [[ -n "${INSTALL_PATH}" ]]; then
    path_config_status="manual-required"
    return 1
  fi

  case "${install_dir}" in
    "${HOME}"/*) ;;
    *)
      path_config_status="manual-required"
      return 1
      ;;
  esac

  detect_shell_profile
  profile_dir="$(dirname "${shell_profile}")"
  mkdir -p "${profile_dir}" 2>/dev/null || {
    path_config_status="manual-required"
    return 1
  }

  marker="# Added by lasso installer for ${install_dir}"

  if [[ -f "${shell_profile}" ]] && grep -Fqs "${marker}" "${shell_profile}"; then
    path_config_status="already-configured"
    return 0
  fi

  if [[ "${shell_name}" == "fish" ]]; then
    {
      printf '\n%s\n' "${marker}"
      printf 'fish_add_path "%s"\n' "${install_dir}"
    } >> "${shell_profile}" || {
      path_config_status="manual-required"
      return 1
    }
  else
    {
      printf '\n%s\n' "${marker}"
      printf 'export PATH="%s:$PATH"\n' "${install_dir}"
    } >> "${shell_profile}" || {
      path_config_status="manual-required"
      return 1
    }
  fi

  path_config_status="updated"
  return 0
}

choose_install_dir() {
  local candidate

  if [[ -n "${INSTALL_PATH}" ]]; then
    printf '%s\n' "$(normalize_dir "${INSTALL_PATH}")"
    return
  fi

  if [[ -n "${existing_path}" ]]; then
    printf '%s\n' "$(normalize_dir "$(dirname "${existing_path}")")"
    return
  fi

  for candidate in "${HOME}/.local/bin" "${HOME}/bin" "/opt/homebrew/bin" "/usr/local/bin"; do
    if path_has_dir "${candidate}" && can_prepare_without_sudo "${candidate}"; then
      printf '%s\n' "$(normalize_dir "${candidate}")"
      return
    fi
  done

  if can_prepare_without_sudo "${HOME}/.local/bin"; then
    printf '%s\n' "${HOME}/.local/bin"
    return
  fi

  for candidate in "/opt/homebrew/bin" "/usr/local/bin"; do
    if path_has_dir "${candidate}"; then
      printf '%s\n' "${candidate}"
      return
    fi
  done

  printf '%s\n' "${HOME}/.local/bin"
}

extract_version() {
  local value="$1"
  local version

  version=$(printf '%s\n' "${value}" | grep -oE 'v?[0-9]+\.[0-9]+\.[0-9]+' | head -n 1 || true)
  if [[ -n "${version}" && "${version}" != v* ]]; then
    version="v${version}"
  fi

  printf '%s\n' "${version}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      [[ $# -ge 2 ]] || fail "Missing value for --version"
      VERSION="$2"
      shift 2
      ;;
    --path)
      [[ $# -ge 2 ]] || fail "Missing value for --path"
      INSTALL_PATH="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

os="$(uname -s)"
arch="$(uname -m)"

case "${os}" in
  Darwin) os="darwin" ;;
  Linux) os="linux" ;;
  *)
    fail "Unsupported OS: ${os}. Lasso supports macOS and Linux only."
    ;;
esac

case "${arch}" in
  arm64|aarch64) arch="arm64" ;;
  x86_64|amd64) arch="x64" ;;
  *)
    fail "Unsupported architecture: ${arch}. Lasso supports arm64 and x64 only."
    ;;
esac

asset="lasso-${os}-${arch}"

curl_opts=(-fsSL -H "Accept: application/vnd.github+json")
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  curl_opts+=(-H "Authorization: Bearer ${GITHUB_TOKEN}")
fi

existing_version=""
existing_path=""
if command -v lasso >/dev/null 2>&1; then
  existing_path="$(command -v lasso)"
  existing_version="$(extract_version "$(${existing_path} --version 2>/dev/null || true)")"
  if [[ -n "${existing_version}" ]]; then
    echo "Existing installation found: lasso ${existing_version} at ${existing_path}"
  fi
fi

if [[ -n "${VERSION}" ]]; then
  echo "Fetching release ${VERSION}..."
  release_url="${BASE_URL}/tags/${VERSION}"
else
  echo "Checking latest release..."
  release_url="${BASE_URL}/latest"
fi

release_info=$(curl "${curl_opts[@]}" "${release_url}" 2>&1) || {
  error_msg="$release_info"
  if printf '%s\n' "${error_msg}" | grep -qi "rate limit"; then
    echo "Error: GitHub API rate limit exceeded" >&2
    echo "Try again later or set GITHUB_TOKEN for authenticated requests." >&2
    echo "  export GITHUB_TOKEN=your_token" >&2
  else
    echo "Error: Failed to fetch release info from GitHub" >&2
    echo "Could not reach GitHub API or the requested version does not exist." >&2
  fi
  exit 1
}

tag_name=$(printf '%s\n' "${release_info}" | grep -oE '"tag_name":\s*"[^"]+"' | head -n 1 | sed -E 's/.*"tag_name":[[:space:]]*"([^"]+)".*/\1/')
[[ -n "${tag_name}" ]] || fail "Could not parse release version from GitHub response"

latest_version="$(extract_version "${tag_name}")"
[[ -n "${latest_version}" ]] || fail "Could not parse version from tag: ${tag_name}"

if [[ -n "${existing_version}" && "${existing_version}" == "${latest_version}" ]]; then
  echo "lasso ${existing_version} is already installed and up to date."
  exit 0
fi

if [[ -n "${existing_version}" ]]; then
  echo "Upgrading lasso ${existing_version} -> ${latest_version}..."
else
  echo "Installing lasso ${latest_version}..."
fi

download_url="https://github.com/${REPO}/releases/download/${tag_name}/${asset}"
install_dir="$(choose_install_dir)"

if [[ ! -d "${install_dir}" ]]; then
  mkdir -p "${install_dir}" 2>/dev/null || {
    echo "Error: Cannot create directory ${install_dir}" >&2
    echo "Try one of these options:" >&2
    echo "  1. Create ~/.local/bin manually" >&2
    echo "  2. Re-run with --path /your/path" >&2
    echo "  3. Re-run with sudo if installing to a system directory" >&2
    exit 1
  }
fi

if [[ ! -w "${install_dir}" ]]; then
  if is_sudo_install_dir "${install_dir}"; then
    needs_sudo=true
  else
    echo "Error: Permission denied" >&2
    echo "Cannot write to ${install_dir}" >&2
    echo "Try one of these options:" >&2
    echo "  1. Re-run with --path /your/path" >&2
    echo "  2. Create ~/.local/bin manually and re-run" >&2
    echo "  3. Re-run with sudo for /usr/local/bin or /opt/homebrew/bin" >&2
    exit 1
  fi
fi

if ! path_has_dir "${install_dir}"; then
  needs_path_update=true
fi

echo "Downloading lasso ${latest_version} for ${os}-${arch}..."
tmp="$(mktemp)"
trap 'rm -f "${tmp}"' EXIT

curl "${curl_opts[@]}" "${download_url}" -o "${tmp}" || {
  echo "Error: Failed to download binary package for ${asset}" >&2
  echo "Expected URL: ${download_url}" >&2
  exit 1
}

chmod 0755 "${tmp}"

target_path="${install_dir}/lasso"
if [[ "${needs_sudo}" == "true" ]]; then
  echo "Installing to ${target_path} (requires sudo)..."
  sudo install -m 0755 "${tmp}" "${target_path}"
else
  echo "Installing to ${target_path}..."
  install -m 0755 "${tmp}" "${target_path}"
fi

installed_version="$("${target_path}" --version 2>/dev/null || true)"
[[ -n "${installed_version}" ]] || fail "Install completed, but ${target_path} did not return a version"

if [[ "${needs_path_update}" == "true" ]]; then
  configure_path "${install_dir}" || true
fi

if [[ -n "${existing_version}" ]]; then
  echo "Successfully upgraded to ${installed_version}"
else
  echo "Successfully installed ${installed_version}"
fi
echo "Installed path: ${target_path}"

if [[ "${needs_path_update}" == "true" ]]; then
  echo ""
  case "${path_config_status}" in
    updated)
      echo "Added ${install_dir} to your PATH in ${shell_profile}."
      echo "Open a new terminal or run:"
      echo "  ${shell_reload_hint}"
      ;;
    already-configured)
      echo "${install_dir} is already configured in ${shell_profile}."
      echo "If this shell was opened before installation, run:"
      echo "  ${shell_reload_hint}"
      ;;
    *)
      echo "Note: ${install_dir} is not currently on your PATH."
      echo "Add it manually with:"
      if [[ "${shell_name}" == "fish" ]]; then
        echo "  fish_add_path ${install_dir}"
      else
        echo "  export PATH=\"${install_dir}:\$PATH\""
      fi
      ;;
  esac
fi

echo ""
echo "Then refresh command lookup if needed:"
echo "  hash -r 2>/dev/null || true"
echo "Run 'lasso --version' to verify the install."

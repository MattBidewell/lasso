import { writeFileSync, unlinkSync, renameSync, chmodSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createInterface } from "node:readline"

const GITHUB_API = "https://api.github.com/repos/mattbidewell/lasso/releases/latest"

// Types per data-model.md
interface Asset {
  name: string
  browser_download_url: string
  size: number
  content_type: string
}

interface ReleaseInfo {
  tag_name: string
  name: string
  body: string
  assets: Asset[]
  created_at: string
  draft: boolean
  prerelease: boolean
}

interface VersionInfo {
  current: string
  latest: string
  needsUpgrade: boolean
}

interface UpgradeOptions {
  check?: boolean
  force?: boolean
  yes?: boolean
}

/**
 * Get the current platform asset name
 */
function getPlatformAsset(): string {
  const platform = process.platform
  const arch = process.arch

  const os = platform === "darwin" ? "darwin" : platform === "linux" ? "linux" : null
  const cpu = arch === "arm64" ? "arm64" : arch === "x64" ? "x64" : null

  if (!os || !cpu) {
    throw new Error(`Unsupported platform: ${platform} ${arch}`)
  }

  return `lasso-${os}-${cpu}`
}

/**
 * Get headers for GitHub API requests
 */
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "lasso-upgrade",
  }

  const token = process.env.GITHUB_TOKEN
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  return headers
}

/**
 * Check for updates by comparing current version against latest release
 */
export async function checkForUpdates(): Promise<VersionInfo> {
  const current = process.env.LASSO_VERSION ?? "0.0.0"

  const response = await fetch(GITHUB_API, { headers: getHeaders() })

  if (!response.ok) {
    if (response.status === 403) {
      const rateLimitRemaining = response.headers.get("x-ratelimit-remaining")
      if (rateLimitRemaining === "0") {
        throw new Error(
          "GitHub API rate limit exceeded\n" +
          "Try again later or set GITHUB_TOKEN environment variable."
        )
      }
    }
    throw new Error(`Failed to check for updates: ${response.statusText}`)
  }

  const release = await response.json() as ReleaseInfo
  const latest = release.tag_name.replace(/^v/, "")

  return {
    current,
    latest,
    needsUpgrade: current !== latest,
  }
}

/**
 * Download binary to a temporary file
 */
async function downloadBinary(release: ReleaseInfo): Promise<string> {
  const assetName = getPlatformAsset()
  const asset = release.assets.find(a => a.name === assetName)

  if (!asset) {
    throw new Error(
      `No binary available for your platform (${assetName})\n` +
      `Available assets: ${release.assets.map(a => a.name).join(", ")}`
    )
  }

  console.log(`Downloading lasso v${release.tag_name.replace(/^v/, "")}...`)

  const response = await fetch(asset.browser_download_url, {
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to download binary: ${response.statusText}`)
  }

  const buffer = await response.arrayBuffer()
  const tmpPath = join(tmpdir(), `lasso-upgrade-${Date.now()}`)

  writeFileSync(tmpPath, Buffer.from(buffer))
  chmodSync(tmpPath, 0o755)

  return tmpPath
}

/**
 * Replace current binary with new one, with rollback on failure
 */
async function replaceBinary(tmpPath: string): Promise<void> {
  // Find current binary location
  const currentPath = process.execPath

  // Create backup path
  const backupPath = `${currentPath}.bak`

  try {
    // Rename current to backup
    renameSync(currentPath, backupPath)

    try {
      // Move new binary to target location
      renameSync(tmpPath, currentPath)

      // Remove backup on success
      try {
        unlinkSync(backupPath)
      } catch {
        // Ignore cleanup errors
      }
    } catch (installError) {
      // Rollback: restore from backup
      console.error("Error: Installation failed, rolling back...")
      try {
        renameSync(backupPath, currentPath)
      } catch {
        console.error(`Warning: Could not restore backup from ${backupPath}`)
      }
      throw installError
    }
  } catch (error) {
    // Clean up temp file
    try {
      unlinkSync(tmpPath)
    } catch {
      // Ignore cleanup errors
    }

    if (error instanceof Error && error.message.includes("EACCES")) {
      throw new Error(
        "Permission denied\n" +
        `Cannot write to ${currentPath}\n` +
        "Try running with sudo or install to ~/.local/bin"
      )
    }

    throw error
  }
}

/**
 * Prompt user for confirmation
 */
async function promptConfirm(message: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(`${message} [Y/n]: `, (answer) => {
      rl.close()
      const normalized = answer.trim().toLowerCase()
      resolve(normalized === "" || normalized === "y" || normalized === "yes")
    })
  })
}

/**
 * Main upgrade function
 */
export async function upgrade(options: UpgradeOptions = {}): Promise<number> {
  try {
    console.log("Checking for updates...")

    const { current, latest, needsUpgrade } = await checkForUpdates()

    // Check mode: just display version info
    if (options.check) {
      if (needsUpgrade) {
        console.log(`lasso v${current} (installed)`)
        console.log(`lasso v${latest} (available)`)
        console.log("")
        console.log("Run 'lasso upgrade' to update.")
      } else {
        console.log(`lasso v${current} (latest)`)
      }
      return 0
    }

    // Already on latest version
    if (!needsUpgrade && !options.force) {
      console.log(`lasso v${current} is already the latest version.`)
      return 0
    }

    // Confirm upgrade unless --yes flag
    if (!options.yes) {
      console.log(`lasso v${latest} is available (current: v${current})`)
      const confirmed = await promptConfirm("Upgrade?")
      if (!confirmed) {
        console.log("Upgrade cancelled.")
        return 2
      }
    }

    // Fetch release info for download
    const response = await fetch(GITHUB_API, { headers: getHeaders() })
    if (!response.ok) {
      throw new Error(`Failed to fetch release info: ${response.statusText}`)
    }
    const release = await response.json() as ReleaseInfo

    // Download and install
    const tmpPath = await downloadBinary(release)
    await replaceBinary(tmpPath)

    console.log(`Successfully upgraded to lasso v${latest}`)
    return 0
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`)
    } else {
      console.error("Error: An unexpected error occurred")
    }
    return 1
  }
}

/**
 * Parse upgrade command arguments and run
 */
export async function runUpgradeCommand(args: string[]): Promise<number> {
  const options: UpgradeOptions = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case "--check":
      case "-c":
        options.check = true
        break
      case "--force":
      case "-f":
        options.force = true
        break
      case "--yes":
      case "-y":
        options.yes = true
        break
      case "--help":
      case "-h":
        console.log("Usage: lasso upgrade [options]")
        console.log("")
        console.log("Options:")
        console.log("  -c, --check   Check for updates without installing")
        console.log("  -f, --force   Force upgrade even if already on latest")
        console.log("  -y, --yes     Skip confirmation prompt")
        console.log("  -h, --help    Show this help message")
        return 0
      default:
        console.error(`Unknown option: ${arg}`)
        console.error("Run 'lasso upgrade --help' for usage.")
        return 1
    }
  }

  return upgrade(options)
}

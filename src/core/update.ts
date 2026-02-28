import { createWriteStream, existsSync, promises as fs } from "node:fs";
import { access } from "node:fs/promises";
import { chmod } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { tmpdir } from "node:os";
import { createInterface } from "node:readline";
import { getVersion } from "./version.ts";

const REPO = "mattbidewell/lasso";
const API_BASE = `https://api.github.com/repos/${REPO}`;

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

export interface ReleaseInfo {
  tag_name: string;
  assets: ReleaseAsset[];
}

export async function checkForUpdate(): Promise<string | null> {
  try {
    const release = await fetchLatestRelease();
    const latest = normalizeVersion(release.tag_name);
    const current = normalizeVersion(getVersion());
    if (compareVersions(latest, current) > 0) {
      return `Update available: v${latest} → run lasso update`;
    }
  } catch {
    return null;
  }

  return null;
}

export async function runUpdate(assumeYes: boolean): Promise<void> {
  const release = await fetchLatestRelease();
  const latest = normalizeVersion(release.tag_name);
  const current = normalizeVersion(getVersion());

  if (compareVersions(latest, current) <= 0) {
    console.log(`lasso is up to date (v${current})`);
    return;
  }

  if (!assumeYes) {
    const ok = await confirm(`Update to v${latest}? (y/N) `);
    if (!ok) {
      console.log("Update cancelled.");
      return;
    }
  }

  const targetPath = await resolveInstallPath();
  const asset = selectAsset(release.assets);
  if (!asset) {
    throw new Error("No compatible release asset found for this platform.");
  }

  const tempPath = path.join(tmpdir(), asset.name);
  await downloadFile(asset.browser_download_url, tempPath);

  try {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.copyFile(tempPath, targetPath);
    await chmod(targetPath, 0o755);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("EACCES") || message.includes("permission")) {
      throw new Error(
        `Permission denied.\n` +
        `Cannot write to ${targetPath}\n` +
        `Try running with sudo or install to ~/.local/bin`
      );
    }
    throw new Error(`Failed to install update: ${message}`);
  }

  console.log(`Updated to v${latest} at ${targetPath}`);
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "User-Agent": "lasso",
    "Accept": "application/vnd.github+json",
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

async function fetchLatestRelease(): Promise<ReleaseInfo> {
  const response = await fetch(`${API_BASE}/releases/latest`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    if (response.status === 403) {
      const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
      if (rateLimitRemaining === "0") {
        throw new Error(
          "GitHub API rate limit exceeded.\n" +
          "Try again later or set GITHUB_TOKEN environment variable."
        );
      }
    }
    throw new Error(`Failed to fetch release info: ${response.status}`);
  }

  return response.json() as Promise<ReleaseInfo>;
}

function normalizeVersion(version: string): string {
  return version.replace(/^v/, "");
}

function compareVersions(a: string, b: string): number {
  const parse = (v: string) => v.split(".").map((n) => Number(n));
  const [a1 = 0, a2 = 0, a3 = 0] = parse(a);
  const [b1 = 0, b2 = 0, b3 = 0] = parse(b);

  if (a1 !== b1) return a1 - b1;
  if (a2 !== b2) return a2 - b2;
  return a3 - b3;
}

function getPlatform(): { os: string; arch: string } {
  const platform = process.platform;
  const arch = process.arch;

  const os = platform === "darwin" ? "darwin" : platform === "linux" ? "linux" : "unknown";
  const cpu = arch === "arm64" ? "arm64" : arch === "x64" ? "x64" : "unknown";

  return { os, arch: cpu };
}

function selectAsset(assets: ReleaseAsset[]): ReleaseAsset | undefined {
  const { os, arch } = getPlatform();
  if (os === "unknown" || arch === "unknown") return undefined;
  const name = `lasso-${os}-${arch}`;
  return assets.find((asset) => asset.name === name);
}

async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url, { headers: getHeaders() });
  if (!response.ok || !response.body) {
    throw new Error(`Download failed: ${response.status}`);
  }

  await pipeline(response.body as unknown as NodeJS.ReadableStream, createWriteStream(outputPath));
}

async function resolveInstallPath(): Promise<string> {
  const current = process.argv[0] ?? "";
  if (current && looksLikeLasso(current) && existsSync(current)) {
    return current;
  }

  const fromPath = await findInPath("lasso");
  if (fromPath) return fromPath;

  const localBin = path.join(getHomeDir(), ".local", "bin", "lasso");
  return localBin;
}

function looksLikeLasso(executable: string): boolean {
  return path.basename(executable).toLowerCase().includes("lasso");
}

async function findInPath(binary: string): Promise<string | null> {
  const paths = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  for (const dir of paths) {
    const fullPath = path.join(dir, binary);
    try {
      await access(fullPath);
      return fullPath;
    } catch {
      continue;
    }
  }
  return null;
}

function getHomeDir(): string {
  return process.env.HOME || process.env.USERPROFILE || ".";
}

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => rl.question(message, resolve));
  rl.close();
  return answer.trim().toLowerCase() === "y";
}

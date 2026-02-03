import Anser from "anser";
import type { OutputLine, OutputSegment } from "../types.ts";

type AnserSegment = {
  content?: string;
  fg?: string | null;
  bg?: string | null;
  decoration?: string | Record<string, boolean> | null;
  bold?: boolean;
  underline?: boolean;
};

export function parseAnsiLine(raw: string, ansiEnabled: boolean): OutputLine {
  const cleaned = stripNonSgrSequences(raw).replace(/\r/g, "");

  if (!ansiEnabled) {
    return {
      raw: cleaned,
      segments: [{ text: cleaned }],
    };
  }

  const parsed = Anser.ansiToJson(cleaned, { use_classes: false, remove_empty: true }) as AnserSegment[];
  const segments: OutputSegment[] = [];

  for (const segment of parsed) {
    const text = segment.content ?? "";
    if (!text) continue;

    const fg = normalizeColor(segment.fg ?? undefined);
    const bg = normalizeColor(segment.bg ?? undefined);
    const bold = segment.bold === true || hasDecoration(segment.decoration, "bold");
    const underline = segment.underline === true || hasDecoration(segment.decoration, "underline");

    segments.push({
      text,
      fg,
      bg,
      bold,
      underline,
    });
  }

  if (segments.length === 0) {
    segments.push({ text: cleaned });
  }

  return { raw: cleaned, segments };
}

function hasDecoration(
  decoration: AnserSegment["decoration"],
  key: "bold" | "underline",
): boolean {
  if (!decoration) return false;
  if (typeof decoration === "string") return decoration.includes(key);
  return Boolean(decoration[key]);
}

function normalizeColor(value?: string | null): string | undefined {
  if (!value) return undefined;
  if (value === "default" || value === "transparent") return undefined;
  if (value.startsWith("#")) return value;
  if (value.startsWith("rgb(")) {
    const match = value.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return value;
    return rgbToHex(Number(match[1]), Number(match[2]), Number(match[3]));
  }
  return value;
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function stripNonSgrSequences(value: string): string {
  // Strip OSC sequences
  let output = value.replace(/\u001b\][^\u0007]*\u0007/g, "");

  // Strip CSI sequences except SGR (ending with 'm')
  output = output.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, (match) =>
    match.endsWith("m") ? match : ""
  );

  return output;
}

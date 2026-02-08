import clipboardy from "clipboardy";

export async function copyToClipboard(value: string): Promise<void> {
  await clipboardy.write(value);
}

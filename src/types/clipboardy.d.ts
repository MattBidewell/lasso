declare module "clipboardy" {
  export function write(value: string): Promise<void>;
  const clipboardy: { write: typeof write };
  export default clipboardy;
}

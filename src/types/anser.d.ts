declare module "anser" {
  interface AnserOptions {
    use_classes?: boolean;
    remove_empty?: boolean;
  }

  interface AnserModule {
    ansiToJson: (input: string, options?: AnserOptions) => unknown[];
  }

  const Anser: AnserModule;
  export default Anser;
}

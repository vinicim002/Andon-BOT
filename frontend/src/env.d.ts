// Data do build, injetada pelo Vite (vite.config.ts) e exibida como versão no login.
declare const __BUILD_DATE__: string;

interface ImportMetaEnv {
  // 'true' libera o atalho de login da conta de demonstração em deploys de feira
  // e apresentação. Ausente ou diferente disso, o botão não existe no build.
  readonly VITE_DEMO_ACCESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

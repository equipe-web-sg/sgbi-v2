import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Nomes de 1 caractere (variáveis, parâmetros, propriedades...) dificultam a leitura: use nomes
  // inteiros. `_` marca o que não é usado; A, B e C são as classes da Curva ABC. APIs de
  // bibliotecas com nomes curtos (ex.: `r` do Recharts) usam `eslint-disable-next-line id-length`.
  {
    rules: {
      "id-length": ["error", { min: 2, exceptions: ["_", "A", "B", "C"], properties: "always" }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Skills instaladas (npx skills): conteúdo de terceiros, não é código do projeto.
    ".claude/**",
  ]),
]);

export default eslintConfig;

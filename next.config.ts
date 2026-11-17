import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera `.next/standalone` (servidor mínimo com só os arquivos usados) para a imagem
  // Docker e para o instalador Windows. Nada de configuração por cliente aqui: a mesma
  // imagem atende todos, e o que muda (banco, API, slug) vem de variáveis de ambiente.
  output: "standalone",
  // `next dev` só aceita localhost por padrão; libera o acesso pela rede
  // interna (ex.: http://172.16.101.153:3000). Não afeta o build de produção.
  allowedDevOrigins: ["172.16.*.*"],
  // O canto inferior esquerdo é da barra lateral.
  devIndicators: { position: "bottom-right" },
  serverExternalPackages: ["mysql2"],
  experimental: {
    optimizePackageImports: ["@mdi/js"],
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

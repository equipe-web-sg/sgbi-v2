// Gera a imagem Docker do SGBI v2 e, se quiser, envia ao Docker Hub (como o
// `onDockerBuild.js` do BI antigo). Uso: `npm run build:docker` (pergunta a versão)
// ou `node scripts/build-docker.mjs 1.0.0 --push`.
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";

// Repositório próprio do v2 no Docker Hub (o do BI antigo é `sgsistemas/sgbi`).
const IMAGEM_BASE = "sgsistemas/sgbi-v2";

/** Qualquer nome de tag válido para o Docker: até 128 caracteres de letras, números, `_`, `.` e `-`, sem começar por `.` ou `-`. */
const tagValida = (tag) => /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/.test(tag);

function docker(args) {
  console.log(`> docker ${args.join(" ")}`);
  return spawnSync("docker", args, { stdio: "inherit" }).status === 0;
}

async function main() {
  const [, , tagArg, ...opcoes] = process.argv;
  const leitor = createInterface({ input: process.stdin, output: process.stdout });
  try {
    let tag = tagArg;
    while (!tag || !tagValida(tag)) {
      if (tag) console.log("Tag inválida! Use só letras, números, '_', '.' e '-' (até 128 caracteres).");
      tag = (await leitor.question("Qual versão deseja fazer o build? ")).trim();
    }
    const imagem = `${IMAGEM_BASE}:${tag}`;

    console.log(`Iniciando build de ${imagem}...`);
    if (!docker(["build", "-t", imagem, "--no-cache", "."])) {
      console.error(`Falha ao realizar build da imagem: ${imagem}`);
      process.exit(1);
    }
    console.log("Build finalizado com sucesso!");

    const enviar = opcoes.includes("--push")
      ? true
      : (await leitor.question("Deseja fazer push da imagem? (S|N) ")).trim().toUpperCase() === "S";
    if (!enviar) return console.log("Finalizando sem realizar push...");

    if (!docker(["push", imagem])) {
      console.error("Falha ao realizar push da imagem!");
      process.exit(1);
    }
    console.log("Push realizado com sucesso!");
  } finally {
    leitor.close();
  }
}

await main();

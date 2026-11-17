// Migrations do banco do cliente, rodadas a cada subida do container (como o
// `prestart` do BI antigo): `node scripts/migrar.mjs && node server.js`.
//
// Mesmo modelo do antigo (`onServerStart.js`): migrations numeradas em
// `scripts/migracoes.mjs`, tabela `migrations` com os ids já aplicados, e só roda o
// que tem id MAIOR que o último registrado. Assim:
// - banco novo: cria tudo, do id 1 ao último;
// - banco já migrado pelo BI antigo (ou por este): só aplica o que faltar, que
//   normalmente é nada;
// - rodar duas vezes não repete nada.
// Variáveis: DB_HOST, DB_PORT (3306), DB_USER, DB_PASSWORD, DB_DATABASE.
import mysql from "mysql2/promise";
import { pathToFileURL } from "node:url";
import { migrations } from "./migracoes.mjs";

/** Erros de "já existe", ignorados como no antigo (a migration já tinha sido feita à mão ou por outro BI). */
const ERROS_IGNORADOS = [
  "ER_DUP_KEYNAME",
  "ER_DUP_KEY",
  "ER_DUP_ENTRY",
  "ER_DUP_FIELDNAME",
  "ER_TABLE_EXISTS_ERROR",
  "ER_FK_DUP_NAME",
];

export const erroIgnoravel = (codigo) => ERROS_IGNORADOS.includes(codigo);

/** Garante ids únicos, inteiros e crescentes a partir de 1, e ao menos uma query em cada. */
export function validarMigracoes(lista) {
  lista.forEach((migracao, i) => {
    if (migracao.id !== i + 1) {
      throw new Error(`Migration fora de ordem: esperado o id ${i + 1}, veio ${migracao.id}.`);
    }
    if (!Array.isArray(migracao.queries) || migracao.queries.length === 0) {
      throw new Error(`Migration ${migracao.id} sem queries.`);
    }
  });
}

/** As que ainda não foram aplicadas: id maior que o último registrado (`null` = banco sem nenhuma). */
export const migracoesPendentes = (lista, ultimoId) => lista.filter((migracao) => migracao.id > (ultimoId ?? 0));

const dataDeHoje = () => new Date().toISOString().slice(0, 10);

/**
 * Aplica as pendentes, na ordem, registrando cada uma na tabela `migrations` só
 * depois de executada (se uma falhar, a próxima subida tenta de novo a partir dela).
 * `conexao` já aponta para o banco do cliente.
 */
export async function executar(conexao, lista = migrations, log = console.log) {
  validarMigracoes(lista);

  await conexao.query(
    "CREATE TABLE IF NOT EXISTS migrations (`id` int NOT NULL, `created_at` date NOT NULL, CONSTRAINT `migration_id` PRIMARY KEY(id));",
  );
  const [[{ ultimoId }]] = await conexao.query("SELECT max(id) AS ultimoId FROM migrations;");

  const pendentes = migracoesPendentes(lista, ultimoId);
  if (pendentes.length === 0) {
    log(`Banco de dados em dia (migration ${ultimoId}).`);
    return { aplicadas: [], ultimoId };
  }

  for (const migracao of pendentes) {
    log(`Executando migration ${migracao.id}`);
    for (const query of migracao.queries) {
      try {
        await conexao.query(query);
      } catch (erro) {
        if (!erroIgnoravel(erro.code)) {
          log(`Erro na migration ${migracao.id}: ${erro.message}\n${query.trim().slice(0, 200)}`);
          throw erro;
        }
      }
    }
    await conexao.query("INSERT INTO migrations(id, created_at) VALUES (?, ?)", [migracao.id, dataDeHoje()]);
  }

  return { aplicadas: pendentes.map((m) => m.id), ultimoId: pendentes.at(-1).id };
}

function configuracao() {
  const faltando = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_DATABASE"].filter((nome) => !process.env[nome]);
  if (faltando.length) throw new Error(`Variáveis de ambiente ausentes: ${faltando.join(", ")}`);
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  };
}

/** Espera o MySQL aceitar conexão (no `docker compose up` ele pode demorar mais que o app). */
async function conectar({ database, ...servidor }) {
  for (let tentativa = 1; ; tentativa++) {
    try {
      const conexao = await mysql.createConnection(servidor);
      // Banco novo: cria, se o instalador ainda não criou.
      await conexao.query(`CREATE DATABASE IF NOT EXISTS \`${database.replaceAll("`", "``")}\``);
      await conexao.changeUser({ database });
      return conexao;
    } catch (erro) {
      if (tentativa >= 10) {
        console.log("Algum problema pode estar ocorrendo com o MySQL, favor verificar...");
        console.error(erro);
        process.exit(1);
      }
      console.log("Não foi possível conectar no MySQL, tentando novamente...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

async function main() {
  let servidor;
  try {
    servidor = configuracao();
  } catch (erro) {
    console.error(erro.message);
    process.exit(1);
  }
  const conexao = await conectar(servidor);
  try {
    await executar(conexao);
  } catch (erro) {
    // Como no antigo: o erro fica no log, mas o BI sobe mesmo assim (e a próxima subida tenta de novo).
    console.error(erro);
  } finally {
    await conexao.end();
  }
  console.log("Verificações no banco de dados finalizadas!");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

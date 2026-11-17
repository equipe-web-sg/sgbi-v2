import "server-only";

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "@/lib/env";
import * as schema from "./schema";

type Db = ReturnType<typeof criar>;

// Reuse the pool across hot reloads in development.
const globalForDb = globalThis as unknown as { pool?: mysql.Pool };

function criar() {
  const pool =
    globalForDb.pool ??
    mysql.createPool({
      ...env.db,
      connectionLimit: 10,
    });
  if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;
  return drizzle(pool, { schema, mode: "default" });
}

let instancia: Db | undefined;

/**
 * Cliente do banco, criado no primeiro uso (e não ao importar): o build da imagem
 * Docker não tem as variáveis de ambiente do banco (ver `src/lib/env.ts`).
 */
export const db = new Proxy({} as Db, {
  get: (_, propriedade) => Reflect.get((instancia ??= criar()), propriedade),
});

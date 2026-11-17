# SGBI v2: imagem única para todos os clientes. Banco, API do VX e slug entram por
# variáveis de ambiente na hora de rodar (docker-compose do instalador), nunca no build.
# Versão do Node: a do .nvmrc.
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
# Instalação completa: o build precisa das devDependencies (TypeScript, Tailwind).
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# O build não acessa o banco nem precisa do .env.
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# O standalone não leva `.next/static` nem `public`.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Migrations do banco, rodadas a cada subida (como o `prestart` do BI antigo).
COPY --chown=nextjs:nodejs scripts/migrar.mjs scripts/migracoes.mjs ./scripts/

USER nextjs
EXPOSE 3000

# /login é pública: serve de teste de saúde sem credencial.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s \
  CMD wget -qO- http://127.0.0.1:3000/login >/dev/null || exit 1

CMD ["sh", "-c", "node scripts/migrar.mjs && exec node server.js"]

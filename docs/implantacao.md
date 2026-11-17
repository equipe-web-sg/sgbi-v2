# Implantação do SGBI v2

> Como levar o v2 aos clientes **no mesmo estilo do SGBI antigo**: imagem Docker publicada no Docker Hub e instalador Python que cria a pasta do cliente, o `docker-compose.yml` e sobe o container. Começou como estudo do repositório antigo (`../sgbi`: `Dockerfile`, `onDockerBuild.js`, `onServerStart.js`, `installer/linux`, `installer/windows`, commit do slug `87af91d5`); a **imagem, as migrations e o instalador Linux já estão feitos e testados** (D48, D49, D50). Falta o instalador de Windows (P64).

## 1. Situação

O estilo antigo serve para o v2: o container recebe tudo por variável de ambiente (`API_VIEW`, `DB_*`, `CLIENT_SLUG`, e agora `JWT_SECRET`) e escuta na porta 3000. O estudo apontou quatro bloqueios do v2:

| # | Bloqueio | Situação |
|---|---|---|
| B1 | O `next build` falhava sem `.env` (`env.ts` exigia as variáveis ao importar) | **Resolvido**: `env` e `db` são lidos no primeiro uso. Build sem nenhuma variável passa |
| B2 | O `proxy.ts` redirecionava para o endereço de bind do servidor; com porta publicada diferente da interna (`9000:3000`) o login levaria o navegador a um endereço que não abre | **Resolvido**: `origemDoNavegador` (`src/lib/origem.ts`) usa `X-Forwarded-*`/`Host`, com teste |
| B3 | As 20 tabelas que o v2 lê eram criadas só pelas migrations do BI antigo | **Resolvido (D48)**: `scripts/migrar.mjs` + `scripts/migracoes.mjs`, mesmo modelo do antigo |
| B4 | `JWT_SECRET` (≥ 32 caracteres) é obrigatório no v2; o compose antigo não define | **Resolvido (D50)**: o instalador gera um por cliente |

Decisões (16/11/2026): migrations próprias seguindo o modelo do antigo, sincronizadas à mão entre os dois BIs (D48); imagem em repositório próprio, `sgsistemas/sgbi-v2`, porque o antigo continua sendo atualizado e a transição ainda não está definida (D49).

## 1.1 O que foi feito no repositório

| Arquivo | Para quê |
|---|---|
| `Dockerfile` | 3 estágios (`npm ci` completo → build → `standalone`), `node:24-alpine` (o do `.nvmrc`), usuário `nextjs`, `HOSTNAME=0.0.0.0`, healthcheck em `/login`, `CMD` = migrations e depois `server.js` |
| `.dockerignore` | Deixa `.env*`, `.git`, `.claude`, `docs` fora da imagem (o `.env.local` tem credenciais de homologação) |
| `next.config.ts` | `output: "standalone"` |
| `scripts/migracoes.mjs` | Cópia fiel das 41 migrations do `onServerStart.js` do antigo (mesmos ids e SQL) |
| `scripts/migrar.mjs` | Executor: tabela `migrations`, só roda id maior que o último; `npm run db:migrar` |
| `scripts/build-docker.mjs` | `npm run build:docker`: pergunta a tag (qualquer nome válido do Docker), `docker build`, pergunta se faz push para `sgsistemas/sgbi-v2` |
| `src/lib/env.ts`, `src/db/index.ts` | Leitura preguiçosa (B1) |
| `src/lib/origem.ts`, `src/proxy.ts` | Redirecionamento pelo endereço do navegador (B2) |
| `installer/linux/` | Instalador Python (D50): `main.py`, `flows.py`, `utils.py`, `config.py`, `resources/`, specs do PyInstaller, testes e README |

## 2. Como o antigo é implantado hoje

```
dev: docker build -t sgsistemas/sgbi:<TAG> .   (npm run build:docker pergunta a versão e se faz push)
        │  tags: qualquer nome válido do Docker (ex.: 1.0.0, homologation, teste)
        ▼
Docker Hub privado  sgsistemas/sgbi:<TAG>
        ▼
instalador Linux (Python, PyInstaller, 2 binários: Ubuntu 16–22 e Ubuntu 24)  ── roda como root no servidor do cliente
  1. instala curl e Docker se faltar; faz `docker login` (credencial fixa no código do instalador)
  2. cria /opt/sgbi/{banco,clientes}; sobe o MySQL 5.7 (`mysql-sgbi`, porta 3333) com `my.cnf`
  3. pergunta o slug, cria clientes/<slug>/docker-compose.yml a partir de resources/docker-sgbi.yml
  4. cria o banco sgbi_<slug> e roda `docker compose up -d`
  5. grava <SER>/sgapirest/apirestview-config.json apontando o headquarter para sgbi_<slug>
        ▼
container sgbi-<slug>: `npm start` → prestart = `node onServerStart.js` (migrations) → `next start` (porta 3000)
```

Menu do instalador: **1** instalação completa (MySQL + cliente), **2** só cliente em banco existente, **3** só o MySQL, **4** atualização de sistema (escolhe cliente e versão, faz `docker pull`, troca a tag no compose por regex `sgsistemas/sgbi:<versão>`, `down` + `up -d`).

Windows/Fivewin (sem Docker): Inno Setup instala o `.next/standalone` + Node portátil + NSSM; o serviço roda `service.js`, que executa `onServerStart.js` e depois `server.js`. A configuração vai por `setx ... /m` (variáveis de **máquina**: `API_VIEW`, `PORT`, `DB_*`) e `config.properties`.

## 3. O slug

O slug é o **nome da instalação de um cliente** e amarra tudo no servidor:

| Onde | Valor | Quem usa |
|---|---|---|
| Pergunta do instalador | texto livre, depois `[^a-zA-Z0-9_-]` removido e minúsculas; recusa se `clientes/<slug>` já existe | instalador |
| Pasta | `<base>/clientes/<slug>/docker-compose.yml` | atualização de sistema lista clientes por pasta |
| Container | `sgbi-<slug>` | docker |
| Banco | `sgbi_<slug>` | app **e headquarter** (gravado em `apirestview-config.json`; é contrato com o processo noturno) |
| Variável | `CLIENT_SLUG=<slug>` | app |
| Cookie | antigo `session-<slug>`; v2 `sgbi-sessao-<slug>` (nomes diferentes: convivem) | middleware/proxy |
| JWT | claim `slug`, conferido a cada requisição | middleware/proxy |

**Por que existe:** vários clientes rodam no mesmo servidor em portas diferentes, e **cookie não separa portas** (só host). Sem slug, entrar no cliente A derrubaria a sessão do cliente B. O `localStorage` já é separado por origem (inclui a porta), então o prefixo `<slug>:` do antigo só faria diferença com vários clientes na mesma origem (proxy reverso por caminho).

**Estado no v2:** `env.clientSlug` (só tira `/` das pontas), cookie `sgbi-sessao-<slug>` e claim `slug` conferido em `lerSessao` (`src/server/sessao.ts`). Faltam (P62): validar o formato do slug, prefixar o armazenamento do navegador se for preciso e decidir o slug no Windows.

Peculiaridades que importam:

- **Slug é variável de execução, nunca de build.** A mesma imagem atende todos os clientes; qualquer configuração de build (`basePath`, `NEXT_PUBLIC_*`) quebraria isso. O v2 não tem nenhuma hoje; vale como regra.
- **Nome do cookie sem validação:** o instalador já sanitiza, mas `env.clientSlug` aceita qualquer coisa. Um slug com espaço ou `;` geraria cookie inválido. Falhar na inicialização se não casar com `^[a-z0-9_-]*$` custa uma linha.
- **Sem slug, o cookie é `sgbi-sessao`** (o instalador Windows antigo não pergunta). Dois serviços no mesmo Windows em portas diferentes (o serviço se chama `SGBI-<versão>`, então é possível) se derrubariam. Além disso, `setx /m` faz `PORT`/`DB_*` valerem para a máquina inteira: duas instâncias no mesmo Windows já não funcionam hoje por esse motivo. O ideal no v2 é configurar por serviço (`nssm set <serviço> AppEnvironmentExtra`).
- **Coabitação com o BI antigo:** o instalador amarra pasta = slug = container = banco. Subir o v2 **ao lado** do antigo no mesmo banco exigiria desacoplar o nome do banco do slug (ou pasta/container diferentes com o mesmo `CLIENT_SLUG`). Substituir **no mesmo lugar** não tem esse problema.

## 4. Demais peculiaridades do SGBI no cliente

- **Dados até ontem:** o headquarter (Harbour) lê os `.dbf` do SER à noite e popula o MySQL; o dia atual vem da API Rest SG (`API_VIEW`), na porta informada na instalação (padrão 8069). O instalador exige os arquivos `hpe_headquarterview.l` e `hapirestsg.l` no SER e garante a `libmysqlclient.so.18.1.0` em `<SER>/dll/x64/sgdbc/mysql/` (baixada por FTP, credenciais em `SGBI_FTP_*`) para o headquarter conseguir gravar no MySQL. O instalador antigo a gravava na pasta de instalação e não no SER (corrigido no v2, D51).
- **MySQL 5.7 fixo**, com `--lower_case_table_names=1 --sql-mode=""` e `my.cnf` próprio. O v2 usa SQL escrito para 5.7 (ver CLAUDE.md); a imagem não muda isso.
- **Perfil legado:** Ubuntu ≤ 22.04 usa binário compilado no Ubuntu 16.04 (glibc antigo) e o compose recebe `version: '3'`.
- **Plataformas (VX, Cloud, Fivewin):** o v2 lê a plataforma do login do VX (D46); não depende do instalador. O Fivewin é o que roda sem Docker (Windows).
- **Token do VX** fica na tabela `tokens` do banco do cliente e nunca vai ao navegador (D45).
- **Segurança do instalador atual (a corrigir independentemente do v2):** o `docker login` usa um token fixo em texto no código (`utils.py`, `docker_login`), portanto dentro do binário distribuído e visível na lista de processos. Trocar por token somente leitura, via `--password-stdin`, e rotacionar. O `docker-sgbi.yml` também traz a tag `3.2.0` fixa e `get_available_versions()` é uma lista fixa no código (há um `TODO` para ler de fonte remota).

## 5. O que muda no v2

1. **Build sem `.env` (B1).** A causa era `env.apiView`/`env.db` e o pool do banco criados na importação, que o Next faz ao coletar as rotas. Agora são lidos no primeiro uso (`db` é um `Proxy` que cria o pool na primeira consulta). Regra para o futuro: não ler variável de ambiente no escopo do módulo.
2. **Redirecionamento (B2).** Com `Host: 192.168.0.10:9000` o `Location` saía como o endereço de bind. O Next recusa `Location` relativo no proxy (`Invalid URL`), por isso a origem é montada a partir dos cabeçalhos. Vale também atrás de proxy reverso `https`. O `redirect()` de Server Actions e os redirecionamentos do cliente já eram relativos.
3. **`standalone`.** 76 MB de aplicação, `mysql2` incluído, variáveis lidas em tempo de execução. `.next/static` e `public` são copiados à mão para dentro dele (feito no Dockerfile). A imagem final tem 340 MB.
4. **Migrations (B3, D48).** O `schema.ts` do v2 tem 20 tabelas, todas com `CREATE TABLE` nas migrations do antigo; o headquarter só popula. Em vez de recriar só essas 20, o v2 leva **todas as 41 migrations** (inclusive `users`, `reports`... que ele ainda não lê), para os ids e o esquema ficarem iguais aos do antigo no mesmo banco. Comportamento portado do `MigrationRunner`: ignora erros de "já existe", registra cada migration depois de executada, e, se uma falhar, o erro vai para o log e o BI sobe mesmo assim (a próxima subida tenta de novo); sem conexão após 10 tentativas de 2 s, sai com erro e o `server.js` não sobe. Diferenças deliberadas, sem mudar o resultado: registra o id só depois de executar (o antigo tentava inserir todos a cada subida e ignorava o erro de duplicidade) e cria o banco com o nome entre crases (um slug com hífen quebraria o `CREATE DATABASE` do antigo).
5. **`JWT_SECRET` (B4).** Gerar no instalador (`secrets.token_urlsafe(32)`, 43 caracteres) e gravar no compose; trocar o segredo só invalida as sessões. O fluxo de atualização do antigo só reescreve a linha `image:`; como o nome da imagem mudou (D49), a transição de um cliente é editar o compose uma vez (imagem e `JWT_SECRET`).
6. **`.dockerignore` obrigatório.** O antigo só ignora `node_modules` e `.next`; no v2 o `COPY . .` levaria o `.env.local` para uma camada da imagem, que todo cliente baixa com a credencial compartilhada do Docker Hub.
7. **Fonte do Google:** `layout.tsx` usa `next/font/google`. O Next baixa a fonte no build e a serve do próprio servidor; o cliente não precisa de internet para isso, a máquina de build sim.
8. **Cache de dados** (`'use cache'`): por processo/container. Nunca compartilhar um volume em `.next/cache` entre clientes.

## 6. Como sincronizar os dois BIs (migrations)

Os dois BIs podem apontar para o mesmo banco, e a tabela `migrations` guarda só o último id. Regras:

1. Migration nova: copiar **idêntica** (mesmo SQL) para `onServerStart.js` do antigo e `scripts/migracoes.mjs` do v2, com o **mesmo id** (o próximo livre), na mesma ordem.
2. Nunca editar nem renumerar uma migration publicada; correção é migration nova.
3. Se os dois repositórios usarem o mesmo id para SQL diferente, o segundo a rodar é **pulado sem aviso**: o banco já registra o id. Vale conferir o último id dos dois antes de criar.
4. `npm test` valida que os ids do v2 vão de 1 a N, sem buraco nem repetição (`scripts/migrar.test.mjs`); comparar com o antigo continua manual.

## 7. Instalador Linux e o que falta

`installer/linux/` replica o funcionamento do instalador do antigo (menu: instalação completa, só cliente, só banco, atualização), com nomes próprios para conviver no mesmo servidor; tudo está no [README do instalador](../installer/linux/README.md). Em resumo:

- imagem `sgsistemas/sgbi-v2:<tag>`, pasta `/opt/sgbi/clientes-v2/<slug>`, container `sgbi-v2-<slug>`, porta sugerida 9100; **o `mysql-sgbi` e o banco `sgbi_<slug>` são compartilhados** com o antigo;
- o compose de cada cliente leva `API_VIEW`, `DB_*`, `CLIENT_SLUG` e o `JWT_SECRET` gerado (permissão 600); `PLATAFORMA` não vai para produção (D46);
- a credencial do Docker Hub não fica no código (variáveis, `resources/docker-login.json` fora do git, ou pergunta).

Falta (P64): instalador de **Windows/Fivewin** (`JWT_SECRET` por serviço NSSM no lugar de `setx /m`, slug P62, `scripts/migrar.mjs` antes do `server.js`; atenção aos symlinks do standalone no Windows sem privilégio de administrador), numeração das versões e o token do Docker Hub.

Roteiro por cliente (para quem testa): login no endereço e porta publicados (não em `localhost`); abrir uma tela sem sessão e conferir que cai em `/login` no mesmo endereço e porta; entrar no cliente A e no B no mesmo navegador sem um derrubar o outro; `docker logs sgbi-v2-<slug>` com "Banco de dados em dia" (ou as migrations aplicadas) e sem erro de variável ausente; reiniciar o container mantém a sessão.

## 8. Verificação feita (16/11/2026)

Máquina de desenvolvimento, Docker 29.8, MySQL 5.7.44 (`--lower_case_table_names=1 --sql-mode=""`, como o instalador):

- **Do zero:** o v2 cria o banco inexistente e aplica as 41 migrations; o resultado (56 tabelas, 1.063 linhas de DDL com índices e chaves estrangeiras, e os dados semeados de `reports`) é **idêntico** ao que o `onServerStart.js` original gera.
- **Cliente em transição:** banco criado pelo antigo, com dados do headquarter: "Banco de dados em dia (migration 41)", nada alterado, dados preservados.
- **Antigo em versão velha** (parado na migration 30): o v2 aplica só as que faltam e o esquema fica igual ao completo.
- **Repetição:** segunda subida não executa nada; o BI antigo subindo depois no mesmo banco também não altera nada (coexistência/retorno).
- **Falhas:** senha errada esgota as 10 tentativas e sai com código 1; variável ausente sai com código 1 e lista quais.
- **Imagem real** (`docker build` pelo `build-docker.mjs`, sem push; `docker run -p 9000:3000`, banco novo): migrations rodam sozinhas na subida (41, 56 tabelas), processo como `nextjs`, `/login` 200, `/api/filiais` sem sessão 401, `/vendas` sem sessão redireciona para `http://127.0.0.1:9000/login?de=%2Fvendas`, estáticos 200, healthcheck `healthy`.
- `npm test` (247 testes), `npm run lint` e `npm run build` sem nenhuma variável de ambiente passam.
- **Instalador** (`installer/linux`), com Docker e MySQL 5.7 reais e a imagem local, acionando os fluxos de verdade: instalação completa em servidor sem MySQL (cliente do zero: 56 tabelas, 41 migrations, `apirestview-config.json` apontando o banco); cliente com banco criado pelo antigo (slug repetido e porta ocupada recusados; "em dia (migration 41)"; dados do headquarter preservados); servidor que já tem o `mysql-sgbi` (detectado pelos labels, container não recriado); três clientes v2 lado a lado; atualização (tag trocada, `JWT_SECRET` acrescentado a um compose sem ele, container recriado, nada refeito no banco; compose de imagem do antigo ignorado na lista); pull de tag inexistente falha com mensagem. 25 testes unitários (`python3 -m unittest`), inclusive em Python 3.8. O executável do Ubuntu 24 compila com PyInstaller e abre o menu num Ubuntu 24 limpo.

Não verificado: o executável do Ubuntu 16.04 (compila Python 3.8 com pyenv, demorado; o código roda no 3.8), instalação do Docker em máquina sem ele (`get.docker.com`), o `docker login` e o pull reais (a imagem ainda não foi publicada), o download da `libmysqlclient` por FTP, o fluxo Windows/Inno Setup, o login de fato (exige o VX), dois clientes lado a lado no mesmo navegador, e se o headquarter aceita hífen no nome do banco (`sgbi_meu-cliente`; o instalador antigo já permite hífen).

# Instalador Linux do SGBI v2

Instalador em Python (compilado com PyInstaller) que prepara o servidor do cliente: instala Docker se faltar, sobe o MySQL 5.7 compartilhado, cria a pasta e o `docker-compose.yml` de cada cliente e sobe o container `sgsistemas/sgbi-v2:<tag>`. Mesmo funcionamento do instalador do SGBI antigo (`../sgbi/installer/linux`), com nomes próprios para os dois conviverem no mesmo servidor. Decisões em `docs/decisoes-e-pendencias.md` (D49, D50) e visão geral em `docs/implantacao.md`.

Menu: **1** instalação completa (MySQL + cliente), **2** só cliente em banco existente, **3** só o MySQL, **4** atualização de sistema.

## O que é do v2 e o que é compartilhado com o antigo

| | SGBI antigo | SGBI v2 |
|---|---|---|
| Imagem | `sgsistemas/sgbi:<tag>` | `sgsistemas/sgbi-v2:<tag>` |
| Pasta do cliente | `/opt/sgbi/clientes/<slug>` | `/opt/sgbi/clientes-v2/<slug>` |
| Container | `sgbi-<slug>` | `sgbi-v2-<slug>` |
| Porta sugerida | 9000 | 9100 (o instalador recusa porta em uso) |
| Banco do cliente | `sgbi_<slug>` | `sgbi_<slug>` (o mesmo: o headquarter grava nele) |
| MySQL | container `mysql-sgbi` em `/opt/sgbi/banco` | **o mesmo**: se já existe, é reaproveitado |

Um cliente em transição usa o **mesmo slug e o mesmo banco** nos dois: o v2 só aplica as migrations que faltarem (D48), e os dois cookies de sessão têm nomes diferentes.

Diferenças em relação ao instalador antigo (além dos nomes):

- **`JWT_SECRET`** (obrigatório no v2) é gerado por cliente e gravado no compose; na atualização, é acrescentado se faltar.
- **Compose com permissão 600** (guarda a senha do banco e o segredo da sessão).
- **Detecção do `mysql-sgbi` existente** pelos *labels* do container (`docker inspect`). A do antigo usa `docker compose ls --format json`, que nas versões atuais devolve um array e não traz o nome do container, então nunca encontrava o banco existente.
- **Espera a aplicação responder** (`/login`) em vez de `sleep(10)` e mostra o comando de log se não responder.
- **Porta e nome de container em uso** são recusados antes de subir.
- **Credencial do Docker Hub fora do código** (ver abaixo) e passada por `--password-stdin`.
- A tag da imagem é escolhida na instalação (as do menu, em `config.py`, ou qualquer nome de tag digitado), em vez de fixa no template.
- A atualização lista só clientes do v2 (ignora compose de outra imagem) e guarda `docker-compose.yml.backup`.

## Credencial do Docker Hub

O repositório da imagem é privado e o instalador faz `docker login`. O token **não fica no código-fonte**. Ele é lido, nesta ordem, de:

1. variáveis `SGBI_DOCKER_USER` e `SGBI_DOCKER_TOKEN`;
2. `resources/docker-login.json` (`{"user": "sgsistemas", "token": "..."}`), **criado antes de compilar** e ignorado pelo git; o PyInstaller o embute no executável (pede para o coordenador o token, de preferência somente leitura);
3. pergunta ao técnico.

Quem tiver o executável consegue extrair o token embutido: use um token somente leitura e rotacione-o ao trocar de técnicos/clientes (P64).

## libmysqlclient (headquarter)

O headquarter precisa da `libmysqlclient.so.18.1.0` em **`<SER>/dll/x64/sgdbc/mysql/`** (a pasta é criada se não existir). O instalador:

1. se a lib já está lá, não faz nada;
2. senão, baixa do FTP da SG (pasta `/linux/ubuntu-libmysqlx64/`), com `SGBI_FTP_HOST`, `SGBI_FTP_USER` e `SGBI_FTP_PASS` (e `SGBI_FTP_REMOTE_DIR`, se for outra pasta) **ou** `resources/ftp-login.json` embutido na compilação, como o do Docker Hub (fora do git): `{"host": "...", "user": "...", "pass": "..."}`;
3. por último, usa `resources/libmysqlclient.so.18.1.0`, se estiver presente na compilação.

O `apirestview-config.json` do headquarter é gravado **antes** da lib: se ela faltar, o instalador avisa onde copiá-la e a instalação do resto já está feita. (O instalador antigo procurava a lib na pasta de instalação, e não no SER; por isso falhava mesmo com a lib já instalada.)

## Publicar uma versão nova no instalador

1. `npm run build:docker` na raiz do v2 (gera e envia `sgsistemas/sgbi-v2:<tag>`).
2. *(Opcional)* Acrescente a tag em `VERSOES_CONHECIDAS`, em `config.py`, e recompile, só para ela aparecer no menu de escolha. Não é necessário: qualquer tag pode ser digitada na hora (opção `0` na instalação, `T` na atualização), sem recompilar. O instalador não lista as tags do Docker Hub.

## Testes

Só a biblioteca padrão do Python, sem Docker nem rede:

```bash
cd installer/linux && python3 -m unittest -v
```

## Compilar o instalador

Execute na pasta `installer/linux`; precisa só de Docker. Dois executáveis, como no antigo:

- **Ubuntu 16.04 a 22.04** (compilado no 16.04 com Python 3.8, para a glibc antiga): `dist/instalador-sgbi-v2-ubuntu-16-ate-22`
- **Ubuntu 24.04 em diante**: `dist/instalador-sgbi-v2-ubuntu-24`

Crie antes o `resources/docker-login.json` (seção acima).

```bash
# Ubuntu 16.04 a 22.04 (demorado: compila o Python 3.8 com o pyenv)
sudo docker run --rm -v "$(pwd):/src" ubuntu:16.04 sh -c "\
    apt-get update && \
    apt-get install -y git curl build-essential libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev libffi-dev && \
    curl https://pyenv.run | bash && \
    export PATH=\"/root/.pyenv/bin:\$PATH\" && \
    eval \"\$(pyenv init -)\" && \
    pyenv install 3.8.18 && \
    pyenv global 3.8.18 && \
    pip install --upgrade pip && \
    pip install -r /src/requirements.txt && \
    cd /src && \
    pyinstaller instalador-sgbi-v2-ubuntu-16.spec --clean"
```

```bash
# Ubuntu 24.04 em diante
sudo docker run --rm -v "$(pwd):/src" ubuntu:24.04 sh -c "\
    apt-get update && \
    apt-get install -y python3 python3-pip python3-venv python3-dev && \
    python3 -m venv /opt/venv && \
    . /opt/venv/bin/activate && \
    pip install --upgrade pip && \
    pip install -r /src/requirements.txt && \
    cd /src && \
    pyinstaller instalador-sgbi-v2-ubuntu-24.spec --clean"
```

Os arquivos de `dist/` e `build/` ficam como `root`; apague com `sudo` e não vão para o git.

## Windows / Fivewin

Este instalador é só Linux. O de Windows do antigo é outro (Inno Setup + NSSM, sem Docker) e ainda não foi portado para o v2 (P64).

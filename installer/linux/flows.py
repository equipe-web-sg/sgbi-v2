#!/usr/bin/env python3
"""
Fluxos escolhidos pelo usuário no menu do instalador do SGBI v2.

Mesmos fluxos do instalador do SGBI antigo (instalação completa, só cliente, só
banco e atualização), mas com imagem, pastas e container próprios, para os dois
conviverem no mesmo servidor, e com `JWT_SECRET` por cliente. O MySQL
(`mysql-sgbi`) é o mesmo: existe um por servidor.
"""

import os
import re
import shlex
import shutil
import subprocess
import time
from pathlib import Path
from typing import Dict, Optional, Tuple

import config
from utils import (
    check_curl_installed, install_curl,
    create_apirest_config, confirm_action,
    replace_template_variables, get_user_input,
    get_machine_ip, create_directory_structure, copy_embedded_file,
    check_docker_installed, install_docker, docker_login,
    docker_container_exists, find_container_compose_dir,
    test_mysql_connection, create_database, database_has_tables,
    ensure_libmysqlclient, libmysqlclient_dir, LIB_FILENAME,
    validate_directory_exists, validate_dbf_files, validate_sg_files,
    ensure_docker_compose_version, get_legacy_profile,
    sanitize_slug, is_valid_version, generate_jwt_secret, is_port_free, wait_http_ready,
    get_compose_image_version, set_compose_image_version, compose_has_env_var, add_compose_env_var,
    run_command, print_success, print_error, print_warning, print_step,
    RICH_AVAILABLE,
)

if RICH_AVAILABLE:
    from rich.console import Console
    from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn

    console = Console()

DOCKER_COMPOSE_CMD = ""


def compose(directory: str, args: str) -> subprocess.CompletedProcess:
    """Executa o docker compose dentro da pasta (sem mudar a pasta do instalador)."""
    return run_command(f"cd {shlex.quote(directory)} && {DOCKER_COMPOSE_CMD} {args}", capture_output=True)


# --------------------------------------------------------------------------- dependências e MySQL

def verify_dependencies() -> bool:
    global DOCKER_COMPOSE_CMD
    print_step(1, "Verificação de Dependências")

    print("🔍 Verificando cURL...")
    if not check_curl_installed():
        print_warning("cURL não está instalado. Tentando instalar...")
        if not install_curl():
            print_error("Falha na instalação do cURL. Verifique conexão com internet.")
            return False
        print_success("cURL instalado com sucesso!")
    else:
        print_success("cURL já está instalado")

    print("\n🔍 Verificando Docker...")
    docker_installed, compose_command = check_docker_installed()

    if not docker_installed:
        print_warning("Docker não está instalado. Tentando instalar...")
        if not install_docker():
            print_error("Falha na instalação do Docker. Verifique conexão com internet.")
            return False
        docker_installed, compose_command = check_docker_installed()
        print_success("Docker instalado com sucesso!")
    else:
        print_success("Docker já está instalado")

    if not compose_command:
        print_error("Docker Compose não está disponível")
        return False

    print_success(f"Docker Compose disponível: {compose_command}")

    if not docker_login():
        return False

    DOCKER_COMPOSE_CMD = compose_command
    return True


def find_existing_mysql() -> Tuple[bool, Optional[str]]:
    """
    (existe, pasta do compose do banco). O `mysql-sgbi` é um só por servidor e pode ter
    sido criado pelo instalador do SGBI antigo: nesse caso é reaproveitado.
    """
    print_step(2, "Verificação de Container MySQL Existente")

    if not docker_container_exists(config.CONTAINER_MYSQL):
        print("ℹ️ Nenhum container MySQL existente encontrado")
        return False, None

    folder = find_container_compose_dir(config.CONTAINER_MYSQL)
    if folder:
        print_success(f"Container MySQL encontrado em: {folder}")
        return True, folder

    print_warning("Container MySQL existe, mas não foi criado por docker-compose (pasta desconhecida)")
    return True, None


def setup_installation_directory() -> str:
    print_step(3, "Configuração do Diretório de Instalação")

    print("Escolha o diretório de instalação:")
    print(f"1. 📁 Recomendado: {config.PASTA_BASE_PADRAO}")
    print("2. 📂 Personalizado")

    while True:
        choice = get_user_input("Escolha (1/2)", "1")

        if choice == "1":
            install_dir = config.PASTA_BASE_PADRAO
            break
        if choice == "2":
            install_dir = get_user_input("Digite o caminho completo")
            if not install_dir:
                print_error("Caminho não pode estar vazio")
                continue
            break
        print_error("Escolha inválida. Digite 1 ou 2.")

    print(f"📁 Criando estrutura em: {install_dir}")

    if create_directory_structure(install_dir, ["banco", config.PASTA_CLIENTES]):
        print_success(f"Estrutura criada: {install_dir}/banco e {install_dir}/{config.PASTA_CLIENTES}")
        return install_dir

    print_error("Falha ao criar estrutura de diretórios")
    raise PermissionError("Não foi possível criar diretórios de instalação")


def configure_mysql_compose(database_dir: str) -> Dict[str, str]:
    print_step(4, "Configuração do Docker Compose do Banco")

    compose_file = Path(database_dir) / "docker-compose.yml"

    if compose_file.exists():
        print_success("docker-compose.yml já existe. Usando configurações existentes.")

        mysql_port = config.PORTA_MYSQL_PADRAO
        mysql_password = config.SENHA_MYSQL_PADRAO
        try:
            compose_content = compose_file.read_text(encoding='utf-8')

            port_match = re.search(r'-\s*"?(\d+):3306', compose_content)
            if port_match:
                mysql_port = port_match.group(1)

            password_match = re.search(r'MYSQL_ROOT_PASSWORD:\s*(.+)', compose_content)
            if password_match:
                mysql_password = password_match.group(1).strip()
        except Exception as e:
            print_warning(f"Erro ao ler arquivo existente: {e}")
            print_warning("Usando configurações padrão...")

        mysql_config = {"host": get_machine_ip(), "port": mysql_port, "password": mysql_password}

        print("📋 Configurações do banco existente:")
        print(f"   Host: {mysql_config['host']}")
        print(f"   Porta: {mysql_config['port']}")
        print("   Senha: (a do docker-compose.yml existente)")
        return mysql_config

    print("📄 Criando novo docker-compose.yml...")

    if not copy_embedded_file("docker-mysql.yml", str(compose_file)):
        raise FileNotFoundError("Falha ao copiar template: docker-mysql.yml")
    if not copy_embedded_file("my.cnf", str(Path(database_dir) / "my.cnf")):
        raise FileNotFoundError("Falha ao copiar my.cnf")

    print("\n⚙️ Configurações do MySQL:")
    mysql_port = get_user_input("Porta MySQL", config.PORTA_MYSQL_PADRAO)
    mysql_password = get_user_input("Senha root", config.SENHA_MYSQL_PADRAO)

    mysql_config = {"host": get_machine_ip(), "port": mysql_port, "password": mysql_password}

    template_content = compose_file.read_text(encoding='utf-8')
    compose_file.write_text(
        replace_template_variables(template_content, {
            "MYSQL_PORT": mysql_port,
            "MYSQL_ROOT_PASSWORD": mysql_password,
        }),
        encoding='utf-8'
    )

    if not ensure_docker_compose_version(str(compose_file), get_legacy_profile()):
        print_warning("Falha ao ajustar versão do docker-compose")

    print_success("docker-compose.yml configurado com sucesso!")
    return mysql_config


def start_mysql_container(database_dir: str, mysql_config: Dict[str, str]) -> bool:
    print_step(5, "Iniciando Container do MySQL")

    print("🔍 Verificando Docker daemon...")
    if run_command("docker info", capture_output=True).returncode != 0:
        print_warning("Docker daemon não está rodando. Tentando iniciar...")
        run_command("systemctl start docker", check=True)
        time.sleep(5)

        if run_command("docker info", capture_output=True).returncode != 0:
            print_error("Falha ao iniciar Docker daemon")
            return False

    print("🐳 Executando docker compose up -d...")
    result = compose(database_dir, "up -d")
    if result.returncode != 0:
        print_error(f"Falha ao iniciar container: {result.stderr}")
        return False
    print_success("Container iniciado!")

    print("⏳ Aguardando MySQL ficar pronto...")
    return wait_mysql_ready(mysql_config)


def wait_mysql_ready(mysql_config: Dict[str, str], timeout: int = 60) -> bool:
    test_cmd = f'docker exec {config.CONTAINER_MYSQL} mysql -u root -p{shlex.quote(mysql_config["password"])} -e "SELECT 1;" 2>/dev/null'
    counter = 0

    if RICH_AVAILABLE:
        with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                TimeElapsedColumn(),
                console=console,
        ) as progress:
            task = progress.add_task("Aguardando MySQL...", total=None)
            while counter < timeout:
                if run_command(test_cmd, capture_output=True).returncode == 0:
                    progress.update(task, description="MySQL está pronto!")
                    break
                time.sleep(2)
                counter += 2
                progress.update(task, description=f"Aguardando MySQL... ({counter}/{timeout}s)")
            else:
                print_error(f"MySQL não ficou pronto em {timeout} segundos")
                return False
        print_success("MySQL está pronto para conexões!")
        return True

    while counter < timeout:
        print(f"Aguardando MySQL ficar pronto... ({counter}/{timeout}s)")
        if run_command(test_cmd, capture_output=True).returncode == 0:
            print_success("MySQL está pronto!")
            return True
        time.sleep(2)
        counter += 2

    print_error(f"MySQL não ficou pronto em {timeout} segundos")
    return False


def get_mysql_connection_config() -> Optional[Dict[str, str]]:
    print("🔗 Configuração de Conexão com Banco MySQL")

    while True:
        host = get_user_input("Host/IP do MySQL (não usar localhost)", get_machine_ip())
        port = get_user_input("Porta MySQL", "3306")
        password = get_user_input("Senha root")

        mysql_config = {"host": host, "port": port, "password": password}

        print("🧪 Testando conexão...")
        if test_mysql_connection(host, port, "root", password):
            print_success("Conexão MySQL estabelecida!")
            return mysql_config

        print_error("Falha na conexão MySQL")
        if not confirm_action("Tentar novamente?"):
            return None


# --------------------------------------------------------------------------- SER e API

def get_api_config() -> Dict[str, str]:
    print_step(6, "Configuração da API Rest SG")

    api_host = get_user_input("IP da API Rest SG (não usar localhost)", get_machine_ip())
    api_port = get_user_input("Porta da API Rest SG", config.PORTA_API_PADRAO)

    return {"host": api_host, "port": api_port}


def get_ser_directory() -> Optional[str]:
    while True:
        ser_dir = get_user_input("Diretório SER (onde estão os arquivos .DBF)")

        if not validate_directory_exists(ser_dir):
            print_error("Diretório não existe")
            continue

        if not validate_dbf_files(ser_dir):
            print_error("Diretório não contém arquivos .DBF")
            continue

        print_success("Diretório SER válido!")
        return ser_dir


def configure_sgvx_system(ser_directory: str, mysql_config: Dict[str, str]) -> bool:
    """
    Configura o SER para o headquarter: o apirestview-config.json (banco `sgbi_<slug>`) e a
    libmysqlclient em `<SER>/dll/x64/sgdbc/mysql`. A config é gravada ANTES da lib: sem ela o
    headquarter não carrega o banco, e uma falha na lib não deve deixar isso por fazer.
    """
    print_step(7, "Configurações do Sistema SGVX")

    print("\n📋 Verificando arquivos do sistema...")
    sg_valid, missing_files = validate_sg_files(ser_directory)
    if not sg_valid:
        print_error("Arquivos SG faltando:")
        for file in missing_files:
            print(f"  ❌ {file}")
        print_error("Abortando instalação. Verifique os arquivos SG.")
        return False

    print_success("Todos os arquivos SGVX estão presentes")

    print("\n📄 Criando arquivo de configuração da API...")
    if not create_apirest_config(ser_directory, mysql_config):
        return False

    print("\n🔧 Configurando libmysqlclient...")
    if not ensure_libmysqlclient(ser_directory):
        lib_dir = libmysqlclient_dir(ser_directory)
        print_error(f"A {LIB_FILENAME} não foi encontrada em {lib_dir} e não foi possível baixá-la.")
        print_warning("Sem ela o headquarter não grava no banco e o BI fica sem dados. Para resolver:")
        print(f"   1. copie a {LIB_FILENAME} (FTP da SG, pasta /linux/ubuntu-libmysqlx64/) para {lib_dir}, ou")
        print("   2. informe SGBI_FTP_HOST, SGBI_FTP_USER e SGBI_FTP_PASS e rode o instalador de novo.")
        print("   (O restante da instalação já está feito.)")
        return False
    return True


# --------------------------------------------------------------------------- versões

def choose_version_for_install() -> Optional[str]:
    """Tag da imagem para uma instalação nova: uma das conhecidas ou outra digitada."""
    print("\n📦 Versões do SGBI v2:")
    for i, version in enumerate(config.VERSOES_CONHECIDAS, 1):
        print(f"{i}) {version}")
    print("0) Digitar outra tag (qualquer nome)")

    while True:
        choice = get_user_input("Escolha a versão", "1" if config.VERSOES_CONHECIDAS else "0").strip()

        if choice.isdigit() and 1 <= int(choice) <= len(config.VERSOES_CONHECIDAS):
            return config.VERSOES_CONHECIDAS[int(choice) - 1]

        if choice == "0":
            typed = get_user_input("Tag da imagem").strip()
            if is_valid_version(typed):
                return typed
        elif not choice.isdigit() and is_valid_version(choice):
            return choice  # digitou o nome da tag direto (número fora da lista não vale)

        print_error("Tag inválida. Use só letras, números, '_', '.' e '-' (até 128 caracteres).")


def pull_image(version: str) -> bool:
    image_name = f"{config.IMAGEM_SGBI}:{version}"
    print(f"🐳 Fazendo pull da imagem: {image_name}")

    result = run_command(f"docker pull {image_name}", capture_output=True)
    if result.returncode == 0:
        print_success(f"Pull da imagem {image_name} concluído com sucesso!")
        return True

    print_error(f"Falha ao fazer pull da imagem: {result.stderr}")
    print_error("Verifique a conexão com a internet e se a versão existe no registry")
    return False


# --------------------------------------------------------------------------- cliente

def configure_client(clients_dir: str, mysql_config: Dict[str, str], api_config: Dict[str, str]) -> Optional[str]:
    print_step(7, "Configuração do Cliente")

    while True:
        raw_slug = get_user_input("Nome do cliente (slug)")
        if not raw_slug:
            print_error("Nome do cliente não pode estar vazio. Tente novamente.")
            continue

        client_slug = sanitize_slug(raw_slug)
        if not client_slug:
            print_error("Nome do cliente resultou em um slug inválido. Tente usar letras e números.")
            continue
        if client_slug != raw_slug:
            print_warning(f"O slug foi ajustado para: {client_slug}")

        client_dir = Path(clients_dir) / client_slug
        container_name = f"{config.PREFIXO_CONTAINER}{client_slug}"

        if client_dir.exists():
            print_error(f"O diretório para '{client_slug}' já existe em: {client_dir}")
            print_warning("Por favor, escolha um nome de cliente diferente.")
        elif docker_container_exists(container_name):
            print_error(f"Já existe um container chamado {container_name}.")
            print_warning("Por favor, escolha um nome de cliente diferente.")
        else:
            break

    version = choose_version_for_install()
    if not version:
        return None

    while True:
        sgbi_port = get_user_input("Porta SGBI", config.PORTA_SGBI_PADRAO).strip()
        if not sgbi_port.isdigit() or not 1 <= int(sgbi_port) <= 65535:
            print_error("Porta inválida.")
        elif not is_port_free(sgbi_port):
            print_error(f"A porta {sgbi_port} já está em uso neste servidor. Escolha outra.")
        else:
            break

    database_name = f"sgbi_{client_slug}"
    jwt_secret = generate_jwt_secret()

    print(f"📁 Configurando cliente em: {client_dir}")
    compose_file = client_dir / "docker-compose.yml"

    if not copy_embedded_file("docker-sgbi.yml", str(compose_file)):
        print_error("Falha ao copiar template do cliente")
        return None

    variables = {
        "SGBI_VERSION": version,
        "CLIENT_SLUG": client_slug,
        "SGBI_PORT": sgbi_port,
        "API_HOST": f"http://{api_config['host']}",
        "API_PORT": api_config["port"],
        "DB_HOST": mysql_config["host"],
        "DB_PASSWORD": mysql_config["password"],
        "DB_DATABASE": database_name,
        "DB_PORT": mysql_config["port"],
        "JWT_SECRET": jwt_secret,
    }
    compose_file.write_text(
        replace_template_variables(compose_file.read_text(encoding='utf-8'), variables),
        encoding='utf-8'
    )
    # O compose guarda a senha do banco e o segredo da sessão: só o root lê.
    os.chmod(str(compose_file), 0o600)

    if not ensure_docker_compose_version(str(compose_file), get_legacy_profile()):
        print_warning("Falha ao ajustar versão do docker-compose")

    print(f"\n Criando database {database_name}...")
    if not create_database(mysql_config["host"], mysql_config["port"], "root", mysql_config["password"], database_name):
        print_error("Falha ao criar database")
        return None
    if database_has_tables(mysql_config["host"], mysql_config["port"], "root", mysql_config["password"], database_name):
        print_warning(f"O banco {database_name} já tem tabelas (cliente que já usa o SGBI antigo?). "
                      "Elas serão reaproveitadas; o SGBI v2 só aplica as migrations que faltarem.")
    else:
        print_success(f"Database {database_name} pronto! As tabelas são criadas pelo SGBI v2 ao subir.")

    if not pull_image(version):
        return None

    print("\n🚀 Iniciando container do cliente...")
    result = compose(str(client_dir), "up -d")
    if result.returncode != 0:
        print_error(f"Falha ao iniciar cliente: {result.stderr}")
        return None
    print_success("Container do cliente iniciado!")

    print("⏳ Aguardando aplicação ficar pronta (as migrations rodam na primeira subida)...")
    url = f"http://{get_machine_ip()}:{sgbi_port}"
    if wait_http_ready(sgbi_port):
        print_success(f"Cliente {client_slug} configurado e rodando!")
    else:
        print_warning("A aplicação ainda não respondeu. Veja o que está acontecendo com:")
        print(f"   docker logs --tail 50 {config.PREFIXO_CONTAINER}{client_slug}")
    print(f"🌐 URL de acesso: {url}")

    return client_slug


# --------------------------------------------------------------------------- atualização

def get_clients_base_directory(message: str = "Escolha o diretório para instalar o(s) cliente(s):") -> str:
    print("📁 Configuração do Diretório de Instalação")
    print(message)
    default_dir = f"{config.PASTA_BASE_PADRAO}/{config.PASTA_CLIENTES}"
    print(f"1. 📁 Recomendado: {default_dir}")
    print("2. 📂 Personalizado")

    while True:
        choice = get_user_input("Escolha (1/2)", "1")

        if choice == "1":
            clients_base = default_dir
            break
        if choice == "2":
            clients_base = get_user_input("Digite o caminho completo")
            if not clients_base:
                print_error("Caminho inválido")
                continue
            break
        print_error("Escolha inválida. Digite 1 ou 2.")

    Path(clients_base).mkdir(parents=True, exist_ok=True)
    return clients_base


def get_client_current_version(client_path: str) -> Optional[str]:
    try:
        compose_file = Path(client_path) / "docker-compose.yml"
        if not compose_file.exists():
            print_warning(f"Arquivo docker-compose.yml não encontrado em: {client_path}")
            return None

        version = get_compose_image_version(compose_file.read_text(encoding='utf-8'))
        if not version:
            print_warning(f"Versão da imagem {config.IMAGEM_SGBI} não encontrada no docker-compose.yml de {client_path}")
        return version
    except Exception as e:
        print_error(f"Erro ao ler versão do cliente {client_path}: {e}")
        return None


def list_installed_clients(clients_dir: str) -> list:
    clients_list = []

    if not validate_directory_exists(clients_dir):
        print_error(f"Diretório não existe: {clients_dir}")
        return clients_list

    try:
        for item in sorted(Path(clients_dir).iterdir()):
            compose_file = item / "docker-compose.yml"
            if item.is_dir() and compose_file.exists():
                version = get_client_current_version(str(item))
                if version is None:
                    # Compose de outra imagem (ex.: SGBI antigo em pasta indicada por engano): ignora.
                    continue
                clients_list.append({"name": item.name, "version": version, "path": str(item)})

        if not clients_list:
            print_warning("Nenhum cliente SGBI v2 instalado encontrado no diretório.")
    except Exception as e:
        print_error(f"Erro ao listar clientes: {e}")

    return clients_list


def choose_client_to_update(clients_list: list) -> Optional[dict]:
    if not clients_list:
        print_error("Nenhum cliente disponível para atualização.")
        return None

    print("\n📋 Clientes SGBI v2 instalados encontrados:")
    print("=" * 50)
    for i, client in enumerate(clients_list, 1):
        print(f"{i}) Cliente {client['name']} (versão {client['version']})")
    print("0) Cancelar")
    print("=" * 50)

    while True:
        try:
            choice = get_user_input("Escolha o cliente para atualizar").strip()
            if not choice:
                print_error("Escolha não pode estar vazia.")
                continue

            choice_num = int(choice)
            if choice_num == 0:
                print("Operação cancelada pelo usuário.")
                return None
            if 1 <= choice_num <= len(clients_list):
                selected = clients_list[choice_num - 1]
                print(f"\n✅ Cliente selecionado: {selected['name']} (versão atual: {selected['version']})")
                return selected
            print_error(f"Opção inválida! Escolha entre 0 e {len(clients_list)}.")
        except ValueError:
            print_error("Por favor, digite apenas números!")
        except KeyboardInterrupt:
            print("\nOperação cancelada pelo usuário.")
            return None


def choose_version_to_install(current_version: str) -> Optional[str]:
    installable = [v for v in config.VERSOES_CONHECIDAS if v != current_version]

    print("\n🔄 Versões disponíveis para atualização:")
    print(f"   📌 Versão atual: {current_version}")
    print("=" * 50)
    for i, version in enumerate(installable, 1):
        print(f"{i}) Versão {version}")
    print("T) Digitar outra tag (qualquer nome)")
    print("0) Cancelar")
    print("=" * 50)

    while True:
        try:
            choice = get_user_input("Escolha a versão para instalar").strip()
            if not choice:
                print_error("Escolha não pode estar vazia.")
                continue

            if choice == "0":
                print("Operação cancelada pelo usuário.")
                return None
            if choice.upper() == "T":
                typed = get_user_input("Tag da imagem").strip()
                if not is_valid_version(typed):
                    print_error("Tag inválida. Use só letras, números, '_', '.' e '-' (até 128 caracteres).")
                    continue
                selected = typed
            elif choice.isdigit() and 1 <= int(choice) <= len(installable):
                selected = installable[int(choice) - 1]
            else:
                print_error("Opção inválida!")
                continue

            if selected == current_version:
                print_warning("Essa já é a versão instalada. Para baixar de novo a mesma tag, escolha outra opção.")
                continue

            print(f"\n✅ Versão selecionada: {selected}")
            return selected
        except KeyboardInterrupt:
            print("\nOperação cancelada pelo usuário.")
            return None


def update_client_docker_compose(client_path: str, new_version: str) -> bool:
    """Troca a tag no compose (guardando uma cópia) e garante o JWT_SECRET, se faltar."""
    try:
        compose_file = Path(client_path) / "docker-compose.yml"
        if not compose_file.exists():
            print_error(f"Arquivo docker-compose.yml não encontrado em: {client_path}")
            return False

        content = compose_file.read_text(encoding='utf-8')
        backup_file = Path(client_path) / "docker-compose.yml.backup"
        shutil.copy2(compose_file, backup_file)

        updated = set_compose_image_version(content, new_version)
        if updated == content:
            print_warning("Nenhuma alteração foi feita no arquivo docker-compose.yml")
            print_warning(f"Verifique se o padrão da imagem está correto: {config.IMAGEM_SGBI}:versao")
            return False

        if not compose_has_env_var(updated, "JWT_SECRET"):
            print_warning("O compose não tem JWT_SECRET (obrigatório no SGBI v2). Gerando um novo...")
            updated = add_compose_env_var(updated, "JWT_SECRET", generate_jwt_secret())

        compose_file.write_text(updated, encoding='utf-8')
        os.chmod(str(compose_file), 0o600)

        print_success(f"docker-compose.yml atualizado com a nova versão: {new_version}")
        print(f"   (cópia da configuração anterior: {backup_file})")
        return True
    except Exception as e:
        print_error(f"Erro ao atualizar docker-compose.yml: {e}")
        return False


def restart_client_container(client_path: str) -> bool:
    print(f"🔄 Reiniciando container do cliente em: {client_path}")

    print("⏹️ Parando container atual...")
    down = compose(client_path, "down")
    if down.returncode != 0:
        print_warning(f"Aviso ao parar container: {down.stderr}")
        print_warning("Continuando com o restart...")
    else:
        print_success("Container parado com sucesso!")

    print("🚀 Iniciando container com nova imagem...")
    up = compose(client_path, "up -d")
    if up.returncode != 0:
        print_error(f"Falha ao iniciar container: {up.stderr}")
        return False

    print_success("Container iniciado com sucesso!")
    return True


def client_port(client_path: str) -> Optional[str]:
    try:
        content = (Path(client_path) / "docker-compose.yml").read_text(encoding='utf-8')
        match = re.search(r'-\s*"?(\d+):3000', content)
        return match.group(1) if match else None
    except Exception:
        return None


def print_update_success(client_name: str, old_version: str, new_version: str) -> None:
    print_success("🎉 Atualização de Sistema concluída com sucesso!")
    print("\n📋 Resumo da Atualização:")
    print(f"   🏢 Cliente: {client_name}")
    print(f"   📦 Versão anterior: {old_version}")
    print(f"   🆕 Nova versão: {new_version}")
    print("\n💡 Informações importantes:")
    print("   🔄 Container foi reiniciado com a nova imagem")
    print("   🗄️ As migrations do banco rodam sozinhas na subida")
    print("   🌐 O sistema já está disponível para uso")


# --------------------------------------------------------------------------- fluxos do menu

def complete_installation() -> bool:
    try:
        print_step(0, "INSTALAÇÃO COMPLETA", "Criando banco MySQL (se não existir) + instalando cliente SGBI v2")

        if not verify_dependencies():
            return False

        mysql_exists, existing_dir = find_existing_mysql()

        if mysql_exists and existing_dir:
            database_dir = existing_dir
            install_dir = str(Path(existing_dir).parent)
            Path(install_dir, config.PASTA_CLIENTES).mkdir(parents=True, exist_ok=True)
            mysql_config = configure_mysql_compose(database_dir)
            if not start_mysql_container(database_dir, mysql_config):
                return False
        elif mysql_exists:
            print_warning("Informe a conexão do MySQL existente.")
            mysql_config = get_mysql_connection_config()
            if not mysql_config:
                return False
            install_dir = get_clients_base_directory()
        else:
            install_dir = setup_installation_directory()
            database_dir = str(Path(install_dir) / "banco")
            mysql_config = configure_mysql_compose(database_dir)
            if not start_mysql_container(database_dir, mysql_config):
                return False

        ser_directory = get_ser_directory()
        if not ser_directory:
            return False

        api_config = get_api_config()

        clients_dir = install_dir if mysql_exists and not existing_dir else str(Path(install_dir) / config.PASTA_CLIENTES)
        client_slug = configure_client(clients_dir, mysql_config, api_config)
        if not client_slug:
            print_error("Falha ao configurar cliente")
            return False

        mysql_config['database'] = f"sgbi_{client_slug}"

        if not configure_sgvx_system(ser_directory, mysql_config):
            return False

        print_step(8, "Finalização")
        print_success("🎉 Instalação Completa concluída com sucesso!")
        print("\n📋 Resumo da Instalação:")
        print(f"   🗄️  MySQL: {mysql_config['host']}:{mysql_config['port']}")
        print(f"   📁 Diretório: {install_dir}")
        print(f"   🌐 API Rest: {api_config['host']}:{api_config['port']}")
        print(f"   📂 SER: {ser_directory}")
        return True

    except Exception as e:
        print_error(f"Erro durante instalação completa: {e}")
        return False


def install_client() -> bool:
    try:
        print_step(0, "INSTALAÇÃO DE CLIENTE", "Instalando cliente SGBI v2 em banco existente")

        if not verify_dependencies():
            return False

        mysql_config = get_mysql_connection_config()
        if not mysql_config:
            return False

        clients_base = get_clients_base_directory()

        ser_directory = get_ser_directory()
        if not ser_directory:
            return False

        api_config = get_api_config()

        client_slug = configure_client(clients_base, mysql_config, api_config)
        if not client_slug:
            print_error("Falha ao configurar cliente")
            return False

        mysql_config['database'] = f"sgbi_{client_slug}"

        if not configure_sgvx_system(ser_directory, mysql_config):
            return False

        print_step(6, "Finalização")
        print_success("🎉 Cliente SGBI v2 instalado com sucesso!")
        print("\n📋 Resumo da Instalação:")
        print(f"   🗄️  MySQL: {mysql_config['host']}:{mysql_config['port']}")
        print(f"   📁 Diretório: {clients_base}")
        print(f"   🌐 API Rest: {api_config['host']}:{api_config['port']}")
        print(f"   📂 SER: {ser_directory}")
        return True

    except Exception as e:
        print_error(f"Erro durante instalação do cliente: {e}")
        return False


def prepare_database() -> bool:
    try:
        print_step(0, "PREPARAÇÃO DO BANCO", "Criando apenas o banco MySQL compartilhado")

        if not verify_dependencies():
            return False

        exists, existing_dir = find_existing_mysql()

        if exists and existing_dir:
            print_success(f"Container {config.CONTAINER_MYSQL} encontrado.")
            database_dir = existing_dir
            install_dir = str(Path(existing_dir).parent)
        elif exists:
            print_error(f"O container {config.CONTAINER_MYSQL} existe, mas não foi criado por docker-compose. Nada a fazer.")
            return False
        else:
            print("ℹ️ Nenhum container MySQL existente encontrado. Criando um novo...")
            install_dir = setup_installation_directory()
            database_dir = str(Path(install_dir) / "banco")

        mysql_config = configure_mysql_compose(database_dir)

        if not start_mysql_container(database_dir, mysql_config):
            return False

        print_step(4, "Finalização")
        print_success("🎉 Banco MySQL configurado com sucesso!")
        print("\n📋 Informações de Conexão:")
        print(f"   🖥️  Host: {mysql_config['host']}")
        print(f"   🔌 Porta: {mysql_config['port']}")
        print("   👤 Usuário: root")
        print(f"   📁 Diretório: {install_dir}")
        print("\n💡 Próximos passos:")
        print("   Use a 'Opção 2 - Instalar Cliente' para adicionar clientes SGBI v2")
        return True

    except Exception as e:
        print_error(f"Erro durante preparação do banco: {e}")
        return False


def update_system() -> bool:
    try:
        print_step(0, "ATUALIZAÇÃO DE SISTEMA", "Atualizando versão do software cliente SGBI v2")

        if not verify_dependencies():
            return False

        clients_directory = get_clients_base_directory("Escolha o diretório onde o(s) cliente(s) está(ão) instalado(s):")

        print_step(1, "Verificação de Clientes Instalados")
        clients_list = list_installed_clients(clients_directory)
        if not clients_list:
            print_error("Nenhum cliente SGBI v2 instalado foi encontrado no diretório especificado.")
            print_warning(f"Verifique se existem clientes instalados em: {clients_directory}")
            return False

        print_step(2, "Seleção do Cliente")
        selected_client = choose_client_to_update(clients_list)
        if not selected_client:
            print_warning("Operação cancelada ou nenhum cliente selecionado.")
            return False

        client_name = selected_client['name']
        current_version = selected_client['version']
        client_path = selected_client['path']

        print_step(3, "Seleção da Nova Versão")
        selected_version = choose_version_to_install(current_version)
        if not selected_version:
            print_warning("Operação cancelada ou nenhuma versão selecionada.")
            return False

        print_step(4, "Download da Nova Imagem")
        if not pull_image(selected_version):
            return False

        print_step(5, "Atualização da Configuração")
        if not update_client_docker_compose(client_path, selected_version):
            print_error("Falha ao atualizar arquivo de configuração do cliente.")
            return False

        print_step(6, "Reinicialização do Container")
        if not restart_client_container(client_path):
            print_error("Falha ao reiniciar container do cliente.")
            print_warning("O cliente pode estar em estado inconsistente.")
            print_warning(f"Para voltar, restaure {client_path}/docker-compose.yml.backup e rode '{DOCKER_COMPOSE_CMD} up -d'.")
            return False

        port = client_port(client_path)
        if port:
            print("⏳ Aguardando aplicação ficar pronta...")
            if not wait_http_ready(port):
                print_warning("A aplicação ainda não respondeu. Veja o que está acontecendo com:")
                print(f"   docker logs --tail 50 {config.PREFIXO_CONTAINER}{client_name}")

        print_step(7, "Finalização")
        print_update_success(client_name, current_version, selected_version)
        return True

    except KeyboardInterrupt:
        print_error("\nOperação interrompida pelo usuário.")
        return False
    except Exception as e:
        print_error(f"Erro durante atualização do sistema: {e}")
        return False

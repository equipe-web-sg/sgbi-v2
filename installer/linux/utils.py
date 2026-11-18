#!/usr/bin/env python3
"""
Funções úteis para o instalador do SGBI v2.

Compatível com Python 3.8 (o instalador "legado" é compilado no Ubuntu 16.04): nada de
`list[str]`, `X | None` ou `str.removeprefix`.
"""

import os
import json
import sys
import time
import shutil
import socket
import subprocess
import re
import ftplib
import secrets
import urllib.request
from pathlib import Path
from typing import Optional, Tuple, Dict, List

import config

try:
    from rich.panel import Panel
    from rich.prompt import Prompt
    from rich.console import Console

    console = Console()
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False


# --------------------------------------------------------------------------- saída

def print_success(message: str) -> None:
    if RICH_AVAILABLE:
        console.print(f"✅ {message}", style="bold green")
    else:
        print(f"✅ {message}")


def print_error(message: str) -> None:
    if RICH_AVAILABLE:
        console.print(f"❌ {message}", style="bold red")
    else:
        print(f"❌ {message}")


def print_warning(message: str) -> None:
    if RICH_AVAILABLE:
        console.print(f"⚠️ {message}", style="bold yellow")
    else:
        print(f"⚠️ {message}")


def print_step(step_number: int, title: str, description: str = "") -> None:
    if RICH_AVAILABLE:
        step_text = f"Passo {step_number}: {title}"
        if description:
            step_text += f"\n{description}"
        console.print(Panel(step_text, border_style="blue"))
    else:
        print(f"\n=== PASSO {step_number}: {title.upper()} ===")
        if description:
            print(description)


def get_user_input(prompt: str, default: str = "") -> str:
    if RICH_AVAILABLE:
        if default:
            return Prompt.ask(prompt, default=default)
        return Prompt.ask(prompt)
    if default:
        user_input = input(f"{prompt} [{default}]: ").strip()
        return user_input if user_input else default
    return input(f"{prompt}: ").strip()


def confirm_action(prompt: str) -> bool:
    if RICH_AVAILABLE:
        while True:
            console.print(f"[bold]{prompt}[/bold] [dim](Sim/Não)[/dim]: ", end="")
            response = input().lower().strip()
            if response in ['s', 'sim']:
                return True
            if response in ['n', 'não', 'nao']:
                return False
            console.print("[red]Por favor, responda 'Sim' ou 'Não'.[/red]")
    else:
        while True:
            response = input(f"{prompt} (s/n): ").lower().strip()
            if response in ['s', 'sim', 'y', 'yes']:
                return True
            if response in ['n', 'não', 'nao', 'no']:
                return False
            print("Por favor, responda 's' para sim ou 'n' para não.")


# --------------------------------------------------------------------------- comandos

def run_command(command: str, capture_output: bool = True, check: bool = False) -> subprocess.CompletedProcess:
    try:
        return subprocess.run(
            command,
            shell=True,
            capture_output=capture_output,
            text=True,
            check=check
        )
    except subprocess.CalledProcessError as e:
        print_error(f"Erro ao executar comando: {command}")
        print(f"Saída de erro: {e.stderr}")
        raise


def check_command_exists(command: str) -> bool:
    return run_command(f"which {command}", capture_output=True).returncode == 0


def check_curl_installed() -> bool:
    return check_command_exists("curl")


def install_curl() -> bool:
    try:
        print("📦 Instalando cURL...")
        run_command("apt-get update -qq", check=True)
        run_command("apt-get install -y curl", check=True)
        return check_curl_installed()
    except subprocess.CalledProcessError:
        print_error("Falha na instalação do cURL")
        return False


def check_docker_installed() -> Tuple[bool, str]:
    """(docker instalado, comando do compose: 'docker-compose', 'docker compose' ou '')."""
    if not check_command_exists("docker"):
        return False, ""

    if check_command_exists("docker-compose"):
        return True, "docker-compose"

    if run_command("docker compose version", capture_output=True).returncode == 0:
        return True, "docker compose"
    return True, ""


def install_docker() -> bool:
    try:
        print("🐳 Instalando Docker...")
        run_command("curl -fsSL https://get.docker.com -o get-docker.sh", check=True)
        run_command("sh get-docker.sh", check=True)

        if Path("get-docker.sh").exists():
            Path("get-docker.sh").unlink()

        print("🔧 Configurando Docker daemon...")
        run_command("systemctl start docker", check=True)
        run_command("systemctl enable docker", check=True)
        time.sleep(3)

        installed, _ = check_docker_installed()
        return installed
    except subprocess.CalledProcessError:
        print_error("Falha na instalação do Docker")
        return False


# --------------------------------------------------------------------------- credenciais

def load_credentials(section: str) -> Dict[str, str]:
    """
    Uma seção ("docker" ou "ftp") do `resources/credentials.json`, embutido ao compilar o
    instalador (fora do git; o modelo é `credentials-example.json`). Devolve só textos já
    sem espaços nas pontas; arquivo ausente, inválido ou sem a seção vira {}.
    """
    try:
        with open(resource_path("credentials.json"), "r", encoding="utf-8") as f:
            data = json.load(f)
        values = data.get(section, {})
        if not isinstance(values, dict):
            return {}
        return {str(key): str(value).strip() for key, value in values.items() if value is not None}
    except (OSError, ValueError, AttributeError):
        return {}


# --------------------------------------------------------------------------- Docker Hub

def get_docker_credentials() -> Tuple[str, str]:
    """
    Usuário e token do Docker Hub para baixar a imagem (repositório privado). Em ordem:
    1. variáveis SGBI_DOCKER_USER / SGBI_DOCKER_TOKEN;
    2. seção "docker" do `resources/credentials.json` ({"user": "...", "token": "..."});
    3. pergunta ao técnico.
    O token nunca fica no código-fonte.
    """
    user = os.environ.get("SGBI_DOCKER_USER", "").strip()
    token = os.environ.get("SGBI_DOCKER_TOKEN", "").strip()

    # Campo a campo: o que a variável de ambiente não informar vem do arquivo.
    data = load_credentials("docker")
    user = user or data.get("user", "")
    token = token or data.get("token", "")

    user = user or config.DOCKER_USUARIO_PADRAO
    if not token:
        print_warning("Credencial do Docker Hub não encontrada no instalador.")
        user = get_user_input("Usuário do Docker Hub", user)
        import getpass
        token = getpass.getpass("Token/senha do Docker Hub: ").strip()
    return user, token


def docker_login() -> bool:
    print("🔐 Efetuando login no Docker...")
    try:
        user, token = get_docker_credentials()
        if not token:
            print_error("Token do Docker Hub não informado.")
            return False

        # A senha vai pela entrada padrão: não aparece na lista de processos.
        result = subprocess.run(
            ["docker", "login", "-u", user, "--password-stdin"],
            input=token, capture_output=True, text=True
        )
        if result.returncode == 0:
            print_success("Login no Docker efetuado com sucesso!")
            return True

        print_error("Falha ao efetuar login no Docker!")
        print_error("Por favor, entre em contato com o suporte técnico.")
        return False
    except Exception as e:
        print_error(f"Erro ao tentar login no Docker: {e}")
        print_error("Por favor, entre em contato com o suporte técnico.")
        return False


def docker_container_exists(name: str) -> bool:
    result = run_command(f"docker inspect --type container {name}", capture_output=True)
    return result.returncode == 0


def find_container_compose_dir(name: str) -> Optional[str]:
    """
    Pasta do docker-compose.yml que criou o container `name` (label do próprio
    compose, que existe em qualquer versão), ou None se o container não existe ou
    não veio de um compose.
    """
    result = run_command(
        f"docker inspect --type container -f "
        f"'{{{{index .Config.Labels \"com.docker.compose.project.working_dir\"}}}}' {name}",
        capture_output=True
    )
    if result.returncode != 0:
        return None
    folder = result.stdout.strip()
    return folder if folder and folder != "<no value>" else None


# --------------------------------------------------------------------------- pastas e arquivos

def validate_directory_exists(directory_path: str) -> bool:
    path = Path(directory_path)
    return path.exists() and path.is_dir()


def validate_dbf_files(directory_path: str) -> bool:
    if not validate_directory_exists(directory_path):
        return False
    path = Path(directory_path)
    return len(list(path.glob("*.dbf")) + list(path.glob("*.DBF"))) > 0


def validate_sg_files(directory_path: str) -> Tuple[bool, List[str]]:
    if not validate_directory_exists(directory_path):
        return False, ["Diretório não existe"]

    path = Path(directory_path)
    missing_files = [f for f in config.ARQUIVOS_SG_OBRIGATORIOS if not (path / f).exists()]
    return len(missing_files) == 0, missing_files


def create_directory_structure(base_path: str, subdirs: List[str]) -> bool:
    try:
        base = Path(base_path)
        base.mkdir(parents=True, exist_ok=True)
        for subdir in subdirs:
            (base / subdir).mkdir(parents=True, exist_ok=True)
        return True
    except PermissionError:
        print_error(f"Sem permissão para criar diretórios em {base_path}")
        return False
    except Exception as e:
        print_error(f"Erro ao criar diretórios: {e}")
        return False


def resource_path(resource_name: str) -> Path:
    """Arquivo de `resources/`, dentro do executável (PyInstaller) ou ao lado do código."""
    try:
        base_path = Path(sys._MEIPASS)  # type: ignore[attr-defined]
    except Exception:
        base_path = Path(os.path.dirname(os.path.abspath(__file__)))
    return base_path / "resources" / resource_name


def copy_embedded_file(resource_name: str, destination_path: str) -> bool:
    try:
        source = resource_path(resource_name)
        dest_path = Path(destination_path)

        if not source.exists():
            print_error(f"Arquivo de recurso não encontrado: {resource_name}")
            return False

        dest_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, dest_path)

        if dest_path.exists():
            print_success(f"Arquivo copiado: {resource_name} → {destination_path}")
            return True
        return False
    except Exception as e:
        print_error(f"Erro ao copiar arquivo: {e}")
        return False


def get_machine_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"


def is_port_free(port: str) -> bool:
    """True se nada neste servidor escuta na porta (o Docker publica a porta no host)."""
    try:
        number = int(port)
    except ValueError:
        return False
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind(("0.0.0.0", number))
            return True
        except OSError:
            return False


def wait_http_ready(port: str, path: str = "/login", timeout: int = 90) -> bool:
    """Espera o SGBI responder (a rota /login é pública)."""
    url = f"http://127.0.0.1:{port}{path}"
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=3) as response:
                if response.status < 500:
                    return True
        except Exception:
            pass
        time.sleep(2)
    return False


# --------------------------------------------------------------------------- templates e compose

def replace_template_variables(template_content: str, variables: Dict[str, str]) -> str:
    content = template_content
    for variable_name, variable_value in variables.items():
        content = content.replace("{{" + variable_name + "}}", str(variable_value))
    return content


def sanitize_slug(raw: str) -> str:
    """
    Slug do cliente: só letras, números, `_` e `-`, em minúsculas. Vira o nome da
    pasta, do container (`sgbi-v2-<slug>`), do banco (`sgbi_<slug>`), a variável
    `CLIENT_SLUG` e parte do nome do cookie de sessão.
    """
    return re.sub(r'[^a-zA-Z0-9_-]', '', raw).lower()


# Regra de tag do próprio Docker: até 128 caracteres de letras, números, `_`, `.` e `-`,
# sem começar por `.` ou `-`. Qualquer nome que respeite isso serve (`1.0.0`, `teste`,
# `homologation`, `carlera-rc1`...). A validação continua porque a tag entra num comando
# de shell (`docker pull`): espaço, `;` ou `$` quebrariam ou executariam outra coisa.
TAG_PATTERN = re.compile(r'[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}')


def is_valid_version(tag: str) -> bool:
    """True se `tag` é um nome de tag válido para o Docker."""
    return TAG_PATTERN.fullmatch(tag) is not None


def generate_jwt_secret() -> str:
    """Segredo que assina o cookie de sessão (um por cliente; o v2 exige 32+ caracteres)."""
    return secrets.token_urlsafe(32)


_IMAGE_PATTERN = r'(image:\s*["\']?' + re.escape(config.IMAGEM_SGBI) + r':)([^"\'\s]+)(["\']?)'


def get_compose_image_version(compose_content: str) -> Optional[str]:
    match = re.search(_IMAGE_PATTERN, compose_content)
    return match.group(2) if match else None


def set_compose_image_version(compose_content: str, new_version: str) -> str:
    """Troca a tag da imagem do v2. Não mexe em nada além dela."""
    return re.sub(_IMAGE_PATTERN, lambda m: f"{m.group(1)}{new_version}{m.group(3)}", compose_content, count=1)


def compose_has_env_var(compose_content: str, name: str) -> bool:
    return re.search(r'^\s*-\s*' + re.escape(name) + r'=', compose_content, re.MULTILINE) is not None


def add_compose_env_var(compose_content: str, name: str, value: str) -> str:
    """
    Acrescenta `- NOME=valor` ao fim da lista `environment:` (com a mesma indentação),
    se ainda não existir. Usado para dar o JWT_SECRET a um compose sem ele.
    """
    if compose_has_env_var(compose_content, name):
        return compose_content

    lines = compose_content.split("\n")
    env_index = next((i for i, ln in enumerate(lines) if re.match(r'^\s*environment:\s*$', ln)), None)
    if env_index is None:
        return compose_content

    last = env_index
    indent = None
    for i in range(env_index + 1, len(lines)):
        item = re.match(r'^(\s*)-\s*\S', lines[i])
        if item:
            indent = item.group(1)
            last = i
        elif lines[i].strip() == "" or lines[i].lstrip().startswith("#"):
            continue
        else:
            break

    if indent is None:
        indent = re.match(r'^(\s*)', lines[env_index]).group(1) + "  "
    lines.insert(last + 1, f"{indent}- {name}={value}")
    return "\n".join(lines)


def ensure_docker_compose_version(file_path: str, is_legacy: bool = False) -> bool:
    """Garante o cabeçalho `version: '3'` no perfil legado (docker-compose antigo)."""
    try:
        path = Path(file_path)
        if not path.exists():
            return False

        raw = path.read_bytes()
        bom = "﻿" if raw.startswith(b"\xef\xbb\xbf") else ""
        text = raw.decode("utf-8-sig")

        first_line = next((ln for ln in text.splitlines() if ln.strip() and not ln.lstrip().startswith("#")), None)
        if first_line is not None and first_line.lstrip().lower().startswith("version:"):
            return True

        backup = path.with_suffix(path.suffix + ".bak")
        if not backup.exists():
            shutil.copy2(path, backup)

        insert_line = "version: '3'\n" if is_legacy else ""
        path.write_text(bom + insert_line + text, encoding="utf-8")
        return True
    except Exception as e:
        print_error(f"Erro ao garantir versão do docker-compose: {e}")
        return False


def backup_file(file_path: str) -> Optional[str]:
    try:
        if not Path(file_path).exists():
            return None
        backup_path = f"{file_path}.backup.{int(time.time())}"
        shutil.copy2(file_path, backup_path)
        print_success(f"Backup criado: {backup_path}")
        return backup_path
    except Exception as e:
        print_error(f"Erro ao criar backup: {e}")
        return None


def create_apirest_config(ser_directory: str, config_values: Dict[str, str]) -> bool:
    """`sgapirest/apirestview-config.json` no SER: diz ao headquarter em qual banco gravar."""
    try:
        config_dir = Path(ser_directory) / "sgapirest"
        config_file = config_dir / "apirestview-config.json"
        config_dir.mkdir(parents=True, exist_ok=True)

        if config_file.exists():
            if not confirm_action("Arquivo apirestview-config.json já existe. Sobrescrever?"):
                print("Mantendo configuração existente...")
                return True
            backup_file(str(config_file))

        template_path = resource_path("apirest-template.txt")
        if not template_path.exists():
            print_error(f"Template não encontrado: {template_path}")
            return False

        with open(template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()

        variables = {
            "DB_HOST": config_values.get("host"),
            "DB_PORT": config_values.get("port"),
            "DB_USER": "root",
            "DB_DATABASE": config_values.get("database"),
            "DB_PASSWORD": config_values.get("password")
        }
        final_content = replace_template_variables(template_content, variables)

        try:
            json.loads(final_content)
        except json.JSONDecodeError as e:
            print_error(f"JSON resultante é inválido: {e}")
            return False

        with open(config_file, 'w', encoding='utf-8') as f:
            f.write(final_content)

        print_success(f"Arquivo criado: {config_file}")
        return True
    except Exception as e:
        print_error(f"Erro ao criar apirestview-config.json: {e}")
        return False


# --------------------------------------------------------------------------- MySQL

def test_mysql_connection(host: str, port: str, user: str, password: str) -> bool:
    import mysql.connector
    try:
        connection = mysql.connector.connect(
            host=host, port=int(port), user=user, password=password, connect_timeout=10
        )
        connection.close()
        return True
    except mysql.connector.Error as e:
        print_error(f"Erro de conexão MySQL: {e}")
        return False
    except Exception as e:
        print_error(f"Erro inesperado ao conectar MySQL: {e}")
        return False


def create_database(host: str, port: str, user: str, password: str, database_name: str) -> bool:
    """Cria o banco se não existir. Se já existe (cliente que veio do SGBI antigo), segue."""
    import mysql.connector
    try:
        connection = mysql.connector.connect(host=host, port=int(port), user=user, password=password)
        cursor = connection.cursor()
        cursor.execute("CREATE DATABASE IF NOT EXISTS `{}`".format(database_name.replace("`", "``")))
        connection.commit()
        cursor.close()
        connection.close()
        return True
    except mysql.connector.Error as e:
        print_error(f"Erro ao criar database: {e}")
        return False
    except Exception as e:
        print_error(f"Erro inesperado ao criar database: {e}")
        return False


def database_has_tables(host: str, port: str, user: str, password: str, database_name: str) -> bool:
    """True se o banco já tem tabelas (cliente em transição do SGBI antigo)."""
    import mysql.connector
    try:
        connection = mysql.connector.connect(host=host, port=int(port), user=user, password=password)
        cursor = connection.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = %s", (database_name,)
        )
        count = cursor.fetchone()[0]
        cursor.close()
        connection.close()
        return count > 0
    except Exception:
        return False


# --------------------------------------------------------------------------- libmysqlclient (headquarter)

LIB_FILENAME = "libmysqlclient.so.18.1.0"


def libmysqlclient_dir(ser_directory: str) -> Path:
    """Onde o headquarter procura a lib: `<SER>/dll/x64/sgdbc/mysql` (criada se não existir)."""
    return Path(ser_directory) / "dll" / "x64" / "sgdbc" / "mysql"


def libmysqlclient_present(ser_directory: str) -> bool:
    target_file = libmysqlclient_dir(ser_directory) / LIB_FILENAME
    return target_file.exists() and target_file.stat().st_size > 0


def get_ftp_credentials() -> Optional[Dict[str, str]]:
    """
    Credenciais do FTP da SG onde fica a lib, ou None. Em ordem:
    1. variáveis SGBI_FTP_HOST / SGBI_FTP_USER / SGBI_FTP_PASS (e SGBI_FTP_REMOTE_DIR);
    2. seção "ftp" do `resources/credentials.json` ({"host": "...", "user": "...", "pass": "...",
       "dir": "..." opcional}), embutido ao compilar o instalador.
    """
    values = {
        "host": os.environ.get("SGBI_FTP_HOST", "").strip(),
        "user": os.environ.get("SGBI_FTP_USER", "").strip(),
        "pass": os.environ.get("SGBI_FTP_PASS", "").strip(),
        "dir": os.environ.get("SGBI_FTP_REMOTE_DIR", "").strip(),
    }

    if not (values["host"] and values["user"] and values["pass"]):
        data = load_credentials("ftp")
        for key in values:
            values[key] = values[key] or data.get(key, "")

    if not (values["host"] and values["user"] and values["pass"]):
        return None
    values["dir"] = values["dir"] or "/linux/ubuntu-libmysqlx64"
    return values


def setup_libmysqlclient(ser_directory: str) -> bool:
    """Plano B: copia a libmysqlclient embutida no instalador (se houver) para a pasta de DLLs do SER."""
    try:
        dll_dir = libmysqlclient_dir(ser_directory)
        dll_dir.mkdir(parents=True, exist_ok=True)

        if libmysqlclient_present(ser_directory):
            print_success(f"{LIB_FILENAME} já existe")
            return True

        source_file = resource_path(LIB_FILENAME)
        if not source_file.exists():
            print_warning(f"{LIB_FILENAME} não está embutida no instalador")
            return False

        target_file = dll_dir / LIB_FILENAME
        shutil.copy2(source_file, target_file)
        os.chmod(target_file, 0o755)
        print_success(f"{LIB_FILENAME} configurada com sucesso")
        return target_file.exists()
    except Exception as e:
        print_error(f"Erro ao configurar libmysqlclient: {e}")
        return False


def download_libmysqlclient_via_ftp(ser_directory: str, filename: str = LIB_FILENAME) -> bool:
    try:
        dll_dir = libmysqlclient_dir(ser_directory)
        dll_dir.mkdir(parents=True, exist_ok=True)

        target_file = dll_dir / filename
        if target_file.exists() and target_file.stat().st_size > 0:
            print_success(f"{filename} já existe em {target_file}")
            return True

        credentials = get_ftp_credentials()
        if not credentials:
            print_warning("Credenciais do FTP não informadas (SGBI_FTP_HOST, SGBI_FTP_USER e SGBI_FTP_PASS, "
                          "ou a seção ftp do resources/credentials.json no instalador).")
            return False

        attempts = 3
        for attempt in range(1, attempts + 1):
            try:
                with ftplib.FTP() as ftp:
                    ftp.connect(credentials["host"], 21, timeout=10)
                    ftp.login(credentials["user"], credentials["pass"])
                    ftp.cwd(credentials["dir"])

                    if filename not in ftp.nlst():
                        raise FileNotFoundError(f"{filename} não encontrado no FTP {credentials['dir']}")

                    with open(target_file, 'wb') as f:
                        ftp.retrbinary(f'RETR {filename}', f.write)

                os.chmod(target_file, 0o755)
                if target_file.stat().st_size == 0:
                    raise IOError("Arquivo baixado tem tamanho 0")

                print_success(f"{filename} baixado com sucesso para {target_file}")
                return True
            except (ftplib.all_errors, socket.timeout, FileNotFoundError, IOError) as e:
                print_warning(f"Tentativa {attempt}/{attempts} falhou: {e}")
                if attempt == attempts:
                    print_error("Falha ao baixar do FTP após várias tentativas")
                    return False
                time.sleep(2 ** attempt)
        return False
    except Exception as e:
        print_error(f"Erro ao preparar download via FTP: {e}")
        return False


def ensure_libmysqlclient(ser_directory: str) -> bool:
    """
    Garante a libmysqlclient em `<SER>/dll/x64/sgdbc/mysql`: se já está lá, não faz nada;
    senão baixa do FTP e, por último, usa a embutida no instalador.
    """
    if libmysqlclient_present(ser_directory):
        print_success(f"{LIB_FILENAME} já existe em {libmysqlclient_dir(ser_directory)}")
        return True

    print(f"Procurando {LIB_FILENAME} em {libmysqlclient_dir(ser_directory)}... não encontrada.")
    print("🔧 Baixando libmysqlclient via FTP...")
    if download_libmysqlclient_via_ftp(ser_directory):
        return True

    print_warning("Falha no download FTP, tentando recurso local...")
    return setup_libmysqlclient(ser_directory)


# --------------------------------------------------------------------------- sistema

def get_ubuntu_version() -> Optional[float]:
    try:
        with open("/etc/os-release", "r", encoding="utf-8") as f:
            content = f.read()
        match = re.search(r'VERSION_ID\s*=\s*"?(\d+(?:\.\d+)?)"?', content)
        if match:
            return float(match.group(1))
    except Exception:
        pass
    return None


LEGACY_UBUNTU_PROFILE = False


def set_legacy_profile(is_legacy: bool) -> None:
    global LEGACY_UBUNTU_PROFILE
    LEGACY_UBUNTU_PROFILE = bool(is_legacy)


def get_legacy_profile() -> bool:
    return bool(LEGACY_UBUNTU_PROFILE)

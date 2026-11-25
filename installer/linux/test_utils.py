"""
Testes das funções puras do instalador (sem Docker, MySQL nem rede).
Rodar: `python3 -m unittest -v` nesta pasta (só biblioteca padrão).
"""
import contextlib
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import config
import utils

VARIAVEIS_DE_CREDENCIAL = (
    "SGBI_DOCKER_USER", "SGBI_DOCKER_TOKEN",
    "SGBI_FTP_HOST", "SGBI_FTP_USER", "SGBI_FTP_PASS", "SGBI_FTP_REMOTE_DIR",
)


@contextlib.contextmanager
def recursos_falsos(credentials=None):
    """
    Isola o teste das credenciais reais da máquina: `resources/` vira uma pasta temporária
    (com `credentials.json` só se `credentials` for dado) e as variáveis SGBI_* somem.
    """
    with tempfile.TemporaryDirectory() as pasta:
        if credentials is not None:
            conteudo = credentials if isinstance(credentials, str) else json.dumps(credentials)
            (Path(pasta) / "credentials.json").write_text(conteudo, encoding="utf-8")
        ambiente = {nome: valor for nome, valor in os.environ.items() if nome not in VARIAVEIS_DE_CREDENCIAL}
        with mock.patch.object(utils, "resource_path", lambda nome: Path(pasta) / nome), \
                mock.patch.dict(os.environ, ambiente, clear=True):
            yield Path(pasta)

COMPOSE = """version: '3'
services:
  sgbi:
    image: sgsistemas/sgbi-v2:homologation
    restart: unless-stopped
    container_name: sgbi-v2-acme
    ports:
      - 9100:3000
    environment:
      - API_VIEW=http://10.0.0.5:8069
      - DB_HOST=10.0.0.5
      - CLIENT_SLUG=acme
"""


class Slug(unittest.TestCase):
    def test_remove_caracteres_invalidos_e_poe_em_minusculas(self):
        self.assertEqual(utils.sanitize_slug("Meu Cliente Ltda."), "meuclienteltda")
        self.assertEqual(utils.sanitize_slug("Açougue São José"), "aouguesojos")

    def test_mantem_hifen_e_sublinhado(self):
        self.assertEqual(utils.sanitize_slug("loja-01_matriz"), "loja-01_matriz")

    def test_vazio_quando_nao_sobra_nada(self):
        self.assertEqual(utils.sanitize_slug("@#$ /"), "")

    def test_slug_serve_de_nome_de_cookie_e_de_banco(self):
        slug = utils.sanitize_slug("Cliente; Com/Lixo=1")
        self.assertRegex(slug, r"^[a-z0-9_-]+$")


class Versao(unittest.TestCase):
    def test_aceita_qualquer_nome_de_tag_do_docker(self):
        for tag in ("1.0.0", "12.34.56", "homologation", "teste", "carlera", "v1.0", "1.0.0-rc1", "latest", "Minha_Tag-2", "_x", "a" * 128):
            self.assertTrue(utils.is_valid_version(tag), tag)

    def test_recusa_o_que_o_docker_recusa_ou_quebraria_o_shell(self):
        for tag in ("", " ", "tag com espaco", "1.0.0 ", "1.0.0\n", "-x", ".x", "a:b", "a/b", "../x", "x;rm -rf /", "x$(id)", "x`id`", "x&y", "x|y", "açaí", "a" * 129):
            self.assertFalse(utils.is_valid_version(tag), repr(tag))


class JwtSecret(unittest.TestCase):
    def test_tem_o_tamanho_que_o_v2_exige_e_e_diferente_a_cada_vez(self):
        primeiro, segundo = utils.generate_jwt_secret(), utils.generate_jwt_secret()
        self.assertGreaterEqual(len(primeiro), 32)
        self.assertNotEqual(primeiro, segundo)
        self.assertRegex(primeiro, r"^[A-Za-z0-9_-]+$")  # sem nada que o YAML ou o compose interpretem


class ImagemNoCompose(unittest.TestCase):
    def test_le_a_versao(self):
        self.assertEqual(utils.get_compose_image_version(COMPOSE), "homologation")

    def test_troca_so_a_tag(self):
        novo = utils.set_compose_image_version(COMPOSE, "1.2.3")
        self.assertEqual(utils.get_compose_image_version(novo), "1.2.3")
        self.assertEqual(novo.replace("1.2.3", "homologation"), COMPOSE)

    def test_ignora_compose_do_sgbi_antigo(self):
        antigo = COMPOSE.replace("sgsistemas/sgbi-v2:", "sgsistemas/sgbi:")
        self.assertIsNone(utils.get_compose_image_version(antigo))
        self.assertEqual(utils.set_compose_image_version(antigo, "9.9.9"), antigo)

    def test_aceita_imagem_entre_aspas(self):
        com_aspas = COMPOSE.replace("sgbi-v2:homologation", 'sgbi-v2:homologation"').replace("image: ", 'image: "')
        self.assertEqual(utils.get_compose_image_version(com_aspas), "homologation")
        self.assertIn('sgbi-v2:2.0.0"', utils.set_compose_image_version(com_aspas, "2.0.0"))


class VariavelNoCompose(unittest.TestCase):
    def test_acrescenta_no_fim_da_lista_com_a_mesma_indentacao(self):
        novo = utils.add_compose_env_var(COMPOSE, "JWT_SECRET", "abc")
        self.assertTrue(novo.endswith("      - CLIENT_SLUG=acme\n      - JWT_SECRET=abc\n") or "      - JWT_SECRET=abc" in novo)
        self.assertTrue(utils.compose_has_env_var(novo, "JWT_SECRET"))
        # nada além da linha nova mudou
        self.assertEqual(novo.replace("      - JWT_SECRET=abc\n", ""), COMPOSE)

    def test_nao_duplica(self):
        uma_vez = utils.add_compose_env_var(COMPOSE, "JWT_SECRET", "abc")
        self.assertEqual(utils.add_compose_env_var(uma_vez, "JWT_SECRET", "outro"), uma_vez)

    def test_environment_no_meio_do_arquivo(self):
        texto = "services:\n  a:\n    environment:\n      - X=1\n    restart: always\n"
        novo = utils.add_compose_env_var(texto, "Y", "2")
        self.assertEqual(novo, "services:\n  a:\n    environment:\n      - X=1\n      - Y=2\n    restart: always\n")

    def test_sem_environment_nao_mexe(self):
        texto = "services:\n  a:\n    image: x\n"
        self.assertEqual(utils.add_compose_env_var(texto, "Y", "2"), texto)

    def test_nome_parecido_nao_conta_como_existente(self):
        self.assertFalse(utils.compose_has_env_var("      - MY_JWT_SECRET=1\n", "JWT_SECRET"))


class Templates(unittest.TestCase):
    def test_template_do_cliente_fica_sem_marcador_e_com_o_que_o_v2_exige(self):
        modelo = (Path(__file__).parent / "resources" / "docker-sgbi.yml").read_text(encoding="utf-8")
        final = utils.replace_template_variables(modelo, {
            "SGBI_VERSION": "1.0.0", "CLIENT_SLUG": "acme", "SGBI_PORT": "9100",
            "API_HOST": "http://10.0.0.5", "API_PORT": "8069", "DB_HOST": "10.0.0.5",
            "DB_PASSWORD": "segredo", "DB_DATABASE": "sgbi_acme", "DB_PORT": "3333",
            "JWT_SECRET": "x" * 43,
        })
        self.assertNotIn("{{", final)
        for esperado in (
            "image: sgsistemas/sgbi-v2:1.0.0", "container_name: sgbi-v2-acme", "- 9100:3000",
            "- API_VIEW=http://10.0.0.5:8069", "- DB_DATABASE=sgbi_acme", "- CLIENT_SLUG=acme",
        ):
            self.assertIn(esperado, final)
        self.assertTrue(utils.compose_has_env_var(final, "JWT_SECRET"))

    def test_toda_variavel_do_template_e_preenchida_pelo_fluxo(self):
        import re
        fluxo = (Path(__file__).parent / "flows.py").read_text(encoding="utf-8")
        modelo = (Path(__file__).parent / "resources" / "docker-sgbi.yml").read_text(encoding="utf-8")
        for nome in set(re.findall(r"\{\{(\w+)\}\}", modelo)):
            self.assertIn(f'"{nome}"', fluxo, f"{nome} não é preenchida em flows.py")


class ComposeLegado(unittest.TestCase):
    def test_acrescenta_version_so_no_perfil_legado_e_so_se_faltar(self):
        with tempfile.TemporaryDirectory() as pasta:
            arquivo = Path(pasta) / "docker-compose.yml"
            arquivo.write_text("services:\n  a:\n    image: x\n", encoding="utf-8")
            self.assertTrue(utils.ensure_docker_compose_version(str(arquivo), is_legacy=True))
            self.assertTrue(arquivo.read_text(encoding="utf-8").startswith("version: '3'\n"))
            antes = arquivo.read_text(encoding="utf-8")
            self.assertTrue(utils.ensure_docker_compose_version(str(arquivo), is_legacy=True))
            self.assertEqual(arquivo.read_text(encoding="utf-8"), antes)

    def test_perfil_moderno_nao_altera(self):
        with tempfile.TemporaryDirectory() as pasta:
            arquivo = Path(pasta) / "docker-compose.yml"
            texto = "services:\n  a:\n    image: x\n"
            arquivo.write_text(texto, encoding="utf-8")
            utils.ensure_docker_compose_version(str(arquivo), is_legacy=False)
            self.assertEqual(arquivo.read_text(encoding="utf-8"), texto)


class LibMysqlClient(unittest.TestCase):
    """A lib fica em <SER>/dll/x64/sgdbc/mysql (onde o headquarter procura), não na pasta de instalação."""

    def test_pasta_da_lib_e_a_do_ser(self):
        self.assertEqual(
            utils.libmysqlclient_dir("/mnt/dados/alvorada"),
            Path("/mnt/dados/alvorada/dll/x64/sgdbc/mysql"),
        )

    def test_lib_que_ja_esta_no_ser_nao_precisa_de_ftp_nem_de_credencial(self):
        import os
        with tempfile.TemporaryDirectory() as ser:
            pasta = Path(ser) / "dll/x64/sgdbc/mysql"
            pasta.mkdir(parents=True)
            (pasta / utils.LIB_FILENAME).write_text("lib")
            for nome in ("SGBI_FTP_HOST", "SGBI_FTP_USER", "SGBI_FTP_PASS"):
                os.environ.pop(nome, None)
            self.assertTrue(utils.libmysqlclient_present(ser))
            self.assertTrue(utils.ensure_libmysqlclient(ser))

    def test_arquivo_vazio_nao_conta_como_lib(self):
        with tempfile.TemporaryDirectory() as ser:
            pasta = Path(ser) / "dll/x64/sgdbc/mysql"
            pasta.mkdir(parents=True)
            (pasta / utils.LIB_FILENAME).write_text("")
            self.assertFalse(utils.libmysqlclient_present(ser))

    def test_sem_lib_e_sem_credencial_falha_e_cria_a_pasta(self):
        with recursos_falsos(), tempfile.TemporaryDirectory() as ser:
            self.assertFalse(utils.ensure_libmysqlclient(ser))
            self.assertTrue(utils.libmysqlclient_dir(ser).is_dir())  # "se não existir, criar"

    def test_fluxo_nao_usa_mais_a_pasta_de_instalacao_para_a_lib(self):
        fluxo = (Path(__file__).parent / "flows.py").read_text(encoding="utf-8")
        self.assertNotIn("dll_target_dir", fluxo)
        self.assertIn("configure_sgvx_system(ser_directory, mysql_config)", fluxo)

    def test_config_do_headquarter_e_gravada_antes_da_lib(self):
        fluxo = (Path(__file__).parent / "flows.py").read_text(encoding="utf-8")
        corpo = fluxo[fluxo.index("def configure_sgvx_system"):fluxo.index("# ---", fluxo.index("def configure_sgvx_system"))]
        self.assertLess(corpo.index("create_apirest_config"), corpo.index("ensure_libmysqlclient"))


class Credenciais(unittest.TestCase):
    """Docker Hub e FTP saem de um só arquivo, resources/credentials.json (modelo: credentials-example.json)."""

    COMPLETO = {
        "docker": {"user": "equipe", "token": "tok-123"},
        "ftp": {"host": "ftp.exemplo", "user": "u", "pass": "p", "dir": "/outra/pasta"},
    }

    def test_docker_vem_da_secao_docker(self):
        with recursos_falsos(self.COMPLETO):
            self.assertEqual(utils.get_docker_credentials(), ("equipe", "tok-123"))

    def test_ftp_vem_da_secao_ftp(self):
        with recursos_falsos(self.COMPLETO):
            self.assertEqual(utils.get_ftp_credentials(),
                             {"host": "ftp.exemplo", "user": "u", "pass": "p", "dir": "/outra/pasta"})

    def test_ftp_sem_dir_usa_a_pasta_padrao(self):
        dados = {"ftp": {"host": "h", "user": "u", "pass": "p"}}
        with recursos_falsos(dados):
            self.assertEqual(utils.get_ftp_credentials()["dir"], "/linux/ubuntu-libmysqlx64")

    def test_variaveis_de_ambiente_valem_mais_que_o_arquivo(self):
        with recursos_falsos(self.COMPLETO):
            with mock.patch.dict(os.environ, {"SGBI_DOCKER_TOKEN": "do-ambiente", "SGBI_FTP_HOST": "outro-host"}):
                self.assertEqual(utils.get_docker_credentials(), ("equipe", "do-ambiente"))
                self.assertEqual(utils.get_ftp_credentials()["host"], "outro-host")
                self.assertEqual(utils.get_ftp_credentials()["user"], "u")  # o resto continua do arquivo

    def test_so_uma_secao_preenchida_nao_atrapalha_a_outra(self):
        with recursos_falsos({"docker": {"user": "equipe", "token": "t"}}):
            self.assertIsNone(utils.get_ftp_credentials())
            self.assertEqual(utils.get_docker_credentials(), ("equipe", "t"))
        with recursos_falsos({"ftp": {"host": "h", "user": "u", "pass": "p"}}):
            self.assertIsNotNone(utils.get_ftp_credentials())

    def test_campos_vazios_contam_como_ausentes(self):
        with recursos_falsos({"ftp": {"host": "", "user": "", "pass": ""}}):
            self.assertIsNone(utils.get_ftp_credentials())
        with recursos_falsos({"ftp": {"host": "h", "user": "u", "pass": "  "}}):
            self.assertIsNone(utils.get_ftp_credentials())

    def test_arquivo_ausente_invalido_ou_de_formato_errado_nao_quebra(self):
        with recursos_falsos():
            self.assertEqual(utils.load_credentials("docker"), {})
            self.assertIsNone(utils.get_ftp_credentials())
        for conteudo in ("isto não é json", "[]", '{"docker": "texto", "ftp": 3}', "null"):
            with recursos_falsos(conteudo):
                self.assertEqual(utils.load_credentials("docker"), {}, conteudo)
                self.assertIsNone(utils.get_ftp_credentials(), conteudo)

    def test_valores_nao_texto_viram_texto_e_nulos_somem(self):
        with recursos_falsos({"ftp": {"host": "h", "user": "u", "pass": 1234, "dir": None}}):
            self.assertEqual(utils.get_ftp_credentials(),
                             {"host": "h", "user": "u", "pass": "1234", "dir": "/linux/ubuntu-libmysqlx64"})

    def test_modelo_do_arquivo_tem_exatamente_os_campos_que_o_instalador_le(self):
        modelo = json.loads((Path(__file__).parent / "resources" / "credentials-example.json").read_text(encoding="utf-8"))
        self.assertEqual(set(modelo), {"docker", "ftp"})
        self.assertEqual(set(modelo["docker"]), {"user", "token"})
        self.assertEqual(set(modelo["ftp"]), {"host", "user", "pass", "dir"})
        # e o instalador consegue ler o modelo (com valores de mentira)
        with recursos_falsos(modelo):
            self.assertEqual(len(utils.get_docker_credentials()), 2)
            self.assertIsNotNone(utils.get_ftp_credentials())

    def test_arquivos_antigos_nao_sao_mais_usados(self):
        codigo = (Path(__file__).parent / "utils.py").read_text(encoding="utf-8")
        self.assertNotIn("docker-login.json", codigo)
        self.assertNotIn("ftp-login.json", codigo)


class ArquivosDoSistema(unittest.TestCase):
    def test_exige_os_arquivos_sg(self):
        with tempfile.TemporaryDirectory() as pasta:
            ok, faltando = utils.validate_sg_files(pasta)
            self.assertFalse(ok)
            self.assertEqual(sorted(faltando), sorted(config.ARQUIVOS_SG_OBRIGATORIOS))
            for nome in config.ARQUIVOS_SG_OBRIGATORIOS:
                (Path(pasta) / nome).write_text("x")
            self.assertEqual(utils.validate_sg_files(pasta), (True, []))

    def test_dbf_em_maiuscula_ou_minuscula(self):
        with tempfile.TemporaryDirectory() as pasta:
            self.assertFalse(utils.validate_dbf_files(pasta))
            (Path(pasta) / "VENDAS.DBF").write_text("x")
            self.assertTrue(utils.validate_dbf_files(pasta))


class Porta(unittest.TestCase):
    def test_porta_ocupada_e_invalida(self):
        import socket
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as soquete:
            soquete.bind(("0.0.0.0", 0))
            soquete.listen(1)
            self.assertFalse(utils.is_port_free(str(soquete.getsockname()[1])))
        self.assertFalse(utils.is_port_free("abc"))


class ConfiguracaoDoV2(unittest.TestCase):
    def test_nomes_nao_colidem_com_os_do_sgbi_antigo(self):
        self.assertNotEqual(config.IMAGEM_SGBI, "sgsistemas/sgbi")
        self.assertNotEqual(config.PREFIXO_CONTAINER, "sgbi-")
        self.assertNotEqual(config.PASTA_CLIENTES, "clientes")
        self.assertEqual(config.CONTAINER_MYSQL, "mysql-sgbi")  # o MySQL é compartilhado

    def test_versoes_conhecidas_sao_validas(self):
        for tag in config.VERSOES_CONHECIDAS:
            self.assertTrue(utils.is_valid_version(tag), tag)


if __name__ == "__main__":
    unittest.main()

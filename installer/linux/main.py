#!/usr/bin/env python3
"""
Arquivo principal do instalador do SGBI v2.
"""

import sys
import os
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

import flows
from utils import get_ubuntu_version, set_legacy_profile

try:
    from rich.console import Console
    from rich.panel import Panel

    COLORS_AVAILABLE = True
except ImportError:
    COLORS_AVAILABLE = False

if COLORS_AVAILABLE:
    console = Console()

def display_logo():
    logo = """
    ███████╗ ██████╗ ██████╗ ██╗
    ██╔════╝██╔════╝ ██╔══██╗██║
    ███████╗██║  ███╗██████╔╝██║
    ╚════██║██║   ██║██╔══██╗██║
    ███████║╚██████╔╝██████╔╝██║
    ╚══════╝ ╚═════╝ ╚═════╝ ╚═╝
    """

    if COLORS_AVAILABLE:
        console.print(Panel(
            logo,
            title="🚀 SGBI v2 Installer",
            border_style="bright_green"
        ))
        console.print("✨ Bem-vindo ao instalador do SGBI v2!\n", style="bold green")
    else:
        print("=" * 60)
        print(logo)
        print("=" * 60)
        print("Bem-vindo ao instalador do SGBI v2!\n")

def display_menu():
    menu_text = """
=== MENU PRINCIPAL ===

1. 🚀 Instalação Completa (Recomendada)
   └─ Cria banco MySQL (ou usa o existente) + instala cliente SGBI v2
   └─ Para quem está começando do zero

2. 🔧 Instalar Cliente (Banco Existente)
   └─ Instala cliente SGBI v2 em banco já configurado
   └─ Para múltiplas instâncias ou migração

3. 🗄️  Preparar Banco (Apenas MySQL)
   └─ Cria apenas o banco MySQL compartilhado
   └─ Para configurar múltiplos clientes depois

4. 🆕 Atualização de Sistema
   └─ Escolhe cliente v2 e versão para atualizar
   └─ Para alterar versão do software de cliente SGBI v2

0. ❌ Sair
"""

    if COLORS_AVAILABLE:
        console.print(Panel(menu_text, border_style="bright_blue"))
    else:
        print(menu_text)

def check_root_privileges():
    if os.geteuid() != 0:
        if COLORS_AVAILABLE:
            console.print("❌ ERRO: Este instalador deve ser executado como root!", style="bold red")
            console.print("💡 Execute: sudo python3 main.py", style="yellow")
        else:
            print("ERRO: Este instalador deve ser executado como root!")
            print("Execute: sudo python3 main.py")
        sys.exit(1)

def get_user_option():
    while True:
        try:
            if COLORS_AVAILABLE:
                user_input = console.input("🎯 Escolha uma opção: ")
            else:
                user_input = input("Escolha uma opção: ")

            option = int(user_input.strip())

            if option in [0, 1, 2, 3, 4]:
                return option
            else:
                if COLORS_AVAILABLE:
                    console.print("⚠️  Opção inválida! Escolha entre 0, 1, 2, 3 ou 4.", style="yellow")
                else:
                    print("Opção inválida! Escolha entre 0, 1, 2, 3 ou 4.")

        except ValueError:
            if COLORS_AVAILABLE:
                console.print("⚠️  Por favor, digite apenas números!", style="yellow")
            else:
                print("Por favor, digite apenas números!")

        except KeyboardInterrupt:
            print("\n👋 Saindo...")
            sys.exit(0)

def execute_flow(option):
    try:
        if option == 1:
            if COLORS_AVAILABLE:
                console.print("🚀 Iniciando Instalação Completa...", style="bold green")
            else:
                print("🚀 Iniciando Instalação Completa...")
            return flows.complete_installation()

        elif option == 2:
            if COLORS_AVAILABLE:
                console.print("🔧 Iniciando Instalação de Cliente...", style="bold blue")
            else:
                print("🔧 Iniciando Instalação de Cliente...")
            return flows.install_client()

        elif option == 3:
            if COLORS_AVAILABLE:
                console.print("🗄️ Iniciando Preparação do Banco...", style="bold cyan")
            else:
                print("🗄️ Iniciando Preparação do Banco...")
            return flows.prepare_database()

        elif option == 4:
            if COLORS_AVAILABLE:
                console.print("🆕 Iniciando Atualização de Sistema...", style="bold magenta")
            else:
                print("🆕 Iniciando Atualização de Sistema...")
            return flows.update_system()

        else:
            return False

    except ImportError as erro:
        if COLORS_AVAILABLE:
            console.print(f"❌ Erro ao importar flows: {erro}", style="bold red")
        else:
            print(f"❌ Erro ao importar flows: {erro}")
        return False
    except Exception as erro:
        if COLORS_AVAILABLE:
            console.print(f"❌ Erro durante execução: {erro}", style="bold red")
        else:
            print(f"❌ Erro durante execução: {erro}")
        return False

def main():
    try:
        os.system('clear')
        check_root_privileges()

        try:
            version = get_ubuntu_version()
            is_legacy = False
            if version is not None:
                is_legacy = (version <= 22.04)
            set_legacy_profile(is_legacy)
            if is_legacy:
                if COLORS_AVAILABLE:
                    console.print(f"ℹ Perfil Legado: Ubuntu {version}", style="yellow")
                else:
                    print(f"Perfil Legado: Ubuntu {version}")
        except Exception:
            pass

        display_logo()

        while True:
            display_menu()
            option = get_user_option()

            if option == 0:
                os.system('clear')
                if COLORS_AVAILABLE:
                    console.print("👋 Obrigado por usar o instalador SGBI v2!", style="bold green")
                else:
                    print("Obrigado por usar o instalador SGBI v2!")
                sys.exit(0)
            else:
                success = execute_flow(option)

                if success:
                    if COLORS_AVAILABLE:
                        console.print("\n✅ Operação concluída com sucesso!", style="bold green")
                    else:
                        print("\n✅ Operação concluída com sucesso!")
                else:
                    if COLORS_AVAILABLE:
                        console.print("\n❌ Operação falhou! Verifique os erros acima.", style="bold red")
                    else:
                        print("\n❌ Operação falhou! Verifique os erros acima.")

                input("\nPressione Enter para voltar ao menu...")
                os.system('clear')

    except KeyboardInterrupt:
        print("\n\n👋 Instalação cancelada pelo usuário.")
        sys.exit(0)
    except Exception as erro:
        if COLORS_AVAILABLE:
            console.print(f"❌ Erro inesperado: {erro}", style="bold red")
        else:
            print(f"Erro inesperado: {erro}")
        sys.exit(1)

if __name__ == "__main__":
    main()
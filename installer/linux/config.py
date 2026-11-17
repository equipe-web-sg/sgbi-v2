#!/usr/bin/env python3
"""
Constantes do instalador do SGBI v2. O que muda de uma versão do instalador para
outra (nomes, pastas, versões) fica aqui.
"""

# Imagem do v2 no Docker Hub (repositório próprio, separado do SGBI antigo: D49).
IMAGEM_SGBI = "sgsistemas/sgbi-v2"
DOCKER_USUARIO_PADRAO = "sgsistemas"

# Nomes que NÃO podem colidir com os do SGBI antigo, que pode estar no mesmo servidor:
# o MySQL (`mysql-sgbi`, uma instância por servidor) é compartilhado; pasta e container
# de cada cliente, não.
CONTAINER_MYSQL = "mysql-sgbi"
PASTA_BASE_PADRAO = "/opt/sgbi"
PASTA_CLIENTES = "clientes-v2"
PREFIXO_CONTAINER = "sgbi-v2-"

PORTA_SGBI_PADRAO = "9100"
PORTA_MYSQL_PADRAO = "3333"
SENHA_MYSQL_PADRAO = "SG515t3m45"
PORTA_API_PADRAO = "8069"

# Tags que aparecem no menu (só conveniência: qualquer tag válida do Docker, como `teste`
# ou `1.0.0`, também pode ser digitada na hora, sem recompilar).
VERSOES_CONHECIDAS = ["homologation"]

# Arquivos que o headquarter precisa encontrar na pasta SER.
ARQUIVOS_SG_OBRIGATORIOS = ["hpe_headquarterview.l", "hapirestsg.l"]

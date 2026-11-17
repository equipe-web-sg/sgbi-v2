// Migrations do banco do cliente. Cópia FIEL do array `migrations` do `onServerStart.js`
// do BI antigo (../sgbi): mesmos ids, mesmos SQL, mesma tabela de controle (`migrations`).
// Os dois BIs usam o mesmo banco, então um id só pode ter UM significado: ao criar uma
// migration nova, copie-a idêntica para o outro repositório, com o mesmo id (próximo
// número livre). Nunca edite nem renumere uma já publicada.
// Tabelas que o v2 não lê (users, reports, ...) ficam, para os ids e o esquema baterem
// com os do BI antigo.
export const migrations = [
  {
    id: 1,
    data: '2024-05-01',
    queries: [
      `CREATE TABLE IF NOT EXISTS view_11_agrupamentos (
        id int AUTO_INCREMENT NOT NULL,
        id_session varchar(255),
        codigo int,
        descricao varchar(255),
        CONSTRAINT view_11_agrupamentos_id PRIMARY KEY(id)
      );`,

      `CREATE TABLE IF NOT EXISTS view_analise_gerencial_produtos (
        id int AUTO_INCREMENT NOT NULL,
        id_session varchar(255),
        filial int NOT NULL,
        codigo int NOT NULL,
        descricao varchar(255) NOT NULL,
        sexto int NOT NULL,
        quinto int NOT NULL,
        quarto int NOT NULL,
        departamento int NOT NULL,
        grupo int NOT NULL,
        subgrupo int NOT NULL,
        marca int NOT NULL,
        totalCompra double,
        totalVenda double,
        totalPerdas double,
        totalTrocas double,
        totalCusto double,
        quantidadeCompras double,
        quantidadeVendas double,
        quantidadePerdas double,
        quantidadeTrocas double,
        totalTransferenciaEntrada double,
        totalTransferenciaSaida double,
        custoMedioItem double,
        precoMedioItem double,
        cmv double,
        compraSobreVenda double,
        lucroCustoTotal double,
        lucroSobreVenda double,
        quantidadeClentes int,
        vendaMediaCliente double,
        estoqueProduto double,
        tipoProducaoProduto varchar(255),
        tipoUsoConsumoProduto varchar(255),
        participacaoVenda double,
        participacaoVendaGeral double,
        data date NOT NULL,
        CONSTRAINT view_analise_gerencial_produtos_id PRIMARY KEY(id)
      );`,

      `CREATE TABLE IF NOT EXISTS view_11_classes (
        id int AUTO_INCREMENT NOT NULL,
        id_session varchar(255),
        codigo int,
        descricao varchar(255),
        CONSTRAINT view_11_classes_id PRIMARY KEY(id)
      );`,

      `CREATE TABLE IF NOT EXISTS view_11_departamentos (
        id int AUTO_INCREMENT NOT NULL,
        id_session varchar(255),
        codigo int NOT NULL,
        descricao varchar(255) NOT NULL,
        quarto int NOT NULL,
        CONSTRAINT view_11_departamentos_id PRIMARY KEY(id)
      );`,

      `CREATE TABLE IF NOT EXISTS view_dre (
        id int AUTO_INCREMENT NOT NULL,
        id_session varchar(40),
        periodo date,
        filial int,
        id_geral varchar(13),
        id_principal varchar(255),
        id_grupo varchar(255),
        id_subgrupo varchar(255),
        id_item varchar(255),
        valor double,
        descricao varchar(255),
        descricao_principal varchar(255),
        descricao_grupo varchar(255),
        descricao_subgrupo varchar(255),
        descricao_item varchar(255),
        percentualSobreGrupo double,
        percentualSobreReceita double,
        CONSTRAINT view_dre_id PRIMARY KEY(id)
      );`,

      `CREATE TABLE IF NOT EXISTS view_11_grupos (
        id int AUTO_INCREMENT NOT NULL,
        id_session varchar(255),
        codigo int NOT NULL,
        descricao varchar(255) NOT NULL,
        departamento int NOT NULL,
        CONSTRAINT view_11_grupos_id PRIMARY KEY(id)
      );`,

      `CREATE TABLE IF NOT EXISTS logindicadores (
        id int AUTO_INCREMENT NOT NULL,
        filial int NOT NULL,
        dataCadastro date NOT NULL,
        data date NOT NULL,
        dataMes varchar(255) NOT NULL,
        dataAno varchar(255) NOT NULL,
        estoqueMenorMinimo char NOT NULL,
        estoqueNegativo char NOT NULL,
        possuiEstoqueSemVenda char NOT NULL,
        margemAplicadaAcima char NOT NULL,
        margemAplicadaAbaixo char NOT NULL,
        margemAplicadaNegativa char NOT NULL,
        produto int NOT NULL,
        descricao varchar(255) NOT NULL,
        sexto int NOT NULL,
        quinto int NOT NULL,
        quarto int NOT NULL,
        departamento int NOT NULL,
        grupo int NOT NULL,
        subgrupo int NOT NULL,
        marca int NOT NULL,
        classe int NOT NULL,
        similar int NOT NULL,
        agrupamento int NOT NULL,
        estoqueAtual double NOT NULL,
        estoqueMinimo double NOT NULL,
        margemTradicional int NOT NULL,
        margemAplicada int NOT NULL,
        precoVenda double NOT NULL,
        custoMedio double NOT NULL,
        produto_data_ultima_venda date NOT NULL,
        CONSTRAINT logindicadores_id PRIMARY KEY(id)
      );`,

      `CREATE TABLE IF NOT EXISTS logpdv (
        id int AUTO_INCREMENT NOT NULL,
        sexto int,
        quinto int,
        quarto int,
        departamento int,
        grupo int,
        subgrupo int,
        classe int,
        similar int,
        marca int,
        agrupamento int,
        codigo int,
        filial int,
        dataVenda date,
        valorTotal double,
        numeroCaixa int,
        numeroCupom int,
        codigoBarras varchar(255),
        horarioVenda time,
        codigoCliente int,
        cpfCgcCliente varchar(255),
        cpfCnpjNfp varchar(255),
        precoUnitario double,
        valorDesconto double,
        codigoOperador int,
        codigoPromocao varchar(255),
        cupomCancelado varchar(255),
        motivoDesconto int,
        valorCancelado double,
        valorReembolso double,
        valorTotalReembolso double,
        motivoDesconto2 int,
        tipoPrecoProduto char,
        quantidadeVendida double,
        codigoMotivoOferta varchar(255),
        motivoCancelamento int,
        precoNormalProduto double,
        idPromocaoScanntech int,
        quantidadeCancelada double,
        valorTotalCancelado double,
        acrescimoDescontoItem double,
        valorVendaPromocional double,
        codigoFornecedorReembolso int,
        codigoSupervisorCancelamento int,
        agrupadorVendas varchar(255),
        cfop varchar(255),
        icms double,
        valorIcms double,
        chavenfce varchar(255),
        serie varchar(255),
        vendedor int,
        origem varchar(255),
        dataVendaAno varchar(255),
        dataVendaMes varchar(255),
        ncm varchar(255),
        aliquotaPis double,
        aliquotaCofins double,
        descricaoCSTPisCofins varchar(255),
        custo double,
        clube char,
        CONSTRAINT logpdv_id PRIMARY KEY(id)
      );`,

      `CREATE TABLE IF NOT EXISTS view_11_marcas (
        id int AUTO_INCREMENT NOT NULL,
        id_session varchar(255) NOT NULL,
        codigo int NOT NULL,
        descricao varchar(255) NOT NULL,
        CONSTRAINT view_11_marcas_id PRIMARY KEY(id)
      );`,

      `CREATE TABLE IF NOT EXISTS view_11_ofertas (
        id int AUTO_INCREMENT NOT NULL,
        id_session varchar(255),
        codigo int,
        descricao varchar(255),
        CONSTRAINT view_11_ofertas_id PRIMARY KEY(id)
      );`,

      `CREATE TABLE IF NOT EXISTS view_4_painel (
        id int AUTO_INCREMENT NOT NULL,
        id_session varchar(255) NOT NULL,
        filial int NOT NULL,
        data_atualizacao date NOT NULL,
        produtos_abaixo_estoque_minimo int NOT NULL,
        produtos_abaixo_estoque_minimo_filtro int NOT NULL,
        produtos_com_estoque_negativo int NOT NULL,
        produtos_com_estoque_negativo_filtro int NOT NULL,
        produtos_com_estoque_sem_venda int NOT NULL,
        produtos_com_estoque_sem_venda_filtro int NOT NULL,
        produtos_com_vendas_margem_aplicada_acima int NOT NULL,
        produtos_com_vendas_margem_aplicada_acima_filtro int NOT NULL,
        produtos_com_vendas_margem_aplicada_abaixo int NOT NULL,
        produtos_com_vendas_margem_aplicada_abaixo_filtro int NOT NULL,
        produtos_com_margem_aplicada_negativa int NOT NULL,
        produtos_com_margem_aplicada_negativa_filtro int NOT NULL,
        CONSTRAINT view_4_painel_id PRIMARY KEY(id)
      );`,

      `CREATE TABLE IF NOT EXISTS parfil (
        id int AUTO_INCREMENT NOT NULL,
        id_session varchar(255),
        filial int NOT NULL,
        dataVenda date NOT NULL,
        atuest char,
        totvrcusto double NOT NULL,
        totvrvenda double NOT NULL,
        totcussicm double NOT NULL,
        totcustenc double NOT NULL,
        totprodvda double NOT NULL,
        sku double NOT NULL,
        nclientes int NOT NULL,
        totcusmed double NOT NULL,
        totcustfis double NOT NULL,
        CONSTRAINT parfil_id PRIMARY KEY(id)
      );`,

      `CREATE TABLE IF NOT EXISTS view_produtos (
        id int AUTO_INCREMENT NOT NULL,
        codigo int,
        id_session int,
        filial int,
        descricao varchar(255),
        estoqueAtual double,
        estoqueMaximo double,
        estoqueMinimo double,
        vendaMediaDiaria double,
        situacao int,
        sexto int,
        quinto int,
        quarto int,
        departamento int,
        grupo int,
        subgrupo int,
        marca int,
        classe int,
        agrupamento int,
        similar int,
        ipi double,
        ncm varchar(255),
        custo double,
        margem double,
        custoReal double,
        pesoBruto double,
        custoMedio double,
        precoVenda double,
        custoFiscal double,
        pesoLiquido double,
        precoVenda2 double,
        custoEncargo double,
        dataCadastro date,
        estoqueTroca double,
        anoInativacao int,
        dataAlteracao date,
        mesInativacao int,
        unidadeMedida varchar(255),
        custoSubstituicao double,
        dataUltimaEntrada date,
        dataAlteracaoCusto date,
        descricaoAbreviada varchar(255),
        dataAlteracaoCadastro date,
        percentualQuebraPerda double,
        quantidadeDeEmbalagem int,
        quantidadeDeEmbalagem2 int,
        substituicaoTributaria varchar(255),
        percentualAcrescimoDecrescimo double,
        cest varchar(255),
        pisCofins varchar(255),
        natureza int,
        icmsSaida double,
        tipoFiscal int,
        tabelaPreco2_preco double,
        tabelaPreco2_margemTradicional double,
        tabelaPreco2_margemAplicada double,
        tabelaPreco2_quantidade double,
        tabelaPreco3_preco double,
        tabelaPreco3_margemTradicional double,
        tabelaPreco3_margemAplicada double,
        tabelaPreco3_quantidade double,
        tabelaPreco4_preco double,
        tabelaPreco4_margemTradicional double,
        tabelaPreco4_margemAplicada double,
        tabelaPreco4_quantidade double,
        lucroSobreVenda double,
        lucroSobreCusto double,
        CONSTRAINT view_produtos_id PRIMARY KEY(id)
      );`,

      `CREATE TABLE IF NOT EXISTS view_11_quarto (
        id int AUTO_INCREMENT NOT NULL,
        id_session varchar(255),
        codigo int,
        descricao varchar(255),
        quinto int,
        CONSTRAINT view_11_quarto_id PRIMARY KEY(id)
      );`,

      `CREATE TABLE IF NOT EXISTS view_11_quinto (
        id int AUTO_INCREMENT NOT NULL,
        id_session varchar(255),
        codigo int,
        descricao varchar(255),
        sexto int,
        CONSTRAINT view_11_quinto_id PRIMARY KEY(id)
      );`,

      `CREATE TABLE IF NOT EXISTS reports (
        id int AUTO_INCREMENT NOT NULL,
        name varchar(255) NOT NULL,
        module varchar(255) NOT NULL,
        CONSTRAINT reports_id PRIMARY KEY(id)
      );`,

      `CREATE TABLE IF NOT EXISTS view_11_sexto (
        id int AUTO_INCREMENT NOT NULL,
        id_session varchar(255),
        codigo int,
        descricao varchar(255),
        CONSTRAINT view_11_sexto_id PRIMARY KEY(id)
      );`,

      `CREATE TABLE IF NOT EXISTS view_11_similares (
        id int AUTO_INCREMENT NOT NULL,
        id_session varchar(255),
        codigo int,
        descricao varchar(255),
        CONSTRAINT view_11_similares_id PRIMARY KEY(id)
      );`,

      `CREATE TABLE IF NOT EXISTS view_11_subgrupos (
        id int AUTO_INCREMENT NOT NULL,
        id_session varchar(255),
        codigo int NOT NULL,
        descricao varchar(255) NOT NULL,
        grupo int NOT NULL,
        CONSTRAINT view_11_subgrupos_id PRIMARY KEY(id)
      );`,

      `CREATE TABLE IF NOT EXISTS tab_md5 (
        tabela varchar(255),
        md5 varchar(255)
      );`,

      `CREATE TABLE IF NOT EXISTS view_11_tipo_cliente (
        id int AUTO_INCREMENT NOT NULL,
        id_session varchar(255),
        codigo int,
        descricao varchar(255),
        CONSTRAINT view_11_tipo_cliente_id PRIMARY KEY(id)
      );`,

      `CREATE TABLE IF NOT EXISTS user_reports (
        user_id int NOT NULL,
        report_id int NOT NULL,
        column_order text,
        column_visibility text,
        CONSTRAINT user_reports_user_id_report_id_pk PRIMARY KEY(user_id,report_id)
      );`,

      `CREATE TABLE IF NOT EXISTS users (
        id int AUTO_INCREMENT NOT NULL,
        name varchar(255) NOT NULL,
        admin boolean NOT NULL,
        CONSTRAINT users_id PRIMARY KEY(id)
      );`,

      `CREATE TABLE IF NOT EXISTS view_11_vendedores (
        id int AUTO_INCREMENT NOT NULL,
        id_session varchar(255),
        codigo int,
        descricao varchar(255),
        CONSTRAINT view_11_vendedores_id PRIMARY KEY(id)
      );`,

      `CREATE TABLE IF NOT EXISTS view_vendia (
        id int AUTO_INCREMENT NOT NULL,
        id_session varchar(255),
        filial int,
        data date,
        produto int,
        descricao varchar(255),
        quantidade double,
        valor_unitario double,
        valor_total double,
        sexto int,
        quinto int,
        quarto int,
        departamento int,
        grupo int,
        subgrupo int,
        classe int,
        similar int,
        marca int,
        agrupamento int,
        custo double,
        origem varchar(255),
        lucro_bruto double,
        lucro_sobre_venda double,
        lucro_sobre_custo double,
        custo_total double,
        periodo date,
        percentual_venda double,
        percentual_custo double,
        margem double,
        curva_abc char,
        CONSTRAINT view_vendia_id PRIMARY KEY(id)
      );`,

      'CREATE INDEX idx_cod ON view_11_agrupamentos (codigo);',

      'CREATE INDEX idx_cod ON view_11_classes (codigo);',

      'CREATE INDEX idx_cod ON view_11_departamentos (codigo);',

      'CREATE INDEX idx_cod ON view_11_grupos (codigo);',

      'CREATE INDEX idx_cod ON view_11_marcas (codigo);',

      'CREATE INDEX idx_cod ON view_11_ofertas (codigo);',

      'CREATE INDEX idx_cod ON view_produtos (codigo);',

      'CREATE INDEX idx_cod ON view_11_quarto (codigo);',

      'CREATE INDEX idx_cod ON view_11_quinto (codigo);',

      'CREATE INDEX idx_cod ON view_11_sexto (codigo);',

      'CREATE INDEX idx_cod ON view_11_similares (codigo);',

      'CREATE INDEX idx_cod ON view_11_subgrupos (codigo);',

      'CREATE INDEX idx_cod ON view_11_tipo_cliente (codigo);',

      'CREATE INDEX idx_cod ON view_11_vendedores (codigo);',

      'CREATE INDEX idx_filial_data ON view_analise_gerencial_produtos (filial,data);',

      'ALTER TABLE user_reports ADD CONSTRAINT user_reports_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE no action ON UPDATE no action;',

      'ALTER TABLE user_reports ADD CONSTRAINT user_reports_report_id_reports_id_fk FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE no action ON UPDATE no action;',
    ],
  },
  {
    id: 2,
    data: '2024-05-01',
    queries: [
      "INSERT INTO reports(name, module) VALUES ('analise_de_vendas', 'vendas');",

      "INSERT INTO reports(name, module) VALUES ('analise_de_marcas', 'vendas');",

      "INSERT INTO reports(name, module) VALUES ('ranking_de_marcas', 'vendas');",

      "INSERT INTO reports(name, module) VALUES ('detalhamento_vendas', 'vendas');",

      "INSERT INTO reports(name, module) VALUES ('curva_abc', 'vendas');",

      "INSERT INTO reports(name, module) VALUES ('comparativo_por_filial', 'comparativos');",

      "INSERT INTO reports(name, module) VALUES ('comparativo_por_periodo', 'comparativos');",

      "INSERT INTO reports(name, module) VALUES ('ticket_medio', 'indicadores');",

      "INSERT INTO reports(name, module) VALUES ('cesta_media', 'indicadores');",

      "INSERT INTO reports(name, module) VALUES ('dre', 'gerencial');",

      "INSERT INTO reports(name, module) VALUES ('gerencial', 'configuracoes');",
    ],
  },
  {
    id: 3,
    data: '2024-05-22',
    queries: [
      `CREATE TABLE IF NOT EXISTS users_preference (
        user_id int NOT NULL,
        font_size int,
        CONSTRAINT users_preference_user_id_pk PRIMARY KEY(user_id)
      );`,

      'ALTER TABLE `users_preference` ADD CONSTRAINT `users_preference_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;',
    ],
  },
  {
    id: 4,
    data: '2024-05-24',
    queries: [
      'ALTER TABLE users_preference ADD id_base_report int;',

      'ALTER TABLE users_preference ADD CONSTRAINT users_preference_id_base_report_reports_id_fk FOREIGN KEY (id_base_report) REFERENCES reports(id) ON DELETE no action ON UPDATE no action;',

      'DELETE FROM reports WHERE id = 12;', //delete a permissao "gerencial -> configuracoes", pois não existe mais

      "INSERT INTO reports(id, name, module) VALUES (13, 'painel', 'indicadores');",
    ],
  },
  {
    id: 5,
    data: '2024-05-29',
    queries: [
      'ALTER TABLE reports ADD parent_id int;',

      'UPDATE reports SET parent_id = id WHERE id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13);',

      'ALTER TABLE reports ADD CONSTRAINT reports_parent_id_reports_id_fk FOREIGN KEY (parent_id) REFERENCES reports(id) ON DELETE no action ON UPDATE no action;',

      `INSERT	INTO reports(id, name, module, parent_id) 
        VALUES
          (14, "analise_nivel_1", "vendas", 1),
          (15, "analise_nivel_2", "vendas", 1),
          (16, "analise_nivel_3", "vendas", 1),
          (17, "analie_nivel_4", "vendas", 1),
          (18, "analise_nivel_5", "vendas", 1),
          (19, "detalhamento_nivel_1", "vendas", 4),
          (20, "detalhamento_nivel_2", "vendas", 4),
          (21, "detalhamento_nivel_3", "vendas", 4),
          (22, "detalhamento_nivel_4", "vendas", 4),
          (23, "detalhamento_nivel_5", "vendas", 4),
          (24, "curva_abc_resumo_vendas", "vendas", 5),
          (25, "curva_abc_resumo_lucro", "vendas", 5),
          (26, "curva_abc_produtos", "vendas", 5);`,
    ],
  },
  {
    id: 6,
    data: '2024-08-27',
    queries: [
      `INSERT	INTO reports(id, name, module, parent_id) 
        VALUES 
          (27, "analise_nivel_6", "vendas", 1), 
          (28, "detalhamento_nivel_6", "vendas", 4);`,
    ],
  },
  {
    id: 7,
    data: '2024-09-10',
    queries: [
      `INSERT	INTO reports(id, name, module, parent_id) VALUES (29, "analise_produtos", "vendas", 1);`,
    ],
  },
  {
    id: 8,
    data: '2024-09-24',
    queries: [
      `INSERT	INTO reports(id, name, module, parent_id) VALUES (30, "top_produtos", "produtos", 30);`,
    ],
  },
  {
    id: 9,
    data: '2024-09-25',
    queries: [
      `CREATE TABLE compras (
	      codigo_fornecedor int,
	      codigo_produto int,
	      data_movimentacao date,
	      quantidade double,
	      custo double,
	      preco double,
	      total double
      );`,
      `CREATE TABLE despesa (
	      id int AUTO_INCREMENT NOT NULL,
	      tipo_despesa int,
	      filial int,
	      fornecedor int,
	      descricao varchar(255),
	      valor double,
	      observacao varchar(255),
	      data_despesa date,
	      data_emissao date,
	      data_processamento date,
	      usuario varchar(255),
	      CONSTRAINT despesa_id PRIMARY KEY(id)
      );`,
      `CREATE TABLE fornecedores (
        codigo int NOT NULL,
        razaoSocial varchar(255) NOT NULL,
        nomeFantasia varchar(255) NOT NULL,
        cnpj varchar(14) NOT NULL,
        CONSTRAINT fornecedores_codigo PRIMARY KEY(codigo)
      );`,
      `CREATE TABLE primeiro_nivel_despesa (
	      codigo int NOT NULL,
	      descricao varchar(255),
	      segundo_nivel int,
	      CONSTRAINT codigo PRIMARY KEY(codigo)
      );`,
      `CREATE TABLE produtos_fornecedor (
        codigo_fornecedor int NOT NULL,
        codigo_produto int NOT NULL,
        CONSTRAINT produtos_fornecedor_pk PRIMARY KEY(codigo_fornecedor,codigo_produto)
      );`,
      `CREATE TABLE segundo_nivel_despesa (
        codigo int NOT NULL,
        descricao varchar(255) NOT NULL,
        terceiro_nivel int,
        CONSTRAINT codigo PRIMARY KEY(codigo)
      );`,
      `CREATE TABLE terceiro_nivel_despesa (
        codigo int NOT NULL,
        descricao varchar(255) NOT NULL,
        CONSTRAINT codigo PRIMARY KEY(codigo)
      );`,
      `CREATE TABLE tipo_despesa (
        codigo int not NULL,
        descricao varchar(255),
        primeiro_nivel int,
        classificacao varchar(255),
        origem varchar(255),
        tipo_custo varchar(255),
        CONSTRAINT codigo PRIMARY KEY(codigo)
      );`,
      `ALTER TABLE compras ADD CONSTRAINT forn_fk FOREIGN KEY (codigo_fornecedor) REFERENCES fornecedores(codigo) ON DELETE no action ON UPDATE no action;`,
      `ALTER TABLE compras ADD CONSTRAINT prod_fk FOREIGN KEY (codigo_produto) REFERENCES view_produtos(codigo) ON DELETE no action ON UPDATE no action;`,
      `ALTER TABLE despesa ADD CONSTRAINT tipo_desp_fk FOREIGN KEY (tipo_despesa) REFERENCES tipo_despesa(codigo) ON DELETE no action ON UPDATE no action;`,
      `ALTER TABLE despesa ADD CONSTRAINT despesa_forn_fk FOREIGN KEY (fornecedor) REFERENCES fornecedores(codigo) ON DELETE no action ON UPDATE no action;`,
      `ALTER TABLE primeiro_nivel_despesa ADD CONSTRAINT segundo_nivel_fk FOREIGN KEY (segundo_nivel) REFERENCES segundo_nivel_despesa(codigo) ON DELETE no action ON UPDATE no action;`,
      `ALTER TABLE produtos_fornecedor ADD CONSTRAINT prod_forn_forn_fk FOREIGN KEY (codigo_fornecedor) REFERENCES fornecedores(codigo) ON DELETE no action ON UPDATE no action;`,
      `ALTER TABLE produtos_fornecedor ADD CONSTRAINT prod_forn_prod_fk FOREIGN KEY (codigo_produto) REFERENCES view_produtos(codigo) ON DELETE no action ON UPDATE no action;`,
      `ALTER TABLE segundo_nivel_despesa ADD CONSTRAINT terceiro_nivel_fk FOREIGN KEY (terceiro_nivel) REFERENCES terceiro_nivel_despesa(codigo) ON DELETE no action ON UPDATE no action;`,
      `ALTER TABLE tipo_despesa ADD CONSTRAINT primeiro_nivel_fk FOREIGN KEY (primeiro_nivel) REFERENCES primeiro_nivel_despesa(codigo) ON DELETE no action ON UPDATE no action;`,
    ],
  },
  {
    id: 10,
    data: '2024-09-27',
    queries: [
      `CREATE TABLE view_17_clientes_geocode (
      	id int AUTO_INCREMENT NOT NULL,
      	id_session varchar(40),
      	codigo int,
      	razaoSocial varchar(40),
      	nomeFantasia varchar(40),
      	cpf varchar(20),
      	telefone varchar(30),
      	celular varchar(30),
      	email varchar(255),
      	sexo varchar(1),
      	idade int,
      	bairro varchar(30),
      	cidade varchar(30),
      	dataCadastro date,
      	faixaEtaria varchar(20),
      	tipoDeCliente varchar(40),
      	endereco varchar(255),
      	numero varchar(30),
      	cep int,
      	uf varchar(2),
      	dataUltimaCompra date,
      	latitude float,
      	longitude float,
      	enderecoFormatado varchar(255),
      	statusGeocode varchar(30),
      	origenGeocode varchar(10),
      	codigoRota int,
      	descricaoRota varchar(30),
      	ie_rg varchar(20),
      	clube varchar(1),
      	situacao varchar(1),
      	CONSTRAINT view_17_clientes_geocode_id PRIMARY KEY(id)
      );`,
      `CREATE INDEX idx_codigo ON view_17_clientes_geocode (codigo);`,
      `CREATE INDEX idx_cpf ON view_17_clientes_geocode (cpf);`,
      `INSERT	INTO reports(id, name, module, parent_id) VALUES (31, "top_clientes", "clientes", 31);`,
    ],
  },
  {
    id: 11,
    data: '2024-10-15',
    queries: [
      `select
      case
        when COUNT(*) > 0 then 
                CONCAT('ALTER TABLE view_17_clientes_geocode 
          CHANGE COLUMN origenGeocode origemGeocode VARCHAR(255)')
        else 
                'SELECT "Coluna não encontrada, nenhuma alteração feita";'
      end    
    into
      @sql_command
    from
      information_schema.columns
    where
      table_name = "view_17_clientes_geocode"
      and column_name = "origenGeocode";`,
      'PREPARE stmt FROM @sql_command;',
      'EXECUTE stmt;',
      'DEALLOCATE PREPARE stmt;',
    ],
  },
  {
    id: 12,
    data: '2024-10-15',
    queries: [
      'SET FOREIGN_KEY_CHECKS = 0;',
      'DELETE FROM user_reports WHERE report_id = 2;',
      'DELETE FROM user_reports WHERE report_id = 3;',
      'DELETE FROM reports WHERE id = 3;',
      'SET FOREIGN_KEY_CHECKS = 1;',
      `INSERT	INTO reports(id, name, module, parent_id) VALUES (32, "analise_marcas_produto", "vendas", 2);`,
    ],
  },
  {
    id: 13,
    data: '2024-10-16',
    queries: [
      'SET FOREIGN_KEY_CHECKS = 0',
      `CREATE TABLE compradores (
      	codigo int NOT NULL,
      	nome varchar(255) NOT NULL,
      	CONSTRAINT compradores_codigo PRIMARY KEY(codigo)
      );`,
      'ALTER TABLE compras ADD filial int NOT NULL;',
      'ALTER TABLE fornecedores ADD codigo_comprador int;',
      'ALTER TABLE fornecedores ADD CONSTRAINT compradores_codigo_fk FOREIGN KEY (codigo_comprador) REFERENCES compradores(codigo) ON DELETE no action ON UPDATE no action;',
      'SET FOREIGN_KEY_CHECKS = 1',
      `INSERT	INTO reports(id, name, module, parent_id) VALUES (33, "ranking_compras_vendas", "compras", 33);`,
    ],
  },
  {
    id: 14,
    data: '2024-10-21',
    queries: [
      'ALTER TABLE view_analise_gerencial_produtos ADD totalPDV double;',
      'ALTER TABLE view_analise_gerencial_produtos ADD totalFaturamento double;',
      'ALTER TABLE view_analise_gerencial_produtos ADD quantidadeVendidaFaturamento double;',
      'ALTER TABLE view_analise_gerencial_produtos ADD quantidadeVendidaPDV double;',
    ],
  },
  {
    id: 15,
    data: '2024-10-29',
    queries: [
      `INSERT	INTO reports(id, name, module, parent_id) VALUES (34, "analise_despesas", "despesas", 34);`,
      `INSERT	INTO reports(id, name, module, parent_id) VALUES (35, "analise_despesas_nivel_1", "despesas", 34);`,
      `INSERT	INTO reports(id, name, module, parent_id) VALUES (36, "analise_despesas_nivel_2", "despesas", 34);`,
      `INSERT	INTO reports(id, name, module, parent_id) VALUES (37, "analise_despesas_nivel_3", "despesas", 34);`,
      `INSERT	INTO reports(id, name, module, parent_id) VALUES (38, "analise_despesas_itens", "despesas", 34);`,
    ],
  },
  {
    id: 16,
    data: '2024-11-05',
    queries: [
      'SET FOREIGN_KEY_CHECKS = 0',

      `CREATE TABLE contas_pagar (
      id int AUTO_INCREMENT NOT NULL,
      codigo_fornecedor int,
      numero_documento int,
      ordem_pagamento int,
      data_vencimento date,
      valor_pagar double,
      data_emissao date,
      codigo_filial int,
      num_nota_fiscal varchar(9),
      valor_total_pagamento double,
      data_pagamento date,
      data_entrada date,
      data_processamento date,
      nome varchar(40),
      classificacao_produto varchar(1),
      numero_conta_paga int,
      numero_cheque_pago int,
      observacao varchar(100),
      tipo_entidade varchar(1),
      data_aceite_duplicata date,
      codigo_tipo_pagamento int,
      total_parcelas int,
      valor_desconto double,
      usuario_baixa varchar(10),
      taxa_boleto double,
      serie varchar(3),
      horario_pagamento varchar(5),
      usuario_alteracao varchar(10),
      data_alteracao date,
      desconto_pagamento_antecipado double,
      usuario_lancamento varchar(10),
      numero_boleto varchar(20),
      data_geracao_bloqueio date,
      forma_pagamento varchar(1),
      data_efetiva_pagamento date,
      codigo_forma_pagamento int,
      data_apuracao date,
      numero_banco int,
      numero_agencia int,
      valor_juros_conta double,
      CONSTRAINT contas_pagar_id PRIMARY KEY(id)
    );`,

      `CREATE TABLE contas_receber (
      id int AUTO_INCREMENT NOT NULL,
      codigo_filial int,
      codigo_filial_cliente_fornecedor int,
      numero_documento varchar(9),
      ordem_recebimento int,
      data_vencimento date,
      valor_documento double,
      data_emissao date,
      valor_recebido double,
      data_recebimento date,
      nome_cliente varchar(20),
      numero_bloqueio double,
      juros_recebidos double,
      tipo_cobranca int,
      observacao varchar(50),
      cliente_fornecedor_filial int,
      usuario_baixa varchar(10),
      percentual_juros double,
      filial_receptora double,
      data_alteracao date,
      operador_caixa int,
      desconto_recebimento double,
      taxa_emissao_boleto double,
      numero_conta_bancaria int,
      numero_cupom double,
      caixa_receptor double,
      operador_efetuador int,
      percentual_desconto double,
      usuario_lancamento varchar(10),
      chave_renegociacao varchar(9),
      data_aceite date,
      data_venda date,
      hora_recebimento varchar(5),
      entrada_ou_saida varchar(1),
      CONSTRAINT contas_receber_id PRIMARY KEY(id)
    );`,

      `CREATE TABLE previsao_departamento (
      id int AUTO_INCREMENT NOT NULL,
      codigo_filial int,
      ano int,
      mes int,
      codigo_departamento int,
      codigo_vendedor int,
      previsao_venda double,
      dias_uteis int,
      previsao_lucro double,
      codigo_produto int,
      previsao_cobertura_clientes double,
      CONSTRAINT previsao_departamento_id PRIMARY KEY(id)
    );`,

      `CREATE TABLE previsao_dia (
      id int AUTO_INCREMENT NOT NULL,
      codigo_filial int,
      ano int,
      mes int,
      codigo_dia int,
      codigo_vendedor int,
      previsao_venda double,
      dias_uteis int,
      previsao_lucro double,
      codigo_produto int,
      previsao_cobertura_clientes double,
      CONSTRAINT previsao_dia_id PRIMARY KEY(id)
    );`,

      `CREATE TABLE previsao_filial (
      id int AUTO_INCREMENT NOT NULL,
      codigo_filial int,
      ano int,
      mes int,
      codigo_vendedor int,
      previsao_venda double,
      dias_uteis int,
      previsao_lucro double,
      codigo_produto int,
      previsao_cobertura_clientes double,
      CONSTRAINT previsao_filial_id PRIMARY KEY(id)
    );`,
      `CREATE TABLE previsao_grupo (
      id int AUTO_INCREMENT NOT NULL,
      codigo_filial int,
      ano int,
      mes int,
      codigo_grupo int,
      codigo_vendedor int,
      previsao_venda double,
      dias_uteis int,
      previsao_lucro double,
      codigo_produto int,
      previsao_cobertura_clientes double,
      CONSTRAINT previsao_grupo_id PRIMARY KEY(id)
    );`,

      `CREATE TABLE previsao_nivel_4 (
      id int AUTO_INCREMENT NOT NULL,
      codigo_filial int,
      ano int,
      mes int,
      codigo_nivel_4 int,
      codigo_vendedor int,
      previsao_venda double,
      dias_uteis int,
      previsao_lucro double,
      codigo_produto int,
      previsao_cobertura_clientes double,
      CONSTRAINT previsao_nivel_4_id PRIMARY KEY(id)
    );`,

      `CREATE TABLE previsao_nivel_5 (
      id int AUTO_INCREMENT NOT NULL,
      codigo_filial int,
      ano int,
      mes int,
      codigo_nivel_5 int,
      codigo_vendedor int,
      previsao_venda double,
      dias_uteis int,
      previsao_lucro double,
      codigo_produto int,
      previsao_cobertura_clientes double,
      CONSTRAINT previsao_nivel_5_id PRIMARY KEY(id)
    );`,

      `CREATE TABLE previsao_nivel_6 (
      id int AUTO_INCREMENT NOT NULL,
      codigo_filial int,
      ano int,
      mes int,
      codigo_nivel_6 int,
      codigo_vendedor int,
      previsao_venda double,
      dias_uteis int,
      previsao_lucro double,
      codigo_produto int,
      previsao_cobertura_clientes double,
      CONSTRAINT previsao_nivel_6_id PRIMARY KEY(id)
    );`,

      `CREATE TABLE previsao_subgrupo (
      id int AUTO_INCREMENT NOT NULL,
      codigo_filial int,
      ano int,
      mes int,
      codigo_subgrupo int,
      codigo_vendedor int,
      previsao_venda double,
      dias_uteis int,
      previsao_lucro double,
      codigo_produto int,
      previsao_cobertura_clientes double,
      CONSTRAINT previsao_subgrupo_id PRIMARY KEY(id)
    );`,

      `CREATE TABLE previsao_produto (
      id int AUTO_INCREMENT NOT NULL,
      codigo_filial int,
      ano int,
      mes int,
      codigo_vendedor int,
      previsao_venda double,
      dias_uteis int,
      previsao_lucro double,
      codigo_produto int,
      previsao_cobertura_clientes double,
      CONSTRAINT previsao_produto_id PRIMARY KEY(id)
    );`,

      `CREATE TABLE tipo_pagamento (
      codigo_forma_pagamento int NOT NULL,
      descricao_tipo_pagamento varchar(20),
      descricao_reduzida varchar(6),
      tipo_pagamento varchar(1),
      recebimento varchar(1),
      pagamento varchar(1),
      ordem_recebimentos int,
      ordem_pagamentos int,
      numero_conta_bancaria varchar(9),
      pagamento_historico_bancario varchar(3),
      numero_banco int,
      numero_agencia int,
      CONSTRAINT tipo_pagamento_codigo_forma_pagamento PRIMARY KEY(codigo_forma_pagamento)
    );`,

      `ALTER TABLE contas_pagar ADD CONSTRAINT contas_pagar_codigo_tipo_pagamento_codigo_forma_pagamento_fk FOREIGN KEY (codigo_tipo_pagamento) REFERENCES tipo_pagamento(codigo_forma_pagamento) ON DELETE no action ON UPDATE no action;`,
      `ALTER TABLE previsao_departamento ADD CONSTRAINT previsao_departamento_view_11_departamentos_codigo_fk FOREIGN KEY (codigo_departamento) REFERENCES view_11_departamentos(codigo) ON DELETE no action ON UPDATE no action;`,
      `ALTER TABLE previsao_grupo ADD CONSTRAINT previsao_grupo_codigo_grupo_view_11_grupos_codigo_fk FOREIGN KEY (codigo_grupo) REFERENCES view_11_grupos(codigo) ON DELETE no action ON UPDATE no action;`,
      `ALTER TABLE previsao_nivel_4 ADD CONSTRAINT previsao_nivel_4_codigo_nivel_4_view_11_quarto_codigo_fk FOREIGN KEY (codigo_nivel_4) REFERENCES view_11_quarto(codigo) ON DELETE no action ON UPDATE no action;`,
      `ALTER TABLE previsao_nivel_5 ADD CONSTRAINT previsao_nivel_5_codigo_nivel_5_view_11_quinto_codigo_fk FOREIGN KEY (codigo_nivel_5) REFERENCES view_11_quinto(codigo) ON DELETE no action ON UPDATE no action;`,
      `ALTER TABLE previsao_nivel_6 ADD CONSTRAINT previsao_nivel_6_codigo_nivel_6_view_11_sexto_codigo_fk FOREIGN KEY (codigo_nivel_6) REFERENCES view_11_sexto(codigo) ON DELETE no action ON UPDATE no action;`,
      `ALTER TABLE previsao_subgrupo ADD CONSTRAINT previsao_subgrupo_codigo_subgrupo_view_11_subgrupos_codigo_fk FOREIGN KEY (codigo_subgrupo) REFERENCES view_11_subgrupos(codigo) ON DELETE no action ON UPDATE no action;`,
      `ALTER TABLE previsao_produto ADD CONSTRAINT previsao_produto_codigo_produto_view_produtos_codigo_fk FOREIGN KEY (codigo_produto) REFERENCES view_produtos(codigo) ON DELETE no action ON UPDATE no action;`,

      'SET FOREIGN_KEY_CHECKS = 1',
    ],
  },
  {
    id: 17,
    data: '2024-11-18',
    queries: [
      `INSERT	INTO reports(id, name, module, parent_id) VALUES (39, "comparativo_por_despesas", "comparativos", 39);`,
      `INSERT	INTO reports(id, name, module, parent_id) VALUES (40, "comparativo_por_despesas_detalhamento", "comparativos", 39);`,
    ],
  },
  {
    id: 18,
    data: '2024-11-30',
    queries: [
      `insert into reports(id, name, module, parent_id) values (41, "pdv_por_faixa_horaria", "vendas", 41);`,
    ],
  },
  {
    id: 19,
    data: '2024-12-12',
    queries: [
      `insert into reports(id, name, module, parent_id) values (42, "relacao_venda_casada", "vendas", 42);`,
    ],
  },
  {
    id: 20,
    data: '2024-12-27',
    queries: [
      `insert into reports(id, name, module, parent_id) values (43, "comparativo_por_contas", "comparativos", 43);`,
      `insert into reports(id, name, module, parent_id) values (44, "comparativo_por_contas_detalhamento", "comparativos", 43);`,
    ],
  },
  {
    id: 21,
    data: '2025-02-05',
    queries: [
      `insert into reports(id, name, module, parent_id) values (45, "analise_contas", "compras", 45);`,
      `insert into reports(id, name, module, parent_id) values (46, "analise_contas_fornecedor", "compras", 45);`,
      `insert into reports(id, name, module, parent_id) values (47, "analise_contas_documento", "compras", 45);`,
    ],
  },
  {
    id: 22,
    data: '2025-04-08',
    queries: [
      `alter table contas_receber modify cliente_fornecedor_filial varchar(1);`,
      `alter table view_dre add column criado_em datetime`,
    ],
  },
  {
    id: 23,
    data: '2025-03-13',
    queries: [
      `insert into reports(id, name, module, parent_id) values (48, "metas_realizado", "metas", 48);`,
      `insert into reports(id, name, module, parent_id) values (49, "metas_realizado_filial", "metas", 48);`,
      `insert into reports(id, name, module, parent_id) values (50, "metas_realizado_nivel_1", "metas", 48);`,
      `insert into reports(id, name, module, parent_id) values (51, "metas_realizado_nivel_2", "metas", 48);`,
      `insert into reports(id, name, module, parent_id) values (52, "metas_realizado_nivel_3", "metas", 48);`,
    ],
  },
  {
    id: 24,
    data: '2025-03-26',
    queries: [
      `insert into reports(id, name, module, parent_id) values (53, "comparativo_por_previsao_de_vendas", "comparativos", 53);`,
    ],
  },
  {
    id: 25,
    data: '2025-04-17',
    queries: [
      `insert into reports(id, name, module, parent_id) values (54, "ranking_compras_vendas_detalhamento", "compras", 33);`,
    ],
  },
  {
    id: 26,
    data: '2025-04-29',
    queries: [
      `update reports r set r.module = 'financeiro' where r.parent_id  = 45`,
      `insert into reports(id, name, module, parent_id) values (55, "compras_por_fornecedor", "compras", 55);`,
      `insert into reports(id, name, module, parent_id) values (56, "compras_por_fornecedor_detalhamento", "compras", 55);`,
      `insert into reports(id, name, module, parent_id) values (57, "comparativo_por_dre", "comparativos", 57);`,
      `alter table contas_pagar add column tipo_conta varchar(15)`,
    ],
  },
  {
    id: 27,
    data: '2025-05-21',
    queries: [
      `alter table view_analise_gerencial_produtos add column quantidadeClientesPDV int(11)`,
      `alter table view_analise_gerencial_produtos add column quantidadeClientesFaturamento int(11)`,
    ],
  },
  {
    id: 28,
    data: '2025-07-21',
    queries: [
      `alter table view_analise_gerencial_produtos add column totalCustoPDV double;`,
      `alter table view_analise_gerencial_produtos add column totalCustoFaturamento double;`,
    ],
  },
  {
    id: 29,
    data: '2025-06-02',
    queries: [
      `create table cartoes_vendas (
    codigo_filial int(11),
    numero_pdv int(11),
    numero_parcela int(2),
    valor_bruto double,
    valor_liquido double,
    taxa_administracao double,
    taxa_transacao double,
    taxa_reembolso double,
    data_venda date,
    data_baixa date,
    data_vencimento date,
    codigo_empresa int(11))`,
      `create table cartoes_empresas (
    codigo_empresa int(11),
    descricao_empresa varchar(255))`,
    ],
  },
  {
    id: 30,
    data: '2026-01-22',
    queries: [
      `SELECT
        CASE
          WHEN COUNT(*) > 0 THEN 
            'ALTER TABLE contas_pagar DROP FOREIGN KEY contas_pagar_codigo_tipo_pagamento_codigo_forma_pagamento_fk'
          ELSE 
            'SELECT "Foreign Key não encontrada, nenhuma alteração feita"'
        END    
      INTO
        @sql_command
      FROM
        information_schema.TABLE_CONSTRAINTS
      WHERE
        CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'contas_pagar'
        AND CONSTRAINT_NAME = 'contas_pagar_codigo_tipo_pagamento_codigo_forma_pagamento_fk'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY';`,
      'PREPARE stmt FROM @sql_command;',
      'EXECUTE stmt;',
      'DEALLOCATE PREPARE stmt;'
    ]
  },
  {
    id: 31,
    data: '2025-05-30',
    queries: [
      `insert into reports(id, name, module, parent_id) values (58, "calendario_financeiro", "financeiro", 58);`,
      `insert into reports(id, name, module, parent_id) values (59, "vendas_cartoes", "financeiro", 59);`,
      `create table filiais (codigo int(3),descricao VARCHAR(255));`,
      `insert into reports(id, name, module, parent_id) values (60, "resumo_compras_vendas", "compras", 60);`,
      `create table cartoes_operadoras (
        codigo_operadora int(11),
        descricao_operadora varchar(255)
      );`,
      `ALTER TABLE cartoes_vendas ADD COLUMN codigo_operadora SMALLINT UNSIGNED NULL;`,
      `CREATE TABLE IF NOT EXISTS parameters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        param_key VARCHAR(100) NOT NULL UNIQUE,
        description TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT FALSE,
        value TEXT NULL
      );`,
     `INSERT INTO parameters (param_key, description) 
       VALUES ('ATUALIZAR_PAINEL_AUTOMATICAMENTE', 'Tempo de espera (minutos) para atualizar painel automaticamente.'
      );`,
     `INSERT INTO reports(id, name, module, parent_id) VALUES (61, "produtos_estoque_sem_vendas", "produtos", 61);`, 
    ],
  },
  {
    id: 32,
    data: '2026-02-23',
    queries: [
      `CREATE TABLE IF NOT EXISTS tokens (
        id INT AUTO_INCREMENT NOT NULL,
        token VARCHAR(255),
        CONSTRAINT tokens_id PRIMARY KEY(id)
      );`,
    ],
  },
  {
    id: 33,
    data: '2026-05-19',
    queries: [
      'CREATE INDEX idx_logind ON logindicadores (data, margemAplicadaAbaixo, filial, produto);',
      'CREATE INDEX idx_logpdv_vendas_oferta ON logpdv (dataVenda, cupomCancelado, filial, codigo, precoUnitario);'
    ],
  },
  {
    id: 34,
    data: '2026-05-26',
    queries: [
      'ALTER TABLE contas_pagar MODIFY numero_documento VARCHAR(50);',
      'ALTER TABLE contas_receber MODIFY numero_documento VARCHAR(50);'
    ]
  },
  {
    id: 35,
    data: '2026-07-02',
    queries: [
      'INSERT INTO reports(id, name, module, parent_id) VALUES (62, "analise_de_vendas_diario", "vendas", 62);'
    ]
  },
  {
    id: 36,
    data: '2026-07-09',
    queries: [
      `INSERT INTO parameters (param_key, description) 
       VALUES ('EXIBIR_SÍMBOLOS_DE_PORCENTAGEM_(%)_E_DE_MOEDA_(R$)_PARA_OS_RELATÓRIOS', 'Exibir símbolos de porcentagem (%) e moeda (R$) nos relatórios do BI');`,
    ]
  },
  {
    id: 37,
    data: '2026-07-10',
    queries: [
      `insert into reports(id, name, module, parent_id) values (63, "comparativo_por_metrica", "comparativos", 63);`,
    ],
  },
  {
    id: 38,
    data: '2026-07-17',
    queries: [
      'INSERT INTO reports(id, name, module, parent_id) VALUES (64, "Ajuda_IA", "ajuda", 64);'
    ]
  },
  {
    id: 39,
    data: '2026-07-22',
    queries: [
      'CREATE INDEX idx_logpdv_filial_data ON logpdv (filial, dataVenda);',
    ],
  },
  {
    id: 40,
    data: '2026-07-24',
    queries: [
      'INSERT INTO reports(id, name, module, parent_id) VALUES (65, "cancelamento_produtos", "produtos", 65);'
    ]
  },
  {
    id: 41,
    data: '2026-08-04',
    queries: [
      `CREATE TABLE IF NOT EXISTS cancelamentos (
        id int AUTO_INCREMENT NOT NULL,
        codigo_produto int NOT NULL,
        descricao_produto varchar(255) NOT NULL,
        motivo_cancelamento varchar(255) NOT NULL,
        valor_total_cancelamento double NOT NULL,
        quantidade_total_cancelamento double NOT NULL,
        filial int NOT NULL,
        codigo_operador int NOT NULL,
        data_cancelamento date NOT NULL,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT cancelamentos_id PRIMARY KEY (id)
      );`
    ]
  },
]

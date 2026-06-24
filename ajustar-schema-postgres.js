require("dotenv").config();

const { pool } = require("./postgres");

async function ajustarSchema(){

  try{

    console.log("Ajustando estrutura do PostgreSQL para o padrão do sistema atual...");

    await pool.query(`
      DROP TABLE IF EXISTS backups;
      DROP TABLE IF EXISTS backup_logs;
      DROP TABLE IF EXISTS inventarios;
      DROP TABLE IF EXISTS inventario;
      DROP TABLE IF EXISTS movimentacoes;
      DROP TABLE IF EXISTS estoque;
      DROP TABLE IF EXISTS racks;
      DROP TABLE IF EXISTS produtos;
      DROP TABLE IF EXISTS usuarios;
    `);

    await pool.query(`
      CREATE TABLE produtos (
        id SERIAL PRIMARY KEY,
        codigo TEXT UNIQUE NOT NULL,
        nome TEXT NOT NULL,
        imagem TEXT,
        codigo_barras TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE racks (
        id SERIAL PRIMARY KEY,
        endereco TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'LIVRE'
      );
    `);

    await pool.query(`
      CREATE TABLE usuarios (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        usuario TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        perfil TEXT NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE estoque (
        id SERIAL PRIMARY KEY,
        produto_id INTEGER NOT NULL REFERENCES produtos(id),
        lote TEXT NOT NULL,
        rack TEXT NOT NULL,
        quantidade INTEGER DEFAULT 0,
        data_entrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        validade TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE movimentacoes (
        id SERIAL PRIMARY KEY,
        produto_id INTEGER NOT NULL REFERENCES produtos(id),
        lote TEXT NOT NULL,
        rack TEXT NOT NULL,
        tipo TEXT NOT NULL,
        quantidade INTEGER NOT NULL,
        data_movimentacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        usuario TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE inventarios (
        id SERIAL PRIMARY KEY,
        estoque_id INTEGER,
        produto_id INTEGER,
        codigo TEXT,
        produto TEXT,
        lote TEXT,
        rack TEXT,
        quantidade_sistema INTEGER,
        quantidade_contada INTEGER,
        divergencia INTEGER,
        usuario TEXT,
        status TEXT DEFAULT 'PENDENTE',
        data_inventario TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE backups (
        id SERIAL PRIMARY KEY,
        usuario TEXT,
        data_backup TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Schema PostgreSQL ajustado com sucesso.");

  } catch(erro){

    console.error("Erro ao ajustar schema:", erro.message);

  } finally{

    await pool.end();

  }
}

ajustarSchema();
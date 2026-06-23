require("dotenv").config();

const { pool } = require("./postgres");

async function criarTabelas(){

  try{

    console.log("Criando tabelas no PostgreSQL...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id SERIAL PRIMARY KEY,
        codigo TEXT UNIQUE NOT NULL,
        nome TEXT NOT NULL,
        imagem TEXT,
        codigo_barras TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS racks (
        id SERIAL PRIMARY KEY,
        endereco TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'LIVRE'
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS estoque (
        id SERIAL PRIMARY KEY,
        codigo TEXT NOT NULL,
        lote TEXT NOT NULL,
        rack TEXT NOT NULL,
        quantidade INTEGER NOT NULL,
        validade TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS movimentacoes (
        id SERIAL PRIMARY KEY,
        codigo TEXT,
        nome TEXT,
        lote TEXT,
        rack TEXT,
        tipo TEXT,
        quantidade INTEGER,
        usuario TEXT,
        data_movimentacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        usuario TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        perfil TEXT NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventario (
        id SERIAL PRIMARY KEY,
        estoque_id INTEGER,
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
      CREATE TABLE IF NOT EXISTS backup_logs (
        id SERIAL PRIMARY KEY,
        usuario TEXT,
        data_backup TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Tabelas criadas com sucesso no PostgreSQL.");

  } catch(erro){

    console.error("Erro ao criar tabelas:", erro.message);

  } finally{

    await pool.end();

  }
}

criarTabelas();
require("dotenv").config();

const sqlite3 = require("sqlite3").verbose();
const { pool } = require("./postgres");

const db = new sqlite3.Database("./estoque.db");

function listarSQLite(sql){
  return new Promise((resolve, reject) => {
    db.all(sql, [], (erro, linhas) => {
      if(erro){
        reject(erro);
      } else {
        resolve(linhas);
      }
    });
  });
}

async function tabelaExisteSQLite(nomeTabela){
  const linhas = await listarSQLite(`
    SELECT name
    FROM sqlite_master
    WHERE type='table'
      AND name='${nomeTabela}'
  `);

  return linhas.length > 0;
}

async function limparTabelasOperacionaisPostgres(){
  console.log("Limpando tabelas operacionais no PostgreSQL...");

  await pool.query("DELETE FROM inventarios");
  await pool.query("DELETE FROM movimentacoes");
  await pool.query("DELETE FROM estoque");
  await pool.query("DELETE FROM backups");

  await pool.query("ALTER SEQUENCE inventarios_id_seq RESTART WITH 1");
  await pool.query("ALTER SEQUENCE movimentacoes_id_seq RESTART WITH 1");
  await pool.query("ALTER SEQUENCE estoque_id_seq RESTART WITH 1");
  await pool.query("ALTER SEQUENCE backups_id_seq RESTART WITH 1");
}

async function migrarEstoque(){

  const estoque = await listarSQLite(`
    SELECT
      id,
      produto_id,
      lote,
      rack,
      quantidade,
      data_entrada,
      validade
    FROM estoque
  `);

  console.log("Migrando estoque:", estoque.length);

  for(const item of estoque){
    await pool.query(
      `
        INSERT INTO estoque
        (id, produto_id, lote, rack, quantidade, data_entrada, validade)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        item.id,
        item.produto_id,
        item.lote,
        item.rack,
        item.quantidade || 0,
        item.data_entrada || new Date(),
        item.validade || null
      ]
    );
  }

  await pool.query(`
    SELECT setval(
      'estoque_id_seq',
      COALESCE((SELECT MAX(id) FROM estoque), 1)
    )
  `);
}

async function migrarMovimentacoes(){

  const movimentacoes = await listarSQLite(`
    SELECT
      id,
      produto_id,
      lote,
      rack,
      tipo,
      quantidade,
      data_movimentacao,
      usuario
    FROM movimentacoes
  `);

  console.log("Migrando movimentações:", movimentacoes.length);

  for(const item of movimentacoes){
    await pool.query(
      `
        INSERT INTO movimentacoes
        (id, produto_id, lote, rack, tipo, quantidade, data_movimentacao, usuario)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        item.id,
        item.produto_id,
        item.lote,
        item.rack,
        item.tipo,
        item.quantidade || 0,
        item.data_movimentacao || new Date(),
        item.usuario || "Sistema"
      ]
    );
  }

  await pool.query(`
    SELECT setval(
      'movimentacoes_id_seq',
      COALESCE((SELECT MAX(id) FROM movimentacoes), 1)
    )
  `);
}

async function migrarInventarios(){

  const existe = await tabelaExisteSQLite("inventarios");

  if(!existe){
    console.log("Tabela inventarios não existe no SQLite. Pulando...");
    return;
  }

  const inventarios = await listarSQLite("SELECT * FROM inventarios");

  console.log("Migrando inventários:", inventarios.length);

  for(const item of inventarios){
    await pool.query(
      `
        INSERT INTO inventarios
        (
          id,
          estoque_id,
          produto_id,
          codigo,
          produto,
          lote,
          rack,
          quantidade_sistema,
          quantidade_contada,
          divergencia,
          usuario,
          status,
          data_inventario
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `,
      [
        item.id,
        item.estoque_id || null,
        item.produto_id || null,
        item.codigo || null,
        item.produto || null,
        item.lote || null,
        item.rack || null,
        item.quantidade_sistema || 0,
        item.quantidade_contada || 0,
        item.divergencia || 0,
        item.usuario || "Sistema",
        item.status || "PENDENTE",
        item.data_inventario || new Date()
      ]
    );
  }

  await pool.query(`
    SELECT setval(
      'inventarios_id_seq',
      COALESCE((SELECT MAX(id) FROM inventarios), 1)
    )
  `);
}

async function migrarBackups(){

  const existe = await tabelaExisteSQLite("backups");

  if(!existe){
    console.log("Tabela backups não existe no SQLite. Pulando...");
    return;
  }

  const backups = await listarSQLite("SELECT * FROM backups");

  console.log("Migrando backups:", backups.length);

  for(const item of backups){
    await pool.query(
      `
        INSERT INTO backups
        (id, usuario, data_backup)
        VALUES ($1, $2, $3)
      `,
      [
        item.id,
        item.usuario || "Sistema",
        item.data_backup || new Date()
      ]
    );
  }

  await pool.query(`
    SELECT setval(
      'backups_id_seq',
      COALESCE((SELECT MAX(id) FROM backups), 1)
    )
  `);
}

async function migrar(){
  try{
    console.log("Iniciando migração operacional no padrão final...");

    await limparTabelasOperacionaisPostgres();

    await migrarEstoque();
    await migrarMovimentacoes();
    await migrarInventarios();
    await migrarBackups();

    console.log("Migração operacional concluída com sucesso.");

  } catch(erro){
    console.error("Erro na migração operacional:", erro.message);
  } finally{
    db.close();
    await pool.end();
  }
}

migrar();
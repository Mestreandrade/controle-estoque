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

  await pool.query("DELETE FROM inventario");
  await pool.query("DELETE FROM movimentacoes");
  await pool.query("DELETE FROM estoque");
  await pool.query("DELETE FROM backup_logs");

  await pool.query("ALTER SEQUENCE inventario_id_seq RESTART WITH 1");
  await pool.query("ALTER SEQUENCE movimentacoes_id_seq RESTART WITH 1");
  await pool.query("ALTER SEQUENCE estoque_id_seq RESTART WITH 1");
  await pool.query("ALTER SEQUENCE backup_logs_id_seq RESTART WITH 1");
}

async function migrarEstoque(){

  const estoque = await listarSQLite(`
    SELECT
      e.id,
      p.codigo,
      p.nome,
      e.lote,
      e.rack,
      e.quantidade,
      e.validade,
      e.data_entrada
    FROM estoque e
    INNER JOIN produtos p ON p.id = e.produto_id
  `);

  console.log("Migrando estoque:", estoque.length);

  for(const item of estoque){
    await pool.query(
      `
        INSERT INTO estoque
        (id, codigo, lote, rack, quantidade, validade, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        item.id,
        item.codigo,
        item.lote,
        item.rack,
        item.quantidade || 0,
        item.validade || null,
        item.data_entrada || new Date()
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
      m.id,
      p.codigo,
      p.nome,
      m.lote,
      m.rack,
      m.tipo,
      m.quantidade,
      m.usuario,
      m.data_movimentacao
    FROM movimentacoes m
    INNER JOIN produtos p ON p.id = m.produto_id
  `);

  console.log("Migrando movimentações:", movimentacoes.length);

  for(const item of movimentacoes){
    await pool.query(
      `
        INSERT INTO movimentacoes
        (id, codigo, nome, lote, rack, tipo, quantidade, usuario, data_movimentacao)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        item.id,
        item.codigo || null,
        item.nome || null,
        item.lote || null,
        item.rack || null,
        item.tipo || null,
        item.quantidade || 0,
        item.usuario || "Sistema",
        item.data_movimentacao || new Date()
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

async function migrarInventario(){

  const existe = await tabelaExisteSQLite("inventario");

  if(!existe){
    console.log("Tabela inventario não existe no SQLite. Pulando...");
    return;
  }

  const inventario = await listarSQLite("SELECT * FROM inventario");

  console.log("Migrando inventário:", inventario.length);

  for(const item of inventario){
    await pool.query(
      `
        INSERT INTO inventario
        (
          id,
          estoque_id,
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        item.id,
        item.estoque_id || null,
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
      'inventario_id_seq',
      COALESCE((SELECT MAX(id) FROM inventario), 1)
    )
  `);
}

async function migrarBackupLogs(){

  const existe = await tabelaExisteSQLite("backup_logs");

  if(!existe){
    console.log("Tabela backup_logs não existe no SQLite. Pulando...");
    return;
  }

  const backupLogs = await listarSQLite("SELECT * FROM backup_logs");

  console.log("Migrando logs de backup:", backupLogs.length);

  for(const item of backupLogs){
    await pool.query(
      `
        INSERT INTO backup_logs
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
      'backup_logs_id_seq',
      COALESCE((SELECT MAX(id) FROM backup_logs), 1)
    )
  `);
}

async function migrar(){
  try{
    console.log("Iniciando migração operacional corrigida...");

    await limparTabelasOperacionaisPostgres();

    await migrarEstoque();
    await migrarMovimentacoes();
    await migrarInventario();
    await migrarBackupLogs();

    console.log("Migração operacional concluída com sucesso.");

  } catch(erro){
    console.error("Erro na migração operacional:", erro.message);
  } finally{
    db.close();
    await pool.end();
  }
}

migrar();
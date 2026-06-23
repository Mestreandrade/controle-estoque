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

async function limparTabelasPostgres(){
  console.log("Limpando tabelas de cadastro no PostgreSQL...");

  await pool.query("DELETE FROM produtos");
  await pool.query("DELETE FROM racks");
  await pool.query("DELETE FROM usuarios");

  await pool.query("ALTER SEQUENCE produtos_id_seq RESTART WITH 1");
  await pool.query("ALTER SEQUENCE racks_id_seq RESTART WITH 1");
  await pool.query("ALTER SEQUENCE usuarios_id_seq RESTART WITH 1");
}

async function migrarProdutos(){
  const produtos = await listarSQLite("SELECT * FROM produtos");

  console.log("Migrando produtos:", produtos.length);

  for(const item of produtos){
    await pool.query(
      `
        INSERT INTO produtos
        (id, codigo, nome, imagem, codigo_barras)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (codigo) DO NOTHING
      `,
      [
        item.id,
        item.codigo,
        item.nome,
        item.imagem || null,
        item.codigo_barras || null
      ]
    );
  }

  await pool.query(`
    SELECT setval(
      'produtos_id_seq',
      COALESCE((SELECT MAX(id) FROM produtos), 1)
    )
  `);
}

async function migrarRacks(){
  const racks = await listarSQLite("SELECT * FROM racks");

  console.log("Migrando racks:", racks.length);

  for(const item of racks){
    await pool.query(
      `
        INSERT INTO racks
        (id, endereco, status)
        VALUES ($1, $2, $3)
        ON CONFLICT (endereco) DO NOTHING
      `,
      [
        item.id,
        item.endereco,
        item.status || "LIVRE"
      ]
    );
  }

  await pool.query(`
    SELECT setval(
      'racks_id_seq',
      COALESCE((SELECT MAX(id) FROM racks), 1)
    )
  `);
}

async function migrarUsuarios(){
  const usuarios = await listarSQLite("SELECT * FROM usuarios");

  console.log("Migrando usuários:", usuarios.length);

  for(const item of usuarios){
    await pool.query(
      `
        INSERT INTO usuarios
        (id, nome, usuario, senha, perfil)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (usuario) DO NOTHING
      `,
      [
        item.id,
        item.nome,
        item.usuario,
        item.senha,
        item.perfil
      ]
    );
  }

  await pool.query(`
    SELECT setval(
      'usuarios_id_seq',
      COALESCE((SELECT MAX(id) FROM usuarios), 1)
    )
  `);
}

async function migrar(){
  try{
    console.log("Iniciando migração de cadastros...");

    await limparTabelasPostgres();

    await migrarProdutos();
    await migrarRacks();
    await migrarUsuarios();

    console.log("Migração de cadastros concluída com sucesso.");

  } catch(erro){
    console.error("Erro na migração:", erro.message);
  } finally{
    db.close();
    await pool.end();
  }
}

migrar();
require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true"
    ? { rejectUnauthorized: false }
    : false
});

async function testarConexaoPostgres(){
  try{
    const resultado = await pool.query("SELECT NOW() AS agora");
    console.log("PostgreSQL conectado com sucesso:", resultado.rows[0].agora);
  } catch(erro){
    console.error("Erro ao conectar no PostgreSQL:", erro.message);
  }
}

module.exports = {
  pool,
  testarConexaoPostgres
};
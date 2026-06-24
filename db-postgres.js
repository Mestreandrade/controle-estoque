require("dotenv").config();

const { pool } = require("./postgres");

function converterParametros(sql){
    let contador = 0;

    return sql.replace(/\?/g, () => {
        contador++;
        return "$" + contador;
    });
}

const db = {

    all(sql, params, callback){
        const sqlConvertido = converterParametros(sql);

        pool.query(sqlConvertido, params || [])
            .then(resultado => {
                callback(null, resultado.rows);
            })
            .catch(erro => {
                console.error("Erro PostgreSQL all:", erro.message);
                callback(erro, []);
            });
    },

    get(sql, params, callback){
        const sqlConvertido = converterParametros(sql);

        pool.query(sqlConvertido, params || [])
            .then(resultado => {
                callback(null, resultado.rows[0]);
            })
            .catch(erro => {
                console.error("Erro PostgreSQL get:", erro.message);
                callback(erro, null);
            });
    },

    run(sql, params, callback){
        const sqlConvertido = converterParametros(sql);

        pool.query(sqlConvertido, params || [])
            .then(resultado => {
                if(callback){
                    callback.call({
                        changes: resultado.rowCount,
                        lastID: null
                    }, null);
                }
            })
            .catch(erro => {
                console.error("Erro PostgreSQL run:", erro.message);
                if(callback){
                    callback.call({
                        changes: 0,
                        lastID: null
                    }, erro);
                }
            });
    },

    serialize(callback){
        callback();
    }
};

module.exports = db;
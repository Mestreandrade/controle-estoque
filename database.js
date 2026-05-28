const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./estoque.db");

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT,
            quantidade INTEGER
        )
    `);

});

module.exports = db;
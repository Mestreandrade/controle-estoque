const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./estoque.db");

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT UNIQUE NOT NULL,
            nome TEXT NOT NULL,
            imagem TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS racks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            endereco TEXT UNIQUE NOT NULL,
            status TEXT DEFAULT 'LIVRE'
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS estoque (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto_id INTEGER NOT NULL,
            lote TEXT NOT NULL,
            rack TEXT UNIQUE NOT NULL,
            quantidade INTEGER DEFAULT 0,
            validade TEXT,
            data_entrada TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (produto_id) REFERENCES produtos(id)
        )
    `);

    db.all(`PRAGMA table_info(estoque)`, [], (err, colunas) => {
        if (!err) {
            const existeValidade = colunas.some(coluna => coluna.name === "validade");

            if (!existeValidade) {
                db.run(`ALTER TABLE estoque ADD COLUMN validade TEXT`);
            }
        }
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS movimentacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto_id INTEGER NOT NULL,
            lote TEXT NOT NULL,
            rack TEXT NOT NULL,
            tipo TEXT NOT NULL,
            quantidade INTEGER NOT NULL,
            data_movimentacao TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (produto_id) REFERENCES produtos(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            usuario TEXT UNIQUE NOT NULL,
            senha TEXT NOT NULL,
            perfil TEXT NOT NULL
        )
    `);

    db.run(`
        INSERT OR IGNORE INTO usuarios
        (nome, usuario, senha, perfil)
        VALUES ('Administrador', 'admin', '123', 'ADMIN')
    `);

});

module.exports = db;
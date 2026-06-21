const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./estoque.db");

db.serialize(() => {

    /* PRODUTOS */

    db.run(`
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT UNIQUE NOT NULL,
            nome TEXT NOT NULL,
            imagem TEXT,
            codigo_barras TEXT
        )
    `);

    /* ADICIONAR CÓDIGO DE BARRAS EM PRODUTOS */

    db.all(`PRAGMA table_info(produtos)`, [], (err, colunas) => {
        if (!err) {
            const existeCodigoBarras = colunas.some(coluna => coluna.name === "codigo_barras");

            if (!existeCodigoBarras) {
                db.run(`ALTER TABLE produtos ADD COLUMN codigo_barras TEXT`);
            }
        }
    });


    /* RACKS */

    db.run(`
        CREATE TABLE IF NOT EXISTS racks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            endereco TEXT UNIQUE NOT NULL,
            status TEXT DEFAULT 'LIVRE'
        )
    `);


    /* ESTOQUE */

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

    /* ADICIONAR VALIDADE EM ESTOQUE */

    db.all(`PRAGMA table_info(estoque)`, [], (err, colunas) => {
        if (!err) {
            const existeValidade = colunas.some(coluna => coluna.name === "validade");

            if (!existeValidade) {
                db.run(`ALTER TABLE estoque ADD COLUMN validade TEXT`);
            }
        }
    });


    /* MOVIMENTAÇÕES */

    db.run(`
        CREATE TABLE IF NOT EXISTS movimentacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto_id INTEGER NOT NULL,
            lote TEXT NOT NULL,
            rack TEXT NOT NULL,
            tipo TEXT NOT NULL,
            quantidade INTEGER NOT NULL,
            usuario TEXT,
            data_movimentacao TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (produto_id) REFERENCES produtos(id)
        )
    `);

    /* ADICIONAR USUÁRIO EM MOVIMENTAÇÕES */

    db.all(`PRAGMA table_info(movimentacoes)`, [], (err, colunas) => {
        if (!err) {
            const existeUsuario = colunas.some(coluna => coluna.name === "usuario");

            if (!existeUsuario) {
                db.run(`ALTER TABLE movimentacoes ADD COLUMN usuario TEXT`);
            }
        }
    });


    /* HISTÓRICO DE BACKUPS */

    db.run(`
        CREATE TABLE IF NOT EXISTS backups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT,
            data_backup TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);


    /* INVENTÁRIOS */

    db.run(`
        CREATE TABLE IF NOT EXISTS inventarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            estoque_id INTEGER,
            produto_id INTEGER NOT NULL,
            codigo TEXT NOT NULL,
            produto TEXT NOT NULL,
            lote TEXT NOT NULL,
            rack TEXT NOT NULL,
            quantidade_sistema INTEGER NOT NULL,
            quantidade_contada INTEGER NOT NULL,
            divergencia INTEGER NOT NULL,
            usuario TEXT,
            status TEXT DEFAULT 'PENDENTE',
            data_inventario TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (produto_id) REFERENCES produtos(id)
        )
    `);


    /* USUÁRIOS */

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
    INSERT INTO usuarios
    (nome, usuario, senha, perfil)
    VALUES ('Administrador', 'admin', '123', 'ADMIN')
    ON CONFLICT(usuario) DO UPDATE SET
        senha = '123',
        perfil = 'ADMIN'
`);

});

module.exports = db;
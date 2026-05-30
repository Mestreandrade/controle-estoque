const express = require("express");
const path = require("path");
const db = require("./database");

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

/* LOGIN */

app.post("/login", (req, res) => {
    const { usuario, senha } = req.body;

    db.get(
        "SELECT id, nome, usuario, perfil FROM usuarios WHERE usuario = ? AND senha = ?",
        [usuario, senha],
        (err, row) => {
            if(err || !row){
                res.json({ sucesso: false, mensagem: "Usuário ou senha inválidos" });
            } else {
                res.json({ sucesso: true, usuario: row });
            }
        }
    );
});

/* PERMISSÕES */

function somenteAdmin(req, res, next){
    const perfil = req.headers["perfil"];

    if(perfil !== "ADMIN"){
        return res.send("Acesso negado: somente administrador");
    }

    next();
}

function adminOuOperador(req, res, next){
    const perfil = req.headers["perfil"];

    if(perfil !== "ADMIN" && perfil !== "OPERADOR"){
        return res.send("Acesso negado: permissão insuficiente");
    }

    next();
}

/* USUÁRIOS */

app.post("/usuarios", somenteAdmin, (req, res) => {
    const { nome, usuario, senha, perfil } = req.body;

    db.run(
        `
        INSERT INTO usuarios
        (nome, usuario, senha, perfil)
        VALUES (?, ?, ?, ?)
        `,
        [nome, usuario, senha, perfil],
        function(err){
            if(err){
                res.send("Erro: usuário já cadastrado ou dados inválidos");
            } else {
                res.send("Usuário cadastrado com sucesso");
            }
        }
    );
});

app.put("/usuarios/:id", somenteAdmin, (req, res) => {
    const id = req.params.id;
    const { nome, usuario, senha, perfil } = req.body;

    if(senha && senha.trim() !== ""){
        db.run(
            `
            UPDATE usuarios
            SET nome = ?,
                usuario = ?,
                senha = ?,
                perfil = ?
            WHERE id = ?
            `,
            [nome, usuario, senha, perfil, id],
            function(err){
                if(err){
                    res.send("Erro ao atualizar usuário");
                } else {
                    res.send("Usuário atualizado com sucesso");
                }
            }
        );
    } else {
        db.run(
            `
            UPDATE usuarios
            SET nome = ?,
                usuario = ?,
                perfil = ?
            WHERE id = ?
            `,
            [nome, usuario, perfil, id],
            function(err){
                if(err){
                    res.send("Erro ao atualizar usuário");
                } else {
                    res.send("Usuário atualizado com sucesso");
                }
            }
        );
    }
});

app.get("/usuarios", somenteAdmin, (req, res) => {
    db.all(
        "SELECT id, nome, usuario, perfil FROM usuarios ORDER BY nome",
        [],
        (err, rows) => {
            if(err){
                res.send("Erro ao buscar usuários");
            } else {
                res.json(rows);
            }
        }
    );
});

/* PRODUTOS */

app.post("/produtos", somenteAdmin, (req, res) => {
    const { codigo, nome, imagem } = req.body;

    db.run(
        "INSERT INTO produtos (codigo, nome, imagem) VALUES (?, ?, ?)",
        [codigo, nome, imagem || null],
        function(err){
            if(err){
                res.send("Erro: código já cadastrado ou dados inválidos");
            } else {
                res.send("Produto cadastrado com sucesso");
            }
        }
    );
});

app.put("/produtos/:id", somenteAdmin, (req, res) => {
    const id = req.params.id;
    const { codigo, nome, imagem } = req.body;

    db.run(
        `
        UPDATE produtos
        SET codigo = ?,
            nome = ?,
            imagem = COALESCE(?, imagem)
        WHERE id = ?
        `,
        [codigo, nome, imagem || null, id],
        function(err){
            if(err){
                res.send("Erro ao atualizar: código já existe ou dados inválidos");
            } else {
                res.send("Produto atualizado com sucesso");
            }
        }
    );
});

app.get("/produtos", (req, res) => {
    db.all("SELECT * FROM produtos ORDER BY codigo", [], (err, rows) => {
        if(err){
            res.send("Erro ao buscar produtos");
        } else {
            res.json(rows);
        }
    });
});

app.get("/produtos/:codigo", (req, res) => {
    const codigo = req.params.codigo;

    db.get(
        "SELECT * FROM produtos WHERE codigo = ?",
        [codigo],
        (err, row) => {
            if(err || !row){
                res.json(null);
            } else {
                res.json(row);
            }
        }
    );
});

/* RACKS */

app.post("/racks", somenteAdmin, (req, res) => {
    const { endereco } = req.body;

    db.run(
        "INSERT INTO racks (endereco) VALUES (?)",
        [endereco],
        function(err){
            if(err){
                res.send("Erro: rack já cadastrado ou inválido");
            } else {
                res.send("Rack cadastrado com sucesso");
            }
        }
    );
});

app.put("/racks/:id", somenteAdmin, (req, res) => {
    const id = req.params.id;
    const { endereco } = req.body;

    db.get(
        "SELECT endereco FROM racks WHERE id = ?",
        [id],
        (err, rackAtual) => {

            if(err || !rackAtual){
                return res.send("Rack não encontrado");
            }

            db.get(
                "SELECT * FROM estoque WHERE rack = ?",
                [rackAtual.endereco],
                (err, estoque) => {

                    if(estoque){
                        return res.send("Não é permitido alterar rack ocupado");
                    }

                    db.run(
                        `
                        UPDATE racks
                        SET endereco = ?
                        WHERE id = ?
                        `,
                        [endereco, id],
                        function(err){
                            if(err){
                                res.send("Erro ao atualizar rack: endereço já existe ou inválido");
                            } else {
                                res.send("Rack atualizado com sucesso");
                            }
                        }
                    );

                }
            );
        }
    );
});

app.delete("/racks/:id", somenteAdmin, (req, res) => {
    const id = req.params.id;

    db.get(
        "SELECT endereco FROM racks WHERE id = ?",
        [id],
        (err, rackAtual) => {

            if(err || !rackAtual){
                return res.send("Rack não encontrado");
            }

            db.get(
                "SELECT * FROM estoque WHERE rack = ?",
                [rackAtual.endereco],
                (err, estoque) => {

                    if(estoque){
                        return res.send("Não é permitido excluir rack ocupado");
                    }

                    db.run(
                        "DELETE FROM racks WHERE id = ?",
                        [id],
                        function(err){
                            if(err){
                                res.send("Erro ao excluir rack");
                            } else {
                                res.send("Rack excluído com sucesso");
                            }
                        }
                    );

                }
            );
        }
    );
});

app.post("/racks-excluir-lote", somenteAdmin, (req, res) => {
    const { ids } = req.body;

    if(!ids || ids.length === 0){
        return res.send("Nenhum rack selecionado");
    }

    let excluidos = 0;
    let bloqueados = 0;
    let processados = 0;

    ids.forEach(id => {
        db.get(
            "SELECT endereco FROM racks WHERE id = ?",
            [id],
            (err, rackAtual) => {

                if(err || !rackAtual){
                    bloqueados++;
                    finalizar();
                    return;
                }

                db.get(
                    "SELECT * FROM estoque WHERE rack = ?",
                    [rackAtual.endereco],
                    (err, estoque) => {

                        if(estoque){
                            bloqueados++;
                            finalizar();
                            return;
                        }

                        db.run(
                            "DELETE FROM racks WHERE id = ?",
                            [id],
                            function(err){
                                if(err){
                                    bloqueados++;
                                } else {
                                    excluidos++;
                                }

                                finalizar();
                            }
                        );
                    }
                );
            }
        );
    });

    function finalizar(){
        processados++;

        if(processados === ids.length){
            res.send(`Excluídos: ${excluidos}. Não excluídos/ocupados: ${bloqueados}`);
        }
    }
});

app.get("/racks", (req, res) => {
    db.all("SELECT * FROM racks ORDER BY endereco", [], (err, rows) => {
        if(err){
            res.send("Erro ao buscar racks");
        } else {
            res.json(rows);
        }
    });
});

app.get("/racks-livres", (req, res) => {
    db.all(
        `
        SELECT racks.*
        FROM racks
        LEFT JOIN estoque
        ON racks.endereco = estoque.rack
        WHERE estoque.rack IS NULL
        ORDER BY racks.endereco
        `,
        [],
        (err, rows) => {
            if(err){
                res.send("Erro ao buscar racks livres");
            } else {
                res.json(rows);
            }
        }
    );
});

app.get("/racks-ocupados", (req, res) => {
    db.all(
        `
        SELECT 
            estoque.rack,
            produtos.codigo,
            produtos.nome,
            estoque.lote,
            estoque.quantidade,
            estoque.validade
        FROM estoque
        INNER JOIN produtos
        ON produtos.id = estoque.produto_id
        ORDER BY estoque.rack
        `,
        [],
        (err, rows) => {
            if(err){
                res.send("Erro ao buscar racks ocupados");
            } else {
                res.json(rows);
            }
        }
    );
});

/* ENTRADA */

app.post("/entrada", adminOuOperador, (req, res) => {
    const { codigo, lote, rack, quantidade, validade } = req.body;

    db.get(
        "SELECT * FROM produtos WHERE codigo = ?",
        [codigo],
        (err, produto) => {

            if(!produto){
                return res.send("Produto não encontrado");
            }

            db.get(
                "SELECT * FROM racks WHERE endereco = ?",
                [rack],
                (err, rackCadastrado) => {

                    if(!rackCadastrado){
                        return res.send("Rack não cadastrado");
                    }

                    db.get(
                        "SELECT * FROM estoque WHERE rack = ?",
                        [rack],
                        (err, endereco) => {

                            if(endereco){

                                if(
                                    endereco.produto_id === produto.id &&
                                    endereco.lote === lote
                                ){
                                    db.run(
                                        `
                                        UPDATE estoque
                                        SET quantidade = quantidade + ?,
                                            validade = COALESCE(?, validade)
                                        WHERE rack = ?
                                        `,
                                        [quantidade, validade || null, rack],
                                        function(err){
                                            if(err){
                                                return res.send("Erro ao atualizar estoque");
                                            }

                                            registrarMovimentacao(produto.id, lote, rack, "ENTRADA", quantidade);
                                            res.send("Entrada adicionada ao endereço existente");
                                        }
                                    );
                                } else {
                                    return res.send("Endereço ocupado por outro produto ou lote");
                                }

                            } else {

                                db.run(
                                    `
                                    INSERT INTO estoque
                                    (produto_id, lote, rack, quantidade, validade)
                                    VALUES (?, ?, ?, ?, ?)
                                    `,
                                    [produto.id, lote, rack, quantidade, validade || null],
                                    function(err){
                                        if(err){
                                            return res.send("Erro ao dar entrada no estoque");
                                        }

                                        registrarMovimentacao(produto.id, lote, rack, "ENTRADA", quantidade);
                                        res.send("Entrada realizada com sucesso");
                                    }
                                );

                            }

                        }
                    );
                }
            );
        }
    );
});

/* SAÍDA */

app.post("/saida", adminOuOperador, (req, res) => {
    const { codigo, lote, rack, quantidade } = req.body;

    db.get(
        "SELECT * FROM produtos WHERE codigo = ?",
        [codigo],
        (err, produto) => {

            if(!produto){	
                return res.send("Produto não encontrado");
            }

            db.get(
                `
                SELECT * FROM estoque
                WHERE produto_id = ?
                AND lote = ?
                AND rack = ?
                `,
                [produto.id, lote, rack],
                (err, estoque) => {

                    if(!estoque){
                        return res.send("Produto/lote/rack não encontrado no estoque");
                    }

                    if(estoque.quantidade < quantidade){
                        return res.send("Quantidade insuficiente no estoque");
                    }

                    const novaQuantidade = estoque.quantidade - quantidade;

                    if(novaQuantidade === 0){
                        db.run(
                            "DELETE FROM estoque WHERE id = ?",
                            [estoque.id],
                            function(err){
                                if(err){
                                    return res.send("Erro ao remover estoque");
                                }

                                registrarMovimentacao(produto.id, lote, rack, "SAIDA", quantidade);
                                res.send("Saída realizada e endereço liberado");
                            }
                        );
                    } else {
                        db.run(
                            "UPDATE estoque SET quantidade = ? WHERE id = ?",
                            [novaQuantidade, estoque.id],
                            function(err){
                                if(err){
                                    return res.send("Erro ao atualizar estoque");
                                }

                                registrarMovimentacao(produto.id, lote, rack, "SAIDA", quantidade);
                                res.send("Saída realizada com sucesso");
                            }
                        );
                    }

                }
            );
        }
    );
});


/* BLOCO 1 — Buscar estoque para saída  */



app.get("/estoque-busca", (req, res) => {
    const tipo = req.query.tipo;
    const termo = req.query.termo;

    let sql = `
        SELECT 
            estoque.id,
            produtos.codigo,
            produtos.nome,
            estoque.lote,
            estoque.rack,
            estoque.quantidade,
            estoque.validade
        FROM estoque
        INNER JOIN produtos
        ON produtos.id = estoque.produto_id
        WHERE 1 = 1
    `;

    let params = [];

    if(tipo === "produto"){
        sql += " AND produtos.codigo LIKE ?";
        params.push(`%${termo}%`);
    }

    if(tipo === "lote"){
        sql += " AND estoque.lote LIKE ?";
        params.push(`%${termo}%`);
    }

    sql += " ORDER BY estoque.validade, estoque.rack";

    db.all(sql, params, (err, rows) => {
        if(err){
            res.send("Erro ao buscar estoque");
        } else {
            res.json(rows);
        }
    });
});




/* BLOCO 2 — Saída em lote por vários endereços */



app.post("/saida-lote", adminOuOperador, (req, res) => {
    const { itens } = req.body;

    if(!itens || itens.length === 0){
        return res.send("Nenhum item informado para saída");
    }

    let processados = 0;
    let sucesso = 0;
    let erros = 0;

    itens.forEach(item => {

        const { estoque_id, quantidade_saida } = item;

        db.get(
            `
            SELECT 
                estoque.*,
                produtos.id AS produto_id,
                produtos.codigo,
                produtos.nome
            FROM estoque
            INNER JOIN produtos
            ON produtos.id = estoque.produto_id
            WHERE estoque.id = ?
            `,
            [estoque_id],
            (err, estoque) => {

                if(err || !estoque){
                    erros++;
                    finalizar();
                    return;
                }

                if(Number(quantidade_saida) <= 0){
                    erros++;
                    finalizar();
                    return;
                }

                if(estoque.quantidade < Number(quantidade_saida)){
                    erros++;
                    finalizar();
                    return;
                }

                const novaQuantidade = estoque.quantidade - Number(quantidade_saida);

                if(novaQuantidade === 0){

                    db.run(
                        "DELETE FROM estoque WHERE id = ?",
                        [estoque_id],
                        function(err){

                            if(err){
                                erros++;
                            } else {
                                registrarMovimentacao(
                                    estoque.produto_id,
                                    estoque.lote,
                                    estoque.rack,
                                    "SAIDA",
                                    quantidade_saida
                                );

                                sucesso++;
                            }

                            finalizar();
                        }
                    );

                } else {

                    db.run(
                        "UPDATE estoque SET quantidade = ? WHERE id = ?",
                        [novaQuantidade, estoque_id],
                        function(err){

                            if(err){
                                erros++;
                            } else {
                                registrarMovimentacao(
                                    estoque.produto_id,
                                    estoque.lote,
                                    estoque.rack,
                                    "SAIDA",
                                    quantidade_saida
                                );

                                sucesso++;
                            }

                            finalizar();
                        }
                    );

                }

            }
        );

    });

    function finalizar(){
        processados++;

        if(processados === itens.length){
            res.send(`Saídas realizadas: ${sucesso}. Erros: ${erros}`);
        }
    }
});





/* CONSULTAS */

app.get("/estoque", (req, res) => {
    db.all(
        `
        SELECT 
            estoque.id,
            produtos.codigo,
            produtos.nome,
            produtos.imagem,
            estoque.lote,
            estoque.rack,
            estoque.quantidade,
            estoque.validade,
            estoque.data_entrada
        FROM estoque
        INNER JOIN produtos
        ON produtos.id = estoque.produto_id
        ORDER BY estoque.rack
        `,
        [],
        (err, rows) => {
            if(err){
                res.send("Erro ao buscar estoque");
            } else {
                res.json(rows);
            }
        }
    );
});

app.get("/movimentacoes", (req, res) => {
    db.all(
        `
        SELECT
            movimentacoes.id,
            produtos.codigo,
            produtos.nome,
            movimentacoes.lote,
            movimentacoes.rack,
            movimentacoes.tipo,
            movimentacoes.quantidade,
            movimentacoes.data_movimentacao
        FROM movimentacoes
        INNER JOIN produtos
        ON produtos.id = movimentacoes.produto_id
        ORDER BY movimentacoes.id DESC
        `,
        [],
        (err, rows) => {
            if(err){
                res.send("Erro ao buscar movimentações");
            } else {
                res.json(rows);
            }
        }
    );
});

/* FUNÇÃO AUXILIAR */

function registrarMovimentacao(produto_id, lote, rack, tipo, quantidade){
    db.run(
        `
        INSERT INTO movimentacoes
        (produto_id, lote, rack, tipo, quantidade)
        VALUES (?, ?, ?, ?, ?)
        `,
        [produto_id, lote, rack, tipo, quantidade]
    );
}

/* INICIAR SERVIDOR */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Servidor rodando 🚀 na porta " + PORT);
});
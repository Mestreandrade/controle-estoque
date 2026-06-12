const express = require("express");
const path = require("path");
const db = require("./database");
const multer = require("multer");
const fs = require("fs");




const app = express();

app.use(express.static("Public"));

const upload = multer({
  dest: "uploads/"
});

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname,"Public")));
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
    const { codigo, nome, imagem, codigo_barras } = req.body;

    db.run(
        `
        INSERT INTO produtos
        (codigo, nome, imagem, codigo_barras)
        VALUES (?, ?, ?, ?)
        `,
        [codigo, nome, imagem || null, codigo_barras || null],
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
    const { codigo, nome, imagem, codigo_barras } = req.body;

    db.run(
        `
        UPDATE produtos
        SET codigo = ?,
            nome = ?,
            imagem = COALESCE(?, imagem),
            codigo_barras = ?
        WHERE id = ?
        `,
        [codigo, nome, imagem || null, codigo_barras || null, id],
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


/* BUSCAR PRODUTO POR CÓDIGO INTERNO OU CÓDIGO DE BARRAS */

app.get("/produtos/:codigo", (req, res) => {
    const codigo = req.params.codigo;

    db.get(
        `
        SELECT *
        FROM produtos
        WHERE codigo = ?
        OR codigo_barras = ?
        `,
        [codigo, codigo],
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

app.get("/mapa-entrada", (req, res) => {
    const termo = (req.query.termo || "").trim();

    if(termo === ""){
        return res.json([]);
    }

    const busca = `%${termo}%`;

    db.all(
        `
        SELECT 
            racks.endereco AS rack,
            CASE 
                WHEN estoque.id IS NULL THEN 'LIVRE'
                ELSE 'OCUPADO'
            END AS status,
            produtos.codigo AS codigo,
            produtos.nome AS produto,
            estoque.lote AS lote,
            estoque.quantidade AS quantidade,
            estoque.validade AS validade
        FROM racks
        LEFT JOIN estoque
            ON estoque.rack = racks.endereco
        LEFT JOIN produtos
            ON produtos.id = estoque.produto_id
        WHERE 
            racks.endereco LIKE ?
            OR produtos.codigo LIKE ?
            OR produtos.nome LIKE ?
            OR estoque.lote LIKE ?
        ORDER BY racks.endereco
        `,
        [busca, busca, busca, busca],
        (err, rows) => {
            if(err){
                return res.status(500).send("Erro ao buscar mapa de entrada");
            }

            res.json(rows);
        }
    );
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
        `
        SELECT *
        FROM produtos
        WHERE codigo = ?
        OR codigo_barras = ?
        `,
        [codigo, codigo],
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
                                return res.send("Este rack já está ocupado. Faça a saída antes de realizar nova entrada.");
                            }

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

                                    registrarMovimentacao(
  produto.id,
  lote,
  rack,
  req.body.tipo_movimentacao || "ENTRADA",
  quantidade,
  req.headers.usuario || "Sistema"
);
                                    res.send("Entrada realizada com sucesso");
                                }
                            );

                        }
                    );
                }
            );
        }
    );
});




/* BUSCAR ESTOQUE POR RACK */

app.get("/estoque-rack/:rack", (req, res) => {
    const rack = req.params.rack;

    db.get(
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
        WHERE estoque.rack = ?
        `,
        [rack],
        (err, row) => {
            if(err || !row){
                res.json(null);
            } else {
                res.json(row);
            }
        }
    );
});










/* SAÍDA */

app.post("/saida", adminOuOperador, (req, res) => {
    const { codigo, lote, rack, quantidade } = req.body;

    
db.get(
    `
    SELECT *
    FROM produtos
    WHERE codigo = ?
    OR codigo_barras = ?
    `,
    [codigo, codigo],


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


                                registrarMovimentacao(produto.id,
    lote,
    rack,
    "SAIDA",
    quantidade,
    req.headers.usuario || "Sistema"
);

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



registrarMovimentacao(
    produto.id,
    lote,
    rack,
    "SAIDA",
    quantidade,
    req.headers.usuario || "Sistema"
);

res.send("Saída realizada com sucesso");




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


app.get("/estoque-rastreamento", (req, res) => {
    const termo = (req.query.termo || "").trim();
    const tipo = (req.query.tipo || "codigo").trim();

    if(termo === ""){
        return res.json([]);
    }

    let sql = `
        SELECT 
            estoque.id,
            produtos.codigo,
            produtos.nome,
            estoque.lote,
            estoque.rack,
            estoque.quantidade,
            estoque.validade,
            estoque.data_entrada
        FROM estoque
        INNER JOIN produtos
        ON produtos.id = estoque.produto_id
        WHERE 1 = 1
    `;

    let params = [];

    if(tipo === "codigo"){
        sql += " AND produtos.codigo LIKE ?";
        params.push(`%${termo}%`);
    }

    if(tipo === "lote"){
        sql += " AND estoque.lote LIKE ?";
        params.push(`%${termo}%`);
    }

    sql += " ORDER BY estoque.rack";

    db.all(sql, params, (err, rows) => {
        if(err){
            return res.status(500).send("Erro ao buscar rastreamento");
        }

        res.json(rows);
    });
});





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
            movimentacoes.usuario,
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





/* INVENTÁRIO */

/* LANÇAR CONTAGEM DO INVENTÁRIO */
app.post("/inventario", adminOuOperador, (req, res) => {
    const { estoque_id, quantidade_contada } = req.body;
    const usuario = req.headers.usuario || "Sistema";

    if(!estoque_id || quantidade_contada === undefined || quantidade_contada < 0){
        return res.send("Dados inválidos para inventário");
    }

    db.get(
        `
        SELECT
            estoque.id AS estoque_id,
            estoque.produto_id,
            produtos.codigo,
            produtos.nome,
            estoque.lote,
            estoque.rack,
            estoque.quantidade
        FROM estoque
        INNER JOIN produtos
        ON produtos.id = estoque.produto_id
        WHERE estoque.id = ?
        `,
        [estoque_id],
        (err, item) => {

            if(err || !item){
                return res.send("Item de estoque não encontrado");
            }

            const divergencia = Number(quantidade_contada) - Number(item.quantidade);
            const status = divergencia === 0 ? "CONFERIDO" : "PENDENTE";

            db.run(
                `
                INSERT INTO inventarios
                (
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
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    item.estoque_id,
                    item.produto_id,
                    item.codigo,
                    item.nome,
                    item.lote,
                    item.rack,
                    item.quantidade,
                    quantidade_contada,
                    divergencia,
                    usuario,
                    status
                ],
                function(err){
                    if(err){
                        res.send("Erro ao lançar inventário");
                    } else {
                        res.send("Inventário lançado com sucesso");
                    }
                }
            );
        }
    );
});


/* LISTAR INVENTÁRIO */
app.get("/inventario", (req, res) => {
    db.all(
        `
        SELECT *
        FROM inventarios
        ORDER BY id DESC
        `,
        [],
        (err, rows) => {
            if(err){
                res.send("Erro ao buscar inventário");
            } else {
                res.json(rows);
            }
        }
    );
});


/* AJUSTAR ESTOQUE PELO INVENTÁRIO - SOMENTE ADMIN */
app.post("/inventario/ajustar/:id", somenteAdmin, (req, res) => {
    const id = req.params.id;
    const usuario = req.headers.usuario || "Sistema";

    db.get(
        "SELECT * FROM inventarios WHERE id = ?",
        [id],
        (err, inv) => {

            if(err || !inv){
                return res.send("Inventário não encontrado");
            }

            if(inv.status === "AJUSTADO"){
                return res.send("Este inventário já foi ajustado");
            }

            db.run(
                `
                UPDATE estoque
                SET quantidade = ?
                WHERE id = ?
                `,
                [inv.quantidade_contada, inv.estoque_id],
                function(err){

                    if(err){
                        return res.send("Erro ao ajustar estoque");
                    }

                    registrarMovimentacao(
                        inv.produto_id,
                        inv.lote,
                        inv.rack,
                        "AJUSTE INVENTÁRIO",
                        inv.divergencia,
                        usuario
                    );

                    db.run(
                        `
                        UPDATE inventarios
                        SET status = 'AJUSTADO'
                        WHERE id = ?
                        `,
                        [id],
                        function(err){
                            if(err){
                                res.send("Estoque ajustado, mas erro ao atualizar status");
                            } else {
                                res.send("Estoque ajustado com sucesso");
                            }
                        }
                    );
                }
            );
        }
    );
});














/* FUNÇÃO AUXILIAR */

function registrarMovimentacao(produto_id, lote, rack, tipo, quantidade, usuario){
    db.run(
        `
        INSERT INTO movimentacoes
        (produto_id, lote, rack, tipo, quantidade, usuario)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [produto_id, lote, rack, tipo, quantidade, usuario || "Sistema"]
    );
}




/* INICIAR SERVIDOR */

const PORT = process.env.PORT || 3000;



/* BACKUP DO BANCO */

app.get("/backup", adminOuOperador, (req, res) => {

    const usuario = req.headers.usuario || "Sistema";

    db.run(
        `
        INSERT INTO backups (usuario)
        VALUES (?)
        `,
        [usuario]
    );

    const arquivoBanco = path.join(__dirname, "estoque.db");

    res.download(
        arquivoBanco,
        `backup-estoque-${new Date().toISOString().slice(0,10)}.db`
    );

});


/* ÚLTIMO BACKUP */

app.get("/ultimo-backup", (req, res) => {
    db.get(
        `
        SELECT usuario, data_backup
        FROM backups
        ORDER BY id DESC
        LIMIT 1
        `,
        [],
        (err, row) => {
            if(err){
                res.json(null);
            } else {
                res.json(row || null);
            }
        }
    );
});




/* VIRADA DO SISTEMA */

app.post("/virada-sistema", somenteAdmin, (req, res) => {

    db.serialize(() => {

        db.run("DELETE FROM movimentacoes");
        db.run("DELETE FROM inventarios");
        db.run("DELETE FROM estoque");

        res.send("Virada realizada com sucesso. Estoque, histórico e inventário foram zerados.");

    });

});




/* RESTAURAR BACKUP DO BANCO */

app.post("/restaurar-backup", upload.single("backup"), (req, res) => {

    if(req.headers.perfil !== "ADMIN"){
        return res.status(403).send("Acesso negado. Apenas administrador pode restaurar backup.");
    }

    if(!req.file){
        return res.status(400).send("Nenhum arquivo enviado.");
    }

    try{

        const arquivoBackup = req.file.path;

        fs.copyFileSync(arquivoBackup, "./estoque.db");

        fs.unlinkSync(arquivoBackup);

        res.send("Backup restaurado com sucesso. Reinicie o sistema.");

    }catch(erro){

        console.error("Erro ao restaurar backup:", erro);

        res.status(500).send("Erro ao restaurar backup.");

    }

});






app.listen(PORT, () => {
    console.log("Servidor rodando 🚀 na porta " + PORT);
});
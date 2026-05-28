const express = require("express");

const path = require("path");

const db = require("./database");

const app = express();

app.use(express.json());

app.use(express.static(__dirname));



/* ============================= */
/* ABRIR INDEX.HTML */
/* ============================= */

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "index.html")
    );

});



/* ============================= */
/* SALVAR PRODUTOS NO BANCO */
/* ============================= */

app.post("/produtos", (req, res) => {

    const { nome, quantidade } = req.body;

    db.run(

        `
        INSERT INTO produtos
        (nome, quantidade)
        VALUES (?, ?)
        `,

        [nome, quantidade],

        function(err){

            if(err){

                res.send("Erro ao salvar");

            } else {

                res.send("Produto salvo");

            }

        }

    );

});



/* ============================= */
/* LISTAR PRODUTOS DO BANCO */
/* ============================= */

app.get("/produtos", (req, res) => {

    db.all(

        "SELECT * FROM produtos",

        [],

        (err, rows) => {

            if(err){

                res.send("Erro ao buscar");

            } else {

                res.json(rows);

            }

        }

    );

});



/* ============================= */
/* EXCLUIR PRODUTO */
/* ============================= */

app.delete("/produtos/:id", (req, res) => {

    const id = req.params.id;

    db.run(

        "DELETE FROM produtos WHERE id = ?",

        [id],

        function(err){

            if(err){

                res.send("Erro ao excluir");

            } else {

                res.send("Produto excluído");

            }

        }

    );

});



/* ============================= */
/* INICIAR SERVIDOR */
/* ============================= */

app.listen(3000, () => {

    console.log("Servidor rodando 🚀");

});
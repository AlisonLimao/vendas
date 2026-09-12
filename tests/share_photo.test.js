/* VDV-20260911-07 — invariantes do compartilhamento com a foto escolhida.
 * Teste estático (node puro, mesmo padrão de telemetry_gate/favorites) sobre
 * o app.js — garante por grep:
 *   1. a via nova exige Web Share API COM suporte a arquivos
 *      (navigator.share + navigator.canShare, e canShare({files}) de novo
 *      depois do fetch) — sem suporte, o <a> wa.me segue intocado;
 *   2. o fallback wa.me existe em TODAS as saídas de erro (canShare falso,
 *      fetch falho) — mas NÃO no cancelamento do menu (AbortError);
 *   3. a foto compartilhada é a SELECIONADA na galeria (fotoSelecionada),
 *      nunca um índice fixo;
 *   4. GA + telemetria("share") continuam marcando antes das duas vias.
 * Rodar: node tests/share_photo.test.js */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const js = fs.readFileSync(
  path.join(__dirname, "..", "assets", "js", "app.js"),
  "utf8"
);

// 1. Gate dupla de suporte: antes do preventDefault (sem suporte → <a> wa.me
//    nativo) e depois do fetch (canShare({ files }) → share; senão fallback).
assert(
  js.includes("if (!navigator.share || !navigator.canShare) return;") &&
    js.includes("ev.preventDefault();"),
  "sem Web Share API, o fallback é o <a> wa.me intocado"
);
assert(
  js.includes("navigator.canShare({ files: [arquivo] })"),
  "depois do fetch, canShare({files}) decide entre share e fallback"
);
assert(
  js.includes("navigator.share({") &&
    js.includes("files: [arquivo]") &&
    js.includes("url: shareUrl(product)"),
  "o compartilhamento leva o arquivo + título + URL da página do produto"
);

// 2. Fallback em toda falha, EXCETO cancelamento do menu (AbortError).
assert(
  /if \(e && e\.name === "AbortError"\) return;/.test(js),
  "cancelar o menu de compartilhamento não pode disparar o fallback"
);
assert(
  (js.match(/window\.location\.href = share\.href;/g) || []).length >= 2,
  "fallback wa.me deve existir para canShare falso e para falha de fetch"
);

// 3. A foto é a selecionada na galeria — nunca índice fixo.
assert(
  js.includes("photos[fotoSelecionada] || photos[0]") &&
    js.includes("var fotoSelecionada = 0;"),
  "a foto compartilhada deve ser a escolhida na galeria (fotoSelecionada)"
);

// 4. As duas vias marcam GA + telemetria antes de qualquer ramificação.
const shareHandler = js.slice(
  js.indexOf('var share = main.querySelector("#share-wa")'),
  js.indexOf("// Fatia 24")
);
assert(
  shareHandler.includes('track("compartilhar_produto"') &&
    shareHandler.includes('telemetria("share"'),
  "GA + telemetria share marcados nos dois caminhos"
);

console.log("share_photo: OK (Web Share com arquivos + fallback wa.me + foto selecionada)");
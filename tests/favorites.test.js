/* Fase 0 do "gostei" (VDV-20260905-01) — invariantes do coração/favoritos.
 * Este teste é estático (node puro) sobre o app.js, mesmo padrão do
 * telemetry_gate.test.js — garante por grep as invariantes:
 *   1. favoritos vivem no localStorage ("vdv:favoritos"), sem backend;
 *   2. o evento ``like`` só sai DENTRO da função telemetria() (consent-gated
 *      — nunca um transporte próprio);
 *   3. o like parte APENAS do favoritar (desfavoritar não envia evento);
 *   4. o coração do card é um <button> FORA do <a> (HTML válido) e o clique
 *      não navega (preventDefault + stopPropagation);
 *   5. sem contagem pública: nenhum número de curtidas exportado/renderizado.
 * Rodar: node tests/favorites.test.js */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const js = fs.readFileSync(
  path.join(__dirname, "..", "assets", "js", "app.js"),
  "utf8"
);

// 1. Persistência local, sem backend: a lista de compras do comprador é
//    localStorage — nada de fetch/storage remoto no módulo de favoritos.
assert(
  js.includes('localStorage.getItem("vdv:favoritos")') &&
    js.includes('localStorage.setItem("vdv:favoritos"'),
  "favoritos devem persistir no localStorage (vdv:favoritos)"
);

// 2. O único ``like`` da vitrine passa pela telemetria() consent-gated —
//    nenhum transporte paralelo (fetch/XHR/sendBeacon direto fora dela).
const likeCalls = (js.match(/telemetria\("like"/g) || []).length;
assert(likeCalls >= 1, 'o coração deve emitir telemetria("like", …)');
assert(
  !/fetch\(|XMLHttpRequest/.test(
    js.slice(js.indexOf("var favoritos"), js.indexOf("function $("))
  ),
  "o módulo de favoritos não pode ter transporte próprio (só telemetria())"
);

// 3. O like é assimétrico: só no ramo favoritar (if agoraFavorito → push +
//    like). O ramo desfavoritar (else → splice) NÃO envia evento.
const alternar = js.slice(
  js.indexOf("function alternarFavorito"),
  js.indexOf("function botaoLike")
);
assert(
  /if \(agoraFavorito\) \{\s*favoritos\.push\(id\);\s*telemetria\("like", \{ product: id \}\);/.test(
    alternar
  ),
  'o like deve partir do ramo favoritar (push → telemetria("like"))'
);
assert(
  /else \{\s*favoritos\.splice\(i, 1\);\s*\}/.test(alternar),
  "o desfavoritar (splice) não pode emitir evento"
);

// 4. Coração fora do <a> e clique sem navegação.
assert(
  js.includes('btn.className = "card-like"') &&
    js.includes('wrap.appendChild(botaoLike(p.id));') &&
    js.includes("wrap.appendChild(a);"),
  "o coração deve ser um botão irmão do <a> dentro do card-wrap"
);
assert(
  js.includes("ev.preventDefault();\n      ev.stopPropagation();"),
  "o clique no coração não pode navegar (preventDefault + stopPropagation)"
);

// 5. Sem contagem pública (regra do mínimo do desenho de 05/09): o front
//    nunca renderiza número de curtidas — o like é sinal só para o /admin.
//    (Comentários são ignorados — só código conta.)
const codigoSemComentarios = js
  .split("\n")
  .filter(function (linha) {
    return !/^\s*\/\//.test(linha) && !/^\s*\*/.test(linha);
  })
  .join("\n");
assert(
  !/curtidas|likeCount|likesCount/i.test(codigoSemComentarios),
  "nenhuma contagem pública de curtidas no front"
);

console.log("favorites: OK (localStorage + like consent-gated + sem contagem pública)");
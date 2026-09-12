/* VDV-20260912-01 — invariantes do sinal operacional no front.
 * Medição operacional mínima (decisão 12/09): sinais agregados de direção
 * do produto (page_view/like/share/contact_click) que valem MESMO quando o
 * visitante RECUSA cookies. Este teste é estático (node puro) sobre o
 * app.js — garante por grep as invariantes da decisão:
 *   1. sinal() aponta para a rota operacional /sinal (sem sid no payload);
 *   2. sinal() NÃO é consent-gated (a decisão existe exatamente para a
 *      recusa) — mas também não tem identificador nenhum;
 *   3. o sinal operacional nunca carrega sid/supplier (campos fora do
 *      contrato fechado) e o transporte é navigator.sendBeacon;
 *   4. page_view na home (sem ref) e na página de produto (com ref);
 *   5. like/share/contact_click vão pros DOIS trilhos (operacional sempre +
 *      consentida quando aceito).
 * Rodar: node tests/signal.test.js */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const js = fs.readFileSync(
  path.join(__dirname, "..", "assets", "js", "app.js"),
  "utf8"
);

// 1. Rota operacional própria (irmã da /eventos consentida).
assert(
  /var\s+SINAL_URL\s*=\s*["']https:\/\/api\.vitrinedevenda\.com\.br\/sinal["'];/.test(
    js
  ),
  "SINAL_URL deve apontar para a rota operacional /sinal na ponte Cloudflare"
);

// 2. SEM gate de consentimento — e SEM identificador: o payload não monta
//    sid (a função nem o envia) e o servidor rejeita payload com sid.
assert(
  js.includes("if (!SINAL_URL) return;"),
  "sinal() só checa a URL — NÃO pode exigir consentimento (vale mesmo com recusa)"
);
assert(
  !js.includes("if (!SINAL_URL || !consentimentoTelemetria) return;"),
  "sinal() NÃO pode ser consent-gated (medição operacional mínima)"
);

// 3. Contrato fechado: payload com type/origin/product/category/channel —
//    nunca sid nem supplier (o endpoint rejeita 400).
assert(
  js.includes("var payload = { type: tipo, origin: \"web\" };"),
  "payload do sinal operacional não carrega sid"
);
var corpoSinal = js.slice(
  js.indexOf("function sinal("),
  js.indexOf("var favoritos")
);
assert(
  !/sid/.test(corpoSinal) && !/supplier/.test(corpoSinal),
  "sinal() não pode montar sid nem supplier (fora do contrato operacional)"
);
assert(
  js.includes("navigator.sendBeacon(SINAL_URL"),
  "o transporte do sinal deve ser navigator.sendBeacon (one-way)"
);

// 4. page_view: home SEM referência; produto COM referência.
assert(
  js.includes('sinal("page_view");'),
  "home deve emitir page_view sem referência (denominador do funil)"
);
assert(
  js.includes('sinal("page_view", { product: product.id });'),
  "página de produto deve emitir page_view com o produto"
);

// 5. Dual em like/share/contact_click: sinal() SEMPRE + telemetria() com
//    aceite (duas streams de propósitos distintos).
assert(
  js.includes('sinal("like", { product: id });'),
  "favoritar deve emitir like operacional (desfavoritar, nunca)"
);
assert(
  js.includes('sinal("share", { product: product.id });'),
  "compartilhar deve emitir share operacional"
);
assert(
  (js.match(/sinal\("contact_click"/g) || []).length === 2,
  "contact_click operacional deve existir nos 2 canais (whatsapp + telegram)"
);
assert(
  !/sinal\("(desfavoritar|unlike)"\)/.test(js),
  "desfavoritar nunca emite sinal (não inflar o sinal)"
);

console.log("signal.test.js: 5 invariantes OK");
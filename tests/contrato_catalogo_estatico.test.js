/* VDV-20261015-01 — catálogo estático na /explorar/ (indexação).
 * O exportador grava, entre os marcadores do shell da /explorar/, os cards
 * estáticos dos anúncios ativos (MESMA allowlist do products.json). A página
 * deixou de ser vazia no HTML bruto — causa do "Rastreada — não indexada"
 * no Search Console. Contrato estático (node puro, por regex — padrão das
 * suítes do front):
 *   1. markers do shell presentes e ordenados;
 *   2. seção #catalogo-estatico com a regra CSS de não-duplicação (irmãos);
 *   3. ids linkados em ../produto/<uuid>/ == catálogo público do products.json;
 *   4. nenhum href de produto fora do padrão ../produto/<uuid>/.
 * Rodar: node tests/contrato_catalogo_estatico.test.js */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const START = "<!-- catálogo estático (explorar): início -->";
const END = "<!-- catálogo estático (explorar): fim -->";

const shell = fs.readFileSync(
  path.join(__dirname, "..", "explorar", "index.html"),
  "utf8"
);
const catalog = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "products.json"), "utf8")
);

// 1. marcadores.
assert(shell.includes(START), "1. marcador inicial ausente do shell da /explorar/");
assert(shell.includes(END), "1. marcador final ausente do shell da /explorar/");

// 2. bloco injetado.
const i = shell.indexOf(START);
const j = shell.indexOf(END);
assert(j > i, "2. marcadores fora de ordem (início após fim)");
const bloco = shell.slice(i + START.length, j);
assert(
  /id="catalogo-estatico"/.test(bloco),
  "2. seção #catalogo-estatico ausente do bloco injetado"
);
assert(
  /#x-grid:not\(:empty\) ~ #catalogo-estatico\{display:none\}/.test(bloco),
  "2. regra CSS de não-duplicação ausente (grid JS cheio deve esconder a seção)"
);

// 3. contagem 1:1 com o catálogo público — nada a mais, nada a menos.
const cards = new Set(
  Array.from(bloco.matchAll(/href="\.\.\/produto\/([0-9a-f-]{36})\/"/g), m => m[1])
);
assert(
  cards.size === catalog.products.length,
  "3. cards estáticos (" + cards.size + ") ≠ products.json (" + catalog.products.length + ")"
);
for (const p of catalog.products) {
  assert(cards.has(String(p.id)), "3. produto " + p.id + " ausente do catálogo estático");
}

// 4. todos os hrefs de produto no bloco são do padrão canônico (uuid estático).
for (const href of bloco.matchAll(/href="([^"]*produto[^"]*)"/g)) {
  assert(
    /^\.\.\/produto\/[0-9a-f-]{36}\/$/.test(href[1]),
    "4. href de produto fora do padrão: " + href[1]
  );
}

console.log("contrato_catalogo_estatico: OK");
/* R12 (VDV-20260924-01) — estados com próximo caminho + skeleton.
 * Teste estático (node puro, por regex — padrão das suítes do front) sobre
 * app.js e vdv.css:
 *   1. skeleton (mestre item 39): renderSkeletons antes do fetch, com o
 *      encaixe do card real (card-wrap > .card-skeleton, sk-media 4/5 +
 *      linhas de corpo), removido no sucesso e no erro do fetch;
 *   2. skeleton visível apenas durante o load — seções ocupam o lugar do
 *      conteúdo (hidden = false) e o pulso respeita prefers-reduced-motion;
 *   3. neutra dinâmica (mestre item 48/49): "Produto não encontrado" com
 *      próximo caminho — além do "Ver ofertas", CTA "Veja outros produtos
 *      desta vitrine" para /explorar/;
 *   4. CSS do skeleton reusa tokens (sem cor crua fora dos tokens).
 * Rodar: node tests/estados_r12.test.js */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const js = fs.readFileSync(
  path.join(__dirname, "..", "assets", "js", "app.js"),
  "utf8"
);
const css = fs.readFileSync(
  path.join(__dirname, "..", "assets", "css", "vdv.css"),
  "utf8"
);

// 1. Skeleton existe e é montado antes do fetch do catálogo.
assert(js.includes("function renderSkeletons("), "1. renderSkeletons definido");
const boot = js.slice(js.indexOf("document.addEventListener(\"DOMContentLoaded\""));
assert(
  boot.indexOf("renderSkeletons(page)") < boot.indexOf("fetch(prefix + \"data/products.json\")"),
  "1. renderSkeletons roda ANTES do fetch de products.json"
);
assert(
  /card-wrap/.test(js.slice(js.indexOf("function renderSkeletons("), js.indexOf("function clearSkeletons("))) &&
  /className = "card card-skeleton"/.test(js),
  "1. skeleton usa o encaixe do card real (card-wrap > .card.card-skeleton)"
);
assert(
  /sk-media/.test(js) && /sk-line/.test(js),
  "1. skeleton tem mídia + linhas de corpo"
);
assert(
  boot.includes("clearSkeletons();") &&
  (boot.match(/clearSkeletons\(\);/g) || []).length >= 2,
  "1. skeleton removido no sucesso E no erro do fetch"
);

// 2. Seções de destino e pulso acessível.
assert(/sec\.hidden = false;/.test(js), "2. seção ocupa o lugar do conteúdo durante o load");
assert(
  /prefers-reduced-motion/.test(css) && /sk-pulse/.test(css),
  "2. pulso do skeleton respeita prefers-reduced-motion"
);
["x-grid", "grid-recent", "grid-explorar", "grid-favoritos"].forEach(function (id) {
  assert(js.includes('"' + id + '"'), "2. alvo do skeleton presente: " + id);
});

// 3. Estado "Produto não encontrado" com próximo caminho (mestre item 48/49).
assert(js.includes("Veja outros produtos desta vitrine"), "3. copy do bloco item 49 no neutra dinâmico");
assert(
  /mais\.href = prefix \+ "explorar\/"/.test(js),
  "3. neutra dinâmica linka /explorar/"
);
assert(
  js.indexOf("btn-primary btn-cta") !== -1 && js.indexOf("btn-ghost btn-cta") !== -1,
  "3. mantém o CTA de volta à vitrine e adiciona o caminho de explorar"
);

// 4. CSS do skeleton usa tokens (sem hex cru).
const blocoSk = css.slice(css.indexOf(".card-skeleton"), css.indexOf("/* Fase 0"));
assert(blocoSk.length > 0, "4. bloco CSS do skeleton existe");
assert(!/#[0-9a-fA-F]{3,8}/.test(blocoSk), "4. skeleton sem cores fora dos tokens");
assert(blocoSk.includes("var(--vdv-border)"), "4. skeleton reusa token de superfície");

console.log("estados_r12.test.js — OK");
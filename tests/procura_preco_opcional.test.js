/* VDV-20261016-04 — procura sem orçamento na home + navegação #procura.
 * Teste estático (node puro, por regex — padrão das suítes do front) sobre
 * index.html e app.js:
 *   1. card da home: com price_max → faixa/"até" como hoje; SEM price_max →
 *      o segmento de preço não é construído (nada de "R$ 0,00"/"até R$ 0,00");
 *    no JSON público, campos de preço ficam AUSENTES quando não informados
 *      (contrato do exportador sem valor fictício);
 *   3. navegação: seção "O que estão buscando" é o destino dinâmico
 *      (procuraNavTarget) e o bloco de criação (#procura) regra de fallback;
 *   4. cliques em a[href="#procura"] são interceptados na home e a rolagem
 *      acontece também ao fim do fetch de procuras.json (hash na chegada);
 *   5. o bloco de criação mantém id="procura" + CTA "Criar uma Procura"
 *      (deep link + origem de analytics) e min em par (strings do ciclo no
 *      vdv.min.js).
 * Rodar: node tests/procura_preco_opcional.test.js */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const R = path.join(__dirname, "..");
const js = fs.readFileSync(path.join(R, "assets", "js", "app.js"), "utf8");
const html = fs.readFileSync(path.join(R, "index.html"), "utf8");
const min = fs.readFileSync(path.join(R, "assets", "js", "vdv.min.js"), "utf8");

// --- 1. card da home (renderer procura-line) -------------------------------- #
// Sem price_max: o segmento de preço NÃO é construído — nenhuma concatenação
// de "R$" sem guarda por price_max no caminho do procura-line.
assert(js.includes("var preco = \"\";"),
  "1. renderer declara preco vazio por padrão");
assert(js.includes("if (pr.price_max) {"),
  "1. preço só entra na linha com price_max presente");
// Nada de valor fictício em nenhum caso (nem na faixa, nem no "até").
assert(!js.includes('"R$ 0,00"') && !js.includes("'R$ 0,00'"),
  "1. sem " + '"R$ 0,00"' + " literal no renderer");

// --- 1b. contrato do JSON público (exportador) ------------------------------ #
var exportador = fs.readFileSync(
  path.join(R, "..", "projeto_telegram", "scripts", "export_catalogo_web.py"),
  "utf8"
);
assert(exportador.includes("if price_max is not None:"),
  "1b. exportador omite price_max quando None");
assert(exportador.includes('if price_max is not None:'),
  "1b. price_max só entra no JSON com valor");
assert(exportador.includes('        if price_min is not None:\n            procura["price_min"] = f"{price_min:.2f}"'),
  "1b. price_min só entra sob price_max (JSON nunca tergiversa o teto)");

// --- 3. navegação (destino dinâmico) ---------------------------------------- #
assert(/function procuraNavTarget\(\) \{[\s\S]{0,200}?\$\("procuras"\)[\s\S]{0,120}?\}/.test(js),
  "3. procuraNavTarget mira #procuras");
assert(js.includes('return $("procura");'),
  "3. fallback do destino = bloco de criação #procura");
assert(/<section id="procuras"[ >]/.test(html),
  "3. seção \"O que estão buscando\" leva o id=\"procuras\"");
assert(html.includes('id="procura"'),
  "3. bloco de criação preserva id=\"procura\"");

// --- 3b. interceptação + hash na chegada ----------------------------------- #
assert(js.includes("a[href$=\"#procura\"]") && js.includes('href !== "#procura"'),
  "3b. clique em âncora local #procura interceptado (somente âncora local)");
assert(js.includes('if (hash === "#procura") {') &&
  js.includes("goProcura();"),
  "3b. bottombar roteia #procura pelo destino dinâmico (goProcura)");
assert(js.includes('if (location.hash === "#procura") goProcura();'),
  "3b. hash na chegada rola após o fetch decidir a visibilidade");

// --- 5. bloco de criação intacto + min em par ------------------------------- #
assert(html.includes('data-deep-link="procura"'),
  "5. CTA \"Criar uma Procura\" com deep link canônico preservado");
assert(html.includes('data-ga-origin="cta_home_procura"'),
  "5. origem de analytics do CTA preservada");
assert(min.includes('"#procura"') && min.includes("procuras.json"),
  "5. vdv.min.js em par (strings do ciclo presentes)");

// --- 3c. prefers-reduced-motion respeitado no goProcura -------------------- #
assert(/prefers-reduced-motion: reduce/.test(js),
  "3c. reduced-motion respeitado (mesma mecânica do initBottombar)");

console.log("procura_preco_opcional: OK (VDV-20261016-04 — home card sem preço + navegação #procura)");
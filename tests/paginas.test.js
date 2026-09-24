/* R5 (VDV-20260923-01, mestre itens 16-17) — páginas /explorar/ e /favoritos/.
 * Teste estático (node puro, por regex — padrão das suítes do front) sobre
 * explorar/index.html, favoritos/index.html, app.js e vdv.css:
 *   1. as duas páginas existem com data-page próprio e assets com prefixo ../;
 *   2. /explorar/: busca + filter-bar (grupo, sub, tipo, ordem, disponibi-
 *      lidade), contagem, chips ativos removíveis, grid e zero-result com
 *      caminhos (limpar + Procura);
 *   3. /favoritos/: lista pessoal noindex, grid + estado vazio com CTA para
 *      /explorar/;
 *   4. app.js: boot por data-page com initExplorar/initFavoritos; filtros só
 *      com dados; ordenação recentes/preço; renderFavoritos serve a página;
 *   5. filtros preservados ao voltar: HOME_STATE_KEY reusado nas 3 páginas;
 *   6. CSS da fatia (.filter-bar, .chips-ativos, .chip-x);
 *   7. bottombar das novas páginas navega entre si e para a Home.
 * Rodar: node tests/paginas.test.js */
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
const xHtml = fs.readFileSync(
  path.join(__dirname, "..", "explorar", "index.html"),
  "utf8"
);
const fHtml = fs.readFileSync(
  path.join(__dirname, "..", "favoritos", "index.html"),
  "utf8"
);

// 1. Páginas existem com data-page próprio e assets relativos com versão.
assert(/<body data-page="explorar">/.test(xHtml), "1. explorar com data-page");
assert(/<body data-page="favoritos">/.test(fHtml), "1. favoritos com data-page");
assert(/\.\.\/assets\/css\/vdv\.css\?v=/.test(xHtml) &&
  /\.\.\/assets\/js\/app\.js\?v=/.test(xHtml), "1. assets ../ com ?v= na explorar");
assert(/\.\.\/assets\/css\/vdv\.css\?v=/.test(fHtml) &&
  /\.\.\/assets\/js\/app\.js\?v=/.test(fHtml), "1. assets ../ com ?v= nos favoritos");
assert(/<title>Explorar a vitrine — VDV, Vitrine de Vendas<\/title>/.test(xHtml),
  "1. título da página Explorar");
assert(/<title>Meus favoritos — VDV, Vitrine de Vendas<\/title>/.test(fHtml),
  "1. título da página Favoritos");

// 2. /explorar/: busca + filtros + contagem + chips + grid + zero-result.
for (const frag of [
  'id="search"',
  'id="x-grupo"',
  'id="x-sub"',
  'id="x-tipo"',
  'id="x-ordem"',
  'id="x-avail"',
  'id="x-count"',
  'id="x-chips"',
  'id="x-grid"',
  'id="x-zero"',
  'id="x-limpar"',
  'data-deep-link="procura"',
]) {
  assert(xHtml.includes(frag), `2. explorar/index.html deve conter ${frag}`);
}
assert(/<option value="recentes">Mais recentes<\/option>/.test(xHtml) &&
  /<option value="preco">Menor preço<\/option>/.test(xHtml),
  "2. ordenação recentes/preço");
assert(/id="x-zero" hidden/.test(xHtml), "2. zero-result começa oculto");

// 3. /favoritos/: lista pessoal (noindex), grid + estado vazio com CTA.
assert(/name="robots" content="noindex,nofollow"/.test(fHtml),
  "3. favoritos não indexa (lista pessoal do navegador)");
for (const frag of [
  'id="section-favoritos"',
  'id="grid-favoritos"',
  'id="favoritos-vazio"',
  'id="favoritos-count"',
  'href="../explorar/">Explorar a vitrine',
]) {
  assert(fHtml.includes(frag), `3. favoritos/index.html deve conter ${frag}`);
}

// 4. app.js: boot por data-page e funções novas.
assert(
  /page === "explorar"\) initExplorar\(catalog\)/.test(js) &&
    /page === "favoritos"\) initFavoritos\(catalog\)/.test(js),
  "4. boot roteia explorar e favoritos"
);
assert(/function initExplorar\(catalog\)/.test(js) &&
  /function initFavoritos\(catalog\)/.test(js), "4. funções das páginas definidas");
// Filtros só com dados: tipos derivados do catálogo; pronta entrega some sem dado.
assert(/tipos\[offerType\(p\)\] = true;/.test(js), "4. tipos derivados do catálogo");
assert(/availBtn\.hidden = !hasPronta;/.test(js), "4. chip de pronta entrega some sem dado");
// Ordenação: recentes (ordem do exportador) ou menor preço.
assert(/ordem === "preco"/.test(js) &&
  /Number\(a\.price\) - Number\(b\.price\)/.test(js),
  "4. ordenação por menor preço");
// Chips ativos removíveis.
assert(/function activeChips\(\)/.test(js) &&
  /"chip chip-x"/.test(js) &&
  /chip\.clear\(\);/.test(js),
  "4. chips de filtros ativos removíveis");
// Zero-result: grid some e o bloco de caminhos aparece.
assert(/zeroEl\.hidden = !\(searching && found\.length === 0\);/.test(js) &&
  /var zeroLimpar = \$\("x-limpar"\);/.test(js),
  "4. zero-result com caminho de limpeza");
// renderFavoritos serve a página (nunca some; alterna com o estado vazio).
assert(
  /data-page"\) === "favoritos"/.test(js) &&
    /\$\("favoritos-vazio"\)/.test(js) &&
    /\$\("favoritos-count"\)/.test(js),
  "4. renderFavoritos serve a página /favoritos/"
);
// initFavoritos popula o catálogo para o módulo de favoritos.
assert(
  /function initFavoritos\(catalog\) \{\s*var status = \$\("status"\);[\s\S]{0,80}window\.__vdvCatalogProducts = catalog\.products \|\| \[\];[\s\S]{0,40}renderFavoritos\(\);/.test(js),
  "4. initFavoritos alimenta o módulo e renderiza"
);

// 5. Filtros preservados ao voltar — mesmo snapshot nas 3 páginas.
const usos = (js.match(/HOME_STATE_KEY/g) || []).length;
assert(/var HOME_STATE_KEY = "vdv:home-state";/.test(js) && usos >= 4,
  "5. HOME_STATE_KEY reusado (Home, /explorar/ e /favoritos/)");
assert(/cat: sub,/.test(js) && /tipo: tipo,/.test(js) && /ordem: ordem/.test(js),
  "5. snapshot da explorar guarda filtros próprios");

// 6. CSS da fatia.
assert(/\.filter-bar \{/.test(css) &&
  /\.filter-bar select \{/.test(css) &&
  /\.chips-ativos/.test(css) &&
  /\.chip-x \{/.test(css),
  "6. CSS da filter-bar e dos chips ativos");

// 7. Bottombar das novas páginas: navega entre si e para a Home.
assert(/href="\.\.\/" id="bb-inicio"/.test(xHtml) &&
  /href="\.\.\/" id="bb-inicio"/.test(fHtml),
  "7. Início volta para a vitrine nas duas páginas");
assert(/href="\.\.\/favoritos\/" id="bb-favoritos"/.test(xHtml) &&
  /href="\.\.\/explorar\/" id="bb-explorar"/.test(fHtml),
  "7. Explorar/Favoritos se linkam mutuamente");
assert(/href="\.\.\/explorar\/" id="bb-procura"/.test(fHtml),
  "7. Procura leva à busca da /explorar/ na página de favoritos");

console.log("paginas: OK (/explorar/ e /favoritos/ — VDV-20260923-01 R5)");
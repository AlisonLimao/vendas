/* VDV-20260916-05 — um único ponto de categorias na home (bloco com hierarquia).
 * Teste estático (node puro, por regex — padrão das suítes do front) sobre
 * index.html e app.js:
 *   1. hero sem os chips de filtro soltos (#categories removido);
 *   2. bloco único #section-categorias com .cat-block, logo após o hero e
 *      antes de #results, sem `hidden` fixo no HTML;
 *   3. app.js: sem $("categories"); render único com .cat-group/.chip-group;
 *      grupo é LINK quando a página existe (pageBySlug) e FILTRO quando não;
 *      categoria raiz (group.slug === category.slug) não repete a sub;
 *   4. estado activeGroup mutuamente exclusivo com activeCat e syncChipStates;
 *   5. renderSearch filtra por grupo e inclui grp na assinatura de telemetria;
 *   6. setBrowseVisibility mantém o bloco visível durante a busca;
 *   7. snapshot de retorno (sessionStorage) guarda/restaura grp;
 *   8. cache-busting ?v=20260916-3 no CSS e no app.js.
 * Rodar: node tests/categorias.test.js */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const js = fs.readFileSync(
  path.join(__dirname, "..", "assets", "js", "app.js"),
  "utf8"
);
const html = fs.readFileSync(
  path.join(__dirname, "..", "index.html"),
  "utf8"
);

// 1. Hero limpo: sem o contêiner antigo de chips de filtro.
assert(!/id="categories"/.test(html), "1. #categories removido do hero");
assert(!/\$\("categories"\)/.test(js), "1. app.js sem referência a #categories");

// 2. Bloco único de categorias no lugar certo.
const heroIdx = html.indexOf("</section>", html.indexOf('class="hero"'));
const catIdx = html.indexOf('<section id="section-categorias"');
const resultsIdx = html.indexOf('<section id="results" hidden>');
assert(catIdx !== -1, "2. seção de categorias presente");
assert(resultsIdx !== -1, "2. seção de resultados presente");
assert(catIdx < resultsIdx, "2. categorias antes de #results");
assert(
  html.indexOf('<section id="section-categorias"', heroIdx) === catIdx ||
    catIdx > html.indexOf('class="hero"'),
  "2. bloco de categorias após o hero"
);
assert(
  /<section id="section-categorias">\s*<h2>Categorias<\/h2>\s*<div class="cat-block" id="chips-categorias"><\/div>\s*<\/section>/.test(html),
  "2. bloco único com .cat-block e sem hidden fixo"
);

// 3. Render do bloco único no app.js.
assert(js.includes('id="chips-categorias"') || js.includes('chips-categorias'),
  "3. JS preenche o bloco único");
assert(js.includes('className = "chip chip-group"'), "3. chip de grupo em destaque");
assert(js.includes("pageBySlug"), "3. link condicionado a category_pages");
assert(js.includes('setAttribute("data-group", gr.slug)'), "3. chip de grupo como filtro quando sem página");
assert(/s\.slug !== gr\.slug/.test(js), "3. categoria raiz não repete a sub");
assert(/gChip\.className = "chip chip-group"/.test(js), "3. classe de destaque do grupo");

// 4. Estado mutuamente exclusivo + sincronização visual.
assert(js.includes("var activeGroup = \"\""), "4. activeGroup declarado");
assert(
  /activeGroup = activeGroup === gr\.slug \? "" : gr\.slug;[\s\S]{0,120}activeCat = "";/.test(js),
  "4. escolher grupo limpa activeCat"
);
assert(
  /activeCat = activeCat === s\.slug \? "" : s\.slug;[\s\S]{0,80}activeGroup = "";/.test(js),
  "4. escolher sub limpa activeGroup"
);
assert(js.includes("function syncChipStates"), "4. syncChipStates centraliza aria-pressed");

// 5. renderSearch com filtro de grupo.
const rsIdx = js.indexOf("function renderSearch");
const rs = js.slice(rsIdx, js.indexOf("input.addEventListener", rsIdx));
assert(rs.includes("grp = activeGroup"), "5. renderSearch lê activeGroup");
assert(
  rs.includes("p.category.group.slug !== grp"),
  "5. predicado filtra pelo grupo"
);
assert(rs.includes("grp + \"|\" + avail") || /cat \+ "\|" \+ grp \+ "\|" \+ avail/.test(rs),
  "5. assinatura de telemetria inclui o grupo");

// 6. O bloco de categorias NÃO some durante a busca (o filtro ativo fica na tela).
const visIdx = js.indexOf("function setBrowseVisibility");
const vis = js.slice(visIdx, js.indexOf("}", js.indexOf("sectionEmpty.hidden", visIdx)));
assert(
  /sectionCategorias\.hidden = products\.length === 0/.test(vis),
  "6. categorias visível durante a busca"
);
assert(
  !/sectionCategorias\.hidden = searching/.test(vis),
  "6. categorias não pode ser escondida por searching"
);

// 7. Snapshot de retorno à home persiste o filtro de grupo.
assert(/grp: activeGroup/.test(js), "7. saveHomeState persiste grp");
assert(
  /activeGroup = typeof snap\.grp === "string" \? snap\.grp : "";/.test(js),
  "7. restore lê grp do snapshot"
);

// 8. Cache-busting da fatia.
assert(/vdv\.css\?v=20260916-3/.test(html), "8. CSS com ?v=20260916-3 na home");
assert(/app\.js\?v=20260916-3/.test(html), "8. app.js com ?v=20260916-3 na home");

console.log("categorias: OK (bloco único com hierarquia — grupo + subs + ⚡)");
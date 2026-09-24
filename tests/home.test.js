/* R4 (VDV-20260923-01, mestre itens 13-15) — Home reestruturada.
 * Teste estático (node puro, por regex — padrão das suítes do front) sobre
 * index.html, app.js e vdv.css:
 *   1. primeira dobra é produto: "Acabou de chegar" antes de "Categorias";
 *      hero sem botão "Criar uma Procura" e sem faixa institucional;
 *   2. trilho de grupo (section-grupo/rail-grupo) removido do HTML e do JS;
 *   3. rotação "Em exposição agora" (section-exposicao/fair_rotation)
 *      removida do HTML e do JS — script tag do fair_rotation saiu;
 *   4. seção "Para você explorar" existe, com pickExplorar (round-robin por
 *      categoria, cap EXPLORAR_CAP) e exclusão dos ids de novidades;
 *   5. caps explícitos: NOVIDADES_CAP/EXPLORAR_CAP = 8, VITRINES_CAP = 4
 *      (chips de vitrines com slice no cap);
 *   6. grade completa "Explore a vitrine" permanece na Home (transição R4→R5)
 *      e favoritos também (bottombar aponta para ela);
 *   7. modo busca: explorar esconde junto com novidades (setBrowseVisibility);
 *   8. mobile: .grid-novidades oculta cards 7+ via CSS, desktop mantém os 8.
 * Rodar: node tests/home.test.js */
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
const html = fs.readFileSync(
  path.join(__dirname, "..", "index.html"),
  "utf8"
);

// 1. Primeira dobra é produto: novidades vem antes de categorias; hero sem
//    CTA de Procura e sem a faixa institucional do topo.
assert(
  html.indexOf('id="section-novidades"') < html.indexOf('id="section-categorias"'),
  "1. 'Acabou de chegar' antes de 'Categorias' no HTML"
);
assert(
  !/hero-strip/.test(html) &&
    /class="hero-actions"/.test(html) &&
    !/data-deep-link="procura"[^>]*class="btn[^"]*"[^>]*>[^<]*Criar uma Procura<\/a>\s*<\/div>\s*<div class="searchbar/.test(html),
  "1. hero sem faixa institucional e sem botão de Procura"
);

// 2. Trilho de grupo removido (HTML e JS).
assert(
  !/section-grupo|rail-grupo|grid-grupo/.test(html) &&
    !/sectionGrupo|rail-grupo|grid-grupo|GROUP_RAIL/.test(js),
  "2. trilho de grupo removido"
);

// 3. Rotação removida (HTML e JS); arquivo fair_rotation.js deixa de ser
//    carregado pela Home (lib + teste continuam no repo).
assert(
  !/section-exposicao|grid-exposicao/.test(html) &&
    !/sectionExposicao|EXPOSICAO_|VDVFairRotation/.test(js) &&
    !/fair_rotation\.js/.test(html),
  "3. rotação 'Em exposição agora' removida da Home"
);

// 4. "Para você explorar": seção nova + seleção honesta.
assert(
  /id="section-explorar"/.test(html) &&
    html.indexOf('id="section-explorar"') > html.indexOf('id="section-categorias"') &&
    html.indexOf('id="section-explorar"') < html.indexOf('id="section-vitrines"'),
  "4. seção explorar posicionada entre categorias e vitrines"
);
assert(
  /function pickExplorar\(products, excludeIds, cap\)/.test(js) &&
    /if \(excludeIds\[p\.id\]\) return;/.test(js) &&
    /push\(buckets\[b\]\[round\]\)/.test(js),
  "4. pickExplorar: round-robin por categoria, exclui novidades"
);
assert(
  /fill\(\$\("grid-explorar"\), explorarCards\)/.test(js),
  "4. grid-explorar preenchida pela seleção"
);

// 5. Caps explícitos da R4.
assert(
  /var NOVIDADES_CAP = 8;/.test(js) &&
    /var EXPLORAR_CAP = 8;/.test(js) &&
    /var VITRINES_CAP = 4;/.test(js),
  "5. caps NOVIDADES/EXPLORAR=8 e VITRINES=4"
);
assert(
  /products\.slice\(0, NOVIDADES_CAP\)/.test(js) &&
    /pickExplorar\(products, recentesIds, EXPLORAR_CAP\)/.test(js) &&
    /suppliers\.slice\(0, VITRINES_CAP\)/.test(js),
  "5. caps aplicados em novidades, explorar e vitrines"
);

// 6. Transição R4→R5: grade completa e favoritos seguem na Home.
assert(
  /id="section-vitrine"/.test(html) &&
    /id="section-favoritos"/.test(html) &&
    /id="grid-all"/.test(html),
  "6. grade completa e favoritos permanecem (transição R4→R5)"
);

// 7. Modo busca esconde explorar junto com as outras faixas editoriais.
assert(
  /sectionExplorar\.hidden = searching \|\| !showExplorar;/.test(js) &&
    !/sectionGrupo|sectionExposicao/.test(js),
  "7. setBrowseVisibility esconde explorar; grupos/exposição fora"
);

// 8. Mobile: grade de novidades mostra 6 (cards 7+ ocultos), desktop mantém 8.
assert(
  /\.grid-novidades > \.card-wrap:nth-child\(n\+7\)\s*\{\s*display:\s*none;\s*\}/.test(css),
  "8. mobile oculta cards 7+ das novidades"
);
assert(
  /@media \(min-width: 768px\)\s*\{\s*\.grid-novidades > \.card-wrap:nth-child\(n\+7\)\s*\{\s*display:\s*block;\s*\}/.test(css),
  "8. desktop mantém os 8 cards"
);

console.log("home: OK (Home reestruturada — VDV-20260923-01 R4)");
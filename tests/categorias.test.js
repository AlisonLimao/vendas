/* VDV-20261021-02 (espec 63, decisão 7) — o filtro de 2 níveis MORA no
 * /explorar/; a Home só APONTA os universos (chips-atalho → #banda-<slug>).
 * Teste estático (node puro, por regex — padrão das suítes do front) sobre
 * index.html e app.js:
 *   1. bloco de filtro #section-categorias extinto da Home (shell e JS);
 *   2. chips-atalho: âncora #banda-<slug> com rótulo "Nome · N" e estado
 *      hidden até o render (invariante "nunca seção morta");
 *   3. filtros x-grupo/x-sub seguem intocados no /explorar/ (initExplorar);
 *   4. snapshot de retorno guarda termo de busca (cat/grp/rot extintos);
 *   5. cache-busting da fatia (?v= genérico — lição 20261020).
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

// 1. Bloco de filtro extinto da Home: shell e JS sem resíduo.
assert(!/id="section-categorias"|"chips-categorias"/.test(html),
  "1. #section-categorias/#chips-categorias fora do shell");
assert(
  !/sectionCategorias|chipsCategorias|renderCatBlock|syncChipStates|setChipPressed/.test(js),
  "1a. app.js sem o arranjo do filtro da Home"
);

// 2. Chips-atalho: âncora para a banda + estado inicial oculto.
assert(/id="atalhos-categorias"[^>]*hidden/.test(html),
  "2. #atalhos-categorias nasce hidden (JS revela com dados)");
assert(/#banda-/.test(js), "2a. chips apontam a banda (#banda-<slug>)");
assert(/· /.test(js), "2b. rótulo dos chips com contagem 'Nome · N'");

// 3. Os filtros 2 níveis seguem vivos NO /explorar/.
assert(/\$\("x-grupo"\)/.test(js) && /\$\("x-sub"\)/.test(js),
  "3. initExplorar mantém x-grupo/x-sub (filtro mora lá — decisão 7)");

// 4. Snapshot: cat/grp/rot extintos do saveHomeState (sem estado órfão).
assert(!/cat: selectedSubcategory|grp: selectedCategory|rot: rotSeed/.test(js),
  "4. saveHomeState sem estado do filtro extinto");

// 5. Cache-busting da fatia (?v= genérico — suítes hard-codam ?v: lição).
assert(/vdv(\.min)?\.css\?v=[0-9]{8}-[0-9]+/.test(html),
  "5. CSS com ?v= no cache-busting da home");
assert(/(?:vdv\.min\.js|app\.js)\?v=[0-9]{8}-[0-9]+/.test(html),
  "5a. JS com ?v= no cache-busting da home");

console.log("categorias: OK (filtros no /explorar/, home aponta — VDV-20261021-02)");

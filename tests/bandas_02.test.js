/* VDV-20261021-02 — Home por intenção (espec 63): seções empilhadas por
 * categoria ("bandas") + chips-atalho no topo. Regras vivem NO EXPORTADOR
 * (build_bands em Python — rodízio entre anunciantes, ordem fixa do banco);
 * o JS é renderer burro. Contratos cobertos:
 *   1. shells novos: #section-bandas + #atalhos-categorias; feeds mistos
 *      (section-categorias/novidades/explorar) AUSENTES da home;
 *   2. renderer: renderBandas no app.js + chamada na initHome; selo NOVO
 *      (badge-novo) renderizado e estilizado (.badge-novo no css e min);
 *   3. app.js consome catalog.bands e p.is_new (contrato do products.json);
 *   4. chips-atalho viram âncora: href="#banda-<slug>" e rótulo "Nome · N";
 *   5. fim do dedup destaque→feed (decisão 8): produto da vitrine do dia
 *      TAMBÉM aparece na banda do grupo dele — nada corta banda;
 *   6. fio vivo: minificados regenerados juntos (renderBandas no vdv.min.js,
 *      .badge-novo no vdv.min.css).
 * Node puro (read + assert). Rodar: node tests/bandas_02.test.js */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const js = fs.readFileSync(path.join(root, "assets", "js", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "assets", "css", "vdv.css"), "utf8");
const jsMin = fs.readFileSync(path.join(root, "assets", "js", "vdv.min.js"), "utf8");
const cssMin = fs.readFileSync(path.join(root, "assets", "css", "vdv.min.css"), "utf8");

// 1. Shells novos + feeds mistos fora da home.
assert(html.includes('id="section-bandas"'), "1. #section-bandas presente");
assert(html.includes('id="atalhos-categorias"'), "1a. #atalhos-categorias presente");
assert(
  !html.includes('id="section-categorias"') &&
    !html.includes('id="section-novidades"') &&
    !html.includes('id="section-explorar"'),
  "1b. feeds mistos fora da home"
);
assert(
  !html.includes('id="grid-recent"') && !html.includes('id="grid-explorar"') &&
    !html.includes('id="chips-categorias"'),
  "1c. alvos de render das seções extintas sumiram do shell"
);

// 2. Renderer das bandas + selo NOVO.
assert(/function renderBandas\(/.test(js), "2. renderBandas definido no app.js");
assert(/renderBandas\(catalog\)/.test(js), "2a. initHome chama renderBandas(catalog)");
assert(/<span class="badge-novo">/.test(js), "2b. selo NOVO renderizado (badge-novo)");
assert(/\.badge-novo\s*\{/.test(css), "2c. .badge-novo estilizado no vdv.css");
assert(/\.badge-novo\s*\{/.test(cssMin), "2d. .badge-novo no vdv.min.css");

// 3. app.js consome o contrato do JSON (bands + is_new).
assert(/catalog\.bands/.test(js), "3. app.js lê catalog.bands");
assert(/p\.is_new/.test(js), "3a. app.js lê p.is_new (selo por produto)");

// 4. Chips-atalho = âncora para a banda (espec 63 decisão 7: filtros moram no
//    /explorar/; a home aponta para o universo).
assert(/#banda-/.test(js), "4. chips-atalho linkam a banda via #banda-<slug>");
assert(/b\.name \+ " · " \+ b\.total/.test(js), '4a. rótulo do chip: Nome · N formatado no renderer');
assert(/atalho\.href = "#banda-"/.test(js), "4b. href='#banda-' montado no app.js");

// 5. Fim do dedup destaque→feed (decisão 8): nada corta produto de banda.
assert(
  !/usadosNoDestaque|recentesIds|excluidos/.test(js),
  "5. exclusões da home extintas — destaque TAMBÉM aparece na banda (sem dedup)"
);

// 6. Minificados regenerados junto (fio vivo): strings que sobrevivem ao
//    -m do terser (literais de propriedade/código, não nomes de função).
assert(jsMin.includes("#banda-"), "6. vdv.min.js contém o contrato de bandas (#banda-)");
assert(/is_new/.test(jsMin), "6a. vdv.min.js lê is_new (selo NOVO)");
assert(/\.badge-novo/.test(cssMin), "6b. vdv.min.css contém .badge-novo");
assert(/\.banda/.test(cssMin), "6c. vdv.min.css contém .banda");

console.log("bandas_02: OK (home por intenção — VDV-20261021-02)");

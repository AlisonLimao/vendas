/* Fatia 54 (plano 16, mestre §23-§27): nível 1 de Categorias como PORTAS DE
 * ENTRADA (cartões leves em grade; nível 2 segue filtro) + "Conheça esta
 * vitrine" como MOMENTO EDITORIAL (foto 4:5 protagonista, thumbs auxiliares
 * reais, CTA textual — rodízio diário intacto).
 * Node puro (read + regex). Rodar: node tests/refino_54.test.js */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const js = fs.readFileSync(path.join(root, "assets", "js", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "assets", "css", "vdv.css"), "utf8");

// 1. Nível 1 EVOLUIU para chips compactos (prompt mestre homepage
//    VDV-20261008-07, Etapa 3): as portas de entrada saíram do CSS/JS; os
//    chips da taxonomia têm altura/alvo de toque na faixa do mestre.
assert(!/\.cat-portas/.test(css) && !/\.porta[\s\{:]/.test(css), "1. CSS das portas extinto");
assert(!/cat-portas|"porta"/.test(js), "1a. JS sem portas");
assert(/\.cat-block\s+\.chip\s*\{[\s\S]{0,200}min-height:\s*2\.25rem/.test(css),
  "1b. chips da taxonomia a ~36px (alvo de toque)");
assert(/\.cat-block\s+\.chip\s*\{[\s\S]{0,300}font-size:\s*\.85rem/.test(css),
  "1c. fonte dos chips a 13,6px (faixa 12-14)");

// 2. Diferença evidente termo rápido (texto sem borda) × chip de categoria
//    (fundo discreto de superfície + borda).
assert(/\.cat-block\s+\.chip\s*\{[\s\S]{0,300}display:\s*inline-flex/.test(css),
  "2. chip de categoria com presença de superfície");

// 3. §25: destaque com foto 4:5 protagonista + thumbs auxiliares reais.
assert(/\.vd-photo img\s*\{[\s\S]{0,200}aspect-ratio:\s*4\/5/.test(css),
  "3. foto principal 4:5");
assert(/\.vd-thumbs/.test(css) && js.includes("vd-thumbs"),
  "3a. auxiliares da vitrine no markup");
assert(js.includes("g.imgs.length < 3"), "3b. teto de fotos por vitrine");

// 4. rodízio diário IGUALITÁRIO intacto (§18 — regra real, LCG com seed de data).
assert(/1664525/.test(js), "4. LCG do rodízio preservado");
assert(/seed = \(seed \* 1664525 \+ 1013904223\) >>> 0;/.test(js), "4a. LCG completo");

// 5. VDV-20261021-02 (espec 63, decisão 7): os chips da home são ÂNCORA
//    para a banda (#banda-<slug>) — o filtro de 2 níveis mora no /explorar/.
//    Na home não existe filtro (nem data-group, nem navegação nova).
assert(/atalho\.href = "#banda-"/.test(js),
  "5. chip-atalho da home é âncora para a banda (#banda-)");
assert(!/data-group/.test(js),
  "5a. nenhum filtro data-group na home (filtros moram no /explorar/)");
assert(/"x-grupo"/.test(js) && /"x-sub"/.test(js),
  "5b. filtros de 2 níveis vivos no initExplorar (/explorar/)");

console.log("refino_54: todos os testes passaram ✔");
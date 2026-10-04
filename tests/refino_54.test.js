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

// 1. §23: portas de entrada no nível 1 (cartões leves, seta própria).
assert(/\.cat-portas\s*\{[\s\S]{0,200}grid-template-columns/.test(css), "1. grade de portas");
assert(/\.porta::after\s*\{[\s\S]{0,200}content:\s*"→"/.test(css), "1a. seta da porta");
assert(/\.porta-n\s*\{/.test(css), "1b. contagem na porta");
assert(js.includes("class=\"porta-name\"") === true ||
  js.includes("porta-name"), "1c. nome forte na porta");

// 2. §24: diferença evidente termo rápido (texto sem borda) × categoria
//    (cartão com fundo/borda).
assert(/\.porta\s*\{[\s\S]{0,300}background:\s*var\(--vdv-surface\)/.test(css),
  "2. porta com presença de cartão");

// 3. §25: destaque com foto 4:5 protagonista + thumbs auxiliares reais.
assert(/\.vd-photo img\s*\{[\s\S]{0,200}aspect-ratio:\s*4\/5/.test(css),
  "3. foto principal 4:5");
assert(/\.vd-thumbs/.test(css) && js.includes("vd-thumbs"),
  "3a. auxiliares da vitrine no markup");
assert(js.includes("g.imgs.length < 3"), "3b. teto de fotos por vitrine");

// 4. rodízio diário IGUALITÁRIO intacto (§18 — regra real, LCG com seed de data).
assert(/1664525/.test(js), "4. LCG do rodízio preservado");
assert(/seed = \(seed \* 1664525 \+ 1013904223\) >>> 0;/.test(js), "4a. LCG completo");

// 5. filtro continua filtro: data-group dos portas + validação do ativo
//    (nada de navegação nova; nunca link no nível 1).
const catIdx = js.indexOf("function renderCatBlock");
const cat = js.slice(catIdx, catIdx + 3400);
assert(cat.includes('chip.setAttribute("data-group", gr.slug)'),
  "5. porta continua FILTRO (data-group)");
assert(!cat.includes("a.href ="), "5a. nível 1 nunca vira link");

console.log("refino_54: todos os testes passaram ✔");
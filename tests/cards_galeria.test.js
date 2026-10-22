/* VDV-20261010-01 — galeria universal nos cards: uma única implementação
 * (scroll-snap nativo, mesma física da página do produto) para TODOS os
 * cards, JS e estáticos. Convenção de markup: .card-gal/.card-gal-track/
 * .card-gal-slide/.card-gal-dots; extras lazy (estáticos) ou data-img (JS);
 * dots aria-hidden NÃO interativos; 1 foto → imagem única de sempre;
 * camada 0 (sem JS) funcional: foto principal + link acessíveis.
 * Node puro (read + regex — padrão das suítes). Rodar: node tests/cards_galeria.test.js */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const js = fs.readFileSync(path.join(root, "assets", "js", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "assets", "css", "vdv.css"), "utf8");
// O exportador mora no projeto IRMÃO — fora do layout local (clone limpo,
// migração de host), o caminho padrão não existe: VDV_EXPORTER_SRC aponta.
// (Revisão VDV-20261021-02, Important 1.)
const exporterPath = process.env.VDV_EXPORTER_SRC ||
  path.join(root, "..", "projeto_telegram", "scripts", "export_catalogo_web.py");
let exporter;
try {
  exporter = fs.readFileSync(exporterPath, "utf8");
} catch (e) {
  throw new Error(
    "exportador não encontrado em " + exporterPath +
    " — defina VDV_EXPORTER_SRC com o caminho de scripts/export_catalogo_web.py"
  );
}

// ── 1. CONVENÇÃO ÚNICA — mesmas classes no JS (app.js) e no Python ─────────
assert(js.includes("card-gal-track") &&
  js.includes("card-gal-slide") &&
  js.includes("card-gal-dots"),
  "1. app.js: convenção de classes da galeria nos cards");
assert(exporter.includes("card-gal-track") &&
  exporter.includes("card-gal-slide") &&
  exporter.includes("card-gal-dots") &&
  exporter.includes("_card_gallery_html"),
  "1a. exportador: MESMA convenção de classes via helper único (_card_gallery_html)");
assert(/a\.appendChild\(cardGallery\(p\)\)/.test(js),
  "1b. app.js: cardEl monta a galeria pelo MESMO componente (cardGallery)");

// ── 2. CAMADA 0 (sem JS) — físico nativo, sem handler de touch ─────────────
assert(css.includes(".card-gal-track") &&
  /\.card-gal-track \{[\s\S]*?scroll-snap-type:\s*x mandatory/.test(css),
  "2. css: .card-gal-track com scroll-snap (swipe funciona sem JS)");
assert(!/addEventListener\((?:touchstart|touchmove|touchend)/.test(
  js.slice(js.indexOf("function cardGallery"), js.indexOf("function cardGalIndice"))),
  "2a. app.js: nenhum handler de touch na galeria dos cards (rolagem é do navegador)");

// ── 3. DOTS — aria-hidden, não interativos (nunca botão dentro de <a>) ─────
assert(js.includes('dots.setAttribute("aria-hidden", "true")') &&
  !/card-gal-dots[\s\S]{0,400}<button/.test(js),
  "3. app.js: dots aria-hidden e nunca botões");
assert(/class="card-gal-dots" aria-hidden="true"/.test(exporter) &&
  !/<button/.test(
    exporter.slice(exporter.indexOf("def _card_gallery_html"),
      exporter.indexOf("def _related_card_html"))),
  "3a. exportador: dots aria-hidden e nunca botões (no helper)");

// ── 4. EXTRAS — lazy (estáticos) / data-img (JS), hidratação sob demanda ──
assert(js.includes("data-img") &&
  js.includes("is-ready") &&
  js.includes("cardGalHidratarAte"),
  "4. app.js: extras nascem data-img e hidratam na primeira interação");
const galHelper = exporter.slice(exporter.indexOf("def _card_gallery_html"),
  exporter.indexOf("def _related_card_html"));
assert(/loading="lazy"/.test(galHelper) &&
  /"" if i == 0 else ' loading="lazy"'/.test(galHelper),
  "4a. exportador: helper único com extras lazy (principal eager)");
assert(galHelper.includes('alt if i == 0 else ""') &&
  /if len\(images\) <= 1/.test(galHelper),
  "4b. exportador: 1 foto → img único de sempre; extras decorativas (alt vazio)");

// ── 5. DELEGAÇÃO ÚNICA — capture no document, nenhum listener por card ─────
const delegacao = js.slice(js.indexOf("cardGalIndice"));
assert(/document\.addEventListener\("pointerdown", function \(ev\) \{[\s\S]*?\}, true\)/
  .test(delegacao) &&
  /document\.addEventListener\("mouseover",/.test(delegacao) &&
  /\{ capture: true, passive: true \}/.test(delegacao),
  "5. app.js: delegação em capture no document (um conjunto p/ todos os cards)");
assert(!/card-gal-track[^"\n]*"\s*\.(?:addEventListener|on)\(/.test(js),
  "5a. app.js: nenhum listener acoplado a um track individual dos cards");

// ── 6. 1 FOTO → imagem única de sempre, zero controles (ambos os caminhos) ─
assert(/photos\.length <= 1\) return cardMedia\(p\)/.test(js),
  "6. app.js: card com 1 foto segue o caminho de sempre (sem track/dots)");

// ── 7. PÁGINA DO PRODUTO — galeria individual intocada (regressão) ─────────
assert(js.includes("gallery-track") &&
  js.includes("prod-thumbs") &&
  js.includes("gallery-count"),
  "7. app.js: galeria da página individual preservada");

// ── 8. RODÍZIO INDEPENDENTE — destaque diário no front intocado; rodízio
//       entre anunciantes das bandas é do EXPORTADOR (build_bands, T3 do
//       plano 64) — o card segue render único, sem seleção própria. ────────
assert(js.includes("function pickDestaqueDiario"),
  "8. app.js: rodízio diário do destaque separado da galeria do card");
assert(/def build_bands\(/.test(exporter) && /rotation = int\(now\.strftime\("%Y%m%d%H"\)\)/.test(exporter),
  "8a. rodízio entre anunciantes das bandas é do exportador (build_bands)");

// ── 9. TEMPLATES ESTÁTICOS USAM O HELPER (sem <img> único espalhado) ───────
assert((exporter.match(/_card_gallery_html\(p\)/g) || []).length === 3,
  "9. exportador: _card_gallery_html nos 3 templates estáticos (related/fornecedor/categoria)");

console.log("cards_galeria.test.js — tudo conforme (VDV-20261010-01)");

/* ── 10. SETAS DA GALERIA NO CARD (VDV-20261010-03) ─────────────────────────
 * Desktop com mouse/hover: setas discretas navegam o MESMO track
 * (scroll-snap) sem abrir o anúncio; teclado: focáveis (Enter/Space) e
 * :focus-within as revela; celular intocado (swipe nativo; sem seta em
 * pointer coarse); >1 foto = setas existem; 1 foto = zero controles;
 * span role=button (nunca elemento interativo aninhado ao link do card);
 * estáticos (helper Python): mesmas classes; 1 script de página (não por
 * card) e só quando a página tem galeria multi-foto. */
assert(js.includes("card-gal-arrow") &&
  /card-gal-arrow " \+ \(dir < 0 \? "card-gal-prev" : "card-gal-next"\)/.test(js) &&
  /s\.setAttribute\("role", "button"\)/.test(js) &&
  /s\.setAttribute\("tabindex", "0"\)/.test(js) &&
  js.includes('"Foto anterior"') && js.includes('"Próxima foto"'),
  "10. app.js: setas span role=button (prev/next, aria-label)");
(function () {
  var i = js.indexOf("function cardGallery"), j = js.indexOf("function fill ", i);
  if (j === -1) j = js.indexOf("function cardGalIndice", i);
  assert(!/<button/.test(js.slice(i, j)),
    "10a. app.js: nenhum botão aninhado à galeria (span somente)");
})();
assert(/addEventListener\("click", function \(ev\) \{[\s\S]*?\.card-gal-arrow[\s\S]*?stopPropagation\(\)[\s\S]*?preventDefault\(\)[\s\S]*?cardGalRolar\(/.test(js) &&
  /addEventListener\("keydown", function \(ev\) \{[\s\S]*?cardGalRolar\(/.test(js) &&
  /track\.scrollBy\(\{ left:[\s\S]*?behavior: "smooth" \}\)/.test(js),
  "10b. app.js: delegação capture (click + Enter/Space) → cardGalRolar");
assert(css.includes(".card-gal-arrow") &&
  /\(min-width: 720px\) and \(hover: hover\) and \(pointer: fine\)/.test(css) &&
  /\.card:hover \.card-gal-arrow[\s\S]*?\.card:focus-within \.card-gal-arrow/.test(css) &&
  /\.card-gal-arrow:focus-visible/.test(css),
  "10c. css: setas desktop-only, hover/:focus-within revelam, foco visível");
assert(function () {
  var g = exporter.slice(exporter.indexOf("def _card_gallery_html"),
    exporter.indexOf("def _related_card_html"));
  return g.includes("card-gal-arrow card-gal-prev") &&
    g.includes("card-gal-arrow card-gal-next") &&
    g.includes('role="button" tabindex="0"') &&
    g.includes("Foto anterior") && g.includes("Próxima foto");
}(), "10d. exportador: mesmo markup de setas no helper dos estáticos");
if (!exporter.includes("CARD_GAL_STATIC_SCRIPT")) {
  throw new Error("10e. exportador falta CARD_GAL_STATIC_SCRIPT");
}
console.log("cards_galeria.test.js — tudo conforme (VDV-20261010-01 + setas VDV-20261010-03)");

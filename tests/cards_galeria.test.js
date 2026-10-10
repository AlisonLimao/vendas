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

// ── 1. CONVENÇÃO ÚNICA — o card monta a galeria pelo MESMO componente ──────
assert(js.includes("card-gal-track") &&
  js.includes("card-gal-slide") &&
  js.includes("card-gal-dots"),
  "1. app.js: convenção de classes da galeria nos cards");
assert(js.includes("function cardGallery") &&
  /a\.appendChild\(cardGallery\(p\)\)/.test(js),
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

// ── 4. EXTRAS — data-img (JS), hidratação sob demanda na interação ────────
assert(js.includes("data-img") &&
  js.includes("is-ready") &&
  js.includes("cardGalHidratarAte"),
  "4. app.js: extras nascem data-img e hidratam na primeira interação");

// ── 5. DELEGAÇÃO ÚNICA — capture no document, nenhum listener por card ─────
const delegacao = js.slice(js.indexOf("cardGalIndice"));
assert(/document\.addEventListener\("pointerdown", function \(ev\) \{[\s\S]*?\}, true\)/
  .test(delegacao) &&
  /document\.addEventListener\("mouseover",/.test(delegacao) &&
  /\{ capture: true, passive: true \}/.test(delegacao),
  "5. app.js: delegação em capture no document (um conjunto p/ todos os cards)");
assert(!/card-gal-track[^"\n]*"\s*\.(?:addEventListener|on)\(/.test(js),
  "5a. app.js: nenhum listener acoplado a um track individual dos cards");

// ── 6. 1 FOTO → imagem única de sempre, zero controles ─────────────────────
assert(/photos\.length <= 1\) return cardMedia\(p\)/.test(js),
  "6. app.js: card com 1 foto segue o caminho de sempre (sem track/dots)");

// ── 7. PÁGINA DO PRODUTO — galeria individual intocada (regressão) ─────────
assert(js.includes("gallery-track") &&
  js.includes("prod-thumbs") &&
  js.includes("gallery-count"),
  "7. app.js: galeria da página individual preservada");

// ── 8. RODÍZIO INDEPENDENTE — pickNovidades/pickDestaqueDiario intocado ────
assert(js.includes("function pickNovidades") &&
  js.includes("function pickDestaqueDiario"),
  "8. app.js: rodízio separado da galeria do card");

console.log("cards_galeria.test.js — tudo conforme (VDV-20261010-01)");
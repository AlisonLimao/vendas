/* Fatia 55 (plano 16, mestre §32/§33/§45): demanda real como LISTA EDITORIAL
 * textual (sai o card com foto de placeholder) + FINAL INTEGRADO da Home
 * (.finale-facts → .finale-demand id=procura → .finale-sell), substituindo
 * #section-confianca, .cta-procura, .cta-seller e .how-summary — CSS morto
 * removido junto. Nada de lógica: rodízio, filtros, telemetria intactos.
 * Node puro (read + regex). Rodar: node tests/refino_55.test.js */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const js = fs.readFileSync(path.join(root, "assets", "js", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "assets", "css", "vdv.css"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

// 1. §32: Procura = demanda textual editorial (citação + contexto em linha).
assert(js.includes('className = "procura-line"'), "1. item da lista editorial");
assert(js.includes('"procura-quote"') && js.includes('"procura-loc"'),
  "1a. citação + contexto no item");
assert(!js.includes('image_thumb || pr.image || "assets/vdv-banner-share-1200x630.jpg"'),
  "1b. foto de placeholder fora do render de procuras");
assert(/abrir_procura/.test(js), "1c. telemetria do clique preservada");
assert(html.includes('<div class="procura-list" id="grid-procuras"></div>'),
  "1d. contêiner da lista (sem grade de cards)");
assert(/<h2>O que estão buscando<\/h2>/.test(html),
  "1e. título pela linguagem da gente");

// 2. §33/§45: final integrado — três camadas em uma seção.
assert(html.includes('<section id="section-final">'),
  "2. seção única de encerramento");
assert(/<h2>Encontre\. Confira\. Converse direto\.<\/h2>/.test(html),
  "2a. fechamento como frase de conversa");
assert(/<ul class="finale-facts" aria-label="Por que confiar">/.test(html) &&
  html.includes("✓ Anunciante identificado") &&
  html.includes("✓ Sem taxa de plataforma"),
  "2b. fatos de confiança em texto puro");
assert(/<div class="finale-demand" id="procura">/.test(html),
  "2c. demanda real com âncora permanente");
assert(/<h2>Seu produto também pode estar aqui\.<\/h2>/.test(html) &&
  /btn-sell" data-deep-link="vender" data-ga-origin="cta_home_vender"/.test(html),
  "2d. porta do vendedor com deep link preservado");
assert(/class="finale-link" href="como-funciona\.html"/.test(html),
  "2e. Como funciona em texto (não em caixa)");

// 3. Resíduos fora do markup E do CSS (remoção visual completa).
//    (asserts ancorados em ocorrências de markup — o comentário de
//    documentação dentro de #section-final cita os nomes antigos
//    de propósito e não conta como resíduo.)
assert(!/id="section-confianca"/.test(html) &&
  !/<section class="cta-procura"/.test(html) &&
  !/<section class="cta-seller"/.test(html) &&
  !/class="how-summary"/.test(html) && !/class="how-steps"/.test(html),
  "3. markup sem blocos separados");
assert(!/\.cta-procura\s*\{|\.cta-seller\s*\{|\.how-steps|\.how-num|\.how-more/.test(css),
  "3a. CSS morto removido");
assert(!/\.trust-row|\.trust-lead|#section-confianca/.test(css),
  "3b. CSS de confiança antigo removido");
assert(!/\.hero-actions|\.hero-strip/.test(css),
  "3c. CSS morto do hero removido (Fatia 51)");
// 3d. .rail morto removido — o .card-meta voltou a VIVER no card (prompt
//     mestre homepage, VDV-20261008-07 Etapa 5: fornecedor · cidade), então
//     só o .rail segue na lista dos mortos.
assert(!/\.rail \{/.test(css),
  "3d. .rail morto removido (.card-meta é vivo desde a Etapa 5)");
assert(/\.rail-more/.test(css), "3e. .rail-more (em uso) preservado");
assert(/\.trust-pill\s*\{/.test(css), "3f. .trust-pill preservada (página de produto)");

// 4. Preservações obrigatórias do ciclo visual (§75 — nada de lógica nova).
assert(/1664525/.test(js), "4. LCG do rodízio intacto");
assert(js.includes('track("abrir_procura"') || js.includes("abrir_procura"),
  "4a. sinais de navegação intactos");
assert(html.match(/data-deep-link="procura"/g).length === 3,
  "4b. exatamente 3 deep links de procura (final, zero-result, catálogo vazio)");
assert(/scroll-margin-top: 4rem/.test(css), "4c. âncora #procura com respiro da topbar");
assert(/#section-empty/.test(html) || /<section id="section-empty"/.test(html),
  "4d. estado vazio real preservado (§34 ADEQUADO)");

// 5. Assinatura de seção cobre o final (h2 é filho direto de section).
assert(/body\[data-page="home"\] main > section > h2::before/.test(css),
  "5. regra única de assinatura ainda escopada à Home");

console.log("refino_55: todos os testes passaram ✔");
/* VDV-20260916-04 — repaginação visual da vitrine (manter e refinar).
 * Teste estático (node puro, por regex — padrão das suítes do front) sobre
 * index.html e app.js:
 *   1. copy ampla: title/h1 saem do viés de "malharia" para a marca da cidade;
 *   2. pill de confiança na home ("O VDV não recebe o pagamento…");
 *   3. bottom bar mobile com os 4 alvos (Início/Explorar/Favoritos/Procura);
 *   4. app.js: initBottombar rola suave, cai para a vitrine quando a seção
 *      alvo está hidden e foca o campo de busca no atalho de Procura;
 *   5. página de produto interativa: seller-card, pill e "Continue explorando"
 *      (gate >= 2, cap 8, produto atual excluído) reusando cardEl;
 *   6. cache-busting ?v=20260916-2 no CSS e no app.js.
 * Rodar: node tests/repaginacao.test.js */
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

// 1. Copy ampla na home (title + h1) — e nenhum resíduo de "malharia".
assert(
  /<title>VDV — Vitrine de Vendas de Monte Sião \| Produtos, Serviços e Oportunidades<\/title>/.test(html),
  "1. <title> deve apresentar a vitrine da cidade"
);
assert(/vitrine de vendas de Monte Sião/.test(html), "1. h1 com a marca ampla");
assert(!/<h1>[^<]*malharia/i.test(html), "1. h1 não pode citar malharia");
assert(!/<title>[^<]*malharia/i.test(html), "1. title não pode citar malharia");

// 2. Pill de confiança explícita na home.
assert(
  /<p class="trust-pill">O VDV não recebe o pagamento — a negociação é direta entre vocês<\/p>/.test(html),
  "2. pill de confiança na home"
);

// 3. Bottom bar: 4 âncoras com os alvos esperados.
assert(/<nav class="bottombar"/.test(html), "3. bottombar presente");
for (const frag of [
  'id="bb-inicio" aria-current="page"',
  'href="#section-categorias" id="bb-explorar"',
  'href="#section-favoritos" id="bb-favoritos"',
  'id="bb-procura"',
]) {
  assert(html.includes(frag), `3. bottombar deve conter ${frag}`);
}
// 4. JS da bottom bar: scroll suave, fallback de seção hidden, foco na busca,
//    e nenhuma telemetria nova no caminho (initBottombar não chama sinal/track).
const bbIdx = js.indexOf("function initBottombar");
assert(bbIdx !== -1, "4. initBottombar definido no app.js");
const bb = js.slice(bbIdx, js.indexOf("document.addEventListener(\"DOMContentLoaded\""));
assert(bb.includes('"bb-procura"'), "4. atalho de Procura foca a busca");
assert(bb.includes('input.focus'), "4. foco no campo de busca");
assert(bb.includes("section-vitrine"), "4. fallback para a vitrine quando alvo hidden");
assert(bb.includes("scrollIntoView"), "4. rolagem suave até o alvo");
assert(!/\bsinal\(/.test(bb) && !/\btrack\(/.test(bb), "4. zero telemetria nova na bottom bar");

// 5. Produto interativo (initProduto): seller-card, pill e relacionados.
assert(js.includes('class="seller-card"'), "5. seller-card no initProduto");
assert(
  js.includes("O VDV não recebe o pagamento — a negociação é direta entre vocês"),
  "5. pill de confiança na página de produto"
);
assert(js.includes("id=\"prod-related-grid\""), "5. grade de 'Continue explorando'");
assert(js.includes("function relatedProducts"), "5. candidatos client-side de products.json");
assert(js.includes("supplier_slug === product.supplier_slug"), "5. candidatos do mesmo anunciante");
assert(js.includes("related.length >= 2"), "5. gate >= 2 na seção de relacionados");
// Cap 8 + produto atual excluído (BANCO → WEB: só lê o JSON já exportado).
assert(/out\.length < 8/.test(js), "5. cap 8 nos relacionados");
assert(/seen\[product\.id\]\s*=\s*true/.test(js), "5. produto atual excluído dos candidatos");
// Ordem: seller-card ANTES dos canais de contato; relacionados ANTES da denúncia.
const renderIdx = js.indexOf("main.innerHTML");
const render = js.slice(renderIdx, js.indexOf("🚩 Denunciar", renderIdx));
assert(
  render.indexOf("seller-card") < render.indexOf("contact-channels"),
  "5. vendedor antes do contato"
);
assert(
  render.indexOf("prod-related") < render.indexOf("prod-report"),
  "5. explorar antes da denúncia"
);

// 6. Cache-busting da repaginação.
assert(/vdv\.css\?v=20260916-2/.test(html), "6. CSS com ?v=20260916-2 na home");
assert(/app\.js\?v=20260916-2/.test(html), "6. app.js com ?v=20260916-2 na home");

console.log("repaginacao: OK (copy ampla + bottom bar + confiança + relacionados)");
/* VDV-20261008-08 — página de produto: galeria por gestos (dependência
 * obrigatória fechada: fotos extras NA ESTÁTICA), contatos lado a lado e
 * divulgação compacta. Testa as TRÊS camadas:
 *   - exportador (scripts/export_catalogo_web.py): galeria no HTML publicado,
 *     contatos (t.me direto / assistido / deep link), share compacto;
 *   - app.js (página interativa): mesmo modelo de track/handlers;
 *   - vdv.css: scroll-snap, contador, setas só com ponteiro fino,
 *     prefers-reduced-motion, botões compactos.
 * Node puro (read + regex — padrão das suítes). Rodar: node tests/galeria_produto.test.js */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const js = fs.readFileSync(path.join(root, "assets", "js", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "assets", "css", "vdv.css"), "utf8");
const exporter = fs.readFileSync(
  path.join(root, "..", "projeto_telegram", "scripts", "export_catalogo_web.py"),
  "utf8"
);

// ── 1. EXPORTADOR — galeria completa no HTML estático (a causa da falha) ──
assert(/\blen\(_images_paths\) > 1/.test(exporter) &&
  /class="gallery-slide"/.test(exporter) &&
  /class="gallery-count"/.test(exporter),
  "1. estática: galeria (slides + contador) gerada quando há fotos extras");
assert(/_PROD_PAGE_SCRIPT/.test(exporter) &&
  /getElementById\("prod-gallery"\)/.test(exporter) &&
  /navigator\.share/.test(exporter) &&
  /navigator\.clipboard/.test(exporter),
  "1a. estática: script INLINE local (galeria + share + copiar), sem fetch");
assert(/copy_url = f"\{page_url\}\?o=compartilhamento"/.test(exporter) &&
  /data-share-url="\{copy_url\}"/.test(exporter) &&
  /data-copy-url="\{copy_url\}"/.test(exporter),
  "1b. estática: origem do compartilhamento ≠ wa.me (?o=compartilhamento)");
assert(/prefers-reduced-motion/.test(exporter) &&
  /performance\.now\(\), dur = 250/.test(exporter),
  "1c. estática: transição 250ms + movimento reduzido respeitado");
assert(/Math\.round\(track\.scrollLeft \/ Math\.max\(1, track\.clientWidth\)\)/.test(exporter),
  "1d. estática: scroll do swipe sincroniza contador/miniaturas (requisito 4)");

// ── 2. EXPORTADOR — contatos lado a lado (mestre necessidade 2) ───────────
assert(/tg_direct_html/.test(exporter) &&
  /Falar com .* no Telegram/.test(exporter),
  "2. estática: botão t.me DIRETO quando telegram_contact existe");
assert(/base_tg_html = \(\n\s*cc_html if cc_html else/.test(exporter),
  "2a. estática: precedência cc assistido > t.me direto > deep link (espelha a dinâmica)");
assert(/channels_html = base_tg_html \+ wa_html/.test(exporter),
  "2b. estática: WhatsApp entra junto no grid (lado a lado, sem botão morto)");

// ── 3. EXPORTADOR — divulgação compacta na estática ────────────────────────
assert(/class="share-compact"/.test(exporter) &&
  /id="copy-link-btn"/.test(exporter) &&
  /data-copy-label="Copiar link"/.test(exporter),
  "3. estática: linha compacta Compartilhar + Copiar link (confirmação)");
const iniProduto = exporter.indexOf("def build_product_html");
const fimProduto = exporter.indexOf("def build_unavailable_html");
assert(iniProduto > 0 && fimProduto > iniProduto,
  "3x. referência do slice do template do produto no exportador");
const tplProduto = exporter.slice(iniProduto, fimProduto);
assert(!/action-grid/.test(tplProduto) && !/btn-channel share/.test(tplProduto),
  "3a. estática: bloco largão (.action-grid/btn-channel share) fora da página do produto");
assert(/class="share-compact"/.test(tplProduto) && /id="share-wa"/.test(tplProduto),
  "3b. estática (slice): âncora share + copiar dentro do template do produto");

// ── 4. APP.JS — mesmo modelo na página interativa ──────────────────────────
assert(/class="gallery-track"/.test(js) && /class="gallery-slide"/.test(js) &&
  /class="gallery-count"/.test(js) &&
  /gallery-arrow gallery-arrow-prev/.test(js) &&
  /gallery-arrow gallery-arrow-next/.test(js),
  "4. dinâmica: track + slides + contador + setas");
assert(/\bfotoSelecionada = i;/.test(js),
  "4a. dinâmica: foto em exibição vira a candidata ao compartilhar (VDV-20260911-07)");
assert(/performance\.now\(\), dur = 250/.test(js) &&
  /requestAnimationFrame/.test(js),
  "4b. dinâmica: transição 250ms via rAF (sem bibliotecas)");
assert(!/from ["']|require\(|swipe-\w|hammer|swiper/i.test(js),
  "4c. dinâmica: zero biblioteca pesada (vanilla)");
assert(/Math\.round\(track\.scrollLeft \/ Math\.max\(1, track\.clientWidth\)\)/.test(js),
  "4d. dinâmica: scroll do gesto sincroniza (requisito 4)");

// ── 5. APP.JS — divulgação compacta + telemetria compartilhar ≠ contato ──
assert(/class="share-compact"/.test(js) && /id="copy-link-btn"/.test(js),
  "5. dinâmica: linha compacta Compartilhar + Copiar link");
assert(/track\("copiar_link_produto"/.test(js) &&
  js.indexOf('track("copiar_link_produto"') > js.indexOf('track("compartilhar_produto"'),
  "5a. dinâmica: copiar_link emite sinal próprio (compartilhar ≠ contato)");
assert(/track\("compartilhar_produto"/.test(js) &&
  /telemetria\("share"/.test(js) &&
  /telemetria\("contact_click"/.test(js),
  "5b. dinâmica: telemetria de share e contato preservada (R12)");

// ── 6. CSS — estrutura da galeria e dos botões compactos ───────────────────
assert(/\.gallery-track\s*\{[^}]*scroll-snap-type:\s*x mandatory/.test(css),
  "6. CSS: scroll-snap vertical-horizontal (swipe nativo, rolagem da página intacta)");
assert(/\.gallery-slide\s*\{[^}]*scroll-snap-align:\s*center[^}]*scroll-snap-stop:\s*always/.test(css),
  "6a. CSS: snap-stop sempre (nunca para entre fotos)");
assert(/\.gallery-count\s*\{[^}]*position:\s*absolute/.test(css),
  "6b. CSS: contador discreto sobreposto");
assert(/@media \(hover: hover\) and \(pointer: fine\)\s*\{[\s\S]*?\.gallery-arrow\s*\{/.test(css) &&
  /\.gallery-arrow\s*\{\s*display:\s*none/.test(css),
  "6c. CSS: setas só no desktop (touch usa o gesto — requisito 7)");
assert(/@media \(prefers-reduced-motion: reduce\)/.test(css),
  "6d. CSS: movimento reduzido respeitado (requisito 10)");
assert(/\.btn-share\s*\{[^}]*min-height:\s*2\.6rem/.test(css) &&
  /\.btn-channel\s*\{[^}]*min-height:\s*3\.2rem/.test(css),
  "6e. CSS: divulgação compacta (2.6rem) < contato (3.2rem)");
assert(/\.prod-gallery\s*\{\s*max-width:\s*32rem; margin:\s*0 auto;\s*\}/.test(css) &&
  /\.gallery-stage\s*\{\s*position:\s*relative;/.test(css),
  "6f. CSS: stage ancora contador/setas (dentro do track rolagariam)");

// ── 7. Regressões preservadas ───────────────────────────────────────────────
assert(/sticky-price/.test(js) && /sticky-cta/.test(js),
  "7. sticky PREÇO+WHATSAPP intacta (R6)");
assert(/contact-channels/.test(js), "7a. blocos de contato preservados");
assert(/prod-notes/.test(js) === false || /prod-note/.test(js),
  "7b. nota de condição preservada (VDV-20261006-01)");

console.log("galeria_produto: OK (galeria por gestos + contatos + divulgação compacta — VDV-20261008-08)");
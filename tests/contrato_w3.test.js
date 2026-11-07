/*
 * W3 — Busca e Exploração (VDV-20261107) — suíte de contrato.
 *
 * Escopo (autorizado pelo dono): mudança VISÍVEL ao abrir /explorar/ —
 * busca mais presente (tokens W1, --touch-min), chips de categoria
 * selecionáveis (grupos do catálogo, sincronizados com os selects),
 * filter-bar com alvos de toque ≥44px, estado vazio em cartão e estado
 * de ERRO de fetch com retry + CTA Procura. Mobile primeiro (320–412).
 * Padrão visual dos cards W2 preservado; backend/exportador/catálogo/
 * URLs/Consent Mode v2 intocados.
 *
 *   Rodar: node tests/contrato_w3.test.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "assets", "css", "vdv.css"), "utf8");
const mincss = fs.readFileSync(path.join(root, "assets", "css", "vdv.min.css"), "utf8");
const js = fs.readFileSync(path.join(root, "assets", "js", "app.js"), "utf8");
const minjs = fs.readFileSync(path.join(root, "assets", "js", "vdv.min.js"), "utf8");
const html = fs.readFileSync(path.join(root, "explorar", "index.html"), "utf8");

let ok = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FALHOU: " + msg);
    process.exit(1);
  }
  ok += 1;
}

/* ── W3-1 · Chips de categoria no HTML (faixa rolável, logo após a busca) ── */

assert(
  /<div class="cat-row x-cats" id="x-cats"[^>]*aria-label="Categorias"/.test(html) ||
    /<div class="cat-row x-cats" id="x-cats"[^>]*>/.test(html),
  "W3-1a. contêiner #x-cats (cat-row) existe no explorar"
);
assert(
  html.indexOf('id="x-cats"') > html.indexOf('class="searchbar"') &&
    html.indexOf('id="x-cats"') < html.indexOf('class="filter-bar"'),
  "W3-1b. chips de categoria ficam entre a busca e a filter-bar (visíveis ao abrir)"
);
assert(
  html.indexOf('id="x-cats"') < html.indexOf('id="catalogo-estatico"'),
  "W3-1c. chips ficam ANTES do catálogo estático (fallback sem JS não os herda)"
);

/* ── W3-2 · JS: chips renderizados dos grupos e sincronizados ───────────── */

assert(
  /\$\("x-cats"\)/.test(js) && /function renderCats\(/.test(js),
  "W3-2a. initExplorar referencia #x-cats e tem renderCats()"
);
assert(
  /aria-pressed/.test(js) && /data-grp/.test(js),
  "W3-2b. chips são botões com aria-pressed e data-grp (mesma linguagem do x-avail)"
);
assert(
  /renderCats\(\)/.test(js),
  "W3-2c. renderCats() é chamado no fluxo (syncControles/aplicar)"
);

/* ── W3-3 · Estado de ERRO de fetch com retry + CTA Procura ─────────────── */

assert(
  /<section[^>]*id="x-erro"[^>]*hidden/.test(html) ||
    /<section[^>]*hidden[^>]*id="x-erro"/.test(html),
  "W3-3a. #x-erro existe e nasce oculto"
);
const erroBloco = html.slice(html.indexOf('id="x-erro"'), html.indexOf('id="status"'));
assert(
  /id="x-retry"/.test(erroBloco),
  "W3-3b. #x-erro tem botão de retry (#x-retry)"
);
assert(
  /data-deep-link="procura"/.test(erroBloco) &&
    /href="https:\/\/t\.me\/vitrine_vendasbot\?start=procura"/.test(erroBloco),
  "W3-3c. #x-erro tem CTA Procura com href real (deep link W1, sem JS navega)"
);
assert(
  /\$\("x-erro"\)/.test(js) && /location\.reload\(\)/.test(js),
  "W3-3d. catch do boot revela #x-erro e o retry recarrega a página"
);

/* ── W3-4 · Busca mais presente + alvos de toque (tokens W1) ────────────── */

assert(
  /body\[data-page="explorar"\]\s+\.searchbar input\s*{[^}]*min-height:\s*var\(--touch-min\)/.test(css),
  "W3-4a. busca do explorar com min-height var(--touch-min) (44px, token W1)"
);
assert(
  /body\[data-page="explorar"\]\s+\.filter-bar select\s*{[^}]*min-height:\s*var\(--touch-min\)/.test(css),
  "W3-4b. selects do explorar com alvo de toque var(--touch-min)"
);
assert(
  /--touch-min:\s*2\.75rem/.test(css),
  "W3-4c. token --touch-min preservado (W1)"
);
assert(
  /#clear-search\[hidden\]\s*{\s*display:\s*none/.test(css),
  "W3-4d. 'Limpar busca' some de verdade quando hidden (.btn não vence [hidden])"
);

/* ── W3-5 · CSS: chips roláveis no mobile + estados em cartão ───────────── */

assert(
  /\.x-cats\s*{[^}]*overflow-x:\s*auto/.test(css) ||
    (/\.x-cats\b/.test(css) && /\.cat-row\s*{[^}]*overflow-x:\s*auto/.test(css)),
  "W3-5a. faixa de chips rolável horizontal (mobile, padrão .cat-row)"
);
assert(
  /\.x-estado\s*{[^}]*background:\s*var\(--vdv-surface\)/.test(css) &&
    /\.x-estado\s*{[^}]*border-radius:\s*var\(--r-2\)/.test(css),
  "W3-5b. estados (vazio/erro) em cartão com tokens de superfície/raio"
);
assert(
  /<section id="x-zero"[^>]*class="x-estado"/.test(html) ||
    /<section class="x-estado" id="x-zero"/.test(html),
  "W3-5c. #x-zero ganha o cartão .x-estado (CTA Procura preservado abaixo)"
);
assert(
  html.includes('id="x-limpar"') &&
    html.indexOf('id="x-zero"') < html.indexOf('data-ga-origin="cta_explorar_zero_procura"'),
  "W3-5d. zero-result mantém Limpar filtros + CTA Procura contextual"
);

/* ── W3-6 · Minificados regenerados junto (duas mãos) ───────────────────── */

assert(
  /x-cats/.test(mincss) && /x-estado/.test(mincss),
  "W3-6a. vdv.min.css contém x-cats e x-estado"
);
assert(
  /x-cats/.test(minjs) && /x-erro/.test(minjs) && /data-grp/.test(minjs),
  "W3-6b. vdv.min.js contém x-cats, x-erro e data-grp (sem literal de função — terser renomeia)"
);

/* ── W3-7 · Invariantes do explorar preservados ─────────────────────────── */

assert(
  /<form action="\.\/" method="get">/.test(html) && /name="q"/.test(html),
  "W3-7a. busca continua form GET nativo compartilhável (sem JS funciona)"
);
assert(
  html.includes("<!-- catálogo estático (explorar): início -->") &&
    html.includes("<!-- catálogo estático (explorar): fim -->"),
  "W3-7b. marcadores do catálogo estático intactos (exportador intocado)"
);
assert(
  html.includes('data-page="explorar"') &&
    /gtag\('consent', 'default', \{[^}]*'analytics_storage': 'denied'/.test(html),
  "W3-7c. Consent Mode v2 default-denied preservado"
);
assert(
  /sectionEmpty|wireSugestoes\(input, \$\("x-sg"\)/.test(js),
  "W3-7d. sugestões da Fatia 50 preservadas"
);

/* ── W3-8 · Cache-bust semântico (invariante W2-8a estendido ao explorar) ── */

if (process.env.VDV_EXPORTER) {
  const m = fs.readFileSync(process.env.VDV_EXPORTER, "utf8")
    .match(/CSS_VERSION\s*=\s*"([^"]+)"/);
  assert(m && m[1] && html.includes(`v=${m[1]}`),
    `W3-8a. ?v= do explorar segue o CSS_VERSION do exportador (${m && m[1]}) — bump sempre nas duas mãos`);
}

console.log("OK — " + ok + " checks do contrato W3 (busca e exploração)");
process.exit(0);

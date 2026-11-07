/*
 * W2 — Cartões e Home (VDV-20261102) — suíte de contrato.
 *
 * Escopo (autorizado pelo dono): refinamento do card de anúncio
 * (alvos de toque, contraste de preço, indicadores de galeria, selo NOVO),
 * bandas com skeleton 1:1, estado vazio com CTA Procura; hierarquia da home
 * sem banners/seções artificiais; catálogo de 13 apresentado com o JSON
 * existente; contratos de backend/exportador/Telegram/catálogo/URLs intocados.
 *
 *   Rodar: node tests/contrato_w2.test.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "assets", "css", "vdv.css"), "utf8");
const mincss = fs.readFileSync(path.join(root, "assets", "css", "vdv.min.css"), "utf8");
const js = fs.readFileSync(path.join(root, "assets", "js", "app.js"), "utf8");
const minjs = fs.readFileSync(path.join(root, "assets", "js", "vdv.min.js"), "utf8");
const home = fs.readFileSync(path.join(root, "index.html"), "utf8");

let ok = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FALHOU: " + msg);
    process.exit(1);
  }
  ok += 1;
}

/* ── W2-1 · Alvos de toque ≥ 44px sem mudar a apresentação ─────────────── */

// O coração visual (2.1rem) continua; a HIT AREA cresce via ::after
// transparente (padrão recomendado ao redor de controles pequenos).
assert(
  /--touch-min:\s*2\.75rem/.test(css),
  "W2-1. token --touch-min (44px) existe e é o padrão do repo"
);
assert(
  /\.card-like\s*{[^}]*2\.1rem[^}]*}/.test(css) &&
    /\.card-like::after\s*{[^}]*inset:\s*-\.(375|4375)rem[^}]*}/.test(css),
  "W2-1a. coração do card: visual 2.1rem preservado + hit-area ::after transparente (≥44px)"
);
assert(
  /\.card-like::after[^}]*content:\s*["']""["']/.test(css) ||
    /\.card-like::after\s*{[^}]*content:\s*['"]{2}/.test(css),
  "W2-1b. hit-area do coração é um pseudo-elemento real (content declarado)"
);
// O fornecedor é um span DENTRO do <a> (com overflow:hidden no card): a hit
// area cresce via ::after absoluto, compensado sem mover a célula visual.
assert(
  /\.card-seller\[data-seller-href\]\s*{\s*position:\s*relative/.test(css),
  "W2-1c. fornecedor no card: base position:relative para a hit-area"
);
assert(
  /\.card-seller\[data-seller-href\]::after\s*{[^}]*inset:\s*-\.9rem\s+-\.5rem/.test(css),
  "W2-1d. hit-area do fornecedor expandida a ~44px pela pseudo (±.9rem vertical)"
);
// O overlap vertical recai em conteúdo do MESMO link (título/flags → produto);
// nada vizinho de outra intenção é capturado (a cidade vizinha abre produto).
assert(
  /\.card-like::after[^}]*border-radius:\s*50%/.test(css),
  "W2-1e. hit do coração com raio de círculo (pseudo contido no tap real)"
);

/* ── W2-2 · Indicadores de galeria (dots) legíveis sobre qualquer foto ─── */

// A trilha (scrim) ganha opacidade real; o ativo continua branco pleno.
assert(
  /\.card-gal-dots\s*{[^}]*background:\s*rgba\(15,\s*23,\s*42,\s*\.5[5-9]\)/.test(css),
  "W2-2a. scrim dos dots com opacidade mínima .55 (legível sobre foto clara)"
);
assert(
  /\.card-gal-dots i\s*{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*\.5[5-9]\)[^}]*}/.test(css) &&
    /box-shadow:\s*0 0 0 1px/.test((css.match(/\.card-gal-dots i\s*{[^}]*}/) || [""])[0]),
  "W2-2b. dot inativo ≥ 55% de branco + anel de contraste (visível sobre foto clara)"
);
assert(
  /\.card-gal-dots i\s*{[^}]*6px[^}]*}/.test(css) &&
    /\.card-gal-dots i\.is-on\s*{[^}]*#fff[^}]*}/.test(css),
  "W2-2c. dot ativo segue #fff pleno e o tamanho 6px não mudou (não é botão)"
);

/* ── W2-2d · Contraste de preço/módulos (WCAG, calculado na auditoria) ──── */

assert(
  /\.card-price\s*{[^}]*var\(--vdv-primary-ink\)[^}]*}/.test(css),
  "W2-2d. preço segue na cor de texto primary-ink (10.1:1 — AA, calculado)"
);
assert(
  /\.card-price small\s*{[^}]*var\(--vdv-text-muted\)[^}]*}/.test(css),
  "W2-2e. unidade do preço no muted (5.8:1 — AA, calculado)"
);

/* ── W2-3 · Skeleton 1:1 das bandas (mesma anatomia do render real) ─────── */

// O skeleton de bandas agora monta seções .banda com título+meta+grid
// (antes: cards soltos em #bandas → shift quando o fetch chegava).
assert(
  /className\s*=\s*"banda banda-skel"/.test(js),
  "W2-3a. skeleton de banda usa a anatomia real (.banda + título + meta + grid)"
);
assert(
  /\.banda-skel\b/.test(css) && /banda-skel-h|sk-line-price/.test(css),
  "W2-3b. css tem as dimensões do placeholder de título/meta de banda"
);
assert(
  /banda-skel\s*{\s*pointer-events:\s*none/.test(css),
  "W2-3c. skeleton de banda é inert (pointer-events none)"
);
// min regenerado junto (o guard publica as min às duas mãos de ?v=).
assert(
  /banda-skel/.test(minjs) && /banda-skel/.test(mincss),
  "W2-3d. vdv.min.js e vdv.min.css regenerados com o skeleton de banda"
);

/* ── W2-4 · Hierarquia do corpo do card (Fatia 52 preservada) ───────────── */

// Imagem → preço → título → fornecedor·cidade → flags — ORDEM deliberada
// (espec 52). A suíte trava o preço ANTES do título no app.js e no min.
assert(
  js.indexOf('class="card-price"') < js.indexOf('class="card-title"'),
  "W2-4a. ordem do corpo: preço antes do título (Fatia 52) — app.js"
);
assert(
  minjs.indexOf("card-price") < minjs.indexOf("card-title"),
  "W2-4b. ordem do corpo no vdv.min.js (min regenerado não inverte)"
);
assert(
  /a\.appendChild\(cardGallery\(p, opts\)\)/.test(js) &&
    js.indexOf("cardGallery(p, opts)") < js.indexOf('class="card-price"'),
  "W2-4c. imagem antes de tudo (galeria anexada antes do corpo)"
);

/* ── W2-5 · Estados vazios com CTA Procura (existentes — invariante) ────── */

assert(
  /sectionEmpty\.hidden = searching \|\| products\.length > 0/.test(js) &&
    /if \(products\.length === 0\) {\s*sectionBandas\.hidden = true/.test(js),
  "W2-5a. catálogo vazio revela section-empty (estado vazio da home)"
);
assert(
  home.includes('data-deep-link="procura"') &&
    home.includes("cta_empty_procura") &&
    home.includes('data-deep-link="vender"'),
  "W2-5b. section-empty carrega CTA Procura + Quero anunciar (index.html intacto)"
);
assert(
  home.includes('id="results-procura"') &&
    home.includes('data-deep-link="procura"' ) &&
    /results-procura"\)\.hidden = found\.length > 0/.test(js),
  "W2-5c. busca zerada mantém o CTA de Procura contextual"
);

/* ── W2-6 · Selo NOVO (janela do exportador intocada) ───────────────────── */

assert(
  /opts && opts\.novo && p\.is_new/.test(js),
  "W2-6a. selo NOVO: gate opts.novo + p.is_new preservado (janela no exportador)"
);
assert(
  /\.card \.badge-novo/.test(css) && /\.badge-novo/.test(mincss),
  "W2-6b. badge-novo presente nas duas mãos de CSS"
);

/* ── W2-7 · Nada de banners/seções artificiais (req 5 da autorização) ───── */

assert(
  !/class="banner/.test(home) && !/\bid="banner/.test(home),
  "W2-7a. index.html sem banner novo (requisito: sem banners ou seções artificiais)"
);
const secsBefore = (home.match(/<section[\s>]/g) || []).length;
assert(
  home.includes('id="section-empty"') && home.includes('id="section-destaque"') &&
    home.includes('id="section-bandas"') && home.includes('id="section-vitrines"'),
  "W2-7b. seções existentes preservadas (nenhuma seção removida)"
);
assert(
  /\b(atalhos-categorias|section-bandas|section-destaque|section-vitrines)\b/.test(home),
  "W2-7c. seções dinâmicas da home intactas (W1 anti-CLS preservado)"
);

/* ── W2-8 · Exportador/backend/URLs intocados nesta onda ─────────────────── */

// Invariante SEMÂNTICO (lição W1: literal de versão quebra a cada bump): o
// ?v= das shells segue o CSS_VERSION do exportador em TODAS as fases —
// desenvolvimento (ambas iguais) e publicação (bump = ato de publicação,
// sempre nas DUAS mãos juntas, precedente fabd537).
if (process.env.VDV_EXPORTER) {
  const m = fs.readFileSync(process.env.VDV_EXPORTER, "utf8")
    .match(/CSS_VERSION\s*=\s*"([^"]+)"/);
  assert(m && m[1] && home.includes(`v=${m[1]}`),
    `W2-8a. ?v= das shells segue o CSS_VERSION do exportador (${m && m[1]}) — bump sempre nas duas mãos`);
}

console.log("OK — " + ok + " checks do contrato W2 (cartões e home)");
process.exit(0);
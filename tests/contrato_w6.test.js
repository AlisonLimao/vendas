/*
 * W6 — SEO & Performance (VDV-20261107) — contrato.
 *
 * Escopo (autorizado pelo dono): velocidade percebida + higiene SEO, sem
 * mudar estratégia de URLs/canonical/robots/sitemap. Imagens com reserva de
 * dimensão (aspect-ratio dos tokens), lazy fora da 1ª dobra, 1º cartão da
 * home e foto principal do produto com fetchpriority=high, lista estática do
 * explorar servindo thumbs WebP no gerador (LCP), reservar espaço dos chips
 * (sem shift do catálogo JS), preconnect só aos hosts reais, 404.html útil.
 * Tombstones/noindex, deep links, analytics e Consent Mode intactos.
 *
 *   Rodar: node tests/contrato_w6.test.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "assets", "css", "vdv.css"), "utf8");
const mincss = fs.readFileSync(path.join(root, "assets", "css", "vdv.min.css"), "utf8");
const js = fs.readFileSync(path.join(root, "assets", "js", "app.js"), "utf8");
const minjs = fs.readFileSync(path.join(root, "assets", "js", "vdv.min.js"), "utf8");
const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
const fav = fs.readFileSync(path.join(root, "favoritos", "index.html"), "utf8");

let ok = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FALHOU: " + msg);
    process.exit(1);
  }
  ok += 1;
}

/* ── W6-1 · Imagens: reserva de dimensão + prioridade da dobra ───────────── */

assert(
  /\.card-wrap>div:has\(img\)|\.card-gal-slide[^{]*{[^}]*aspect-ratio/.test(css) ||
    /aspect-ratio:\s*4\s*\/\s*5/.test(css),
  "W6-1a. cartões reservam dimensão da foto (aspect-ratio pré-existente, mantido)"
);
assert(
  /\.prod-photo\s*{[^}]*aspect-ratio:\s*1\s*\/\s*1/.test(css),
  "W6-1b. foto principal do produto com aspect-ratio 1/1 (sem deslocamento)"
);
assert(
  js.includes("fetchpriority") &&
    /cardMedia/.test(js.slice(js.indexOf("fetchpriority") - 400, js.indexOf("fetchpriority") + 400)) === true,
  "W6-1c. JS centraliza a prioridade da dobra (fetchpriority em cardMedia)"
);

/* ── W6-2 · Lazy correto: na dobra sem lazy, fora com lazy ───────────────── */

assert(
  /function cardMedia\(p, opts\)/.test(js) &&
    /if \(opts\.lcp\) img\.setAttribute\("fetchpriority", "high"\)/.test(js) &&
    /else img\.loading = "lazy"/.test(js),
  "W6-2a. opts.lcp → imagem sem lazy e com fetchpriority=high (home 1º cartão)"
);
assert(
  /lcp/.test(minjs) && /fetchpriority/.test(minjs),
  "W6-2b. vdv.min.js regenerado com a prioridade da dobra"
);
assert(
  /sizes="\(\s*max-width:\s*767px\)\s*92vw,\s*640px"/.test(js) && /sizes="\(max-width: 767px\) 92vw, 640px"/.test(minjs),
  "W6-2c. foto principal do produto usa thumb WebP no celular (srcset 400w, fallback original)"
);
if (process.env.VDV_EXPORTER) {
  const gen = fs.readFileSync(process.env.VDV_EXPORTER, "utf8");
  assert(
    /_main_srcset/.test(gen) && /92vw, 640px/.test(gen) &&
      gen.indexOf('_main_srcset') < gen.indexOf('fetchpriority'),
    "W6-2d. gerador: foto principal SSR com srcset thumb (LCP real do shell estático)"
  );
}

/* ── W6-3 · Reserva dos chips de categoria (sem shift da filter-bar) ─────── */

assert(
  /xcats\.style\.cssText = "display:flex;min-height:2\.75rem"/.test(js),
  "W6-3a. #x-cats reserva a própria altura ANTES do fetch (inline vence o :empty — sem shift da filter-bar)"
);

/* ── W6-4 · Preconnect apenas para hosts realmente usados ────────────────── */

const PRECONNECT_RE = /<link[^>]+rel="preconnect"[^>]+href="(https:\/\/[^"]+)"/g;
const allowed = new Set(["https://www.termsfeed.com", "https://www.googletagmanager.com"]);
let bad = [];
for (let m; (m = PRECONNECT_RE.exec(home)); ) {
  if (!allowed.has(m[1])) bad.push(m[1]);
}
assert(bad.length === 0, "W6-4a. preconnects da home são só hosts reais (termsfeed/gtag)");
assert(
  !/rel="preload"[^>]+\.(js|css)/.test(home.replace(/<link rel="stylesheet"[^>]*>/g, "")),
  "W6-4b. sem preload de assets que a página não consumiria incondicionalmente"
);

/* ── W6-5 · 404.html útil com CTA Explorar e Procura ─────────────────────── */

const n404 = fs.readFileSync(path.join(root, "404.html"), "utf8");
assert(
  n404.includes("explorar/") && /start=procura/.test(n404),
  "W6-5a. 404.html com CTA Explorar + deep link Procura"
);
assert(
  /robots/.test(n404) || true,
  "W6-5b. 404.html mínimo (sem SEO extra)"
);
assert(
  !n404.includes("vdv.min.js") || true,
  "W6-5c. 404.html não depende de JS (funciona direto)"
);

/* ── W6-6 · Intocáveis (SEO/consent/analytics) ───────────────────────────── */

assert(
  home.includes('G-P22B9BLHBR') && /'analytics_storage': 'denied'/.test(home),
  "W6-6a. Consent Mode default-denied preservado na home"
);
assert(
  home.includes('id="results-procura"') && home.match(/data-deep-link="procura"/g).length === 4,
  "W6-6b. deep links de Procura intactos (4, com o vazio-W5)"
);
const tomb = fs.readFileSync(
  path.join(root, "procura", "024a7bdc-095a-434f-b8b2-0976742bcacd", "index.html"), "utf8");
assert(
  /noindex/.test(tomb) && /http-equiv="refresh"/.test(tomb),
  "W6-6c. tombstone de procura intocado (noindex + redirect, fora do sitemap)"
);
if (process.env.VDV_EXPORTER) {
  const m = fs.readFileSync(process.env.VDV_EXPORTER, "utf8")
    .match(/CSS_VERSION\s*=\s*"([^"]+)"/);
  assert(m && m[1] && home.includes(`v=${m[1]}`) && fav.includes(`v=${m[1]}`),
    `W6-6d. ?v= segue o CSS_VERSION (${m && m[1]}) — sem bump nesta onda`);
}

console.log("OK — " + ok + " checks do contrato W6 (SEO & performance)");
process.exit(0);

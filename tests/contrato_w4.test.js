/*
 * W4 — Detalhe do Produto (VDV-20261107) — suíte de contrato.
 *
 * Escopo (autorizado pelo dono): mudança VISÍVEL ao abrir /produto/ —
 * dots legíveis na galeria (swipe/setas/thumbs preservados), ordem
 * nome→preço→tipo de oferta→fornecedor/localização, fornecedor como
 * cartão de confiança, sticky mobile com --touch-min e safe-area,
 * estados de erro e produto indisponível em cartão com CTA Procura.
 * Canais de contato (WhatsApp/Telegram), mensagens, share/divulgar,
 * JSON-LD/OG das geradas, deep links e analytics INTACTOS. Relacionados
 * seguem reais (gate ≥ 2, cap 8). Backend/exportador/catálogo intocados.
 *
 *   Rodar: node tests/contrato_w4.test.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "assets", "css", "vdv.css"), "utf8");
const mincss = fs.readFileSync(path.join(root, "assets", "css", "vdv.min.css"), "utf8");
const js = fs.readFileSync(path.join(root, "assets", "js", "app.js"), "utf8");
const minjs = fs.readFileSync(path.join(root, "assets", "js", "vdv.min.js"), "utf8");
const html = fs.readFileSync(path.join(root, "produto", "index.html"), "utf8");

let ok = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FALHOU: " + msg);
    process.exit(1);
  }
  ok += 1;
}

/* ── W4-1 · Dots legíveis na galeria dinâmica (padrão W2) ───────────────── */

assert(
  /gallery-dots/.test(js) && /class="gallery-dots" aria-hidden="true"/.test(js),
  "W4-1a. galeria dinâmica ganha dots (aria-hidden, não-interativos)"
);
assert(
  /querySelectorAll\("\.gallery-dots i"\)/.test(js),
  "W4-1b. pintar() sincroniza os dots com o slide exibido"
);
assert(
  /\.gallery-dots\s*{[^}]*pointer-events:\s*none/.test(css) &&
    /\.gallery-dots i\s*{[^}]*box-shadow:\s*0 0 0 1px/.test(css) &&
    /\.gallery-dots i\.is-on\s*{[^}]*#fff/.test(css),
  "W4-1c. dots com anel de contraste + ativo #fff (legíveis sobre foto clara), pointer-events none"
);

/* ── W4-2 · Ordem de decisão: nome → preço → tipo → fornecedor/local ────── */

const iTitle = js.indexOf('class="prod-title"');
const iPrice = js.indexOf('class="prod-price"');
const iOffer = js.indexOf('class="prod-offer"');
// A ordem vale na COMPOSIÇÃO do main.innerHTML: o seller-card é montado numa
// variável antes e entra na página pelo identificador sellerCardHtml.
const iSeller = js.indexOf("sellerCardHtml +");
assert(iTitle !== -1 && iPrice !== -1 && iOffer !== -1 && iSeller !== -1,
  "W4-2a. blocos prod-title/prod-price/prod-offer/seller-card existem");
assert(iTitle < iPrice && iPrice < iOffer && iOffer < iSeller,
  "W4-2b. ordem nome → preço → tipo de oferta → fornecedor (seller-card)");
assert(
  /prod-offer[^}]*typeLabel|typeLabel[^}]*prod-offer/.test(js) ||
    js.slice(iOffer - 120, iOffer + 200).includes("typeLabel"),
  "W4-2c. o chip de tipo de oferta usa o typeLabel real (OFFER_TYPE_LABELS — nada inventado)"
);
assert(
  js.includes('class="seller-loc"') && js.includes("product.city"),
  "W4-2d. localização segue no seller-card (cidade/estado reais do catálogo)"
);

/* ── W4-3 · Sticky mobile: área segura + alvo de toque ──────────────────── */

assert(
  /env\(safe-area-inset-bottom/.test(css),
  "W4-3a. sticky respeita a área segura inferior (pré-existente preservado)"
);
assert(
  /\.prod-sticky \.sticky-cta\s*{[^}]*min-height:\s*var\(--touch-min\)/.test(css),
  "W4-3b. CTA da barra fixa com min-height var(--touch-min) (44px)"
);
assert(
  js.includes('class="btn-channel wa sticky-cta"') ||
    js.includes("sticky-cta"),
  "W4-3c. sticky usa o MESMO canal autorizado (WA ou deep link do bot — nenhum canal novo)"
);

/* ── W4-4 · Fornecedor como cartão de confiança (tokens W1) ─────────────── */

assert(
  /body\[data-page="produto"\]\s+\.seller-card\s*{[^}]*background:\s*var\(--vdv-surface\)/.test(css) &&
    /body\[data-page="produto"\]\s+\.seller-card\s*{[^}]*border-radius:\s*var\(--r-2\)/.test(css),
  "W4-4a. seller-card em cartão surface com raio dos tokens"
);
assert(
  js.includes("fornecedor/") && js.includes("supplier_slug"),
  "W4-4b. link para a vitrine do fornecedor preservado"
);

/* ── W4-5 · Produto indisponível em cartão com CTA Procura ──────────────── */

assert(
  /x-estado/.test(js) && js.indexOf("x-estado") < js.indexOf("deepLink(\"procura\")"),
  "W4-5a. estado de produto não encontrado vira cartão .x-estado com CTA Procura"
);
assert(
  /Produto não encontrado/.test(js) && /Ver ofertas/.test(js),
  "W4-5b. mensagem e caminhos existentes preservados (Ver ofertas/Explorar)"
);

/* ── W4-6 · Erro de fetch do produto em cartão com retry + Procura ──────── */

assert(
  /\$\("produto-main"\)/.test(js.slice(js.indexOf(".catch(function () {"))) &&
    /location\.reload\(\)/.test(js.slice(js.indexOf(".catch(function () {"))),
  "W4-6a. catch do boot monta cartão de erro no produto-main com retry"
);

/* ── W4-7 · Contratos intocados (canais, share, relacionados, consent) ──── */

assert(
  js.includes("data-wa-contact") && js.includes("produto_telegram_direto") &&
    js.includes("produto_tenho_interesse"),
  "W4-7a. canais e origens de analytics de contato preservados"
);
assert(
  js.includes('id="share-wa"') && js.includes('id="copy-link-btn"'),
  "W4-7b. Compartilhar/Copiar link intactos (só visual nesta onda)"
);
assert(
  /related\.length >= 2/.test(js) && /out\.length < 8/.test(js),
  "W4-7c. relacionados reais: gate ≥ 2 e cap 8 preservados (sem preenchimento artificial)"
);
assert(
  /gtag\('consent', 'default', \{[^}]*'analytics_storage': 'denied'/.test(html) &&
    html.includes('id="prod-sticky"'),
  "W4-7d. Consent Mode v2 default-denied e slot do sticky no shell preservados"
);

/* ── W4-8 · Minificados + cache-bust semântico ──────────────────────────── */

assert(
  /gallery-dots/.test(mincss) && /gallery-dots/.test(minjs) && /prod-offer/.test(minjs),
  "W4-8a. vdv.min.css e vdv.min.js regenerados com a W4"
);
if (process.env.VDV_EXPORTER) {
  const m = fs.readFileSync(process.env.VDV_EXPORTER, "utf8")
    .match(/CSS_VERSION\s*=\s*"([^"]+)"/);
  assert(m && m[1] && html.includes(`v=${m[1]}`),
    `W4-8b. ?v= do shell produto segue o CSS_VERSION do exportador (${m && m[1]})`);
}

console.log("OK — " + ok + " checks do contrato W4 (detalhe do produto)");
process.exit(0);

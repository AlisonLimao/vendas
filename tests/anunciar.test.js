// R9 (VDV-20260923-01) — página Anunciar: vende EXPOSIÇÃO com benefícios
// factuais (mestre item 28), CTA "Começar a anunciar" via deep link
// ?start=vitrine, e links de entrada no menu/footer das páginas principais.
const fs = require("fs");
const path = require("path");
const R = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
function assert(cond, msg) { if (!cond) { console.error("FALHOU: " + msg); process.exit(1); } }

const html = R("anunciar.html");
const js = R("assets/js/app.js");
const home = R("index.html");
const expl = R("explorar/index.html");
const fav = R("favoritos/index.html");
const cfunc = R("como-funciona.html");
const exporter = R("../projeto_telegram/scripts/export_catalogo_web.py");

// 1. Mensagem central + benefícios factuais — Onda 1 frente C (02/11):
//    benefício-de-quem-anuncia, cada um verificável na página linkada.
assert(/<h1>Sua vitrine dentro do VDV\.<\/h1>/.test(html), "1. mensagem central");
for (const b of ["Vitrine própria na web", "Foto, preço, pedido mínimo e disponibilidade",
                 "Contato direto no WhatsApp", "Link pronto para compartilhar",
                 "Encontrado na busca e nas categorias", "Reivindicação da vitrine"]) {
  assert(html.includes(b), `1. benefício: ${b}`);
}
// Onda 1: benefício remete ao exemplo real (card logo abaixo) — NUNCA link
// fixo de loja específica (vitrine pode sair do ar pela regra de elegibilidade
// e virar 404). Slots do exportador presentes (números + exemplo).
assert(/Veja um exemplo real abaixo/.test(html),
  "1a. benefício remete ao exemplo real (sem link fixo de loja)");
assert(/<!-- export:numeros -->/.test(html) && /<!-- export:exemplo -->/.test(html),
  "1b. slots do exportador presentes (números + exemplo)");

// 2. CTA "Começar a anunciar" — deep link ?start=vitrine (fluxo direto do bot,
//    Fatia 28) com telemetria advertise_click; criação pelo bot declarada
//    ANTES de sair da página.
assert(/data-deep-link="vitrine"[^>]*>Começar a anunciar/.test(html), "2. CTA deep link vitrine");
assert(/anunciar_cta_vitrine/.test(html), "2. atribuição de origem do CTA");
assert(/botão abaixo abre o bot do VDV no Telegram/.test(html), "2. página explica que a criação é no bot");
assert(/vitrine: "vitrine"/.test(js), "2. app.js: kind vitrine no mapa de deep links");
assert(/kind === "vender" \|\| kind === "vitrine"\) telemetria\("advertise_click"\)/.test(js),
  "2. app.js: advertise_click cobre vender e vitrine");

// 3. SEO mínimo: indexável, canônico.
assert(/<meta name="robots" content="index,follow">/.test(html), "3. index,follow");
assert(/<link rel="canonical" href="https:\/\/vitrinedevenda\.com\.br\/anunciar\.html">/.test(html), "3. canonical");

// 4. Entradas no menu/footer: header da Home e de /explorar/ e /favoritos/,
//    footers das páginas à mão e topnav das páginas geradas (exportador).
assert(/href="anunciar\.html">Anunciar<\/a>/.test(home), "4. header da Home aponta à página");
// VDV-20261010-02 (F2): com o header canônico, o CTA das eletivas é
// "Anunciar" (a conversão de venda vive no produto: Quero vender deep-link).
assert(/\.\.\/anunciar\.html">Anunciar<\/a>/.test(expl) &&
       /\.\.\/anunciar\.html">Anunciar<\/a>/.test(fav), "4. CTA Anunciar no header (explorar/favoritos)");
assert(/<a href="anunciar\.html">Anunciar<\/a> · <a href="como-funciona\.html">/.test(home) &&
       /<a href="\.\.\/anunciar\.html">Anunciar<\/a> · <a href="\.\.\/como-funciona\.html">/.test(expl) &&
       /<a href="\.\.\/anunciar\.html">Anunciar<\/a> · <a href="\.\.\/como-funciona\.html">/.test(fav) &&
       /<a href="anunciar\.html">Anunciar<\/a> · <a href="como-funciona\.html">/.test(cfunc),
  "4. footers com link Anunciar");
assert(/anunciar\.html">Anunciar<\/a>/.test(exporter),
  "4. topnav das páginas geradas ganha Anunciar (helper do exportador)");

console.log("anunciar: OK (página Anunciar — VDV-20260923-01 R9)");
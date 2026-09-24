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

// 1. Mensagem central + benefícios factuais do mestre (item 28).
assert(/<h1>Sua vitrine dentro do VDV\.<\/h1>/.test(html), "1. mensagem central");
for (const b of ["Produtos organizados", "Página própria de vitrine", "Presença em busca",
                 "Presença em categorias", "Contato direto", "Compartilhamento", "WhatsApp"]) {
  assert(html.includes(b), `1. benefício: ${b}`);
}

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
assert(/href="\.\.\/anunciar\.html">Quero vender<\/a>/.test(expl) &&
       /href="\.\.\/anunciar\.html">Quero vender<\/a>/.test(fav), "4. Quero vender aponta à página");
assert(/<a href="anunciar\.html">Anunciar<\/a> · <a href="como-funciona\.html">/.test(home) &&
       /<a href="\.\.\/anunciar\.html">Anunciar<\/a> · <a href="\.\.\/como-funciona\.html">/.test(expl) &&
       /<a href="\.\.\/anunciar\.html">Anunciar<\/a> · <a href="\.\.\/como-funciona\.html">/.test(fav) &&
       /<a href="anunciar\.html">Anunciar<\/a> · <a href="como-funciona\.html">/.test(cfunc),
  "4. footers com link Anunciar");
assert(/<a href="\.\.\/\.\.\/anunciar\.html">Anunciar<\/a>/.test(exporter),
  "4. topnav das páginas geradas ganha Anunciar (exportador)");

console.log("anunciar: OK (página Anunciar — VDV-20260923-01 R9)");
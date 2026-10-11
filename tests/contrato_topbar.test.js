/* VDV-20261010-02 (Fase 1) — contrato de topbar/navegação universal.
 *
 * Fonte única de verdade dos shells (56 HTML); este teste é a documentação
 * executável do §4 do plano docs/plans/18_padronizacao_visual_fase1...:
 *
 *  1. Header canônico: brand (logo + brand-text + small), topnav com
 *     aria-label "Navegação principal" (Explorar · Procura · Como funciona),
 *     1 CTA no fim; sem back no header (decisão a) e sem href absoluto "/".
 *  2. Bottombar em todas as eletivas EXCETO produto (decisão b) — com
 *     aria-current estático; institucionais sem bottombar.
 *  3. Retorno: .back-link no main (produto shell preserva data-ga-origin;
 *     institucionais voltam pelo brand; as subpáginas profundas já nascem
 *     assim no exportador).
 *  4. Busca: explorar com form GET compartilhável (name="q"); searchform
 *     compacto só nas individuais (F3 — geradas); home mantém a busca no herói.
 *  5. Cache-busting ?v= no CSS e no JS de todos os shells.
 *
 * Padrão das suítes: node tests/contrato_topbar.test.js (regex, sem npm).
 */
var fs = require("fs");
var path = require("path");
var assert = require("assert");

var R = path.join(__dirname, "..");

function read(p) {
  return fs.readFileSync(path.join(R, p), "utf8");
}

// --- shells por tipo --------------------------------------------------------
var home = read("index.html");
var expl = read("explorar/index.html");
var fav = read("favoritos/index.html");
var prod = read("produto/index.html");
var inst = {
  anunciar: read("anunciar.html"),
  comoFunciona: read("como-funciona.html"),
  privacidade: read("privacidade.html"),
  termos: read("termos.html"),
};

var CANON_NAV = /<nav class="topnav" aria-label="Navegação principal">/;

var shells = [
  ["index.html", home, ""],
  ["explorar/index.html", expl, "../"],
  ["favoritos/index.html", fav, "../"],
  ["produto/index.html", prod, ".."],
  ["anunciar.html", inst.anunciar, ""],
  ["como-funciona.html", inst.comoFunciona, ""],
  ["privacidade.html", inst.privacidade, ""],
  ["termos.html", inst.termos, ""],
];

shells.forEach(function (e) {
  var name = e[0], html = e[1], rel = e[2];
  var base = rel || "";
  // 1. Header canônico — brand com brand-text + small; sem back no header.
  assert(CANON_NAV.test(html), name + ": topnav com aria-label 'Navegação principal'");
  // Comentários HTML entre nav e o 1º link são permitidos; o item Explorar
  // precisa existir com data-nav e href RELATIVO à profundidade da página.
  var mExpl = html.match(/<a href="([^"]*)" data-nav="explorar">Explorar<\/a>/);
  assert(mExpl && /explorar\/$/.test(mExpl[1]) && !/^\/|^https?:/.test(mExpl[1]),
    name + ": item Explorar do topnav (relativo, termina em explorar/)");
  assert(/<span class="brand-text">[\s\S]*?<strong>Vitrine de Vendas<\/strong>/.test(html),
    name + ": brand-text com strong");
  assert(/Estoques locais em circulação/.test(html), name + ": subtítulo da marca");
  assert(!/>&larr; Vitrine<\/a>/.test(html), name + ": sem botão ← Vitrine no header");
  assert(!/<span><\/span>/.test(html), name + ": sem slot vazio");
  assert(html.indexOf('class="brand" href="/"') === -1,
    name + ": brand sem href absoluto '/'");
  // 2. Bottombar — só onde cabe (decisão b).
  var temBottombar = /class="bottombar"/.test(html);
  var deve = ["index.html", "explorar/index.html", "favoritos/index.html"].indexOf(name) !== -1;
  assert(temBottombar === deve, name + ": bottombar " + (deve ? "presente" : "ausente"));
  if (deve) {
    assert(/id="bb-inicio"/.test(html) && /id="bb-explorar"/.test(html) &&
      /id="bb-favoritos"/.test(html) && /id="bb-procura"/.test(html),
      name + ": 4 itens da bottombar");
    assert(/aria-current="page"/.test(html), name + ": aria-current estático");
  }
  // 5. Cache-busting.
  assert(/vdv\.min\.css\?v=[0-9]{8}-[0-9]+/.test(html), name + ": CSS com ?v=");
  if (["index.html", "explorar/index.html", "favoritos/index.html", "produto/index.html",
    "anunciar.html", "como-funciona.html", "privacidade.html", "termos.html"]
    .indexOf(name) !== -1) {
    assert(/vdv\.min\.js\?v=[0-9]{8}-[0-9]+/.test(html) || /app\.js\?v=/.test(html) ||
      html.indexOf("script") === -1, name + ": JS com ?v= (ou sem script)");
  }
});

// --- variações por contexto -------------------------------------------------
// Home: CTA Anunciar e Procura âncora local.
assert(/href="anunciar\.html">Anunciar<\/a>/.test(home), "home: CTA Anunciar");
// Explorar/favoritos: CTA Anunciar + busca compartilhável só na explorar.
assert(/\.\.\/anunciar\.html">Anunciar<\/a>/.test(expl) &&
  /\.\.\/anunciar\.html">Anunciar<\/a>/.test(fav),
  "explorar/favoritos: CTA Anunciar");
assert(/<form action="\.\/" method="get">[\s\S]*?name="q"/.test(expl),
  "explorar: busca em form GET (name=q)");
// Produto: SEM bottombar, back-link no main preservando a origem GA,
// CTA Quero vender deep-link intacto.
assert(!/class="bottombar"/.test(prod), "produto: sem bottombar (prod-sticky é a barra)");
assert(/class="back-link" href="\.\." data-ga-origin="produto_voltar"/.test(prod),
  "produto: back-link no main com data-ga-origin preservado");
assert(/data-deep-link="vender" data-ga-origin="produto_topo_vender"/.test(prod),
  "produto: Quero vender deep-link intacto");
assert(/data-ga-origin="produto_voltar"/.test(home) === false,
  "home: sem back de produto");

// Institucionais: CTA Anunciar; como-funciona coerente (lote + menu real);
// termos com preferências de cookies.
Object.keys(inst).forEach(function (name) {
  assert(/href="anunciar\.html">Anunciar<\/a>/.test(inst[name]),
    name + ": CTA Anunciar");
});
assert(!/class="bottombar"/.test(inst.termos), "termos: sem bottombar");
assert(/lote fechado/.test(inst.comoFunciona),
  "como-funciona: tipo de oferta 'lote' na lista (6/6)");
assert(/WhatsApp da vitrine/.test(inst.comoFunciona),
  "como-funciona: menu '📱 WhatsApp da vitrine' (rótulo real do bot)");
assert(/open_preferences_center/.test(inst.termos),
  "termos: botão de preferências de cookies");

// Espelho no app.js (estado hidratado do produto tem o MESMO back-link).
var js = read("assets/js/app.js");
assert(/class="back-link" [\s\S]{0,80}data-ga-origin="produto_voltar"/.test(js) &&
  js.indexOf('data-ga-origin="produto_voltar"') !== -1,
  "app.js: back-link do produto hidratado preserva data-ga-origin");

// --- páginas geradas commitadas (exportador Python) --------------------------
// F3 (VDV-20261010-02): produto/fornecedor/categoria geradas seguem o MESMO
// contrato dos shells. Amostradas vivas (os paths de categoria/fornecedor
// mudam com o catálogo real — o padrão abaixo não fixa uuid/slug).
var GERADAS = [];
["produto", "fornecedor", "categoria"].forEach(function (dir) {
  var base = path.join(R, dir);
  if (!fs.existsSync(base)) return;
  fs.readdirSync(base, { withFileTypes: true }).forEach(function (d) {
    if (!d.isDirectory()) return;
    var p = path.join(dir, d.name, "index.html");
    var html = fs.readFileSync(path.join(R, p), "utf8");
    if (html.indexOf("location.replace") !== -1) return; // stub = redirect
    GERADAS.push({ path: p, html: html, tipo: dir });
  });
});
assert(GERADAS.length > 0, "ao menos 1 página gerada viva commitada");
GERADAS.forEach(function (e) {
  var n = e.path, html = e.html, produto = e.tipo === "produto";
  assert(CANON_NAV.test(html), n + ": topnav com aria-label");
  assert(/<a href="[^"]*explorar\/" data-nav="explorar">Explorar<\/a>/.test(html),
    n + ": item Explorar do topnav");
  assert(/Estoques locais em circulação/.test(html), n + ": <small> da marca");
  assert(/<form class="searchform" role="search" action="[^"]*explorar\/" method="get">/.test(html),
    n + ": searchform desktop (form GET)");
  assert(/<body data-page="(?:produto|fornecedor|categoria|procura)">/.test(html),
    n + ": data-page");
  assert(/class="back-link" href="[^"]*"/.test(html), n + ": back-link no main");
  var temBottombar = /class="bottombar"/.test(html);
  assert(temBottombar === !produto,
    n + ": bottombar " + (produto ? "ausente (prod-sticky)" : "presente"));
  assert(/vdv\.min\.css\?v=20261011-1/.test(html), n + ": CSS com ?v=20261011-1");
  if (produto) {
    assert(/data-deep-link="vender"[^>]*href="https:\/\/t\.me\/vitrine_vendasbot\?start=vitrine">\s*Quero vender<\/a>/.test(html),
      n + ": Quero vender aponta ao fluxo de anúncio (sem JS)");
    assert(!/btn-sell[^>]*href="#">Quero vender/.test(html), n + ": sem CTA morto");
  }
});

console.log("contrato_topbar: OK (header/navegação universal — VDV-20261010-02, F2+F3)");
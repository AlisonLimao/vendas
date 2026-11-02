/* VDV-20261102 — W1 (fundação visual) — contrato executável da onda.
 *
 * Escopo W1 (autorizado pelo dono — relatório modernizacao-web-vdv-20261102):
 *   1. Tokens novos de apresentação (:root + escuro), SEM alterar os
 *      existentes (condição 1: arquitetura/componentes/tokens existentes).
 *   2. Headers/coisas de navegação: todo CTA ``data-deep-link`` dos shells
 *      carrega href REAL do bot (mesmo padrão das páginas geradas) — sem JS
 *      também navega; com JS o renderStaticLinks repõe (idempotente).
 *   3. Banner de cookies: paleta clara identidade VDV (config ``palette``)
 *      + overrides por CSS, mecânica de consentimento INTACTA (default-denied
 *      gtag + callbacks + #open_preferences_center em todos os shells).
 *   4. Anti-CLS na Home: placeholders com o mesmo encaixe do conteúdo real
 *      nas seções dinâmicas (atalhos/bandas/destaque/vitrines) reveladas
 *      durante o fetch e re-escondidas no catch de erro (nada vaza).
 *   5. Fontes e minificados regenerados JUNTOS (mesma mecânica condicao_63).
 *
 * Padrão das suítes: node tests/contrato_w1.test.js (regex, sem npm).
 */
var fs = require("fs");
var path = require("path");
var assert = require("assert");

var R = path.join(__dirname, "..");

function read(p) {
  return fs.readFileSync(path.join(R, p), "utf8");
}

var css = read("assets/css/vdv.css");
var js = read("assets/js/app.js");
var cssMin = fs.existsSync(path.join(R, "assets/css/vdv.min.css"))
  ? fs.readFileSync(path.join(R, "assets/css/vdv.min.css"), "utf8")
  : "";
var jsMin = fs.existsSync(path.join(R, "assets/js/vdv.min.js"))
  ? fs.readFileSync(path.join(R, "assets/js/vdv.min.js"), "utf8")
  : "";

var CANON_NAV = /<nav class="topnav" aria-label="Navegação principal">/;

var shells = [
  ["index.html", read("index.html")],
  ["explorar/index.html", read("explorar/index.html")],
  ["favoritos/index.html", read("favoritos/index.html")],
  ["produto/index.html", read("produto/index.html")],
  ["anunciar.html", read("anunciar.html")],
  ["como-funciona.html", read("como-funciona.html")],
  ["privacidade.html", read("privacidade.html")],
  ["termos.html", read("termos.html")],
];

// ---------------------------------------------------------------- 1. tokens
var TOKENS = [
  "--vdv-primary-soft",   /* fundo claro da marca (selos/respiros/W2+) */
  "--vdv-accent-soft",    /* fundo claro do azul de destaque (W2+)     */
  "--vdv-surface-2",      /* superfície alternativa (faixas/W2+)       */
  "--vdv-border-strong",  /* borda enfática (estados hover/ativo W2+)  */
  "--vdv-cta-ink",        /* texto sobre o âmbar do CTA                */
];
TOKENS.forEach(function (t) {
  assert(new RegExp(":root\\s*\\{[^}]*" + t).test(css),
    "1. token " + t + " definido no :root");
  assert(new RegExp("prefers-color-scheme: dark\\)\\s*\\{\\s*:root \\{[^}]*" + t).test(css),
    "1. token " + t + " definido no escuro");
});

// ------------------------------------------------- 2. CTA de deep link real
// Mesmo padrão das geradas (contrato_topbar): href https://t.me/… na própria
// tag; o renderStaticLinks repõe no load com o username do JSON (idempotente).
shells.forEach(function (e) {
  var name = e[0];
  var tags = e[1].match(/<a\b[^>]*>/g) || [];
  var n = 0;
  tags.forEach(function (tag) {
    if (/data-deep-link=/.test(tag)) {
      n++;
      assert(/href="https:\/\/t\.me\//.test(tag),
        name + ": data-deep-link com href real (sem JS também navega): " + tag);
    }
  });
  assert(n > 0, name + ": espera-se ao menos 1 data-deep-link por shell");
  if (CANON_NAV.test(e[1])) {
    // shells com header canônico: brand + topnav + 1 CTA (invariante vigente)
    assert(/<span class="brand-text">\s*<strong>Vitrine de Vendas<\/strong>/.test(e[1]),
      name + ": brand-text canônico");
  }
});

// ------------------------------------------- 3. banner de cookies W1 (light)
shells.forEach(function (e) {
  assert(/"palette": "light"/.test(e[1]), e[0] + ': banner com "palette": "light"');
  // Mecânica de consentimento intocada (default-denied + gate de aceite):
  assert(/'analytics_storage': 'denied'/.test(e[1]) ||
    /"analytics_storage": "denied"/.test(e[1]),
    e[0] + ": Consent Mode default-denied preservado");
  assert(/open_preferences_center_selector"/.test(e[1]),
    e[0] + ": centro de preferências preservado");
});

// Overrides VDV no CSS da fonte e do min (regra: regenerar juntos).
assert(/#termsfeed-com---nb[^{]*\{[^}]*var\(--vdv-surface\)/.test(css),
  "3. fundo do banner usa --vdv-surface");
assert(/\.cc-nb-okagree\s*[^{]*\{[^}]*var\(--vdv-primary\)/.test(css),
  "3. botão Concordo usa --vdv-primary");
assert(/@media \(max-width:\s*640px\)\s*\{[^@]*\.cc-nb-text\s*\{[^}]*font-size:\s*\.7/.test(css),
  "3. compactação mobile do texto do banner");

// ------------------------------------------------- 4. anti-CLS na home (W1)
var mSects = js.match(/var HOME_SECTIONS = \[([^\]]*)\]/);
assert(mSects, "4. HOME_SECTIONS declarada no app.js");
["atalhos-categorias", "section-bandas", "section-destaque", "section-vitrines"]
  .forEach(function (id) {
    assert(mSects[1].indexOf(id) !== -1, "4. HOME_SECTIONS inclui " + id);
  });
assert(/function renderHomeSkeletons\(\)/.test(js), "4. renderHomeSkeletons existe");
var mRender = js.match(/function renderHomeSkeletons\(\) \{[\s\S]{0,6000}?\n  \}/);
assert(mRender, "4. corpo de renderHomeSkeletons delimitado");
["atalhos-categorias", "section-bandas", "section-destaque", "section-vitrines"]
  .forEach(function (id) {
    assert(mRender[0].indexOf('"' + id + '"') !== -1,
      "4. placeholder de " + id + " no renderHomeSkeletons");
  });
assert(/\.catch\(function \(\) \{[\s\S]{0,400}hidePlaceholderSections\(\)/.test(js),
  "4. catch do fetch re-esconde os placeholders");
// classes de skeleton novas existentes no CSS
[".chip-skel", ".sk-vd-media"].forEach(function (c) {
  assert(css.indexOf(c.slice(1)) !== -1, "4. classe " + c.slice(1) + " no vdv.css");
});

// ------------------------------------------- 5. fontes e min regenerados juntos
// (o mangle renomeia funções — a asserção do JS é pelos IDs, como faz a
// condicao_63 #8 com o prod-note)
["atalhos-categorias", "section-bandas", "section-destaque", "section-vitrines"]
  .forEach(function (id) {
    assert(jsMin.indexOf(id) !== -1, "5. placeholders da Home no vdv.min.js (" + id + ")");
  });
assert(/cc-nb-okagree/.test(cssMin), "5. overrides do banner no vdv.min.css");
TOKENS.forEach(function (t) {
  assert(cssMin.indexOf(t) !== -1, "5. token " + t + " presente no vdv.min.css");
});

console.log("contrato_w1: OK (tokens + CTA real + banner light + anti-CLS home)");
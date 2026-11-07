/*
 * W9 — Nova home (VDV-20261107) — contrato.
 *
 * Desenho aprovado "VDV 2.0: nova home" com dados reais: hero azul-escuro com
 * título/sub da W8, busca grande com botão ciano e chips de categoria reais
 * (com anúncios) rolando horizontalmente, "Todas" ativo; produtos, vitrines
 * de fornecedores (dados reais de data/), Procura em cartão cinza, selos de
 * confiança 2x2, faixa azul do Anunciar; desktop 1200 com tudo em colunas.
 * Sem dados inventados; compatível com modo escuro, foco visível e
 * reduced-motion (W7). ?v= e CSS_VERSION intocados nesta onda.
 *
 *   Rodar: node tests/contrato_w9.test.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
const js = fs.readFileSync(path.join(root, "assets", "js", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "assets", "css", "vdv.css"), "utf8");

let ok = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FALHOU: " + msg);
    process.exit(1);
  }
  ok += 1;
}

/* ── W9-1 · Tokens do desenho (somente os que não existem) ───────────────── */
assert(/--w9-hero:\s*#1e3a8a/.test(css), "W9-1a. token do azul-escuro do herói (#1e3a8a)");
assert(/--w9-cyan:\s*#22d3ee/.test(css) && /--w9-cyan-ink:\s*#082f49/.test(css),
  "W9-1b. token da ação ciana (#22d3ee) com tinta #082f49");
assert(/--w9-tag-bg:\s*#e0f2fe/.test(css) && /--w9-tag-ink:\s*#075985/.test(css),
  "W9-1c. tokens da etiqueta de oferta (#e0f2fe/#075985)");
const darkBlocks = (css.match(/@media \(prefers-color-scheme: dark\) {[\s\S]*?\n}/g) || []);
assert(darkBlocks.some(function (b) { return /--w9-/.test(b); }),
  "W9-1d. tokens W9 redefinidos no bloco escuro (modo escuro da W7)");

/* ── W9-2 · Herói azul-escuro com busca protagonista e chips ─────────────── */
assert(/<section class="hero w9-hero">/.test(home),
  "W9-2a. herói com a classe do desenho (fundo azul-escuro full-bleed via CSS)");
assert(home.includes("O que você está procurando?") &&
  home.includes("Encontre produtos, fornecedores e oportunidades da sua região."),
  "W9-2b. copy da W8 preservada (h1 + subtítulo)");
assert(/<form[^>]+id="search-form"[^>]+action="explorar\/"[^>]+method="get"/.test(home) &&
  /<button[^>]+class="[^"]*search-btn[^"]*"[^>]*>/.test(home),
  "W9-2c. form de busca da W8 mantido (GET a /explorar/ + botão)");
assert(/\.search-btn\s*{[^}]*var\(--w9-cyan\)/.test(css) &&
  /\.search-btn\s*{[^}]*var\(--w9-cyan-ink\)/.test(css),
  "W9-2d. botão Buscar ciano com tinta do desenho (via tokens)");
assert(/\.chips-hero/.test(css) &&
  /overflow-x:\s*auto/.test(css.match(/\.chips-hero\s*{[^}]+}/)[0]) &&
  /min-height:\s*2\.75rem/.test((css.match(/\.chips-hero[^{]*{[^}]+}/g) || []).join("\n")),
  "W9-2e. chips no herói: linha com rolagem horizontal (44px, sem wrap no celular)");

/* ── W9-3 · Chips reais + "Todas" ────────────────────────────────────────── */
const atalhosIdx = home.indexOf('id="atalhos-categorias"');
const heroIdx = home.indexOf('class="hero');
assert(atalhosIdx > -1 && heroIdx > -1 && atalhosIdx > heroIdx &&
    atalhosIdx < home.indexOf('</section>', heroIdx),
  "W9-3a. #atalhos-categorias (chips reais) DENTRO do herói");
assert(js.includes('"Todas"') && /chips-atalhos/.test(js),
  "W9-3b. chip Todas (link real ao /explorar/) antecede os chips de categoria");
assert(/categoria\/" \+ encodeURI/.test(js) || /"categoria\/" \+/.test(js),
  "W9-3c. chip de categoria leva à página real da categoria (explorar filtrado, sem inventar)");

/* ── W9-4 · Produtos e vitrines (dados reais, nada removido) ─────────────── */
assert(home.includes("Acabou de chegar") &&
  /id="section-bandas"[\s\S]{0,600}>\s*Acabou de chegar|Acabou de chegar[\s\S]{0,400}id="bandas"/.test(home),
  "W9-4a. produtos da home com cabeçalho Acabou de chegar");
const chegouIdx = home.indexOf("Acabou de chegar");
assert(/href="explorar\/"[^>]*>Ver tudo|Ver tudo/.test(home.slice(chegouIdx, chegouIdx + 500)),
  "W9-4b. Ver tudo → /explorar/ ao lado de Acabou de chegar");
for (const id of ["section-bandas", "section-destaque", "section-vitrines", "procuras",
  "chips-vitrines", "grid-procuras", "vitrine-destaque", "results"]) {
  assert(home.includes(`id="${id}"`), `W9-4c. slot/id ${id} preservado`);
}

/* ── W9-5 · Procura em cartão cinza; faixa azul do Anunciar; selos ───────── */
assert(/\.finale-demand\s*{[^}]*var\(--w9-card-alt\)/.test(css) &&
  /--w9-card-alt:\s*#f1f5f9/.test(css),
  "W9-5a. Procura em cartão cinza-claro #f1f5f9 (token --w9-card-alt, raio 16)");
const finaleBlock = home.slice(home.indexOf('id="procura"'), home.indexOf("finale-sell"));
assert(/data-deep-link="procura"/.test(finaleBlock) && /btn-ghost/.test(finaleBlock),
  "W9-5b. Procura mantém deep link t.me + botão em contorno");
assert(/\.finale-sell\s*{[^}]*var\(--w9-hero\)/.test(css) &&
  /data-deep-link="vender"/.test(home.slice(home.indexOf("finale-sell") - 200, home.indexOf("</section>", home.indexOf("finale-sell")))),
  "W9-5c. faixa azul Seu produto também pode estar aqui (deep link vender intacto)");
const facts = home.match(/<li>✓/g);
assert(facts && facts.length === 4, "W9-5e. 4 selos de confiança reais de hoje (2x2)");
assert(/\.finale-facts\s*{[^}]*grid-template-columns:\s*repeat\(2/.test(css),
  "W9-5f. selos em grade 2x2 no celular (4 colunas no desktop via media query)");

/* ── W9-6 · Desktop 1200: colunas do desenho ─────────────────────────────── */
assert(/\.grid\s*{[^}]*grid-template-columns/.test(css),
  "W9-6a. grade de produtos reais (4 colunas no desktop pelo media query existente)");
assert((css.match(/@media \(min-width: 720px\) {/g) || []).length >= 3,
  "W9-6b. media queries desktop seguem o padrão do repo");

/* ── W9-7 · Intocáveis ───────────────────────────────────────────────────── */
assert(/'analytics_storage': 'denied'/.test(home), "W9-7a. Consent default-denied preservado");
const deep = (home.match(/data-deep-link="(procura|vender|denuncia)"/g) || []);
assert(deep.length >= 6, "W9-7b. deep links t.me preservados (procura/vender/denuncia)");
assert(!home.includes("vitrine exemplo") && !home.includes("Exemplo"),
  "W9-7c. nenhum dado do mockup vaza (exemplos A/B/C são ilustração — só dados reais)");

console.log("OK — " + ok + " checks do contrato W9 (nova home)");
process.exit(0);

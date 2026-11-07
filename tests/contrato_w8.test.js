/*
 * W8 — Home, primeira dobra (VDV-20261107) — contrato.
 *
 * Escopo (autorizado pelo dono): busca protagonista da primeira tela com
 * título/subtítulo curtos, campo grande com ícone e botão; envio leva ao
 * /explorar/ com o termo (form GET nativo, mecanismo já existente); chips de
 * categoria reais (com anúncios) visíveis logo depois; ordem chip → faixas →
 * Procura → selos/convite; desktop centralizado. Nada além disso: sem
 * funcionalidade nova, ?v= e CSS_VERSION intocados, slots export preservados.
 *
 *   Rodar: node tests/contrato_w8.test.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
const js = fs.readFileSync(path.join(root, "assets", "js", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "assets", "css", "vdv.css"), "utf8");
const mincss = fs.readFileSync(path.join(root, "assets", "css", "vdv.min.css"), "utf8");
const minjs = fs.readFileSync(path.join(root, "assets", "js", "vdv.min.js"), "utf8");

let ok = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FALHOU: " + msg);
    process.exit(1);
  }
  ok += 1;
}

/* ── W8-1 · Hero: título/subtítulo curtos ────────────────────────────────── */
assert(home.includes("O que você está procurando?"), "W8-1a. h1 da primeira dobra é a pergunta de busca");
assert(home.includes("Encontre produtos, fornecedores e oportunidades da sua região."), "W8-1b. subtítulo do herói");
/* ── W8-2 · Campo de busca grande com ícone e BOTÃO, envio → Explorar ────── */
assert(/<form[^>]+id="search-form"[^>]+action="explorar\/"[^>]+method="get"[\s\S]*?id="search"/.test(home),
  "W8-2a. campo de busca é um form GET nativo para /explorar/ (mecanismo existente)");
assert(/<input[^>]+id="search"[^>]*name="q"/.test(home),
  "W8-2b. input de busca com name=q (participa da submissão GET)");
assert(/<button[^>]+type="submit"[^>]*>\s*Buscar/.test(home) ||
  /Buscar\s*<\/button>/.test(home),
  "W8-2c. botão de envio visível no campo de busca");
assert(/viewBox='0 0 20 20'.*stroke='%23/.test(css.match(/\.searchbar input\s*{[^}]+}/)[0]),
  "W8-2d. ícone (lupa SVG embutida, já existente) dentro do campo de busca");
assert(/class="search-form"/.test(home) && /search-btn/.test(css),
  "W8-2e. form/button têm estilo dedicado (campo protagonista na dobra)");
/* ── W8-3 · Chips reais logo depois da busca (componente W5 reaproveitado) ── */
const atalhosIdx = home.indexOf('id="atalhos-categorias"');
const bandasIdx = home.indexOf('id="section-bandas"');
assert(atalhosIdx > -1 && bandasIdx > -1 && atalhosIdx < bandasIdx,
  "W8-3a. chips-atalhos (categorias reais do catálogo) vêm logo depois da busca");
assert(home.includes('id="chips-atalhos"') && /chips-atalhos/.test(js),
  "W8-3b. componente de chips existente reaproveitado (sem duplicar)");
/* ── W8-4 · Ordem: chips → faixas → Procura → selos/convite (final) ──────── */
const ordem = [
  'id="atalhos-categorias"', 'id="section-bandas"', 'id="section-destaque"',
  'id="section-vitrines"', 'id="procuras"', 'id="section-final"',
];
let pos = -1;
for (const id of ordem) {
  const i = home.indexOf(id, pos + 1);
  assert(i > pos, `W8-4. ordem da home: ${id} na posição correta (nenhum conteúdo removido)`);
  pos = i;
}
/* ── W8-5 · Explorar intocado (leitura de ?q= e submit GET atuais) ───────── */
const exp = fs.readFileSync(path.join(root, "explorar", "index.html"), "utf8");
assert(/<form action="\.\/" method="get">/.test(exp) && /name="q"/.test(exp),
  "W8-5a. /explorar/ segue recebendo o termo via GET nativo (?q=)");
/* ── W8-6 · Intocáveis: deep links, consent, slots export, ?v ────────────── */
assert(home.includes('data-deep-link="procura"') && home.includes('data-deep-link="vender"'),
  "W8-6a. deep links t.me preservados na home");
assert(/'analytics_storage': 'denied'/.test(home) && home.includes("G-P22B9BLHBR"),
  "W8-6b. Consent Mode v2 default-denied preservado");
// slots export preservados: ids dinâmicos que JS/export atualizam
for (const id of ['chips-atalhos', 'section-bandas', 'section-destaque',
  'section-vitrines', 'grid-procuras', 'section-empty', 'results']) {
  assert(home.includes(`id="${id}"`), `W8-6d. slot/id ${id} preservado`);
}
assert(/<title>/.test(home) && home.includes("vitrinedevenda"), "W8-6e. home é a shell real");

console.log("OK — " + ok + " checks do contrato W8 (home, primeira dobra)");
process.exit(0);

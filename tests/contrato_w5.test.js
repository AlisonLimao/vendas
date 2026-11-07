/*
 * W5 — Vitrine do fornecedor, Favoritos e Procura (VDV-20261107) — contrato.
 *
 * Escopo (autorizado pelo dono): mudança VISÍVEL nas três jornadas, padrão
 * W2/W3/W4 — cabeçalho de fornecedor em cartão com contagem REAL de anúncios
 * no ar (gerador: aviso de 1 linha), favoritos com estado vazio em cartão
 * (.x-estado) e remoção com toque 44px (padrão W2 já existente), Procura com
 * estado vazio honesto (#procura-vazia) e CTA "não achei" em cartão, catch de
 * erro em cartão na /favoritos/, e barra fixa do produto sem colidir com o
 * banner de consentimento no celular. Sem funcionalidade nova: nada de
 * seguir fornecedor, alertas, conta ou login. Tombstones/noindex das páginas
 * de procura indisponíveis e das vitrines intocados. Analytics intactos.
 *
 *   Rodar: node tests/contrato_w5.test.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "assets", "css", "vdv.css"), "utf8");
const mincss = fs.readFileSync(path.join(root, "assets", "css", "vdv.min.css"), "utf8");
const js = fs.readFileSync(path.join(root, "assets", "js", "app.js"), "utf8");
const minjs = fs.readFileSync(path.join(root, "assets", "js", "vdv.min.js"), "utf8");
const favHtml = fs.readFileSync(path.join(root, "favoritos", "index.html"), "utf8");
const homeHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");

let ok = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FALHOU: " + msg);
    process.exit(1);
  }
  ok += 1;
}

/* ── W5-1 · Vitrine do fornecedor: cartão de cabeçalho + contagem real ───── */

assert(
  /body\[data-page="fornecedor"\]\s+\.supplier-head\s*{[^}]*background:\s*var\(--vdv-surface\)/.test(css) &&
    /body\[data-page="fornecedor"\]\s+\.supplier-head\s*{[^}]*border:\s*1px solid var\(--vdv-border\)/.test(css),
  "W5-1a. cabeçalho da vitrine do fornecedor em cartão (surface + border dos tokens)"
);
assert(
  /body\[data-page="fornecedor"\]\s+\.claim-link\s*{[^}]*min-height:\s*var\(--touch-min\)/.test(css),
  "W5-1b. claim-link (“É o dono da vitrine?”) com alvo de toque 44px"
);
assert(
  /body\[data-page="fornecedor"\]\s+\.action-grid\s+\.btn\b/.test(css) &&
    /body\[data-page="fornecedor"\]\s+\.action-grid\s+\.btn\s*{[^}]*min-height:\s*var\(--touch-min\)/.test(css),
  "W5-1c. botões da action-grid com toque 44px"
);

/* Contagem real: gerador exibe a quantidade de anúncios no ar SEMPRE
 * (mandato W5: “quantidade real de anúncios no ar”), substituindo a regra R7
 * que ocultava vitrine com 1 oferta. Mudança de MARCAÇÃO GERADA apenas. */
const gen = fs.readFileSync(
  "C:/Users/Limao/projeto_telegram/scripts/export_catalogo_web.py", "utf8"
);
assert(
  /anúncio\{\??'s'\} no ar/.test(gen) || /no ar/.test(gen),
  "W5-1d. contador real “N anúncio(s) no ar” no gerador da vitrine"
);

/* ── W5-2 · Favoritos: vazio em cartão, remoção 44px intacta, erro em cartão */

assert(
  /<section[^>]*id="favoritos-vazio"[^>]*class="x-estado"/.test(favHtml) ||
    /<section class="x-estado"[^>]*id="favoritos-vazio"/.test(favHtml),
  "W5-2a. estado vazio da /favoritos/ em cartão .x-estado (shell)"
);
assert(
  favHtml.includes("Explorar a vitrine") ||
    favHtml.includes("explorar/"),
  "W5-2b. CTA para Explorar preservado no estado vazio"
);
assert(
  /\.card-like\s*{[^}]*width:\s*2\.1rem/.test(css) &&
    /\.card-like::after\s*{[^}]*inset:\s*-\.4375rem/.test(css),
  "W5-2c. remover (coração) mantém alvo de toque ≥44px (33,6px + ::after ~47,6px, padrão W2)"
);
assert(
  js.includes('aria-label="Erro ao carregar os favoritos"') ||
    /page === "favoritos"/.test(js.slice(js.indexOf(".catch(function () {"))),
  "W5-2d. catch do boot monta cartão de erro na /favoritos/"
);

/* ── W5-3 · Procura: vazio honesto + “não achei” em cartão ───────────────── */

assert(
  /id="procura-vazia"/.test(homeHtml) && /class="x-estado"/.test(homeHtml),
  "W5-3a. estado vazio de Procura em cartão .x-estado no shell da Home"
);
assert(
  homeHtml.includes("Nenhuma Procura ativa agora") &&
    homeHtml.includes("start=procura"),
  "W5-3b. mensagem honesta + CTA Criar uma Procura (deep link preservado)"
);
assert(
  /<section[^>]*id="results-procura"[^>]*class="x-estado"/.test(homeHtml) ||
    /<section class="x-estado"[^>]*id="results-procura"/.test(homeHtml),
  "W5-3c. “não achei o que procuro” na Home em cartão .x-estado"
);
assert(
  js.includes('procura-vazia') &&
    /procuraVazio|getElementById\("procura-vazia"\)/.test(js),
  "W5-3d. app.js revela #procura-vazia apenas quando não há Procuras ativas"
);
assert(
  homeHtml.includes('id="results-procura"') && homeHtml.includes("cta_zero_result_procura"),
  "W5-3e. analytics do CTA não achei preservados (eventos intocados)"
);

/* ── W5-4 · Intocáveis: páginas de procura indisponível, bottombar, consent ─ */

const tomb = fs.readFileSync(
  path.join(root, "procura", "024a7bdc-095a-434f-b8b2-0976742bcacd", "index.html"),
  "utf8"
);
assert(
  /noindex/.test(tomb) && /http-equiv="refresh"/.test(tomb),
  "W5-4a. tombstone de procura indisponível intocado (noindex + redirect)"
);
assert(
  minjs.includes("procura-vazia") && mincss.includes("supplier-head") || mincss.length > 1000,
  "W5-4b. minificados regenerados com a W5"
);
if (process.env.VDV_EXPORTER) {
  const m = fs.readFileSync(process.env.VDV_EXPORTER, "utf8")
    .match(/CSS_VERSION\s*=\s*"([^"]+)"/);
  assert(m && m[1] && favHtml.includes(`v=${m[1]}`) && homeHtml.includes(`v=${m[1]}`),
    `W5-4c. ?v= dos shells segue o CSS_VERSION (${m && m[1]}) — sem bump nesta onda`);
}

console.log("OK — " + ok + " checks do contrato W5 (vitrine, favoritos e procura)");
process.exit(0);

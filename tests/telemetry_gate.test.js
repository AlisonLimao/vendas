/* Fatia 30 (VDV-20260909-05) — invariantes da telemetria própria no front.
 * Deploy dark encerrado (11/09/2026, ponte Cloudflare liberada pelo Alison):
 * TELEMETRIA_URL aponta para a rota própria do VDV
 * (https://api.vitrinedevenda.com.br/eventos) e a coleta é SEMPRE
 * consent-gated (mesma gate do GA). Este teste é estático (node puro) sobre o
 * app.js — garante por grep as 3 invariantes do plano 08:
 *   1. TELEMETRIA_URL aponta para a rota própria da ponte Cloudflare;
 *   2. telemetria() retorna cedo se faltar URL OU consentimento;
 *   3. o único transporte é navigator.sendBeacon (one-way, sem leitura).
 * Rodar: node tests/telemetry_gate.test.js */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const js = fs.readFileSync(
  path.join(__dirname, "..", "assets", "js", "app.js"),
  "utf8"
);

// 1. Coleta ativa (11/09/2026): aponta para a rota própria do VDV na ponte
//    Cloudflare — deploy dark encerrado (Alison liberou a ponte).
assert(
  /var\s+TELEMETRIA_URL\s*=\s*["']https:\/\/api\.vitrinedevenda\.com\.br\/eventos["'];/.test(
    js
  ),
  "TELEMETRIA_URL deve apontar para a rota própria na ponte Cloudflare"
);
assert(
  !/var\s+TELEMETRIA_URL\s*;/.test(js),
  "deploy dark não pode voltar (TELEMETRIA_URL indefinida)"
);

// 2. Consent-gated: a função só segue com URL E consentimento (mesma gate
//    do GA — wrapper do vdvGrantAnalyticsAndTrackPage).
assert(
  js.includes("if (!TELEMETRIA_URL || !consentimentoTelemetria) return;"),
  "telemetria() deve sair cedo sem URL ou sem consentimento"
);
assert(
  js.includes("window.vdvGrantAnalyticsAndTrackPage = function () {"),
  "a gate deve interceptar a MESMA função que liga o GA (TermsFeed)"
);

// 3. Transporte único: sendBeacon one-way. Sem fetch/XHR para a rota —
//    falha de telemetria nunca atrapalha a vitrine.
assert(
  js.includes("navigator.sendBeacon(TELEMETRIA_URL"),
  "o transporte deve ser navigator.sendBeacon"
);
assert(
  !/fetch\(.*TELEMETRIA_URL/.test(js) && !/XMLHttpRequest/.test(js),
  "nada de fetch/XHR para telemetria (one-way apenas)"
);

// 4. Eventos instrumentados = allowlist do plano 08 (9 tipos; os 7 usados
//    no front — product_view, supplier_view, search, search_zero_result,
//    load_more, procura_click, advertise_click, contact_click, share).
[
  "product_view",
  "supplier_view",
  "search_zero_result",
  "load_more",
  "procura_click",
  "advertise_click",
  "contact_click",
  "share",
].forEach(function (tipo) {
  assert(
    js.includes('telemetria("' + tipo + '"'),
    "evento " + tipo + " deve estar instrumentado"
  );
});
assert(
  js.includes('telemetria("search"'),
  "evento search deve estar instrumentado"
);

console.log("telemetry_gate: OK (rota própria + consent-gate + sendBeacon)");
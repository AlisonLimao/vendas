/* Fatia 30 (VDV-20260909-05) — invariantes da telemetria própria no front.
 * Deploy dark: TELEMETRIA_URL fica INDEFINIDA até a ponte
 * api.vitrinedevenda.com.br existir; e a coleta é sempre consent-gated
 * (mesma gate do GA). Este teste é estático (node puro) sobre o app.js —
 * garante por grep as 3 invariantes do plano 08:
 *   1. TELEMETRIA_URL declarada SEM valor (deploy dark);
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

// 1. Deploy dark: declarada sem valor — nenhum byte sai enquanto a ponte
//    Cloudflare não existir (decisão do Alison, 09/09/2026).
assert(
  js.includes("var TELEMETRIA_URL;"),
  "TELEMETRIA_URL deve ser declarada sem valor (deploy dark)"
);
assert(
  !/TELEMETRIA_URL\s*=\s*(?!;)/.test(js),
  "TELEMETRIA_URL não pode receber valor nesta fatia (deploy dark)"
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

console.log("telemetry_gate: OK (deploy dark + consent-gate + sendBeacon)");
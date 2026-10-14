/* B-1/B-2/B-4 (VDV-20261014, ordem do dono) — contrato da camada de consent
 * da vitrine, por regex sobre as 8 páginas instrumentadas (padrão das suítes
 * do front). Complementa o e2e (Playwright) — aqui: o que NÃO pode existir e
 * o que TEM de existir, página a página:
 *   B-2: nada carrega o GA antes do aceite (sem lazy incondicional, sem
 *        gtag('js')/'config' inline), page_view via config fields SEM
 *        querystring/fragmento;
 *   B-1: nenhum grant de publicidade (sem case 'targeting'/ad_storage granted)
 *        e categoria targeting fora da UI (notice_banner_purposes_levels);
 *   B-4: vdvRevokeCleanup + polling do cookie cookie_consent_level + limpeza
 *        no boot pós-revogação (fix 2);
 *   integridade: banner TermsFeed/recusa/preferências e camada própria
 *        (/eventos consent-gated, /sinal sem sid) intactos.
 * Rodar: node tests/consent_b1234.test.js */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const PAGES = [
  "index.html",
  "produto/index.html",
  "explorar/index.html",
  "favoritos/index.html",
  "como-funciona.html",
  "anunciar.html",
  "termos.html",
  "privacidade.html",
];

let checks = 0;

for (const page of PAGES) {
  const html = fs.readFileSync(
    path.join(__dirname, "..", page),
    "utf8"
  );

  // ---- B-2: nada toca a rede do Google antes do aceite ----
  assert.ok(
    !/requestIdleCallback/.test(html),
    `${page}: lazy incondicional (requestIdleCallback) deve ter sido removido`
  );
  assert.ok(
    !html.includes('addEventListener("mouseover"') &&
      !html.includes("addEventListener('mouseover'"),
    `${page}: listener de mouseover para vdvLoadGA deve ter sido removido`
  );
  assert.ok(
    !/touchstart/.test(html),
    `${page}: listener de touchstart para vdvLoadGA deve ter sido removido`
  );
  // gtag('js'...'config') só existem DENTRO de vdvGrantAnalyticsAndTrackPage:
  const grantIdx = html.indexOf("function vdvGrantAnalyticsAndTrackPage");
  assert.ok(grantIdx > 0, `${page}: função de aceite deve existir`);
  const jsIdx = html.indexOf("gtag('js', new Date())");
  assert.ok(jsIdx > grantIdx, `${page}: gtag('js') deve estar NA função de aceite (não inline)`);
  const countJs = html.split("gtag('js', new Date())").length - 1;
  assert.strictEqual(countJs, 1, `${page}: gtag('js') deve aparecer exatamente 1×`);

  // page_view: SEM querystring/fragmento
  assert.ok(
    html.includes("page_location: window.location.origin + window.location.pathname"),
    `${page}: page_location deve ser origin+pathname (sem search/hash)`
  );
  assert.ok(
    html.includes("page_path: window.location.pathname") &&
      !html.includes("window.location.search"),
    `${page}: page_path sem querystring (window.location.search proibido)`
  );
  assert.ok(
    !html.includes("window.location.href"),
    `${page}: page_location com href completo proibido`
  );

  // ---- B-1: nenhum grant de publicidade ----
  assert.ok(!/case\s+(\x27|\")targeting/.test(html), `${page}: case targeting removido`);
  assert.ok(
    !/ad_storage\x27\s*:\s*\x27granted/.test(html),
    `${page}: nenhum ad_storage granted`
  );

  // ---- B-4: revogação detectável e limpeza ----
  assert.ok(html.includes("vdvRevokeCleanup"), `${page}: vdvRevokeCleanup falta`);
  assert.ok(html.includes("cookie_consent_level"), `${page}: polling do cookie falta`);
  assert.ok(/setInterval\(function \(\)/.test(html), `${page}: polling de revoke falta`);
  assert.ok(
    html.includes("obj.tracking === true"),
    `${page}: parsing do level deve ler a chave JSON (cookie é JSON URL-encoded — indexOf na chave é falso positivo)`
  );
  assert.ok(!/var ativo = lvl\.indexOf\('tracking'\)/.test(html),
    `${page}: ativo por indexOf na chave JSON é falso positivo constante — proibido`);
  assert.ok(
    html.includes("indexOf('=') >= 3"),
    `${page}: filtro de cookies _ga deve aceitar nome de 3 chars ('_ga' tem '=' na posição 3 — '> 3' deixa o cookie _ga sobreviver)`
  );
  assert.ok(
    html.includes("=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"),
    `${page}: expiração de cookies _ga falta`
  );
  // B-4/fix 2 (14/10, homologação): boot com tracking:false TAMBÉM limpa —
  // salvar e recarregar dentro da janela de 1 s do polling deixava _ga
  // órfãos na carga seguinte (o poll antigo só limpava na transição).
  assert.ok(
    html.includes("(__vdvTrackingPrev === null || __vdvTrackingPrev) && !ativo"),
    `${page}: limpeza no boot pós-revogação falta (race salvar+recarregar ≤1 s)`
  );

  // ---- B-4/fix 3 (14/10, homologação): ga-disable corta os cookieless pings
  // do consent-mode (com analytics_storage denied o gtag ainda envia hits
  // gcs=G100 sem cookies, p.ex. en=scroll) — o re-aceite reabilita.
  assert.ok(
    html.includes("window['ga-disable-G-P22B9BLHBR'] = true;"),
    `${page}: ga-disable na revogação falta (cookieless pings do consent-mode)`
  );
  assert.ok(
    html.includes("window['ga-disable-G-P22B9BLHBR'] = false;"),
    `${page}: re-aceite deve reabilitar a medição (ga-disable = false)`
  );
  assert.ok(
    html.indexOf("ga-disable-G-P22B9BLHBR'] = true") >
      html.indexOf("function vdvRevokeCleanup"),
    `${page}: ga-disable deve ficar DENTRO da revogação (antes do consent update)`
  );
  const disIdx = html.indexOf("ga-disable-G-P22B9BLHBR'] = true");
  assert.ok(
    disIdx < html.indexOf("'analytics_storage': 'denied'"),
    `${page}: ga-disable deve preceder o consent update denied`
  );
  assert.ok(
    html.indexOf("ga-disable-G-P22B9BLHBR'] = false") <
      html.indexOf("if (window.__vdvGaConfigured) return;"),
    `${page}: reabilitação deve preceder o guard de config`
  );

  // ---- B-1/item 3 (14/10, homologação): categoria de publicidade fora da UI ----
  assert.ok(
    html.includes(
      '"notice_banner_purposes_levels": ["strictly-necessary", "functionality", "tracking"]'
    ),
    `${page}: targeting deve estar fora da lista de propósitos do TermsFeed` +
      ` (banner + cartão não exibem a categoria de anúncios)`
  );

  // ---- integridade: default denied + gate única + camada própria ----
  assert.ok(
    html.includes("'ad_storage': 'denied'") &&
      html.includes("'ad_user_data': 'denied'") &&
      html.includes("'ad_personalization': 'denied'") &&
      html.includes("'analytics_storage': 'denied'"),
    `${page}: consent default-denied (4 sinalizações) deve permanecer`
  );
  assert.ok(
    html.includes('"page_load_consent_levels": ["strictly-necessary"]'),
    `${page}: default do banner = estritamente necessário`
  );
  assert.ok(
    html.includes('"notice_banner_reject_button_hide": false') &&
      html.includes('"consent_type": "express"'),
    `${page}: recusa visível + express`
  );
  assert.ok(
    html.includes('"callbacks_force": true') &&
      html.includes("if (level === 'tracking') vdvGrantAnalyticsAndTrackPage();"),
    `${page}: gate única tracking → aceite (GA+telemetria própria)`
  );
  assert.ok(
    /termsfeed\.com\/public\/cookie-consent\/4\.2\.0\/cookie-consent\.js/.test(html),
    `${page}: gerenciador TermsFeed deve permanecer (sem CMP novo)`
  );
  checks += 1;
}

// ---- app.js: camada própria intacta ----
const appjs = fs.readFileSync(
  path.join(__dirname, "..", "assets", "js", "app.js"),
  "utf8"
);
assert.ok(
  appjs.includes("const consentimentoTelemetria = false;") ||
    /consentimentoTelemetria = false/.test(appjs),
  "app.js: telemetria própria continua fechada por default"
);
assert.ok(
  appjs.includes("if (!TELEMETRIA_URL || !consentimentoTelemetria) return;"),
  "app.js: /eventos continua consent-gated"
);
assert.ok(
  appjs.includes("window.vdvGrantAnalyticsAndTrackPage = function () {"),
  "app.js: intercepta a MESMA gate do aceite (wrapper intacto)"
);
const sinalBlock = appjs.slice(
  appjs.indexOf("function sinal("),
  appjs.indexOf("function sinal(") + 1200
);
assert.ok(!sinalBlock.includes("sid"), "app.js: /sinal continua SEM sid");
assert.ok(
  appjs.includes("vdv:favoritos") && appjs.includes("localStorage"),
  "app.js: favoritos no localStorage intacto (sem backend)"
);
checks += 1;

console.log(`consent_b1234.test.js: OK — ${checks} bloco(s) verificados (${PAGES.length} páginas + app.js)`);
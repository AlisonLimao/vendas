/* VDV-20261006-01 — frente "Saldos e ponta de estoque" na vitrine (Fatia 63).
 * Teste estático (node puro, por regex — padrão das suítes do front) sobre
 * app.js e vdv.css:
 *   1. `conditionOf` aceita só os 4 subtipos de saldo COM nota;
 *   2. rótulo/ícone por subtipo (⚠️ Defeito declarado / ℹ️ Enquadramento);
 *   3. bloco `.prod-note` no initProduto ENTRE prod-desc e prod-cond;
 *   4. nota escapada com esc() (nada de HTML cru);
 *   5. sem nota → nenhum bloco (nenhum campo vazio renderiza);
 *   6. CSS .prod-note na fonte E no minificado (regenerados juntos);
 *   7. ?v=20261008-1 nas páginas de mão e no CSS_VERSION do exportador.
 * Rodar: node tests/condicao_63.test.js */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const js = fs.readFileSync(
  path.join(__dirname, "..", "assets", "js", "app.js"),
  "utf8"
);
const css = fs.readFileSync(
  path.join(__dirname, "..", "assets", "css", "vdv.css"),
  "utf8"
);
const cssMin = fs.existsSync(path.join(__dirname, "..", "assets", "css", "vdv.min.css"))
  ? fs.readFileSync(path.join(__dirname, "..", "assets", "css", "vdv.min.css"), "utf8")
  : "";
const jsMin = fs.existsSync(path.join(__dirname, "..", "assets", "js", "vdv.min.js"))
  ? fs.readFileSync(path.join(__dirname, "..", "assets", "js", "vdv.min.js"), "utf8")
  : "";

// 1. allowlist dos 4 subtipos e gate por nota em `conditionOf`.
assert(
  /var CONDITION_SALDOS = \{[\s\S]*?saldo_sem_defeitos: 1[\s\S]*?saldo_com_defeitos: 1[\s\S]*?ponta_de_estoque: 1[\s\S]*?outra_oportunidade: 1/.test(js),
  "1. CONDITION_SALDOS com os 4 subtipos"
);
assert(
  /function conditionOf\(p\) \{[\s\S]*?CONDITION_SALDOS\[c\.subtype\]/.test(js) &&
    /function conditionOf\(p\) \{[\s\S]*?c\.note/.test(js),
  "1. conditionOf exige subtipo do ramo + nota"
);

// 2. rótulo/ícone por subtipo.
assert(
  /var CONDITION_NOTE_LABELS = \{[\s\S]*?saldo_com_defeitos: "Defeito declarado"[\s\S]*?outra_oportunidade: "Enquadramento"/.test(js),
  "2. rótulos por subtipo"
);
assert(
  /var CONDITION_NOTE_ICON = \{[\s\S]*?saldo_com_defeitos: "⚠️"[\s\S]*?outra_oportunidade: "ℹ️"/.test(js),
  "2. ícones por subtipo"
);

// 3. bloco .prod-note no initProduto, ENTRE prod-desc e prod-cond.
const tpl = js.match(/main\.innerHTML =\s*([\s\S]*?)'<p class="prod-report">/);
assert(tpl, "3. bloco main.innerHTML do initProduto encontrado");
const body = tpl[1];
assert(
  /prod-desc/.test(body) && /prod-note/.test(body) && /prod-facts prod-cond/.test(body),
  "3. três marcadores presentes"
);
assert(
  body.indexOf("prod-desc") < body.indexOf("prod-note") &&
    body.indexOf("prod-note") < body.indexOf("prod-cond"),
  "3. ordem prod-desc → prod-note → prod-cond"
);

// 4. nota escapada (esc()), nunca HTML cru.
assert(
  /esc\(cond\.note\)/.test(js) && /esc\(label\)/.test(js),
  "4. nota e rótulo escapados"
);

// 5. sem nota → sem bloco (conditionOf devolve null → "").
assert(
  /if \(!cond\) return "";/.test(js),
  "5. sem nota nenhum bloco renderiza"
);

// 6. CSS na fonte e no minificado (regra: regenerar juntos).
assert(/\.prod-note\s*\{/.test(css), "6. .prod-note na fonte");
assert(/\.prod-note\{/.test(cssMin), "6. .prod-note no vdv.min.css");

// 7. cache-busting 20261008-1 nas páginas de mão + no exportador.
const paginas = [
  "../index.html", "../anunciar.html", "../como-funciona.html", "../termos.html",
  "../privacidade.html", "../explorar/index.html", "../favoritos/index.html",
  "../produto/index.html",
];
paginas.forEach(function (p) {
  const html = fs.readFileSync(path.join(__dirname, p), "utf8");
  assert(/v=20261008-1/.test(html), "7. ?v=20261008-1 em " + p);
});
const exporter = fs.readFileSync(
  path.join(__dirname, "..", "..", "projeto_telegram", "scripts", "export_catalogo_web.py"),
  "utf8"
);
assert(
  /CSS_VERSION = "20261008-1"/.test(exporter),
  "7. CSS_VERSION do exportador em 20261008-1"
);

// 8. minificados regenerados JUNTOS com as fontes (prod-note também no min.js).
assert(
  /prod-note/.test(jsMin),
  "8. bloco .prod-note presente no vdv.min.js"
);

console.log("condicao_63: OK (nota de condição do ramo de saldos — VDV-20261006-01)");
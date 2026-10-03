/* Fatia 49 (VDV-20261003-05, mestre §13/§23):
 *   1. termos rápidos "Popular agora" — derivados do catálogo real no app.js
 *      (nada de popularidade inventada);
 *   2. bloco editorial "Conheça esta vitrine" com rodízio diário igualitário
 *      (regra real de destaque; inline no app.js — fair_rotation.js saiu).
 * Node puro (read + assert, sem framework). Rodar: node tests/atalhos_49.test.js */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const js = fs.readFileSync(path.join(root, "assets", "js", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "assets", "css", "vdv.css"), "utf8");

// 1. HTML: contêiner dos termos rápidos após a busca; seção de destaque.
assert(/id="quick-terms"/.test(html), "1. contêiner quick-terms na Home");
assert(
  html.indexOf('id="quick-terms"') > html.indexOf("searchbar") &&
    html.indexOf('id="quick-terms"') < html.indexOf('id="section-novidades"'),
  "1a. termos rápidos posicionados entre busca e primeira prateleira"
);
assert(/id="section-destaque"/.test(html), "2. seção editorial na Home");
assert(
  html.indexOf('id="section-destaque"') > html.indexOf('id="section-explorar"') &&
    html.indexOf('id="section-destaque"') < html.indexOf('id="section-vitrines"'),
  "2a. destaque entre 'Para você explorar' e chips de vitrines"
);

// 2. app.js: termos derivados do catálogo (filtro >= 2, exclui "outro").
assert(/Popular agora:/.test(js), "2b. label do bloco no app.js");
assert(/n >= 2/.test(js) && /c\.slug !== "outro"/.test(js),
  "2c. termos só com volume real >= 2, sem sub genérica");
assert(/pickDestaqueDiario/.test(js), "2d. rodízio diário presente");
assert(/1664525/.test(js), "2e. rng determinístico por dia (LCG)");
assert(/Ver vitrine completa/.test(js), "2f. CTA textual do bloco editorial");
assert(/fornecedor\/"\s*\+\s*encodeURIComponent/.test(js),
  "2g. destaque linka a página de fornecedor real");

// 3. CSS: estilos dos dois blocos.
assert(/\.qt-term\s*\{/.test(css), "3. estilo do atalho");
assert(/\.vitrine-destaque\s*\{/.test(css), "3a. estilo do bloco editorial");
assert(/\[hidden\]\s*\{\s*display:\s*none/.test(css) ||
  css.indexOf(".quick-terms[hidden]") !== -1, "3b. hidden respeitado");

// 4. fair_rotation.js não vira peso morto: arquivo e teste saíram.
assert(!fs.existsSync(path.join(root, "assets", "js", "fair_rotation.js")),
  "4. fair_rotation.js removido do repo");
assert(!fs.existsSync(path.join(root, "tests", "fair_rotation.test.js")),
  "4a. teste da lib removido junto");

// 5. Se o catálogo não sustenta, nada aparece: os blocos nascem hidden
//    (invariante "nunca botão/section que não faz nada").
assert(/id="section-destaque" hidden/.test(html) &&
  /id="quick-terms"[^>]*hidden/.test(html),
  "5. blocos editoriais iniciais ocultos (só JS revela)");

console.log("atalhos_49: todos os testes passaram ✔");
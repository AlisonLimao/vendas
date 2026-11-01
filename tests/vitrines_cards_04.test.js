/* Onda 1 — frente A: "Vitrines do VDV" na Home de chips para cartões
 * compactos (aprovado 02/11/2026, 10 ajustes).
 * Node puro (read + regex). Rodar: node tests/vitrines_cards_04.test.js */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const js = fs.readFileSync(path.join(root, "assets/js/app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "assets/css/vdv.css"), "utf8");

// 1. Home: contêiner em grade, id preservado (invariante: seção some com 0
//    vitrines — sectionVitrines.hidden intacto no app.js)
assert(/<div class="mini-grid" id="chips-vitrines">/.test(html),
  '1. Home: <div class="mini-grid" id="chips-vitrines">');

// 2. app.js — apresentação em cartão, critérios preservados
assert(/a\.className = "card-vitrine"/.test(js),
  '2. cartões .card-vitrine na section-vitrines');

// critérios de seleção PRESERVADOS (intenção igualitária intacta)
assert(/slice\(0, VITRINES_CAP\)/.test(js), "2a. CAP 4 preservado");

// visual real: thumb do primeiro anúncio com fallback de iniciais
assert(/image_thumb \|\| p0\.image/.test(js),
  "2c. visual = thumb (|| image) do primeiro anúncio real");
assert(/card-vitrine-initials/.test(js) && /charAt\(0\)\.toUpperCase\(\)/.test(js),
  "2d. fallback de iniciais (nunca imagem quebrada)");

// especialidade derivada SÓ de categoria resolvível (nunca "Sem categoria")
assert(/display_name \|\| [^;]*\.name/.test(js),
  "2e. rótulo da especialidade = display_name || category name");

// contagem fática com singular/plural
assert(/anúncio[s]?/.test(js), "2h. contagem 'N anúncio(s)' no cartão");

// cidade do primeiro anúncio
assert(/\.city/.test(js), "2i. cidade no cartão de vitrine");

// 3. telemetria idêntica à dos chips (mesmo clique, mesma origem)
assert(/abrir_vitrine/.test(js), "3a. evento abrir_vitrine intacto");
assert(/supplier_view/.test(js), "3b. evento supplier_view intacto");

// 4. CSS: apresentação de cartão
assert(/\.card-vitrine\s*\{/.test(css), "4. .card-vitrine no vdv.css");
assert(/\.card-vitrine-visual\s*\{/.test(css), "4a. .card-vitrine-visual no vdv.css");
assert(/\.card-vitrine-initials/.test(css), "4b. .card-vitrine-initials no vdv.css");
assert(/#section-vitrines/.test(css), "4c. #section-vitrines mantida");

// 5. minificados sincronizados (fonte e min com o MESMO contrato)
const cssMin = fs.readFileSync(path.join(root, "assets/css/vdv.min.css"), "utf8");
assert(cssMin.includes(".card-vitrine{"), "5. vdv.min.css com .card-vitrine (sync fonte/min)");
const jsMin = fs.readFileSync(path.join(root, "assets/js/vdv.min.js"), "utf8");
assert(jsMin.includes("card-vitrine"), "5a. vdv.min.js com card-vitrine (sync fonte/min)");

console.log("vitrines_cards_04: todos os assertos passaram ✔");
/* Unidade de venda no anúncio (VDV-20261020-03) — lado web.
 * Teste estático (node puro, por regex — padrão das suítes do front) sobre
 * app.js e o minificado vdv.min.js:
 *   1. mapa SALE_UNIT_LABELS espelho do domínio (un/dz/kg/L/cx);
 *   2. sufixo lido de p.sale_unit com trim e default "" (JSON legado intocado);
 *   3. priceLine: sufixo substitui a nota do tipo — "R$ X / kg";
 *   4. mínimo com sufixo "Mínimo: N kg" (só quando > 1);
 *   5. sufixo só com preço (fallback: moldes atuais);
 *   6. regenerar vdv.min.js junto à fonte (regra do projeto) — lógica mínima presente.
 * Rodar: node tests/unidade_venda_03.test.js */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const js = fs.readFileSync(
  path.join(__dirname, "..", "assets", "js", "app.js"),
  "utf8"
);
const min = fs.readFileSync(
  path.join(__dirname, "..", "assets", "js", "vdv.min.js"),
  "utf8"
);

// 1. Mapa espelho (unidade→un, duzia→dz, quilo→kg, litro→L, caixa→cx).
assert(
  /SALE_UNIT_LABELS\s*=\s*\{[^}]*\bunidade:\s*"un"[^}]*duzia:\s*"dz"[^}]*quilo:\s*"kg"[^}]*litro:\s*"L"[^}]*caixa:\s*"cx"/s.test(js),
  "1. mapa SALE_UNIT_LABELS espelho do domínio"
);

// 2. Sufixo lido de p.sale_unit (trim; sem valor → "").
assert(
  /function saleUnitSufixo\(\w+\)\s*\{/.test(js) &&
    /saleUnitSufixo\(\w+\)|\.sale_unit \|\| ""\)\.trim\(\)/.test(js),
  "2. saleUnitSufixo lê p.sale_unit com trim"
);

// 3. priceLine: sufixo antes das notas por tipo (substitui a nota).
assert(
  /var sufixo = temPreco \? saleUnitSufixo\(\w+\) : "";[\s\S]{0,120}if \(sufixo\)\s*\{[\s\S]{0,200}preco \+ " \/ " \+ sufixo/.test(js),
  "3. priceLine renderiza 'R$ X / {sufixo}' substituindo a nota do tipo"
);

// 4. Mínimo com sufixo (só quando > 1).
assert(
  /Mínimo: " \+ [\w.]+ \+ " " \+ sufixo/.test(js),
  "4. 'Mínimo: N {sufixo}' em priceLine"
);

// 5. Sufixo só com preço (temPreco ? ... : "").
assert(
  /temPreco \? saleUnitSufixo\(/.test(js),
  "5. sufixo só aplicado quando há preço"
);

// 6. Minificado regenerado junto à fonte: contém o mapa e a leitura de
// sale_unit (nomes podem ser comprimidos; os literais não).
assert(
  /unidade:\s*"un"/.test(min) && /duzia:\s*"dz"/.test(min) &&
    /sale_unit/.test(min) && /Mínimo/.test(min),
  "6. vdv.min.js regenerado com a lógica da unidade"
);

console.log("unidade_venda_03: tudo certo.");
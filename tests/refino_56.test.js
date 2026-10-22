/* Fatia 56 (plano 17, mestre §13/§24/§26/§27/§46-§47/§65-§66) — VDV-20261021-02:
 * a COMPOSIÇÃO comercial da descoberta migrou para o EXPORTADOR (build_bands,
 * plano 64/T3 — ordem do banco + rodízio entre anunciantes por hora). O front
 * é renderer burro. Este teste cobre o que sobreviveu no lado JS:
 *   - pickExplorar/alternarFornecedoresDoBucket/pickNovidades EXTINTOS
 *     (feeds mistos saíram da home — bandas empilhadas herdam o lugar);
 *   - exclusões da home (novidades/dedupe contra destaque) extintas — o
 *     destaque NÃO corta banda (decisão 8 da espec 63, produto em ambos);
 *   - LCG do destaque diário continua FUNCIONAL e estável no dia (§27,
 *     executado em sandbox contra pool sintético);
 *   - renderer das bandas: nada de seleção própria — consome catalog.bands
 *     (rodízio/ordem provados na suíte Python do plano 64).
 * Node puro. Rodar: node tests/refino_56.test.js */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const js = fs.readFileSync(path.join(root, "assets", "js", "app.js"), "utf8");
// O exportador mora no projeto IRMÃO — fora do layout local (clone limpo,
// migração de host), o caminho padrão não existe: VDV_EXPORTER_SRC aponta.
// (Revisão VDV-20261021-02, Important 1.)
const exporterPath = process.env.VDV_EXPORTER_SRC ||
  path.join(root, "..", "projeto_telegram", "scripts", "export_catalogo_web.py");
let exporter;
try {
  exporter = fs.readFileSync(exporterPath, "utf8");
} catch (e) {
  throw new Error(
    "exportador não encontrado em " + exporterPath +
    " — defina VDV_EXPORTER_SRC com o caminho de scripts/export_catalogo_web.py"
  );
}

// --- 1. seleção própria extinta do front -----------------------------------
["pickExplorar", "alternarFornecedoresDoBucket", "pickNovidades", "lcgRng"]
  .forEach(function (fn) {
    assert(!js.includes("function " + fn), "1. " + fn + " extinto do front (composição é do exportador)");
  });

// --- 2. renderer burro das bandas: consome catalog.bands, sem exclusão ---
assert(/function renderBandas\(cat\)/.test(js), "2. renderBandas definido (renderer burro)");
assert(/renderBandas\(catalog\)/.test(js), "2a. initHome chama renderBandas(catalog)");
assert(!/usadosNoDestaque|recentesIds|excluidos/.test(js),
  "2b. nenhuma exclusão de feed — destaque NÃO corta banda (decisão 8)");

// --- 3. composição/rodízio moram no exportador (plano 64, T3) ----------------
assert(/def build_bands\(/.test(exporter), "3. exportador: build_bands define as bandas");
assert(/rotation = int\(now\.strftime\("%Y%m%d%H"\)\) % max\(1, len\(anunciantes\)\)/.test(exporter),
  "3a. rodízio entre anunciantes por hora no exportador");
assert(/group_order/.test(exporter), "3b. ordem fixa dos grupos vem do banco (fetch_group_order)");

// --- 4. §27: LCG do destaque diário intocado — FUNCIONAL em sandbox ---------
function extrair(nomeFn, proximaMarc) {
  const ini = js.indexOf(nomeFn);
  assert(ini !== -1, "função " + nomeFn + " definida no app.js");
  const fim = js.indexOf(proximaMarc, ini);
  assert(fim !== -1, "fim da função " + nomeFn);
  return js.slice(ini, fim);
}
const pickDestaqueSrc = extrair("function pickDestaqueDiario", "  // Fatia 50 (VDV-20261003-06");
const dailySeedSrc = extrair("function dailySeed", "  function pickDestaqueDiario");
const destaqueFn = new Function("dailySeed", pickDestaqueSrc + "\nreturn pickDestaqueDiario;");
const pickDestaque = destaqueFn(new Function(dailySeedSrc + "\nreturn dailySeed;"));
const cat = { products: [
  { supplier_slug: "a", seller_name: "A", image: "i", image_thumb: "t1" },
  { supplier_slug: "a", seller_name: "A", image: "i", image_thumb: "t2" },
  { supplier_slug: "b", seller_name: "B", image: "i", image_thumb: "t3" }
] };
const d1 = pickDestaque(cat.products);
const d2 = pickDestaque(cat.products);
assert(d1 && d1.slug === d2.slug && d1.imgs.length >= 1 && d1.imgs.length <= 3,
  "4. rodízio diário estável e thumbs reais (qualquer fornecedor, cap 3)");
assert(/1664525/.test(js), "4a. LCG (Numerical Recipes) preservado no destaque");

console.log("refino_56: OK (composição no exportador, LCG funcional, renderer burro — VDV-20261021-02)");
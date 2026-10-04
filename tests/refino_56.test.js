/* Fatia 56 (plano 17, mestre §13/§24/§26/§27/§46-§47/§65-§66): composição
 * comercial do exploração — TESTE FUNCIONAL real: extrai as funções de
 * seleção do app.js (pickExplorar + alternarFornecedoresDoBucket) e executa
 * contra pools sintéticos, garantindo:
 *   - nenhum produto duplicado na mesma composição (§77);
 *   - a seção nunca fica vazia quando o pool tem itens (§65);
 *   - fornecedor não domina grupo final quando há alternativas (§71);
 *   - sem novidades/dedupe contra o destaque (§46/§47 — por ID real);
 *   - bucket com 1 fornecedor só / < 3 itens = fallback ordem original;
 *   - determinismo: mesmas entradas → mesmas saídas (§61);
 *   - LCG do destaque diário continua funcionando (§27).
 * Node puro. Rodar: node tests/refino_56.test.js */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const js = fs.readFileSync(path.join(root, "assets", "js", "app.js"), "utf8");

// --- extrai as funções de seleção do app.js e executa-as em sandbox -------
function extrair(nomeFn, proximaMarc) {
  const ini = js.indexOf(nomeFn);
  assert(ini !== -1, "função " + nomeFn + " definida no app.js");
  const fim = proximaMarc !== null
    ? js.indexOf(proximaMarc, ini)
    : js.indexOf("\n  }\n", ini);
  assert(fim !== -1, "fim da função " + nomeFn);
  const corpo = js.slice(ini, fim); // declaração (e aninhados) completos
  return corpo;
}

const pickCorpo = extrair("function alternarFornecedoresDoBucket", "  // Fatia 49 (mestre §23)");
const pickExplorarSrc = extrair("function pickExplorar", "  // Fatia 49 (mestre §23)");
const pickDestaqueSrc = extrair("function pickDestaqueDiario", "  // Fatia 50 (VDV-20261003-06");
const dailySeedSrc = extrair("function dailySeed", "  function pickDestaqueDiario");

const ctxFn = new Function(
  "alternarFornecedoresDoBucket",
  "dailySeed",
  pickExplorarSrc + "\nreturn pickExplorar;"
);
const pickExplorar = ctxFn(
  new Function("bucket", pickCorpo + "\nreturn alternarFornecedoresDoBucket(bucket);"),
  new Function(dailySeedSrc + "\nreturn dailySeed;")
);

function mk(id, cat, sub, sup, thumb) {
  return {
    id: id,
    category: { slug: sub, name: sub, group: { slug: cat, name: cat } },
    supplier_slug: sup,
    image_thumb: thumb || null
  };
}

// 1. §13/§24: bucket com vário fornecedores ALTERNA — 4 primeiros nunca têm
//    3+ do mesmo anunciante; produtos não se repetem; teto respeitado.
const pool1 = [
  mk("a1", "moda", "vestido", "loja-x"),
  mk("a2", "moda", "vestido", "loja-x"),
  mk("a3", "moda", "vestido", "loja-x"),
  mk("a4", "moda", "vestido", "loja-y"),
  mk("a5", "moda", "vestido", "loja-y"),
  mk("a6", "moda", "vestido", "loja-z")
];
const mix = pickExplorar(pool1, {}, 4);
assert(mix.length === 4, "1. composição de 4 no teto");
assert(new Set(mix.map(function (p) { return p.id; })).size === 4,
  "1a. nenhum produto duplicado");
const primeiros3 = mix.slice(0, 3).filter(function (p) { return p.supplier_slug === "loja-x"; }).length;
assert(primeiros3 <= 2, "1b. fornecedor não empilha 3 no primeiro grupo (alternância)");

// 2. §65: seção NUNCA fica vazia — exclusão total excepto 1 item devolve-o.
const umSo = pickExplorar([{ id: "unico", category: null, supplier_slug: "" }], {}, 4);
assert(umSo.length === 1, "2. pool esvaziado ainda renderiza (nunca vazio)");

// 3. §65/§66: bucket de fornecedor único fica como veio (fallback honesto).
const umFornecedor = pickExplorar([
  mk("b1", "fio", "lã", "única"),
  mk("b2", "fio", "lã", "única")
], {}, 8);
assert(umFornecedor.length === 2 && umFornecedor[0].id === "b1" && umFornecedor[1].id === "b2",
  "3. 1 fornecedor só = ordem original preservada");

// 4. §46/§47: produto exibido nos thumbs do destaque NÃO entra no explorar
//    (dedupe por ID real, não por nome).
const pool2 = [
  mk("d1", "moda", "top", "loja-x", "assets/p/d1.webp"),
  mk("d2", "moda", "blusa", "loja-y", "assets/p/d2.webp")
];
const expl2 = pickExplorar(pool2, { d1: true }, 8);
assert(expl2.length === 1 && expl2[0].id === "d2",
  "4. exibido no destaque sai do grid seguinte (ID real)");

// 5. §61: determinismo — mesmas entradas → mesma saída (sem refresh aleatório).
assert(JSON.stringify(pickExplorar(pool1, {}, 4)) === JSON.stringify(mix),
  "5. composição estável para entradas iguais");

// 6. §27: LCG do destaque diário intocado — funciona e é estável no dia.
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
  "6. rodízio diário estável e thumbs reais (qualquer fornecedor, cap 3)");

// 7. assinaturas estruturais da fatia no app.js.
assert(/buckets\.forEach\(function \(bucket\) \{[\s\S]{0,200}alternarFornecedoresDoBucket\(bucket\);/.test(js),
  "7. buckets reordenados antes do round-robin de categoria");
assert(/var excluidos = Object\.assign\(\{\}, recentesIds, usadosNoDestaque\);/.test(js),
  "7a. exclusão junta novidades + destaque");
assert(/doseDestaque.length <= corte/.test(js),
  "7b. vizinhança: troca só com espaço garantido no prefixo");

console.log("refino_56: todos os testes passaram ✔ (composição funcional, LCG intacto)");
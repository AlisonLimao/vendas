/* VDV-20260907-09 — testes do rodízio igualitário por anunciante.
 * Node puro (require + assert, sem framework). Rodar: node tests/fair_rotation.test.js */
"use strict";

const assert = require("assert");
const { supplierKey, createRotation } = require("../assets/js/fair_rotation.js");

// LCG determinístico — mesmo seed, mesma sequência (teste repetível).
function lcg(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function productsFor(sizes) {
  // sizes: [ {seller: "A", n: 3}, ... ] — supplier_slug preenchido.
  const out = [];
  sizes.forEach(function (s) {
    for (let i = 0; i < s.n; i++) {
      out.push({
        id: s.seller.toLowerCase() + "-" + i,
        title: s.seller + " " + i,
        supplier_slug: s.seller.toLowerCase(),
        seller_name: s.seller,
      });
    }
  });
  return out;
}

// 1. Igualdade por ciclo: em N ticks (N = nº de anunciantes), cada um 1×.
{
  const products = productsFor([
    { seller: "Sarah", n: 10 },
    { seller: "Daguel", n: 2 },
    { seller: "Ana", n: 1 },
  ]);
  const rot = createRotation(products, lcg(42));
  const cycle = [];
  for (let i = 0; i < 3; i++) cycle.push(supplierKey(rot.next()));
  assert.deepStrictEqual(cycle.sort(), ["ana", "daguel", "sarah"], "ciclo tem cada anunciante 1×");
  console.log("ok 1 — ciclo de N ticks contém cada anunciante exatamente 1×");
}

// 2. Run longo: contagem por anunciante difere de perfeita por no máximo 1.
{
  const products = productsFor([
    { seller: "Sarah", n: 10 },
    { seller: "Daguel", n: 2 },
    { seller: "Ana", n: 1 },
    { seller: "Betinho", n: 5 },
  ]);
  const rot = createRotation(products, lcg(7));
  const counts = {};
  for (let i = 0; i < 1000; i++) {
    const k = supplierKey(rot.next());
    counts[k] = (counts[k] || 0) + 1;
  }
  const expected = 1000 / 4;
  for (const k of Object.keys(counts)) {
    assert.ok(Math.abs(counts[k] - expected) <= 1, `${k}: ${counts[k]} vs ${expected}`);
  }
  console.log("ok 2 — 1000 ticks: dose por anunciante com desvio ≤ 1");
}

// 3. Fallback sem supplier_slug (JSON antigo) não quebra.
{
  const rot = createRotation(
    [
      { id: "x1", title: "X1", seller_name: "Sem Slug" },
      { id: "y1", title: "Y1", seller_name: "Outro" },
    ],
    lcg(1)
  );
  const seen = [supplierKey(rot.next()), supplierKey(rot.next())];
  assert.deepStrictEqual(seen.sort(), ["Outro", "Sem Slug"]);
  console.log("ok 3 — fallback seller_name quando não há supplier_slug");
}

// 4. Cursor: o catálogo do anunciante gira inteiro — todos os produtos
// aparecem em um run longo (o reembaralhamento ao completar o ciclo dele
// pode reapresentar um recém-visto, mas nada fica sem vez).
{
  const products = productsFor([{ seller: "Sarah", n: 10 }]);
  const rot = createRotation(products, lcg(99));
  const seen = new Set();
  for (let i = 0; i < 100; i++) seen.add(rot.next().id);
  assert.strictEqual(seen.size, 10, "todos os 10 produtos aparecem no run");
  console.log("ok 4 — catálogo do anunciante gira inteiro (run longo)");
}

console.log("fair_rotation: todos os testes passaram ✔");
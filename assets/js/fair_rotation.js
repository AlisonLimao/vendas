/* VDV-20260907-09 — rodízio igualitário por anunciante.
 * Fila por turnos (round-robin de anunciantes): cada anunciante tem a MESMA
 * dose de vitrine por ciclo, independente do tamanho do catálogo — quem tem
 * 1 produto aparece na mesma frequência que quem tem 10. Ordem dos anunciantes
 * e ponto de partida dos produtos são sorteados a cada visita (rng injetável
 * para teste determinístico). Lógica pura, sem DOM, sem rede, sem backend.
 *
 * Browser: window.VDVFairRotation. Node (teste): module.exports. */
(function (global) {
  "use strict";

  function supplierKey(p) {
    // Fatia 27 garantiu supplier_slug; fallback protege JSON antigo.
    return p.supplier_slug || p.seller_name || p.id;
  }

  // Fisher-Yates com rng injetável (cópia — nunca muta a entrada).
  function shuffled(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function groupBySupplier(products) {
    var by = {};
    products.forEach(function (p) {
      var k = supplierKey(p);
      (by[k] = by[k] || []).push(p);
    });
    return by;
  }

  /* createRotation(products, rng) -> { next() }.
   * A cada chamada de next(), o anunciante da vez cede 1 produto (cursor
   * próprio, início sorteado). Em N chamadas (N = nº de anunciantes), cada
   * anunciante aparece exatamente 1 vez — igualdade por ciclo. Ao terminar
   * o próprio catálogo, a ordem interna dele é reembaralhada. */
  function createRotation(products, rng) {
    rng = rng || Math.random;
    var bySupplier = groupBySupplier(products);
    var keys = shuffled(Object.keys(bySupplier), rng);
    var cursor = {};
    keys.forEach(function (k) {
      cursor[k] = Math.floor(rng() * bySupplier[k].length);
    });
    var turn = 0;
    return {
      next: function () {
        var k = keys[turn % keys.length];
        turn += 1;
        var list = bySupplier[k];
        var i = cursor[k] % list.length;
        cursor[k] = i + 1;
        if (cursor[k] >= list.length && list.length > 1) {
          cursor[k] = 0;
          bySupplier[k] = shuffled(list, rng); // reembaralha ao completar o ciclo dele
        } else if (cursor[k] >= list.length) {
          cursor[k] = 0;
        }
        return list[i];
      }
    };
  }

  var api = { supplierKey: supplierKey, shuffled: shuffled, createRotation: createRotation };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.VDVFairRotation = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
/* R6 (VDV-20260923-01, mestre itens 19-20) — página de produto: ordem de
 * decisão + sticky PREÇO + WHATSAPP no mobile.
 * Teste estático (node puro, por regex — padrão das suítes do front) sobre
 * app.js, produto/index.html e vdv.css:
 *   1. ordem de decisão no innerHTML do initProduto: galeria → título →
 *      preço → disponibilidade (prod-disp) → seller-card → contato →
 *      descrição → condições (prod-cond);
 *   2. pedido mínimo nas CONDIÇÕES (depois da descrição), não junto do preço;
 *   3. sticky PREÇO + WHATSAPP: container na shell interativa, preenchido
 *      pelo app.js com o canal autorizado (WhatsApp do anunciante/dono
 *      assistido; fallback deep link "Falar com o vendedor");
 *   4. sticky zero-JS também nas páginas estáticas (template do exportador
 *      — validado pela suíte Python; aqui só o contrato de classes);
 *   5. mobile-only: display none no desktop, fixed + safe-area-inset-bottom,
 *      main com padding para a barra não cobrir conteúdo.
 * Rodar: node tests/produto.test.js */
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
const shell = fs.readFileSync(
  path.join(__dirname, "..", "produto", "index.html"),
  "utf8"
);

// Extrai o innerHTML do initProduto (bloco entre 'main.innerHTML =' e o
// final do template, marcado pelo prod-report) para testar a ORDEM.
const m = js.match(/main\.innerHTML =\s*([\s\S]*?)'<p class="prod-report">/);
assert(m, "bloco main.innerHTML do initProduto encontrado");
const tpl = m[1];

// 1. Ordem de decisão (mestre item 19).
const ordem = [
  ["prod-gallery", /prod-gallery/],
  ["prod-title", /prod-title/],
  ["prod-price", /prod-price/],
  ["prod-disp", /prod-facts prod-disp/],
  ["seller-card", /sellerCardHtml/],
  ["contact-channels", /contact-channels/],
  ["prod-desc", /prod-desc/],
  ["prod-cond", /prod-facts prod-cond/],
];
const idx = ordem.map(function (par) {
  const r = tpl.search(par[1]);
  assert(r >= 0, "1. marcador presente no template: " + par[0]);
  return r;
});
assert(
  idx.every(function (v, i) { return i === 0 || v >= idx[i - 1]; }),
  "1. ordem de decisão: galeria→título→preço→disp→vendedor→contato→descrição→condições"
);

// 2. Pedido mínimo nas condições (moLi entra no bloco prod-cond).
assert(
  /prod-facts prod-cond[\s\S]{0,120}moLi/.test(tpl) &&
    !/prod-facts prod-disp[\s\S]{0,200}moLi/.test(tpl),
  "2. pedido mínimo no bloco de condições"
);

// 3. Sticky PREÇO + WHATSAPP (container na shell + preenchimento no JS).
assert(
  /id="prod-sticky"[^>]*hidden/.test(shell) &&
    /class="prod-sticky"/.test(shell),
  "3. container do sticky na shell interativa"
);
assert(
  /var stickyEl = \$\("prod-sticky"\);/.test(js) &&
    /sticky-price/.test(js) &&
    /cc\.tipo === "whatsapp"/.test(js) &&
    /product\.whatsapp && product\.whatsapp\.link/.test(js),
  "3. app.js preenche o sticky com o canal autorizado"
);
assert(
  /deepLink\("interesse", product\)/.test(js) &&
    /Falar com o vendedor/.test(js),
  "3. fallback do sticky: deep link do bot"
);
assert(/stickyEl\.hidden = false;/.test(js), "3. sticky revelado após preencher");

// 4. Contrato de classes usado pelo template estático (zero-JS) do
//    exportador — as duas superfícies compartilham o mesmo CSS.
assert(
  js.includes('btn-channel wa sticky-cta') && js.includes('btn-channel tg sticky-cta'),
  "4. classes sticky-cta alinhadas ao template estático"
);

// 5. Mobile-only: desktop esconde; mobile fixed com safe-area e padding no
//    main (a barra não cobre conteúdo).
assert(
  /\.prod-sticky\s*\{\s*display:\s*none;\s*\}/.test(css),
  "5. sticky escondida fora do mobile"
);
assert(
  /@media \(max-width: 767px\)\s*\{[\s\S]*?\.prod-sticky\s*\{[\s\S]*?position:\s*fixed[\s\S]*?safe-area-inset-bottom/.test(css),
  "5. sticky fixed no mobile com safe-area-inset-bottom"
);
assert(
  /body\[data-page="produto"\] main\s*\{[\s\S]*?padding-bottom:\s*calc\(\s*4\.4rem \+ env\(safe-area-inset-bottom/.test(css),
  "5. main com padding-bottom no mobile"
);

console.log("produto: OK (ordem de decisão + sticky PREÇO+WHATSAPP — VDV-20260923-01 R6)");
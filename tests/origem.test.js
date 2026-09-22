/* VDV-20260921-01 (Bloco 3) — atribuição de compartilhamento no front.
 * Teste estático (node puro, por regex — padrão das suítes do front) sobre
 * app.js:
 *   1. allowlist fechada de origens (``?o=``): whatsapp/facebook/google/
 *      seller_share/compartilhamento — valor fora da lista = "web";
 *   2. a origem vem da URL, é persistida na sessão (sessionStorage
 *      ``vdv:origem`` — escopo de aba) e o default é "web";
 *   3. telemetria() e sinal() enviam ``origin: vdvOrigem`` (o servidor só
 *      aceita valores da allowlist espelhada — migração 0026);
 *   4. wa.me explícito compartilha a URL com ``?o=whatsapp``; o share
 *      nativo do sistema (alvo à escolha da pessoa) usa
 *      ``?o=compartilhamento`` — sem alegar canal que não se sabe;
 *   5. o canal de CONTATO não é reusado como origem (``channel`` só
 *      aparece nas refs de contact_click);
 *   6. a origem nunca vira identificador (sem sid/hash novo — a origem é
 *      um valor fechado, não um dado de pessoa).
 * Rodar: node tests/origem.test.js */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const js = fs.readFileSync(
  path.join(__dirname, "..", "assets", "js", "app.js"),
  "utf8"
);

// 1. Allowlist fechada de ``?o=``.
assert(js.includes("var ORIGEM_PARAMS"), "1. ORIGEM_PARAMS declarado");
for (const chave of [
  "whatsapp: \"compartilhamento_whatsapp\"",
  "facebook: \"compartilhamento_facebook\"",
  "google: \"compartilhamento_google\"",
  "seller_share: \"seller_share\"",
  "compartilhamento: \"compartilhamento\""
]) {
  assert(js.includes(chave), `1. origem mapeada: ${chave}`);
}

// 2. Leitura de ``?o=`` + persistência na sessão + default "web".
const blocoOrigem = js.slice(js.indexOf("var ORIGEM_PARAMS"), js.indexOf("function telemetria"));
assert(
  /searchParams\.get\("o"\)/.test(blocoOrigem),
  "2. lê o parâmetro ``o`` da URL compartilhada"
);
assert(
  blocoOrigem.includes('sessionStorage.setItem("vdv:origem",'),
  "2. origem preservada na sessão (vdv:origem)"
);
assert(
  blocoOrigem.includes('sessionStorage.getItem("vdv:origem")'),
  "2. origem restaurada da sessão na navegação"
);
assert(/return "web";/.test(blocoOrigem), "2. valor fora da lista / ausente = web");
assert(
  !/localStorage/.test(blocoOrigem),
  "2. origem em sessionStorage (aba), nunca localStorage persistente"
);

// 3. As duas streams usam a origem da sessão.
assert(
  js.includes("var payload = { type: tipo, sid: vdvSid, origin: vdvOrigem };"),
  "3. telemetria() envia origin: vdvOrigem"
);
assert(
  js.includes("var payload = { type: tipo, origin: vdvOrigem };"),
  "3. sinal() envia origin: vdvOrigem"
);
assert(
  !/origin: "web"/.test(js),
  "3. sem origin hardcoded em web (a origem vem da sessão)"
);

// 4. Compartilhamento rastreável: wa.me = whatsapp; share nativo = compartilhamento.
const blocoShareUrl = js.slice(js.indexOf("function shareUrl"), js.indexOf("function fmtPriceText"));
assert(
  /function shareUrl\(product, origem\)/.test(js),
  "4. shareUrl aceita a origem"
);
assert(
  /url\.searchParams\.set\("o", origem\)/.test(blocoShareUrl),
  "4. shareUrl monta ``?o=`` na URL"
);
assert(
  /shareUrl\(product, "whatsapp"\)/.test(js),
  "4. wa.me compartilha a URL com ?o=whatsapp"
);
assert(
  /shareUrl\(product, "compartilhamento"\)/.test(js),
  "4. share nativo usa ?o=compartilhamento (alvo desconhecido)"
);

// 5. ``channel`` continua exclusivo do contato comercial (não virou origem).
assert(
  (js.match(/refs\.channel/g) || []).length >= 2,
  "5. channel segue nas refs de contact_click (telemetria + sinal)"
);

// 6. A origem não introduz identificador novo (sem novo sid/hash).
assert(
  !/vdv:origem.*sha256|origem.*visitor/.test(js),
  "6. origem é valor fechado, nunca identificador"
);

console.log("origem.test.js: 6 invariantes OK (atribuição de compartilhamento — Bloco 3)");
/* Fatia 52 (plano 16, mestre §12-§19): card vira peça editorial — sem caixa,
 * hierarquia IMAGEM → PREÇO → NOME → FORNECEDOR, 1 sinal forte de
 * disponibilidade por card, "Ver detalhes" fora do card.
 * Node puro (read + regex). Rodar: node tests/refino_52.test.js */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const js = fs.readFileSync(path.join(root, "assets", "js", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "assets", "css", "vdv.css"), "utf8");

// 1. §15: preço no topo do corpo (fonte na ordem do §15) — região entre a
//    montagem do cardEl: card-price antes de card-title e de card-seller.
const cardIdx = js.indexOf("function cardEl(");
assert(cardIdx > 0, "1. cardEl definido");
const card = js.slice(cardIdx, cardIdx + 2600);
assert(card.indexOf("card-price") < card.indexOf("card-title"),
  "1. preço antes do título no card");
assert(card.indexOf("card-title") < card.indexOf("card-seller"),
  "1a. título antes do fornecedor");
assert(!card.includes("card-more"), "1b. 'Ver detalhes' fora do card (§12)");
// 1c. Prompt mestre homepage (VDV-20261008-07, Etapa 5) SUPEROU o §49 da
//     Fatia 52: o card voltou a levar fornecedor E cidade quando disponíveis
//     (.card-meta) — sempre DEPOIS do .card-seller, nunca competindo.
assert(card.indexOf("card-meta") > card.indexOf("card-title") &&
    card.indexOf("card-meta") < card.indexOf("card-flags"),
  "1c. card-meta (fornecedor · cidade) entre o título e os sinais (Etapa 5)");

// 2. §18/§19: UM sinal de disponibilidade por card.
assert(/function cardSignal\(/.test(js), "2. cardSignal (1 badge por card)");
assert(/p\.days_since_confirmation == null\) return "";\n\s*var isReady/.test(js) ||
  (card.includes("cardSignal(p)") && !card.includes("availabilityBadge(p) +")),
  "2a. sem triple-badge (availability+sale+fresh)");

// 3. §13: sem caixa — borda e sombra saíram; separação vem de espaço/foto.
assert(/\.card\s*\{[\s\S]{0,200}border:\s*0/.test(css), "3. card sem borda");
assert(/\.card\s*\{[\s\S]{0,200}background:\s*transparent/.test(css), "3a. card sem fundo de caixa");
assert(!/\.card\s*\{[^}]*box-shadow/.test(css), "3b. sombra sumiu do card");
assert(!/\.card:hover\s*\{[^}]*box-shadow/.test(css), "3c. hover sem sombra pesada");

// 4. §16/§17: nome médio (500), fornecedor discreto como assinatura.
assert(/\.card-title\s*\{[^}]*font-weight:\s*500/.test(css), "4. título peso médio");
assert(/\.card-seller\s*\{[^}]*color:\s*var\(--vdv-text-muted\)/.test(css),
  "4a. fornecedor discreto (não compete com preço)");

// 5. §37: preço 18-22px, mais forte que o nome.
assert(/\.card-price\s*\{[^}]*font-size:\s*1\.2rem/.test(css), "5. preço em ~19px");

// 6. skeleton espelha a nova ordem (preço primeiro) — sem CLS no encaixe 1:1.
assert(js.indexOf("sk-line-price") < js.indexOf("sk-line-title"),
  "6. skeleton na mesma ordem do card");

console.log("refino_52: todos os testes passaram ✔");
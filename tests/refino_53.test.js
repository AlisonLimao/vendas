/* Fatia 53 (plano 16, mestre §20/§22/§37-§40): tipografia, respiro,
 * assinatura de seção e ambientação sutil.
 * Node puro (read + regex). Rodar: node tests/refino_53.test.js */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "assets", "css", "vdv.css"), "utf8");

// 1. §37: escala — h2 de seção 20-24px; h1 hero 28-32px (51) / desktop 32-40px.
assert(/h2\s*\{[^}]*font-size:\s*1\.35rem/.test(css), "1. h2 de seção ~21px");
assert(/@media \(min-width: 720px\)[\s\S]{0,300}\.hero-copy h1 \{ font-size: 2\.1rem/.test(css),
  "1a. hero desktop ~34px");

// 2. §20: respiro 56-72px mobile / 72-96px desktop entre seções.
assert(/main > section\s*\{\s*margin-top:\s*3\.5rem/.test(css), "2. seções a 56px mobile");
assert(/@media \(min-width: 720px\)\s*\{\s*main > section\s*\{\s*margin-top:\s*4\.5rem/.test(css),
  "2a. seções a 72px desktop");
assert(/h2\s*\{[^}]*margin:\s*0 0 1\.25rem/.test(css), "2b. título→conteúdo ~20px");

// 3. §39/§40: assinatura recorrente curta (traço ciano) — escopada à Home e
//    só em h2 de section; não é decoração global.
assert(/body\[data-page="home"\] main > section > h2::before/.test(css),
  "3. assinatura dos títulos");
assert(css.split("h2::before").length === 2, "3a. uma só regra de assinatura");

// 4. §22: tinta ciano extremamente pálida apenas na faixa de vitrines.
assert(/#section-vitrines\s*\{[\s\S]{0,200}rgba\(37, 99, 235, \.04\)/.test(css),
  "4. vitrines com tinta quase imperceptível");
assert(!/background:\s*#1e3a8a/.test(css.replace(/--vdv-primary[^;]*;/g, "--vdv-primary")),
  "4a. nenhuma faixa azul forte nova");

// 5. peso coerente: .card-título/fornecedor em 500 (§38 sem bold em tudo).
assert(/\.card-title\s*\{[^}]*font-weight:\s*500/.test(css), "5. 500 no nome");

console.log("refino_53: todos os testes passaram ✔");
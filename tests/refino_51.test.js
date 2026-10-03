/* Fatia 51 (plano 16, mestre §7-§11): primeira dobra recomposta — copy do
 * mestre, CTA de exploração removido (a busca é a porta + o grid responde),
 * busca com presença de "porta principal" e termos rápidos textuais.
 * Node puro (read + regex). Rodar: node tests/refino_51.test.js */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "assets", "css", "vdv.css"), "utf8");

// 1. Copy do mestre §8 no hero.
assert(html.includes("Encontre produtos e oportunidades de Monte Sião e região."),
  "1. título do mestre");
assert(html.includes("Produtos, serviços e ofertas direto de quem está vendendo."),
  "1a. subtexto do mestre");

// 2. §9: CTA "Explorar ofertas" REMOVIDO (busca + grid já exercem a função).
assert(!html.includes("Explorar ofertas"), "2. sem CTA de exploração no hero");
assert(!/hero-actions/.test(html), "2a. hero-actions fora do HTML");
assert(!/hero-strip/.test(html), "2b. sem faixa institucional no hero");
assert(!/data-deep-link="procura"/.test(html.split("searchbar")[0].split("hero")[1] || ""),
  "2c. sem CTA de Procura no hero");

// 3. §10: porta principal — ícone embutido, respiro à esquerda, sem sombra de caixa.
assert(/url\("data:image\/svg\+xml/.test(css), "3. ícone da busca embutido (zero rede)");
assert(/2\.9rem/.test(css), "3a. área do ícone no padding esquerdo");
assert(/\.searchbar input\s*\{[\s\S]{0,400}1rem/.test(css), "3b. altura confortável");
assert(!/\.searchbar input\s*\{[^}]*box-shadow/.test(css), "3c. sem sombra administrativa");

// 4. §11/§24: termos rápidos textuais (borda sumiu; separador entre opções).
assert(/\.qt-term\s*\{[\s\S]{0,80}border:\s*0/.test(css), "4. atalho sem borda");
assert(/\.qt-term \+ \.qt-term::before/.test(css), "4a. separador · entre atalhos");
assert(!/\.qt-term\s*\{[^}]*padding:\s*2px 11px/.test(css), "4b. sem pill antiga");

// 5. hierarquia: h1 maior que antes (≥1.7rem).
assert(/font-size:\s*1\.75rem; line-height: 1\.2/.test(css), "5. h1 do hero em 28px");

console.log("refino_51: todos os testes passaram ✔");
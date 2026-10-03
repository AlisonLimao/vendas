/* Fatia 50 (VDV-20261003-06, mestre §15): sugestões durante a digitação
 * (produtos + categorias) na busca da Home e do /explorar/ — combobox
 * acessível e teclável, client-side sobre o JSON já carregado, sem lib
 * externa. Node puro (read + assert). Rodar: node tests/sugestoes_50.test.js */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const htmlX = fs.readFileSync(path.join(root, "explorar", "index.html"), "utf8");
const js = fs.readFileSync(path.join(root, "assets", "js", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "assets", "css", "vdv.css"), "utf8");

// 1. Markup: listbox aninhada na searchbar + ARIA do combobox, nas 2 páginas.
assert(/id="search-sg"[^>]*role="listbox"/.test(html), "1. listbox na Home");
assert(/id="x-sg"[^>]*role="listbox"/.test(htmlX), "1a. listbox no /explorar/");
assert(/role="combobox"[\s\S]{0,120}aria-controls="search-sg"/.test(html),
  "1b. combobox ARIA da Home aponta para a listbox");
assert(/role="combobox"[\s\S]{0,120}aria-controls="x-sg"/.test(htmlX),
  "1c. combobox ARIA do /explorar/ aponta para a listbox");

// 2. app.js: helper único wired nas duas páginas (nunca lógica duplicada).
assert(/function wireSugestoes\(/.test(js), "2. helper de sugestões");
assert(
  js.split("wireSugestoes(").length >= 3, // 1 declaração + 2 wires
  "2a. wired na Home e no /explorar/"
);
assert(/SG_CAP = 6/.test(js) && /SG_PROD_CAP = 4/.test(js),
  "2b. teto de itens (nunca lista infinita)");
assert(/aria-activedescendant/.test(js) && /ArrowDown/.test(js) &&
       /Escape/.test(js), "2c. navegação por teclado + aria");
assert(/"blur", fechar/.test(js), "2d. lista fecha ao sair do campo");
assert(/c\.slug !== "outro"/.test(js), "2e. sub genérica fora das sugestões");
assert(/fmtPriceText\(s\.p\)/.test(js), "2f. preço no item de produto");

// 3. Navegação por página: Home levanta snapshot antes de sair (retorno
//    preservado, mestre §42); /explorar/ usa o caminho ../produto/.
assert(/saveHomeState\(\)[\s\S]{0,200}produto\/index\.html\?id=/.test(js),
  "3. Home: snapshot de retorno antes de navegar ao produto");
assert(/\.\.\/produto\/index\.html\?id=/.test(js),
  "3a. /explorar/ usa caminho relativo correto");
assert(/gSg\.subs\[s\.slug\]/.test(js) || /gSel\.subs\[s\.slug\]/.test(js),
  "3b. sugestão de categoria validada contra o catálogo (sem filtro órfão)");

// 4. CSS: lista ancorada na searchbar, sem layout shift (posições absolutas).
assert(/\.sg-list\s*\{[\s\S]{0,200}position:\s*absolute/.test(css),
  "4. .sg-list absoluta (sem empurrar a página)");

// 5. Estáticas não linkam JS (decisão vigente): a sugestão é só nas 2
//    páginas interativas — produto/index.html não ganha listbox.
assert(!/search-sg/.test(htmlX.replace(/x-sg/g, "")) ||
  htmlX.indexOf("search-sg") === -1, "5. /explorar/ sem id duplicado da Home");

console.log("sugestoes_50: todos os testes passaram ✔");
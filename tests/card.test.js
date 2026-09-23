/* R2 (VDV-20260923-01) — card único 4:5 cover/contain + placeholder.
 * Teste estático (node puro, por regex — padrão das suítes do front) sobre
 * app.js e vdv.css:
 *   1. contêiner de imagem 4:5 fixo com cover padrão no CSS;
 *   2. heurística contain só para Impressão 3D (grupo ou slug da categoria);
 *   3. placeholder neutro .card-imgph quando não há foto;
 *   4. falha de download da foto troca o <img> pelo placeholder;
 *   5. título do card com clamp de 2 linhas;
 *   6. fornecedor navegável: clique no nome não navega para o produto
 *      (preventDefault + stopPropagation) e vai para fornecedor/<slug>/;
 *   7. coração continua FORA do <a> (card-wrap preservado);
 *   8. cache-busting ?v= presente no CSS e no app.js da home.
 * Rodar: node tests/card.test.js */
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
const html = fs.readFileSync(
  path.join(__dirname, "..", "index.html"),
  "utf8"
);

// 1. Card único: 4:5 fixo + cover padrão (sem padding de moldura no padrão).
assert(
  /\.card img\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*5[^}]*object-fit:\s*cover/.test(css),
  "1. .card img com aspecto 4:5 e cover"
);
assert(
  !/\.prod-related \.card img/.test(css),
  "1. sem override de aspecto nos relacionados (card único)"
);

// 2. Contain é classe condicional, não padrão: só Impressão 3D.
assert(
  js.includes("card-img-contain") &&
    /g === "impressao_3d" \|\|/.test(js) &&
    /\.slug === "impressao_3d"/.test(js),
  "2. heurística contain por grupo/slug impressao_3d"
);
assert(
  /\.card img\.card-img-contain\s*\{[^}]*object-fit:\s*contain/.test(css),
  "2. contain aplicado só via .card-img-contain"
);

// 3. Placeholder neutro quando não há foto.
assert(
  js.includes("card-imgph") && js.includes('aria-label", "Sem foto"'),
  "3. placeholder .card-imgph com aria-label"
);
assert(
  /\.card-imgph\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*5/.test(css),
  "3. placeholder na mesma proporção 4:5"
);

// 4. Falha de download → primeiro tenta a original (R3), depois placeholder.
assert(
  /img\.addEventListener\("error", function \(\) \{[\s\S]*?data-fallback-src[\s\S]*?img\.replaceWith\(cardImgPlaceholder\(\)\);/.test(js),
  "4. onerror do img: fallback original → placeholder"
);

// 4b. R3: srcset da thumbnail WebP 400w gerada pelo exportador + sizes.
assert(
  /if \(p\.image_thumb\)[\s\S]{0,200}srcset", prefix \+ p\.image_thumb \+ " 400w/.test(js),
  "4b. srcset usa image_thumb 400w quando o exportador fornece"
);
assert(
  js.includes('img.setAttribute("sizes", "(max-width: 767px) 46vw, 276px")'),
  "4b. sizes alinhado à largura real dos cards"
);

// 5. Título com clamp de 2 linhas.
assert(
  /\.card-title\s*\{[^}]*-webkit-line-clamp:\s*2/.test(css),
  "5. .card-title com clamp de 2 linhas"
);

// 6. Fornecedor navegável no card.
assert(
  js.includes('data-seller-href') &&
    js.includes('"fornecedor/" + p.supplier_slug + "/"'),
  "6. seller com href da vitrine do fornecedor"
);
assert(
  /sellerEl\.addEventListener\("click", function \(ev\) \{\s*ev\.preventDefault\(\);\s*ev\.stopPropagation\(\);/.test(js),
  "6. clique no seller não navega para o produto"
);

// 7. Estrutura do like preservada (coração fora do <a>).
assert(
  js.includes('wrap.appendChild(a);') && js.includes('wrap.appendChild(botaoLike(p.id));'),
  "7. card-wrap com <a> + coração irmão"
);

// 8. Cache-busting na home.
assert(/vdv\.css\?v=[0-9]{8}-[0-9]+/.test(html), "8. CSS com ?v= na home");
assert(/app\.js\?v=[0-9]{8}-[0-9]+/.test(html), "8. app.js com ?v= na home");

console.log("card: OK (card único 4:5 cover/contain + placeholder — VDV-20260923-01 R2)");
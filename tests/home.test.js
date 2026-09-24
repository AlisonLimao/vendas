/* R4 (VDV-20260923-01, mestre itens 13-15) — Home reestruturada.
 * Teste estático (node puro, por regex — padrão das suítes do front) sobre
 * index.html, app.js e vdv.css:
 *   1. primeira dobra é produto: "Acabou de chegar" antes de "Categorias";
 *      hero sem botão "Criar uma Procura" e sem faixa institucional;
 *   2. trilho de grupo (section-grupo/rail-grupo) removido do HTML e do JS;
 *   3. rotação "Em exposição agora" (section-exposicao/fair_rotation)
 *      removida do HTML e do JS — script tag do fair_rotation saiu;
 *   4. seção "Para você explorar" existe, com pickExplorar (round-robin por
 *      categoria, cap EXPLORAR_CAP) e exclusão dos ids de novidades;
 *   5. caps explícitos: NOVIDADES_CAP/EXPLORAR_CAP = 8, VITRINES_CAP = 4
 *      (chips de vitrines com slice no cap);
 *   6. R5: grade completa "Explore a vitrine" e "Meus favoritos" saem da Home
 *      (viraram as páginas /explorar/ e /favoritos/); bottombar navega;
 *   7. modo busca: explorar esconde junto com novidades (setBrowseVisibility);
 *   8. mobile: .grid-novidades oculta cards 7+ via CSS, desktop mantém os 8.
 * Rodar: node tests/home.test.js */
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

// 1. Primeira dobra é produto: novidades vem antes de categorias; hero sem
//    CTA de Procura e sem a faixa institucional do topo.
assert(
  html.indexOf('id="section-novidades"') < html.indexOf('id="section-categorias"'),
  "1. 'Acabou de chegar' antes de 'Categorias' no HTML"
);
assert(
  !/hero-strip/.test(html) &&
    /class="hero-actions"/.test(html) &&
    !/data-deep-link="procura"[^>]*class="btn[^"]*"[^>]*>[^<]*Criar uma Procura<\/a>\s*<\/div>\s*<div class="searchbar/.test(html),
  "1. hero sem faixa institucional e sem botão de Procura"
);

// 2. Trilho de grupo removido (HTML e JS).
assert(
  !/section-grupo|rail-grupo|grid-grupo/.test(html) &&
    !/sectionGrupo|rail-grupo|grid-grupo|GROUP_RAIL/.test(js),
  "2. trilho de grupo removido"
);

// 3. Rotação removida (HTML e JS); arquivo fair_rotation.js deixa de ser
//    carregado pela Home (lib + teste continuam no repo).
assert(
  !/section-exposicao|grid-exposicao/.test(html) &&
    !/sectionExposicao|EXPOSICAO_|VDVFairRotation/.test(js) &&
    !/fair_rotation\.js/.test(html),
  "3. rotação 'Em exposição agora' removida da Home"
);

// 4. "Para você explorar": seção nova + seleção honesta.
assert(
  /id="section-explorar"/.test(html) &&
    html.indexOf('id="section-explorar"') > html.indexOf('id="section-categorias"') &&
    html.indexOf('id="section-explorar"') < html.indexOf('id="section-vitrines"'),
  "4. seção explorar posicionada entre categorias e vitrines"
);
assert(
  /function pickExplorar\(products, excludeIds, cap\)/.test(js) &&
    /if \(excludeIds\[p\.id\]\) return;/.test(js) &&
    /push\(buckets\[b\]\[round\]\)/.test(js),
  "4. pickExplorar: round-robin por categoria, exclui novidades"
);
assert(
  /fill\(\$\("grid-explorar"\), explorarCards\)/.test(js),
  "4. grid-explorar preenchida pela seleção"
);

// 5. Caps explícitos da R4.
assert(
  /var NOVIDADES_CAP = 8;/.test(js) &&
    /var EXPLORAR_CAP = 8;/.test(js) &&
    /var VITRINES_CAP = 4;/.test(js),
  "5. caps NOVIDADES/EXPLORAR=8 e VITRINES=4"
);
assert(
  /products\.slice\(0, NOVIDADES_CAP\)/.test(js) &&
    /pickExplorar\(products, recentesIds, EXPLORAR_CAP\)/.test(js) &&
    /suppliers\.slice\(0, VITRINES_CAP\)/.test(js),
  "5. caps aplicados em novidades, explorar e vitrines"
);

// 6. R5: grade completa e favoritos saem da Home (páginas /explorar/ e
//    /favoritos/); os alvos do topo/hero/"Ver tudo"/bottombar viram páginas.
assert(
  !/id="section-vitrine"/.test(html) &&
    !/id="section-favoritos"/.test(html) &&
    !/id="grid-all"/.test(html) &&
    !/id="load-more"/.test(html),
  "6. grade completa e favoritos saem da Home (R5)"
);
assert(
  /<a href="explorar\/">Explorar<\/a>/.test(html) &&
    /class="btn btn-primary" href="explorar\/">Explorar ofertas/.test(html) &&
    /href="explorar\/">Explorar a vitrine inteira/.test(html) &&
    /href="explorar\/" id="bb-explorar"/.test(html) &&
    /href="favoritos\/" id="bb-favoritos"/.test(html),
  "6. alvos de navegação apontam para /explorar/ e /favoritos/"
);

// 6b. R8: Procura com presença honesta — bloco ÚNICO com entrada explicativa
//     (mestre item 26) + item permanente de navegação (topnav e bottombar
//     levam AO BLOCO; o deep link para o bot fica só no CTA do bloco).
assert(
  /<section class="cta-procura" id="procura">/.test(html) &&
    html.match(/data-deep-link="procura"/g).length === 3,
  "6b. bloco único de Procura (id=procura); deep link nos 3 CTAs contextuais (bloco, zero-result, catálogo vazio)"
);
assert(
  /Não encontrou o que precisava\?<\/h2>/.test(html) &&
    /Diga o que procura e deixe sua necessidade visível para fornecedores da região/.test(html),
  "6b. entrada do bloco explica antes de enviar para fora da página"
);
assert(
  /<a href="#procura">Procura<\/a>/.test(html) &&
    /href="#procura" id="bb-procura"/.test(html),
  "6b. navegação permanente: topnav e bottombar apontam ao bloco"
);
assert(
  /scroll-margin-top: 4rem/.test(css),
  "6b. âncora #procura reserva espaço da topbar sticky"
);

// 7. Modo busca esconde explorar junto com as outras faixas editoriais.
assert(
  /sectionExplorar\.hidden = searching \|\| !showExplorar;/.test(js) &&
    !/sectionGrupo|sectionExposicao/.test(js),
  "7. setBrowseVisibility esconde explorar; grupos/exposição fora"
);

// 8. Mobile: grade de novidades mostra 6 (cards 7+ ocultos), desktop mantém 8.
assert(
  /\.grid-novidades > \.card-wrap:nth-child\(n\+7\)\s*\{\s*display:\s*none;\s*\}/.test(css),
  "8. mobile oculta cards 7+ das novidades"
);
assert(
  /@media \(min-width: 768px\)\s*\{\s*\.grid-novidades > \.card-wrap:nth-child\(n\+7\)\s*\{\s*display:\s*block;\s*\}/.test(css),
  "8. desktop mantém os 8 cards"
);

// 9. R10: Telegram nunca define a plataforma na copy pública —
//    "fale direto com quem vende" no og/meta e na confiança; canal só nos
//    botões de contato (que são fato, não definição).
assert(
  html.includes("Fale direto com quem vende — sem taxa de plataforma") &&
    html.includes("a negociação acontece direto com quem vende"),
  "9. og/meta e confiança sem Telegram como definição (R10)"
);
assert(
  html.includes("Fale direto com quem está vendendo.") &&
    html.includes("a negociação é direta entre você e quem vende") &&
    !/pelo Telegram/.test(html),
  "9. Converse/trust/footer sem 'pelo Telegram' (R10)"
);

console.log("home: OK (Home reestruturada — VDV-20260923-01 R4)");
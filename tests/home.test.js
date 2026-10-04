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
 *   9. R10: copy pública sem Telegram como definição da plataforma.
 *  10. R11: JSON-LD WebSite + Organization na Home (só fatos públicos).
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
  !/hero-strip/.test(html) && !/hero-actions/.test(html) &&
    !/Explorar ofertas/.test(html),
  "1. hero sem faixa institucional e sem CTA de exploração (Fatia 51: a busca é a porta, §9)"
);

// 2. Trilho de grupo removido (HTML e JS).
assert(
  !/section-grupo|rail-grupo|grid-grupo/.test(html) &&
    !/sectionGrupo|rail-grupo|grid-grupo|GROUP_RAIL/.test(js),
  "2. trilho de grupo removido"
);

// 3. Rotação removida (HTML e JS); arquivo fair_rotation.js saiu do repo
//    (Fatia 49: o rodízio do destaque editorial mora no app.js, inline).
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
  "4. pickExplorar v2: round-robin por categoria + alternância de fornecedor no bucket, exclui novidades e destaque"
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
    /pickExplorar\(products, excluidos, EXPLORAR_CAP\)/.test(js) &&
    /suppliers\.slice\(0, VITRINES_CAP\)/.test(js),
  "5. caps aplicados em novidades, explorar e vitrines (explorar exclui destaque também — Fatia 56)"
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
    /href="explorar\/">Explorar a vitrine inteira/.test(html) &&
    /href="explorar\/" id="bb-explorar"/.test(html) &&
    /href="favoritos\/" id="bb-favoritos"/.test(html),
  "6. alvos de navegação apontam para /explorar/ e /favoritos/"
);

// 6b. R8 + Fatia 55 (plano 16, §45): Procura com presença honesta — agora no
//     FINAL INTEGRADO da Home (.finale-demand com id=procura) + item
//     permanente de navegação (topnav e bottombar levam AO BLOCO; o deep link
//     para o bot fica só no CTA do bloco).
assert(
  /<div class="finale-demand" id="procura">/.test(html) &&
    html.match(/data-deep-link="procura"/g).length === 3,
  "6b. demanda real no final integrado (id=procura); deep link nos 3 CTAs contextuais (final, zero-result, catálogo vazio)"
);
assert(
  /<strong>Não encontrou o que precisava\?<\/strong>/.test(html) &&
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
// 6c. Fatia 55 (mestre §33/§45): final integrado substitui os blocos
//     separados (confiança + cta-seller + resumo de Como funciona).
assert(
  /<section id="section-final">/.test(html) &&
    /<h2>Encontre\. Confira\. Converse direto\.<\/h2>/.test(html) &&
    /<ul class="finale-facts" aria-label="Por que confiar">/.test(html) &&
    /<h2>Seu produto também pode estar aqui\.<\/h2>/.test(html),
  "6c. final integrado: fechamento em três camadas (fatos → demanda → vendedor)"
);
assert(
  !/id="section-confianca"/.test(html) && !/class="cta-seller"/.test(html) &&
    !/class="how-summary"/.test(html) && !/class="how-steps"/.test(html),
  "6c. nenhum resíduo dos blocos separados no markup"
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
//    "fale direto com quem vende" no og/meta; a confiança virou FATOS do
//    final integrado (Fatia 55: trust-lead e o resumo de passos saíram da
//    copy); canal só nos botões de contato (que são fato, não definição).
assert(
  html.includes("Fale direto com quem vende — sem taxa de plataforma") &&
    /<h2>Encontre\. Confira\. Converse direto\.<\/h2>/.test(html) &&
    html.includes("✓ Negociação direta"),
  "9. og/meta e final integrado sem Telegram como definição (R10)"
);
assert(
  html.includes("a negociação é direta entre você e quem vende") &&
    !/pelo Telegram/.test(html),
  "9. final/footer sem 'pelo Telegram' (R10)"
);

// 10. R11: dados estruturados — JSON-LD WebSite + Organization na Home
//     (só fatos públicos: nome/URL/logo; nada de dados de pessoa).
assert(
  /<script type="application\/ld\+json">/.test(html) &&
    /"@type": "WebSite"/.test(html) &&
    /"@type": "Organization"/.test(html) &&
    /"url": "https:\/\/vitrinedevenda\.com\.br\/"/.test(html),
  "10. JSON-LD WebSite + Organization na Home (R11)"
);

console.log("home: OK (Home reestruturada — VDV-20260923-01 R4)");
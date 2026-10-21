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

// 1. Primeira dobra (prompt mestre homepage, VDV-20261008-07 Etapa 2):
//    busca → atalhos de categoria → bandas (chips-atalho apontam os
//    universos; bandas empilhadas por categoria — VDV-20261021-02); hero sem
//    CTA de Procura e sem faixa institucional.
assert(
  html.indexOf('id="atalhos-categorias"') > html.indexOf("searchbar") &&
    html.indexOf('id="atalhos-categorias"') < html.indexOf('id="section-bandas"'),
  "1. entrada por intenção: busca → chips-atalho → bandas (VDV-20261021-02)"
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

// 4. (VDV-20261021-02) "Para você explorar" saiu da Home — as bandas
//    ocupam o lugar; filtros de 2 níveis moram no /explorar/ (decisão 7).
assert(
  !/id="section-explorar"|id="grid-explorar"|pickExplorar/.test(html + js),
  "4. seção e seleção do explorar extintas da Home (bandas herdam)"
);

// 5. Caps restantes da R4.
assert(
  /var VITRINES_CAP = 4;/.test(js),
  "5. cap VITRINES=4 (novidades/explorar extintos com as seções)"
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
  /<a href="explorar\/" data-nav="explorar">Explorar<\/a>/.test(html) &&
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
  /<a href="#procura" data-nav="procura">Procura<\/a>/.test(html) &&
    /href="#procura" id="bb-procura"/.test(html),
  "6b. navegação permanente: topnav e bottombar apontam ao bloco"
);
assert(
  /scroll-padding-top/.test(css) && !/scroll-margin-top: 4rem/.test(css),
  "6b. âncoras reservam altura da topbar sticky (scroll-padding global)"
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

// 7. Modo busca esconde as faixas editoriais (atalhos, bandas, destaque) e
//    mostra os resultados; grupos/exposição seguem fora.
assert(
  /sectionBandas\.hidden = searching/.test(js) &&
    !/sectionGrupo|sectionExposicao/.test(js) &&
    !/sectionExplorar/.test(js),
  "7. setBrowseVisibility esconde bandas na busca; grupos/exposição/explorar fora"
);

console.log("home: OK (home por intenção — VDV-20261021-02)");

// 8. (VDV-20261021-02) grade de novidades extinta junto com a seção — o CSS
//    .grid-novidades sai junto.
assert(
  !/\.grid-novidades/.test(css),
  "8. CSS .grid-novidades removido junto com a seção"
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


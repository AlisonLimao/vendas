/* VDV-20260921-01 (Bloco 1) — taxonomia navegável em 2 níveis.
 * Teste estático (node puro, por regex — padrão das suítes do front) sobre
 * index.html e app.js:
 *   1. hero sem chips de filtro soltos; bloco único #section-categorias após
 *      o hero e antes de #results, sem `hidden` fixo no HTML;
 *   2. nível 1: "Toda a vitrine" (data-all) + só raízes (chip-group como
 *      FILTRO, nunca link) + chip ⚡; raiz NÃO mistura navegação com filtro;
 *   3. nível 2: "Tudo em <categoria>" (limpa só o filho) + filhos diretos
 *      (categoria raiz não repete a sub) + link chip-page quando a página
 *      existe (pageBySlug), só com raiz ativa;
 *   4. estados selectedCategory/selectedSubcategory: trocar raiz limpa o
 *      filho; "Toda a vitrine" limpa ambos; syncChipStates centraliza
 *      aria-pressed;
 *   5. renderSearch filtra por raiz (grupo) e filho, título mostra contexto
 *      "pai › filho · contagem" (breadcrumb), assinatura de telemetria
 *      inclui raiz e filho;
 *   6. setBrowseVisibility mantém o bloco visível durante a busca;
 *   7. snapshot de retorno guarda/restaura raiz+filho com validação anti-
 *      estado-órfão (raiz inexistente some; filho sem raiz válida some);
 *   8. cache-busting ?v=20260921-2 no CSS e no app.js.
 * Rodar: node tests/categorias.test.js */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const js = fs.readFileSync(
  path.join(__dirname, "..", "assets", "js", "app.js"),
  "utf8"
);
const html = fs.readFileSync(
  path.join(__dirname, "..", "index.html"),
  "utf8"
);

// 1. Hero limpo + bloco único de categorias no lugar certo.
assert(!/id="categories"/.test(html), "1. #categories removido do hero");
assert(!/\$\("categories"\)/.test(js), "1. app.js sem referência a #categories");
const resultsIdx = html.indexOf('<section id="results" hidden>');
const catIdx = html.indexOf('<section id="section-categorias"');
assert(catIdx !== -1 && resultsIdx !== -1, "1. seções presentes");
assert(catIdx < resultsIdx, "1. categorias antes de #results");
assert(
  /<section id="section-categorias">\s*<h2>Categorias<\/h2>\s*<div class="cat-block" id="chips-categorias"><\/div>\s*<\/section>/.test(html),
  "1. bloco único com .cat-block e sem hidden fixo"
);

// 2. Nível 1: "Toda a vitrine" + raízes como filtro (nunca link).
assert(js.includes("var selectedCategory = \"\""), "2. selectedCategory declarado");
assert(js.includes("var selectedSubcategory = \"\""), "2. selectedSubcategory declarado");
assert(js.includes('"Toda a vitrine"'), "2. chip Toda a vitrine");
assert(js.includes('setAttribute("data-all", "1")'), "2. data-all no chip de reset");
assert(js.includes('className = "chip chip-group"'), "2. raiz com destaque de grupo");
assert(js.includes('setAttribute("data-group", gr.slug)'), "2. raiz como FILTRO");
assert(
  !/document\.createElement\(page \? "a" : "button"\)/.test(js),
  "2. raiz nunca vira link condicional (navegação foi para o nível 2)"
);
assert(js.includes('"⚡ Pronta entrega"'), "2. chip ⚡ no nível 1");
assert(js.includes('className = "cat-row cat-row-l1"'), "2. nível 1 em cat-row própria");

// 3. Nível 2: Tudo em <categoria> + filhos + link da página.
assert(js.includes('"Tudo em " + current.name'), "3. Tudo em <categoria>");
assert(/s\.slug !== current\.slug/.test(js), "3. categoria raiz não repete a sub");
assert(js.includes('className = "cat-row cat-row-l2"'), "3. nível 2 em cat-row própria");
assert(js.includes('className = "chip chip-page"'), "3. link discreto da página estática");
assert(js.includes("pageBySlug"), "3. link condicionado a category_pages");
assert(
  /if \(!current\) \{ syncChipStates\(\); return; \}/.test(js),
  "3. nível 2 só aparece com raiz ativa"
);
assert(/if \(children\.length\)/.test(js), "3. nível 2 só com filhos diretos");

// 4. Estado: trocar raiz limpa o filho; Toda a vitrine limpa ambos.
assert(
  /selectedCategory = selectedCategory === gr\.slug \? "" : gr\.slug;[\s\S]{0,80}selectedSubcategory = "";/.test(js),
  "4. trocar a raiz limpa o filho"
);
assert(
  /allChip\.addEventListener[\s\S]{0,300}selectedCategory = "";[\s\S]{0,60}selectedSubcategory = "";[\s\S]{0,60}activeAvail = "";/.test(js),
  "4. Toda a vitrine limpa raiz, filho e disponibilidade"
);
assert(
  /allIn\.addEventListener[\s\S]{0,200}selectedSubcategory = "";[\s\S]{0,40}renderCatBlock\(\);/.test(js),
  "4. Tudo em <categoria> limpa só o filho"
);
assert(js.includes("function syncChipStates"), "4. syncChipStates centraliza aria-pressed");
assert(/function setChipPressed/.test(js), "4. aria-pressed calculado por chip");
assert(
  /selectedSubcategory = selectedSubcategory === s\.slug \? "" : s\.slug;/.test(js),
  "4. filho é toggle sem tocar a raiz"
);

// 5. renderSearch: filtro raiz+filho, breadcrumb e assinatura.
const rsIdx = js.indexOf("function renderSearch");
const rs = js.slice(rsIdx, js.indexOf("input.addEventListener", rsIdx));
assert(rs.includes("cat = selectedSubcategory"), "5. renderSearch lê o filho");
assert(rs.includes("grp = selectedCategory"), "5. renderSearch lê a raiz");
assert(
  rs.includes("p.category.group.slug !== grp"),
  "5. predicado filtra pela raiz (grupo)"
);
assert(/ctx\.join\(" › "\)/.test(rs), "5. breadcrumb pai › filho no título");
assert(/cat \+ "\|" \+ grp \+ "\|" \+ avail/.test(rs),
  "5. assinatura de telemetria inclui raiz e filho");

// 6. O bloco de categorias NÃO some durante a busca.
const visIdx = js.indexOf("function setBrowseVisibility");
const vis = js.slice(visIdx, js.indexOf("}", js.indexOf("sectionEmpty.hidden", visIdx)));
assert(
  /sectionCategorias\.hidden = products\.length === 0/.test(vis),
  "6. categorias visível durante a busca"
);
assert(
  !/sectionCategorias\.hidden = searching/.test(vis),
  "6. categorias não pode ser escondida por searching"
);

// 7. Snapshot de retorno: guarda raiz+filho e valida contra o catálogo.
assert(/cat: selectedSubcategory/.test(js), "7. saveHomeState persiste o filho");
assert(/grp: selectedCategory/.test(js), "7. saveHomeState persiste a raiz");
assert(
  /selectedCategory = typeof snap\.grp === "string" \? snap\.grp : "";/.test(js),
  "7. restore lê a raiz do snapshot"
);
assert(
  /selectedSubcategory = typeof snap\.cat === "string" \? snap\.cat : "";/.test(js),
  "7. restore lê o filho do snapshot"
);
assert(
  /if \(selectedCategory && !groups\[selectedCategory\]\) selectedCategory = "";/.test(js),
  "7. raiz inexistente nunca volta órfã"
);
assert(
  /if \(!gs \|\| !gs\.subs\[selectedSubcategory\] \|\|[\s\S]{0,60}selectedSubcategory = "";/.test(js),
  "7. filho sem raiz válida nunca fica órfão"
);
assert(/renderCatBlock\(\);\s*\n\s*renderExplore\(\);\s*\n\s*renderSearch\(\);/.test(js),
  "7. restore re-renderiza o bloco de 2 níveis");

// 8. Cache-busting da fatia.
assert(/vdv\.css\?v=20260921-2/.test(html), "8. CSS com ?v=20260921-2 na home");
assert(/app\.js\?v=20260921-2/.test(html), "8. app.js com ?v=20260921-2 na home");

console.log("categorias: OK (taxonomia navegável em 2 níveis — VDV-20260921-01)");
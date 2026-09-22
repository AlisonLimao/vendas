/* VDV-20260921-01 (Bloco 5) — CTA de Procura no zero-result da busca.
 * Teste estático (node puro, por regex — padrão das suítes do front) sobre
 * index.html e app.js:
 *   1. a linha de procura existe dentro da seção de resultados e nasce
 *      escondida (hidden);
 *   2. o CTA usa o deep link canônico "procura" (mesma mecânica dos
 *      outros CTAs — nenhum destino novo);
 *   3. o toggle no app.js é exclusivo: só aparece quando a busca não
 *      acha nada (found.length > 0 esconde);
 *   4. sem pressão: sem popup, sem auto-redireção — só um link discreto
 *      dentro do resultado vazio;
 *   5. o clique não vira identificador novo — procura_click é o evento
 *      já existente do deep link.
 * Rodar: node tests/procura_cta.test.js */
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

// 1. Linha de procura na seção de resultados, escondida por padrão.
assert(html.includes('id="results-procura" hidden'),
  "1. #results-procura existe e nasce hidden");
const inicio = html.indexOf('<section id="results"');
const fim = html.indexOf("</section>", inicio);
const secao = html.slice(inicio, fim);
assert(secao.includes('id="results-procura"'),
  "1. #results-procura está DENTRO de #results");

// 2. Deep link canônico de procura + origem de analytics declarada.
assert(secao.includes('data-deep-link="procura"'),
  "2. CTA usa data-deep-link=\"procura\"");
assert(secao.includes('data-ga-origin="cta_zero_result_procura"'),
  "2. data-ga-origin=\"cta_zero_result_procura\"");

// 3. Toggle exclusivo — aparece só no zero-result.
assert(js.includes('$("results-procura").hidden = found.length > 0;'),
  "3. toggle #results-procura no renderSearch");

// 4. Sem pressão: sem setInterval/popup de procura.
assert(!/setInterval[^;]*procura/i.test(js),
  "4. sem timer/popup de procura");

// 5. CTA reusa telemetria existente (procura_click no deep link); sem
//    evento novo nem identificador.
assert(!js.includes('results-procura_click'),
  "5. sem evento novo de clique");
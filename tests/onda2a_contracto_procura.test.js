/*
 * Mandato A.1 (VDV-20261102) — contrato de apresentação da Procura no front.
 *
 * §2: quantidade com unidade real (0034) quando informada; quantidade não
 * aplicável (serviço) → segmento omitido; prazo não é exibido na home (hoje
 * nem antes — cabe só à página de detalhe, gerada pelo exportador); foto
 * opcional → sem thumb (lista textual preservada); tipo no selo quando
 * informado (aluguel/serviço), "Procura" para compra e registro legado;
 * NUNCA "un" órfão, null/undefined, unidade fictícia ou dado inventado.
 *
 * §3: retrocompatibilidade — app.js ainda lê os campos antigos (quantity,
 * image_thumb, price_max) e mantém o contrato de ANÚNCIOS intocado.
 *
 *   Rodar: node tests/onda2a_contracto_procura.test.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const js = fs.readFileSync(path.join(root, "assets", "js", "app.js"), "utf8");
const minjs = fs.readFileSync(path.join(root, "assets", "js", "vdv.min.js"), "utf8");
const procuras = JSON.parse(
  fs.readFileSync(path.join(root, "data", "procuras.json"), "utf8")
);

let ok = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FALHOU: " + msg);
    process.exit(1);
  }
  ok += 1;
}

/* 1 — QUANTIDADE COM UNIDADE (§2.1) */
assert(
  /pr\.quantity != null/.test(js),
  "1. app.js lê quantidade só quando definida (guarda pr.quantity != null)"
);
assert(
  /pr\.quantity_unit \? esc\(pr\.quantity_unit\) : "un"/.test(js),
  "1a. unidade real quando informada; 'un' apenas sem unidade (legado)"
);
assert(
  !/locTexto \+= esc\(pr\.quantity\) \+ " un"/.test(js),
  "1b. concatenação antiga (esc(pr.quantity) + ' un') removida do app.js"
);
assert(
  !/String\(e\.quantity\)\+" "+.*&&&&|c\+=_\(e\.quantity\)\+" un"/.test(minjs),
  "1b-min. concatenação antiga removida do vdv.min.js"
);

/* 2 — QUANTIDADE NÃO APLICÁVEL (§2.2): segmento omitido, nada de "un" órfão */
assert(
  !/esc\(locTexto\) \+ " un"/.test(js) && !/\+_\(e\.quantity\)\+" un"/.test(minjs),
  "2. nenhum 'un' incondicional ligado à procura (serviço = sem segmento)"
);

/* 3 — SELO DO TIPO (§2.9, §2.10): aluguel/serviço distinguidos; legado/compra = "Procura" */
assert(
  /pr\.need_type === "aluguel" \? "Aluguel"/.test(js) &&
    /pr\.need_type === "servico" \? "Serviço"/.test(js) &&
    /: "Procura"/.test(js),
  "3. selo deriva de need_type (aluguel → Aluguel, servico → Serviço, resto → Procura)"
);
assert(
  minjs.includes('w=e.need_type==="aluguel"?"Aluguel":e.need_type==="servico"?"Serviço":"Procura"'),
  "3a. vdv.min.js carrega o mesmo mapeamento do selo"
);

/* 4 — SEM FOTO (§2.6, §2.7): guarda de imagem intacta (thumb OU original) */
assert(
  /pr\.image_thumb \|\| pr\.image/.test(js) &&
    /if \(pr\.image_thumb \|\| pr\.image\) \{/.test(js),
  "4. sem foto → thumb não é criada e a linha volta a ser textual (guarda intacta)"
);

/* 5 — PREÇO OPCIONAL PRESERVADO (§2.5/§2.8; VDV-20261016-04) */
assert(
  /if \(pr\.price_max\) \{/.test(js),
  "5. preço continua opcional (sem price_max → sem segmento de preço)"
);

/* 6 — DADO INVENTADO PROIBIDO (§2): nenhum valor técnico vazia para o HTML */
assert(
  !js.includes("undefined un") && !js.includes("null un"),
  "6. nada de 'undefined un' / 'null un' literal no app.js"
);

/* 6a — SEPARADOR ÓRFÃO (§2, regressão de render REAL no sandbox hm):
   sem quantity e sem preço, a linha loc não pode terminar em "· ".
   O separador passa a ser condicional em TODOS os segmentos. */
assert(
  !/category\.name\) \+ " · "/.test(js),
  "6a. app.js: separador ' · ' NÃO concatenado à categoria (só quando há segmento seguinte)"
);
assert(
  /\(locTexto \? " · " : ""\) \+ esc\(String\(pr\.quantity\)\)/.test(js),
  "6b. app.js: separador condicional antes da quantidade"
);
assert(
  minjs.includes(
    'var c=e.category&&e.category.name?_(e.category.name):"";null!=e.quantity&&(c+=(c?" · ":"")+_(String(e.quantity))'
  ),
  "6c. min.js: loc idêntico ao app.js (separadores todos condicionais)"
);

/* 6b — HOISTING DO SELO (§2, regressão de render REAL no sandbox hm):
   no min.js o `var w` NÃO pode ser inicializado dentro do ramo `if(l){` —
   hoisting deixaria `w` undefined no ramo textual e o selo sairia vazio. */
assert(
  minjs.includes(
    '</span>",w=e.need_type==="aluguel"?"Aluguel":e.need_type==="servico"?"Serviço":"Procura";if(l){t.classList.add("procura-line--media");var u=document.createElement("span");u.className="procura-body"'
  ),
  "6d. min.js: w definida ANTES do if(l) (inicializada fora do ramo, hoisting real)"
);

/* 7 — ANÚNCIOS INTACTOS (§3): contrato de produto não tocou */
assert(
  /i\.quantity\+" un em estoque"/.test(js) || /un em estoque/.test(js),
  "7. cards de produto preservados ('un em estoque') — contrato de anúncios intacto"
);
assert(
  minjs.includes('"un em estoque"') || /un em estoque/.test(minjs),
  "7a. produto segue no vdv.min.js"
);

/* 8 — SHAPE DO JSON PÚBLICO (§3.A/§3.B): campos antigos lidos como antes */
assert(
  Array.isArray(procuras.procuras) &&
    typeof procuras.total === "number" &&
    typeof procuras.generated_at === "string" &&
    typeof procuras.bot_username === "string",
  "8. data/procuras.json mantém o envelope público (generated_at/bot_username/total/procuras)"
);
assert(
  js.includes('fetch(prefix + "data/procuras.json")'),
  "8a. home continua consumindo data/procuras.json (fetch separado, best-effort)"
);

console.log("OK — " + ok + " checks do contrato A.1 (apresentação da Procura)");
process.exit(0);
/* VDV-20261008-08 (8ª, spec do Alison) — invariantes do botão Divulgar.
 * O Divulgar compartilha a FOTO EM EXIBIÇÃO como ARQUIVO no menu nativo
 * (navigator.share({ files: [...] })) — sem link, sem prévia, sem wa.me
 * automático, sem cópia. Navegador sem suporte a arquivos → nota + baixar a
 * foto. Teste estático (node puro) por grep sobre app.js + inline do
 * exportador. Rodar: node tests/share_photo.test.js */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const js = fs.readFileSync(
  path.join(__dirname, "..", "assets", "js", "app.js"),
  "utf8"
);

// 1. O clique NUNCA navega: preventDefault incondicional (sem gate de
//    ponteiro, sem wa.me automático, sem cópia — spec da 8ª).
assert(
  js.includes("ev.preventDefault(); // Divulgar nunca navega: ou menu, ou nota/baixar"),
  "Divulgar nunca navega — o menu (ou a nota/baixar) assume do toque"
);
assert(
  !/window\.matchMedia\("\(pointer: coarse\)"\)/.test(js),
  "sem gate de ponteiro no Divulgar (revertido na 5ª e extinto na 8ª)"
);
assert(
  !js.includes("navigator.share(dados)") &&
    !/window\.location\.href = share\.href;/.test(js),
  "sem share de texto+link e sem navegação por código no Divulgar (spec: só a foto)"
);

// 2. O payload é a forma documentada (MDN): files + title + text SEM link.
assert(
  /var comFoto = \{[\s\S]{0,80}?files: \[arquivoPronto\],\s*title: product\.title,\s*text: \(product\.title \+ " — " \+ fmtPriceText\(product\)\) \/\/ sem link/.test(js),
  "dinâmica: share({ files: [arquivoPronto], title, text sem nenhum link do VDV })"
);
assert(
  js.includes("return navigator.share(comFoto).catch(function (err) {"),
  "share(comFoto) é chamado no clique (forma documentada)"
);

// 3. Cancelamento (AbortError) não mostra erro; falha real mostra nota.
assert(
  /if \(err && err\.name === "AbortError"\) return;/.test(js),
  "cancelar o menu não dispara nota nem fallback"
);
assert(
  /nota\("Compartilhar não funcionou \(" \+/.test(js),
  "falha do share diz o nome do erro em vez de navegar"
);

// 4. Sem suporte a arquivos → nota + BAIXAR a foto (nunca wa.me).
assert(
  js.includes("Este navegador não suporta compartilhar fotos") &&
    js.includes("Este navegador não permite anexar fotos") &&
    (js.match(/baixarFoto\(\);/g) || []).length >= 2,
  "sem suporte (sem share ou canShare falso): nota + baixarFoto nas duas vias"
);
assert(
  /function baixarFoto\(\) \{[\s\S]{0,200}?a\.download = "vdv-" \+ product\.id \+[\s\S]{0,120}\(fotoSelecionada > 0 \? "-" \+ \(fotoSelecionada \+ 1\) : ""\) \+ "\.jpg";/m.test(js),
  "baixarFoto baixa o arquivo da foto (nome distingue o slide)"
);

// 5. Foto ainda não pronta → nota "toque de novo" + prepararFoto (sem fetch
//    no clique, que expira a ativação do gesto).
assert(
  /if \(!arquivoPronto\) \{\s*prepararFoto\(\);/.test(js) &&
    js.includes("A foto ainda está preparando — toque de novo em um instante."),
  "foto não pronta: prepararFoto + nota pedindo novo toque (nada navega)"
);

// 6. A foto é a SELECIONADA na galeria (fotoSelecionada), preparada em fundo.
assert(
  js.includes("photos[fotoSelecionada] || photos[0]") &&
    js.includes("var fotoSelecionada = 0;"),
  "a foto compartilhada deve ser a escolhida na galeria (fotoSelecionada)"
);
assert(
  js.includes("var arquivoPronto = null;") &&
    js.includes("function prepararFoto()") &&
    /prepararFoto\(\); \/\/ foto do slide em fundo/.test(js),
  "foto prepara em fundo (abertura + troca de slide em pintar)"
);

// 7. Telemetria (GA + telemetria + sinal) antes da ramificação (dinâmica).
const shareHandler = js.slice(
  js.indexOf('var share = main.querySelector("#share-wa")'),
  js.indexOf("// VDV-20261008-08 (8ª, spec do Alison): Divulgar compartilha a FOTO em")
);
assert(
  shareHandler.includes('track("compartilhar_produto"') &&
    shareHandler.includes('telemetria("share"'),
  "GA + telemetria share marcados antes dos caminhos"
);

// 8. Notas ancoram no bloco compacto vigente (helper nota()).
assert(
  /function nota\(msg\) \{/.test(js) &&
    js.includes("var bloco = share.parentNode; // .share-compact (VDV-20261008-08)") &&
    (js.match(/copied-note/g) || []).length >= 1,
  "notas ancoram no bloco Divulgar compacto (helper nota)"
);

// 9. A ESTÁTICA (script inline do exportador) tem a MESMA forma documentada.
const exporter = fs.readFileSync(
  path.join(__dirname, "..", "..", "projeto_telegram", "scripts", "export_catalogo_web.py"),
  "utf8"
);
const inline = (exporter.match(/_PROD_PAGE_SCRIPT = """<script>([\s\S]*?)<\/script>"""/) || [])[1] || "";
assert(
  /function fotoSrc\(\)/.test(inline) &&
    /gallery-slide:nth-child\(" \+ \(atual \+ 1\) \+\ "\) img/.test(inline) &&
    /img\.prod-photo/.test(inline),
  "estática: a foto compartilhada é o slide em exibição (ou a única)"
);
assert(
  /var atual = 0; \/\/ foto em exibição/.test(exporter) &&
    /var arquivoPronto = null;/.test(inline) &&
    /function prepararFoto\(\)/.test(inline) &&
    /prepararFoto\(\); \/\/ foto do slide em fundo/.test(exporter),
  "estática: foto prepara em fundo (abertura + troca de slide)"
);
assert(
  /e\.preventDefault\(\); \/\/ Divulgar nunca navega: ou menu, ou nota\/baixar/.test(inline) &&
    !/window\.location\.href = share\.href;/.test(inline) &&
    !inline.includes("navigator.share(dados)"),
  "estática: Divulgar nunca navega — sem wa.me por código, sem share de texto"
);
assert(
  /files: \[arquivoPronto\],\s*title: document\.title,\s*text: textoShare\(\)/.test(inline) &&
    /text: textoShare\(\) \/\/ título \+ preço, SEM link \(spec: só a foto\)/.test(inline),
  "estática: payload documentado com texto SEM link do VDV"
);
assert(
  inline.includes("Este navegador não suporta compartilhar fotos") &&
    inline.includes("Este navegador não permite anexar fotos") &&
    (inline.match(/baixarFoto\(\);/g) || []).length >= 2 &&
    /a\.download = "vdv-" \+ pid \+ \(atual > 0 \? "-" \+ \(atual \+ 1\) : ""\) \+ "\.jpg";/.test(inline),
  "estática: sem suporte a arquivos → nota + baixarFoto (nome distingue o slide)"
);
assert(
  /if \(!arquivoPronto\) \{\s*prepararFoto\(\);/.test(inline) &&
    /return navigator\.share\(comFoto\)\.catch\(function \(err\) \{/.test(inline) &&
    /if \(err && err\.name === "AbortError"\) return;/.test(inline),
  "estática: menu no toque (share síncrono) e cancelamento silencioso"
);

// 10. O bloco Divulgar fica logo APÓS O PREÇO (VDV-20261008-08, 2ª).
assert(
  js.indexOf('class="share-compact"') < js.indexOf('class="prod-facts prod-disp"'),
  "dinâmica: Divulgar perto do topo, junto do preço"
);

console.log("share_photo: OK (Divulgar = foto em exibição como arquivo no menu nativo, sem link — spec 8ª)");
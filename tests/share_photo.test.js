/* VDV-20261008-08 (9ª, spec do Alison / prompt mestre W3C-MDN-web.dev) —
 * invariantes do botão Divulgar. O Divulgar compartilha a FOTO EM EXIBIÇÃO
 * como ARQUIVO com CAMINHO DE RETORNO: o link direto do anúncio vai DENTRO
 * do text (4ª: url+files juntos quebram no Chrome Android — sem campo url
 * com files). Cenário C (share sem anexo) → menu nativo texto+link;
 * navegador sem share nenhum → nota + baixar a foto (nunca wa.me). Foto
 * prepara em fundo com proteção de corrida e cache por src. Teste estático
 * (node puro) por grep sobre app.js + inline do exportador.
 * Rodar: node tests/share_photo.test.js */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const js = fs.readFileSync(
  path.join(__dirname, "..", "assets", "js", "app.js"),
  "utf8"
);

// 1. O clique NUNCA navega: preventDefault incondicional (sem gate de
//    ponteiro, sem wa.me automático — spec da 8ª/9ª).
assert(
  js.includes("ev.preventDefault(); // Divulgar nunca navega: ou menu, ou nota/baixar"),
  "Divulgar nunca navega — o menu (ou a nota/baixar) assume do toque"
);
assert(
  !/window\.matchMedia\("\(pointer: coarse\)"\)/.test(js),
  "sem gate de ponteiro no Divulgar (revertido na 5ª e extinto na 8ª)"
);
assert(
  !/window\.location\.href = share\.href;/.test(js),
  "sem navegação por código no Divulgar"
);
// 9ª: a âncora dinâmica troca o href wa.me pela PRÓPRIA URL do produto —
// sem JS falho/sem handler, ela nunca abre WhatsApp.
assert(
  /esc\(shareUrl\(product, "compartilhamento"\)\) \+ '" id="share-wa">'/.test(js) &&
    !js.includes("whatsappShareUrl(product)"),
  "dinâmica: href da âncora = URL do produto (?o=compartilhamento), nunca wa.me"
);

// 2. Payload principal (Cenário A, forma da 4ª): files + title + text COM o
//    link de retorno DENTRO do text — e SEM campo url junto com files.
assert(
  /var comFoto = \{[\s\S]{0,200}?files: \[arquivoPronto\],\s*title: product\.title,\s*text: \(product\.title \+ " — " \+ fmtPriceText\(product\)\) \+\s*"[\s\S]{0,8}Veja mais fotos e fale com o fornecedor:[\s\S]{0,8}" \+\s*shareUrl\(product, "compartilhamento"\)/.test(js),
  "dinâmica: share({ files, text com link de retorno }) — link no text (4ª)"
);
assert(
  /return navigator\.share\(comFoto\)\.catch\(function \(err\) \{/.test(js),
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

// 4. Cenário C: share existe MAS arquivos não permitidos → NOTA + menu
//    nativo texto+link (navigator.share(dados)) — nunca baixar silencioso,
//    nunca navegar ao wa.me.
assert(
  js.includes("Este navegador não permite anexar fotos") &&
    /return navigator\.share\(dados\)\.catch\(function \(err\) \{/.test(js) &&
    /url: shareUrl\(product, "compartilhamento"\)/.test(js),
  "Cenário C: menu nativo com texto+link (o campo url só vai SEM files)"
);

// 5. Cenário D: sem share nenhum → nota + BAIXAR a foto (nunca wa.me).
assert(
  js.includes("Este navegador não tem o menu de compartilhar") &&
    (js.match(/baixarFoto\(\);/g) || []).length >= 1,
  "sem share nenhum: nota + baixarFoto"
);
assert(
  /function nomeArquivo\(\) \{[\s\S]{0,200}?return "vdv-" \+ product\.id \+\s*\(fotoSelecionada > 0 \? "-" \+ \(fotoSelecionada \+ 1\) : ""\) \+ "\.jpg";/.test(js) &&
    /a\.download = nomeArquivo\(\);/.test(js),
  "baixarFoto baixa o arquivo da foto (nome distingue o slide, helper nomeArquivo)"
);

// 6. Foto ainda não pronta → nota "toque de novo" + prepararFoto (sem fetch
//    no clique, que expira a ativação do gesto).
assert(
  /if \(!arquivoPronto\) \{\s*prepararFoto\(\);/.test(js) &&
    js.includes("A foto ainda está preparando — toque de novo em um instante."),
  "foto não pronta: prepararFoto + nota pedindo novo toque (nada navega)"
);

// 7. A foto é a SELECIONADA na galeria (fotoSelecionada), preparada em fundo
//    com proteção de CORRIDA e CACHE por src (9ª, §5.1 do prompt mestre).
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
assert(
  js.includes("var seqPreparo = 0;") &&
    js.includes("var srcDe = null;") &&
    js.includes("if (pedido !== seqPreparo) return; // corrida: seleção já mudou") &&
    js.includes("if (srcDe === src) return; // já em cache (anti-reconversão)") &&
    js.includes("if (!blob || !blob.size) throw new Error("),
  "preparo com corrida (seqPreparo), cache por src (srcDe) e integridade (blob.size)"
);

// 8. Telemetria (GA + telemetria + sinal) antes da ramificação (dinâmica).
const shareHandler = js.slice(
  js.indexOf('var share = main.querySelector("#share-wa")'),
  js.indexOf("Divulgar compartilha a FOTO em exibição como ARQUIVO com CAMINHO DE")
);
assert(
  shareHandler.includes('track("compartilhar_produto"') &&
    shareHandler.includes('telemetria("share"'),
  "GA + telemetria share marcados antes dos caminhos"
);

// 9. Notas ancoram no bloco compacto vigente (helper nota()).
assert(
  /function nota\(msg\) \{/.test(js) &&
    js.includes("var bloco = share.parentNode; // .share-compact (VDV-20261008-08)") &&
    (js.match(/copied-note/g) || []).length >= 1,
  "notas ancoram no bloco Divulgar compacto (helper nota)"
);

// 10. A ESTÁTICA (script inline do exportador) tem a MESMA forma.
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
    !/window\.location\.href = share\.href;/.test(inline),
  "estática: Divulgar nunca navega — sem wa.me por código"
);
assert(
  /function urlShare\(\)/.test(inline) &&
    /files: \[arquivoPronto\],\s*title: document\.title,\s*text: textoShare\(\) \+\s*"[\s\S]{0,8}Veja mais fotos e fale com o fornecedor:[\s\S]{0,8}" \+\s*urlShare\(\)/.test(inline),
  "estática: payload com a foto e o link de retorno DENTRO do text (sem campo url)"
);
assert(
  /url: urlShare\(\)/.test(inline) &&
    /return navigator\.share\(dados\)\.catch\(function \(err\) \{/.test(inline),
  "estática: Cenário C — menu nativo texto+link (dados), nunca navegar"
);
assert(
  inline.includes("Este navegador não tem o menu de compartilhar") &&
    inline.includes("Este navegador não permite anexar fotos") &&
    (inline.match(/baixarFoto\(\);/g) || []).length >= 1 &&
    /a\.download = nomeArquivo\(\);/.test(inline) &&
    /function nomeArquivo\(\)/.test(inline),
  "estática: sem suporte → nota + baixarFoto (nome distingue o slide)"
);
assert(
  /var seqPreparo = 0;/.test(inline) &&
    /var srcDe = null;/.test(inline) &&
    /if \(pedido !== seqPreparo\) return; \/\/ corrida: seleção já mudou/.test(inline) &&
    /if \(srcDe === src\) return; \/\/ já em cache \(anti-reconversão\)/.test(inline) &&
    /if \(!blob \|\| !blob\.size\) throw new Error\(/.test(inline),
  "estática: corrida (seqPreparo), cache por src (srcDe) e integridade (blob.size)"
);
assert(
  /if \(!arquivoPronto\) \{\s*prepararFoto\(\);/.test(inline) &&
    /if \(err && err\.name === "AbortError"\) return;/.test(inline),
  "estática: menu no toque (share síncrono) e cancelamento silencioso"
);
// 9ª: sem JS, o href estático da âncora é a própria URL do produto.
assert(
  !/wa\.me\/\?text=/.test(inline) &&
    !/share_static_msg/.test(exporter) &&
    /share_text_attr = esc_html/.test(exporter) &&
    /share_href = copy_url/.test(exporter),
  "estática: Divulgar nunca abre WhatsApp por href (sem wa.me/?text= e sem share_static_msg)"
);

// 11. O bloco Divulgar fica logo APÓS O PREÇO (VDV-20261008-08, 2ª).
assert(
  js.indexOf('class="share-compact"') < js.indexOf('class="prod-facts prod-disp"'),
  "dinâmica: Divulgar perto do topo, junto do preço"
);

console.log("share_photo: OK (Divulgar = foto em exibição como arquivo + link de retorno no text — spec 9ª)");
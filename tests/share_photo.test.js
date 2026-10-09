/* VDV-20260911-07 — invariantes do compartilhamento com a foto escolhida.
 * Teste estático (node puro, mesmo padrão de telemetry_gate/favorites) sobre
 * o app.js — garante por grep:
 *   1. a via nova exige Web Share API COM suporte a arquivos
 *      (navigator.share + navigator.canShare, e canShare({files}) de novo
 *      depois do fetch) — sem suporte, o <a> wa.me segue intocado;
 *   2. o fallback wa.me existe em TODAS as saídas de erro (canShare falso,
 *      fetch falho) — mas NÃO no cancelamento do menu (AbortError);
 *   3. a foto compartilhada é a SELECIONADA na galeria (fotoSelecionada),
 *      nunca um índice fixo;
 *   4. GA + telemetria("share") continuam marcando antes das duas vias.
 * Rodar: node tests/share_photo.test.js */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const js = fs.readFileSync(
  path.join(__dirname, "..", "assets", "js", "app.js"),
  "utf8"
);

// 1. Gate de suporte (5ª correção Alison): o menu nativo abre SEMPRE que o
//    navegador tem navigator.share — qualquer ponteiro (Edge/Comet do Windows
//    têm o painel nativo de escolher; o gate coarse do 07c foi revertido).
//    `coarse` só fica no RAMO SEM share (celular → <a> natural).
assert(
  js.includes('window.matchMedia("(pointer: coarse)").matches') &&
    /if \(!\(navigator\.share && navigator\.canShare\)\) \{/.test(js) &&
    js.includes("ev.preventDefault();"),
  "o menu nativo abre sempre que há navigator.share (sem gate de toque)"
);
assert(
  js.includes("navigator.canShare(comFoto)"),
  "depois do fetch, canShare(comFoto) decide entre share com foto e fallback"
);
assert(
  js.includes("navigator.share(comFoto)") &&
    js.includes("files: [arquivoPronto]") &&
    js.includes('url: shareUrl(product, "compartilhamento")'),
  "o compartilhamento leva o arquivo + título + URL da página do produto"
);

// 2. Fallback em toda falha, EXCETO cancelamento do menu (AbortError).
assert(
  /if \(err && err\.name === "AbortError"\) return;/.test(js),
  "cancelar o menu de compartilhamento não pode disparar o fallback"
);
assert(
  (js.match(/window\.location\.href = share\.href;/g) || []).length === 3,
  "wa.me por código: 2 na via desktop + 1 no ramo sem-share (com nota antes) — menu recusado nunca navega"
);

// 2b. VDV-20260911-07b — desktop (sem Web Share de arquivos): a foto vai pelo
//     CLIPBOARD (PNG via canvas) + wa.me abre em nova aba; nota "Foto
//     copiada" só quando a cópia succeed; navegador sem ClipboardItem
//     segue pro link sem copiar nada.
assert(
  js.includes("navigator.clipboard") &&
    js.includes("window.ClipboardItem") &&
    js.includes('new ClipboardItem({ "image/png": png })'),
  "a via desktop deve copiar a foto pelo clipboard (PNG)"
);
assert(
  js.includes('canvas.toBlob(function (png) {') &&
    js.includes('"image/png"'),
  "a conversão para PNG deve passar pelo canvas (JPEG cru não cola em todo app)"
);
assert(
  js.includes('window.open(share.href, "_blank", "noopener")'),
  "a via desktop deve abrir o wa.me em nova aba (nota continua visível)"
);
assert(
  js.includes("if (png && colar) {"),
  "sem ClipboardItem (navegador velho): só o link, sem copiar"
);

// 3. A foto é a selecionada na galeria — nunca índice fixo.
assert(
  js.includes("photos[fotoSelecionada] || photos[0]") &&
    js.includes("var fotoSelecionada = 0;"),
  "a foto compartilhada deve ser a escolhida na galeria (fotoSelecionada)"
);

// 4. As duas vias marcam GA + telemetria antes de qualquer ramificação.
const shareHandler = js.slice(
  js.indexOf('var share = main.querySelector("#share-wa")'),
  js.indexOf("// Fatia 24")
);
assert(
  shareHandler.includes('track("compartilhar_produto"') &&
    shareHandler.includes('telemetria("share"'),
  "GA + telemetria share marcados nos dois caminhos"
);

// 5. VDV-20261008-08 (correção Alison) — as notas de confirmação ancoram no
//    bloco compacto (share.parentNode, helper nota()), não no action-grid.
assert(
  /function nota\(msg\) \{/.test(js) &&
    js.includes("var bloco = share.parentNode; // .share-compact") &&
    !js.includes("var grid = main.querySelector(\".action-grid\")"),
  "notas ancoram no bloco Divulgar compacto vigente (helper nota)"
);

// 6. A ESTÁTICA (script inline do exportador) leva a foto em exibição na
//    conversa — mesma dinâmica 07/07b/07c: fotoSrc (slide atual / img única),
//    gate pointer: coarse, canShare({files}), desktopShare no clipboard e
//    fallback wa.me fora do AbortError.
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
    /pointer: coarse/.test(inline) &&
    /canShare\(comFoto\)/.test(inline),
  "estática: gate de toque + canShare de arquivos (mesma dinâmica)"
);
assert(
  /function desktopShare\(blob\)/.test(inline) &&
    inline.includes('new ClipboardItem({ "image/png": png })') &&
    /copied-note/.test(inline),
  "estática: via desktop copia a foto (PNG) com nota de confirmação"
);
assert(
  inline.includes("window.location.pathname.match") &&
    inline.includes('"vdv-" + pid + (atual > 0 ? "-" + (atual + 1) : "")') &&
    /\(atual > 0 \? "-" \+ \(atual \+ 1\) : ""\)/.test(inline),
  "estática: nome do arquivo distingue a foto (vdv-<id>-N.jpg)"
);
assert(
  /if \(err && err\.name === "AbortError"\) return;/.test(inline) &&
    (inline.match(/window\.location\.href = share\.href;/g) || []).length === 3,
  "estática: wa.me por código nas 3 saídas remanescentes (desktop ×2 + sem-share com nota)"
);

// 7. VDV-20261008-08 (4ª/5ª correção Alison) — COM foto: link no TEXTO (Chrome
//    Android não passa url junto com files); SEM foto (não chegou em fundo /
//    anexo recusado): MENU com texto+link aberto NA HORA do toque — o share é
//    chamado sincronicamente no clique (busca dentro do clique expirava a
//    ativação do gesto: navegador recusava o menu → WhatsApp direto).
assert(
  /var arquivoPronto = null;/.test(inline) &&
    /function prepararFoto\(\)/.test(inline) &&
    /var comFoto = \{[\s\S]{0,180}?files: \[arquivoPronto\],[\s\S]{0,300}?urlShare\(\)/.test(inline) &&
    /if \(navigator\.canShare\(comFoto\)\) \{\s*return navigator\.share\(comFoto\)/.test(inline),
  "estática: foto prepara em fundo e vai com link no texto"
);
assert(
  /var arquivoPronto = null;/.test(js) &&
    /function prepararFoto\(\)/.test(js) &&
    /var comFoto = \{[\s\S]{0,180}?files: \[arquivoPronto\],[\s\S]{0,300}?shareUrl\(product, "compartilhamento"\)/.test(js) &&
    /if \(navigator\.canShare\(comFoto\)\) \{\s*return navigator\.share\(comFoto\)/.test(js),
  "dinâmica: foto prepara em fundo e vai com link no texto"
);
assert(
  /prepararFoto\(\); \/\/ foto do slide em fundo/.test(inline) &&
    Array.prototype.some.call([js], (x) => /prepararFoto\(\); \/\/ foto do slide/.test(x)),
  "troca de slide prepara a nova foto em fundo (pintar)"
);
assert(
  /prepararFoto\(\);\s*return navigator\.share\(dados\)/.test(inline) &&
    /prepararFoto\(\);\s*return navigator\.share\(dados\)/.test(js),
  "menu com texto+link abre na hora quando a foto não chegou (gesto vivo)"
);

// 8. O bloco Divulgar fica logo APÓS O PREÇO (relato: botão longe demais).
assert(
  /prod-price.*[\s\S]{0,240}action-label">Divulgar<\/span>/i.test(js) ||
    js.indexOf('class="share-compact"') < js.indexOf('class="prod-facts prod-disp"'),
  "dinâmica: Divulgar perto do topo, junto do preço"
);

// 9. VDV-20261008-08 (6ª correção Alison) — diagnóstico no toque (a nota DIZ
//    qual caminho o navegador pegou; página velha em cache = nota não sai) e
//    menu recusado NUNCA navega ao wa.me: mostra o nome do erro e pede novo
//    toque (que tem ativação de gesto nova).
assert(
  /nota\("toque: menu="/.test(js) && /nota\("toque: menu="/.test(inline),
  "o toque diz qual caminho o navegador pegou (versão + estado da foto)"
);
assert(
  (js.match(/O navegador recusou o menu/g) || []).length === 2 &&
    (inline.match(/O navegador recusou o menu/g) || []).length === 2,
  "menu recusado (com foto e sem) avisa pelo nome do erro em vez de navegar"
);

// 10. VDV-20261008-08 (7ª correção Alison) — no celular SEM navigator.share
//     (ex.: navegador interno de apps), a nota DIZ antes de abrir por link:
//     o caso "não tem menu nativo" nunca é silêncio.
assert(
  /Este navegador não tem o menu de compartilhar/.test(js) &&
    /Este navegador não tem o menu de compartilhar/.test(inline),
  "sem share no celular: nota antes da saída por link (navegadores internos de apps dizem o caso)"
);

console.log("share_photo: OK (Web Share com arquivos + fallback wa.me + foto selecionada)");
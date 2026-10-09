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

// 1. Gate de suporte: a via de arquivos exige TELA DE TOQUE (pointer: coarse)
//    — o Chrome/Edge do Windows também tem navigator.share com arquivos, mas
//    abre o painel nativo do Windows (sem WhatsApp Web lá, VDV-20260911-07c).
//    Desktop (ponteiro fino) → via clipboard.
assert(
  js.includes('window.matchMedia("(pointer: coarse)").matches') &&
    js.includes("var comArquivos =") &&
    js.includes("ev.preventDefault();") &&
    js.includes("if (!comArquivos) {"),
  "a via de arquivos só vale em tela de toque; desktop vai pro clipboard"
);
assert(
  js.includes("navigator.canShare({ files: [arquivo] })"),
  "depois do fetch, canShare({files}) decide entre share e fallback"
);
assert(
  js.includes("navigator.share({") &&
    js.includes("files: [arquivo]") &&
    js.includes('url: shareUrl(product, "compartilhamento")'),
  "o compartilhamento leva o arquivo + título + URL da página do produto"
);

// 2. Fallback em toda falha, EXCETO cancelamento do menu (AbortError).
assert(
  /if \(e && e\.name === "AbortError"\) return;/.test(js),
  "cancelar o menu de compartilhamento não pode disparar o fallback"
);
assert(
  (js.match(/window\.location\.href = share\.href;/g) || []).length >= 2,
  "fallback wa.me deve existir para falha de fetch (celular e desktop)"
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

// 5. VDV-20261008-08 (correção Alison) — a nota "Foto copiada" ancora no
//    bloco compacto (share.parentNode), não no action-grid removido.
assert(
  js.includes("var grid = share.parentNode; // .share-compact") &&
    !/nota, grid\.nextSibling/.test(js) === false,
  "nota desktop ancora no bloco Divulgar compacto vigente"
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
    /canShare\(\{ files: \[arquivo\] \}\)/.test(inline),
  "estática: gate de toque + canShare de arquivos (mesma dinâmica)"
);
assert(
  /function desktopShare\(blob\)/.test(inline) &&
    inline.includes('new ClipboardItem({ "image/png": png })') &&
    /copied-note/.test(inline),
  "estática: via desktop copia a foto (PNG) com nota de confirmação"
);
assert(
  /var nome = "vdv-"/.test(inline) &&
    /\(atual > 0 \? "-" \+ \(atual \+ 1\) : ""\)/.test(inline),
  "estática: nome do arquivo distingue a foto (vdv-<id>-N.jpg)"
);
assert(
  /if \(err && err\.name === "AbortError"\) return;/.test(inline) &&
    (inline.match(/window\.location\.href = share\.href;/g) || []).length >= 2,
  "estática: fallback wa.me nas falhas, nunca no cancelamento"
);

console.log("share_photo: OK (Web Share com arquivos + fallback wa.me + foto selecionada)");
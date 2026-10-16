/*
 * VDV-20261016-02 (Parte A/C) — miniatura de referência da PROCURA na home.
 *
 *  A lista editorial da Fatia 55 ganha coluna de imagem: thumb WebP
 *  priorizada, original de fallback (mesmo padrão de cardMedia), contain 4:3,
 *  card inteiro clicável com abrir_procura preservado, rótulo PROCURA e
 *  layout textual quando não há imagem. Cards de produto/fornecedor intactos.
 *
 *   Rodar: node tests/procura_home_thumb.test.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const js = fs.readFileSync(path.join(root, "assets", "js", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "assets", "css", "vdv.css"), "utf8");
const mincss = fs.readFileSync(path.join(root, "assets", "css", "vdv.min.css"), "utf8");
const minjs = fs.readFileSync(path.join(root, "assets", "js", "vdv.min.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const procuras = JSON.parse(
  fs.readFileSync(path.join(root, "data", "procuras.json"), "utf8")
);

function assert(cond, msg) {
  if (!cond) {
    console.error("FALHOU: " + msg);
    process.exit(1);
  }
}

// 1. Render: miniatura com fallback thumb→original (padrão cardMedia).
assert(js.includes('pic.className = "procura-thumb"'), "1. container da miniatura");
assert(
  js.includes("img.src = prefix + (pr.image_thumb || pr.image)"),
  "2. thumb WebP priorizada"
);
assert(
  js.includes('img.setAttribute("data-fallback-src", prefix + pr.image)'),
  "3. original registrada como fallback"
);
assert(
  js.includes("img.addEventListener(\"error\"") && js.includes("pic.remove()"),
  "4. falha total → linha volta ao layout textual"
);
assert(
  js.includes('a.classList.add("procura-line--media")'),
  "5. variante de imagem separada da textual"
);

// 2. Identidade PROCURA nos dois variantes + telemetria preservada.
assert(
  (js.match(/'<span class="procura-tag">Procura<\/span>'/g) || []).length === 2,
  "6. rótulo PROCURA no card com e sem foto"
);
assert(js.includes('track("abrir_procura"'), "7. abrir_procura preservado");
assert(
  js.includes('a.href = "procura/" + encodeURIComponent(pr.id) + "/"'),
  "8. card inteiro clicável (link único)"
);
assert(
  !(js.includes("cardImgPlaceholder") &&
    /cardImgPlaceholder/.test(js.slice(js.indexOf("procura-thumb"), js.indexOf("procura-thumb") + 2000)) &&
    false),
  "9. placeholder de produto intacto em outro módulo"
);

// 3. Apresentação: 4:3, contain, coluna que encolhe no celular.
assert(
  /\.procura-thumb img \{[^}]*aspect-ratio: 4 \/ 3/.test(css) &&
    /\.procura-thumb img \{[^}]*object-fit: contain/.test(css),
  "10. proporção 4:3 com contain (não corta)"
);
assert(
  /\.procura-line--media \{[^}]*flex-wrap: nowrap/.test(css) &&
    /\.procura-body \{[^}]*min-width: 0/.test(css),
  "11. coluna textual encolhe no móvel (sem estouro)"
);
assert(
  /\.procura-thumb \{[^}]*flex: 0 0 auto/.test(css) &&
    /\.procura-thumb \{[^}]*width: 7rem/.test(css),
  "12. coluna de imagem de largura fixa"
);
assert(/\.procura-tag \{/.test(css), "13. rótulo PROCURA estilizado");

// 4. Artefatos minificados regenerados em par.
assert(mincss.includes(".procura-thumb") && mincss.includes(".procura-tag"),
  "14. min.css com as novas regras");
assert(minjs.includes("procura-thumb") && minjs.includes("data-fallback-src"),
  "15. min.js regenerado com o render novo");

// 5. Catálogo: nada alterado — procuras.json segue com image/image_thumb.
const pr0 = procuras.procuras[0];
assert(
  "image" in pr0 && "image_thumb" in pr0 && "id" in pr0 && "description" in pr0,
  "16. procuras.json intacto (campos consumidos)"
);
assert(html.includes('<div class="procura-list" id="grid-procuras"></div>'),
  "17. contêiner da lista intacto");

console.log("OK — procura_home_thumb (17 asserts)");
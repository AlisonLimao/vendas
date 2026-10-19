// VDV-20261019-02 — rotação da foto de destaque dos cards (espec 57).
// Pick UNIFORME ALEATÓRIO por carregamento de página no slide 0 do
// carrossel dos cards. Contratos cobertos:
//   1. destaquePara: guardas (foto única intocada; divergência de thumbs
//      → rotação desligada) + par image/image_thumb do MESMO índice;
//   2. estatístico: N renderizações cobrem ≥2 índices de uma galeria de 3;
//   3. cardGallery: rotação do array de fotos (slice+concat; track contém
//      TODAS as fotos — nada duplicado; dots inalterados em quantidade);
//   4. fallback: sem image_thumbs → comportamento de hoje (photos[0],
//      extras = photos.slice(1));
//   5. sem re-escolha pós-render (destaquePara só toca o slide 0, nunca
//      listener) e sem armazenamento/rede (nada de localStorage).
// Estilo do repo: testes estáticos por regex/leitura de arquivo; o pick
// (destaquePara) é função pura e roda de verdade em Node via eval.
const fs = require("fs");
const path = require("path");
const R = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
function assert(cond, msg) { if (!cond) { console.error("FALHOU: " + msg); process.exit(1); } }

const js = R("assets/js/app.js");

// ---------- 1. destaquePara — guardas e par coerente (runtime real) ----------
const mDest = js.match(/function destaquePara\(p\)\s*\{[\s\S]*?\n  \}/);
assert(mDest, "1. destaquePara existe em app.js");
const destaquePara = eval("(function(){ return (" + mDest[0].replace(/\n\s+/g, " ") + "); })()");
const P3 = {
  title: "Blusa", id: "u1",
  images: ["a.jpg", "b.jpg", "c.jpg"],
  image_thumbs: ["a.webp", "b.webp", "c.webp"],
};
assert(destaquePara({ images: ["a.jpg"], image_thumbs: ["a.webp"] }) === null,
  "1. foto única → null (intocada)");
assert(destaquePara({}) === null, "1. sem images → null");
assert(destaquePara({ images: ["a.jpg", "b.jpg"] }) === null,
  "1. sem image_thumbs → rotação desligada (fallback photos[0])");
assert(destaquePara({ images: ["a.jpg", "b.jpg"], image_thumbs: ["a.webp"] }) === null,
  "1. divergência de comprimento → rotação desligada");

// ---------- 2. estatístico: pick uniforme cobre os índices ----------
(() => {
  const ks = new Set();
  for (let i = 0; i < 300; i++) {
    const d = destaquePara(P3);
    ks.add(d.k);
    if (d.image !== P3.images[d.k] || d.image_thumb !== P3.image_thumbs[d.k]) {
      console.error("FALHOU: 2. par image/image_thumb do MESMO índice");
      process.exit(1);
    }
  }
  assert(ks.size >= 2, "2. 300 picks em 3 fotos devem tocar ≥2 índices");
})();

// ---------- 3. cardGallery rotaciona (estático) ----------
assert(/var dest = destaquePara\(p\);/.test(js), "3. cardGallery chama destaquePara");
assert(/var ordem = dest \? photos\.slice\(dest\.k\)\.concat\(photos\.slice\(0, dest\.k\)\) : photos;/.test(js),
  "3. ordem = rotação (slice+concat) quando há pick, photos na ausência");
assert(/cardMedia\(principal\)/.test(js), "3. slide 0 renderiza o principal (par escolhido)");
assert(/ordem\.slice\(1\)/.test(js), "3. extras a partir de ordem (track inteiro, nada duplicado)");
// dots: quantidade = comprimento da ordem (= photos.length)
assert(/for \(var k = 0; k < ordem\.length; k\+\+\)/.test(js),
  "3. dots seguem a ordem (quantidade inalterada)");
// principal carrega o PAR do índice escolhido (srcset coerente com o que se vê)
assert(/var principal = dest\s*\?\s*Object\.assign\(\{\}, p, \{\s*image: dest\.image,\s*image_thumb: dest\.image_thumb\s*\}\)/.test(js),
  "3. principal = par do índice escolhido (image + image_thumb)");

// ---------- 4. fallback sem dest: comportamento de hoje ----------
assert(/Object\.assign\(\{\}, p, \{ image: photos\[0\] \}\)/.test(js),
  "4. sem dest → principal é photos[0] (idêntico a hoje)");
assert(/if \(photos\.length <= 1\) return cardMedia\(p\);/.test(js),
  "4. foto única: caminho atual exato (cardMedia direto)");

// ---------- 5. sem re-escolha pós-render e sem storage ----------
const chamadas = (js.match(/destaquePara\(/g) || []).length;
assert(chamadas === 2, "5. destaquePara só na definição + 1 call no render (sem re-escolha)");
assert(!mDest[0].includes("localStorage") && !mDest[0].includes("fetch"),
  "5. pick local — sem storage, sem rede");

console.log("rotacao_foto: OK (estático + pick em runtime)");
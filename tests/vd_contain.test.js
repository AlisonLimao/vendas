// VDV-20261019-03 — enquadramento adaptativo em "Conheça esta vitrine"
// (espec 58). O quadro 4:5 com object-fit: cover corta fotos longe do 4:5
// (orca da Imprima 3D, r=1.33). Proposta: medir a proporção REAL no
// listener load (loading=lazy exige o evento, não o append) e quando foge
// do alvo além da tolerância, aplicar .vd-contain (contain, sem deformar).
// Contratos cobertos:
//   1. CSS: regras .vd-photo img.vd-contain / .vd-thumb img.vd-contain
//      (object-fit: contain + respiro) — e o COVER default INTACTO;
//   2. const nomeada VD_CONTAIN_TOL = 0.15 (decisão de spec, não número
//      solto no código);
//   3. vdContain(img, alvo): função pura, runtime real — contain quando
//      |r − alvo| > tolerância; nada quando dentro; razão indisponível
//      (naturalWidth 0) → não quebra e não aplica classe;
//   4. ligação no bloco destaque: dImg com alvo 0.8 (quadro 4:5) e tImg
//      com alvo 1 (thumbs 1:1), ambos no listener load;
//   5. intocados: alt do protagonista, telemetria (vitrineDestaqueTrack),
//      cards (mecanismo próprio) e nada além do bloco usa vdContain.
// Estilo do repo: estático por regex + função pura em runtime via eval.
const fs = require("fs");
const path = require("path");
const R = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
function assert(cond, msg) { if (!cond) { console.error("FALHOU: " + msg); process.exit(1); } }

const js = R("assets/js/app.js");
const css = R("assets/css/vdv.css");

// ---------- 1. CSS — regra contain e cover default intacto ----------
assert(/\.vd-photo img\.vd-contain\s*\{[^}]*object-fit:\s*contain/.test(css),
  "1. .vd-photo img.vd-contain usa object-fit: contain");
assert(/\.vd-photo img\.vd-contain\s*\{[^}]*padding/.test(css),
  "1. contain no quadro grande leva respiro (.4rem, vocabulário card-img-contain)");
assert(/\.vd-thumb img\.vd-contain\s*\{[^}]*object-fit:\s*contain/.test(css),
  "1. .vd-thumb img.vd-contain usa object-fit: contain");
assert(/\.vd-photo img\s*\{[^}]*object-fit:\s*cover/.test(css),
  "1. cover segue como default do quadro 4:5 (intocada)");

// ---------- 2. tolerância como const nomeada ----------
const mTol = js.match(/var VD_CONTAIN_TOL = 0\.15;/);
assert(mTol, "2. VD_CONTAIN_TOL = 0.15 declarada com esse nome exato");

// ---------- 3. vdContain — função pura, runtime real ----------
const mFun = js.match(/function vdContain\(img, alvo\)\s*\{([\s\S]*?)\n  \}/);
assert(mFun, "3. vdContain(img, alvo) existe em app.js");
const vdContain = eval("(function(){ var VD_CONTAIN_TOL = 0.15; return (" +
  mFun[0].replace(/\n\s+/g, " ") + "); })()");

// dentro da tolerância → sem classe (cover fotográfico mantido)
const dentro = { naturalWidth: 1024, naturalHeight: 1280, classList: fakeCl() };
vdContain(dentro, 0.8);
assert(!dentro.classList._tem("vd-contain"), "3. r=0.80 (4:5 exato) → sem vd-contain");
vdContain(dentro, 1.0); // r=0.8, alvo 1: |0.8−1|=0.2 > 0.15 → contain
assert(dentro.classList._tem("vd-contain"),
  "3. r=0.80 no quadro 1:1 → contain (mesma função, alvo por quadro)");

function fakeCl() {
  var set = {};
  return {
    add: function (c) { set[c] = true; },
    _tem: function (c) { return !!set[c]; },
  };
}
const fora = { naturalWidth: 1024, naturalHeight: 768, classList: fakeCl() };
vdContain(fora, 0.8); // r=1.333 → |1.333−0.8|=0.533
assert(fora.classList._tem("vd-contain"), "3. r=1.33 (horizontal) → contain");
const quebrada = { naturalWidth: 0, naturalHeight: 0, classList: fakeCl() };
vdContain(quebrada, 0.8);
assert(!quebrada.classList._tem("vd-contain"), "3. razão indisponível → sem classe e sem erro");

// ---------- 4. ligação no bloco destaque (listeners load) ----------
assert(/dImg\.addEventListener\("load", function \(\) \{ vdContain\(dImg, 0\.8\); \}\);/.test(js),
  "4. dImg medido no listener load com alvo 0.8 (quadro 4:5)");
assert(/tImg\.addEventListener\("load", function \(\) \{ vdContain\(tImg, 1\); \}\);/.test(js),
  "4. tImg (thumb auxiliar) medido no listener load com alvo 1 (1:1)");

// ---------- 5. intocados ----------
assert(/dImg\.alt = destaque\.name \+ " — produtos no VDV";/.test(js),
  "5. alt do protagonista intacto (accessibility-auditor)");
assert(/function vitrineDestaqueTrack\(\)/.test(js),
  "5. telemetria do bloco intacta");
const usos = (js.match(/vdContain\(/g) || []).length;
assert(usos === 3, "5. vdContain só na definição + as 2 ligações do bloco (sem espalhamento)");

// ---------- 6. min em par com os fontes (regeneração não esquecida) ----------
const cssMin = R("assets/css/vdv.min.css");
const jsMin = R("assets/js/vdv.min.js");
assert(cssMin.includes("vd-contain"),
  "6. vdv.min.css em par (regra vd-contain minificada)");
assert(jsMin.includes("vd-contain"),
  "6. vdv.min.js em par (strings do ciclo sobrevivem à minificação)");

console.log("vd_contain: OK (estático + função pura em runtime)");
/*
 * W7 — Refinamentos (VDV-20261107) — contrato.
 *
 * Escopo: higiene visual/acessibilidade SEM funcionalidade nova —
 *   W7-1 modo escuro completo (color-scheme nos tokens + overrides dark
 *         para os componentes W3–W6 que ainda eram exclusivamente claros);
 *   W7-2 foco visível universal (inclui select/textarea/[tabindex]/summary);
 *   W7-3 prefers-reduced-motion nas micro-interações (hover/transform).
 * Fora do escopo (já entregues em W1–W6): cookie banner compacto, alvo de
 * toque/dots/selo NOVO, labels de selects (já têm aria-label), dark toggle.
 *
 *   Rodar: node tests/contrato_w7.test.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "assets", "css", "vdv.css"), "utf8");
const mincss = fs.readFileSync(path.join(root, "assets", "css", "vdv.min.css"), "utf8");
const minjs = fs.readFileSync(path.join(root, "assets", "js", "vdv.min.js"), "utf8");
const home = fs.readFileSync(path.join(root, "index.html"), "utf8");

let ok = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FALHOU: " + msg);
    process.exit(1);
  }
  ok += 1;
}

/* ── W7-1 · Modo escuro completo (CSS puro, sem toggle) ─────────────────────── */

assert(
  /:root\s*{[^}]*color-scheme:\s*light/.test(css.replace(/[\r\n]+/g, " ")) ||
    /:root {[^}]*color-scheme: light/.test(css),
  "W7-1a. :root declara color-scheme: light (controles nativos coerentes)"
);
assert(
  /@media \(prefers-color-scheme: dark\) {[^@]*:root {[^{]*color-scheme:\s*dark/.test(
    css.replace(/[\r\n]+/g, " ")
  ),
  "W7-1b. bloco dark declara color-scheme: dark (popup de select nativo segue o tema)"
);
assert(
  home.includes("G-P22B9BLHBR") && /'analytics_storage': 'denied'/.test(home),
  "W7-1c. Consent Mode default-denied preservado (dark via CSS puro, sem toggle)"
);

/* ── W7-2 · Foco visível universal ──────────────────────────────────────────── */

assert(
  /:is\(a,\s*button,\s*input,\s*select,\s*textarea,\s*\[tabindex\](,\s*summary)?(,\s*\.chip)?\):focus-visible/.test(css),
  "W7-2a. regra global de foco visível inclui select, textarea e [tabindex]"
);

/* ── W7-3 · prefers-reduced-motion nas micro-interações ─────────────────────── */

assert(
  /@media \(prefers-reduced-motion: reduce\) {[^}]*\.card:hover[^}]*transform:\s*none/.test(
    css.replace(/[\r\n]+/g, " ")
  ),
  "W7-3a. hover do cartão (transform) desligado com reduced-motion"
);
assert(
  /lcp/.test(minjs) && /fetchpriority/.test(minjs) &&
    /--vdv-bg/.test(mincss) &&
    /prefers-color-scheme/.test(mincss),
  "W7-3b. mins intactos/regenerados (W6 preservado + dark no min.css)"
);

/* ── Intocáveis ─────────────────────────────────────────────────────────────── */

assert(
  /data-deep-link="procura"/.test(home) &&
    !/color-scheme[^;]*\bforce|data-theme/.test(css.slice(0, 2000)),
  "W7-4. deep links intactos; sem data-theme (sem funcionalidade nova)"
);

console.log("OK — " + ok + " checks do contrato W7 (refinamentos)");
process.exit(0);

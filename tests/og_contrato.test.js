/*
 * VDV-20261010-06 — contrato de Open Graph da vitrine.
 *
 * Missão do Alison (complemento ao redesign 04): o banner oficial é a
 * prévia padrão quando o link é compartilhado (WhatsApp/Telegram/Facebook),
 * sem recolocar o banner na página, e as prévias específicas de produto
 * (foto do produto) e fornecedor (logo, senão banner) continuam como
 * definidas. Crawlers NÃO rodam JS — metatags nascem no HTML servido.
 *
 * O que este teste impede (remoção futura):
 *  1. Conjunto completo de OG em TODA página pública (título, descrição,
 *     tipo, site_name, url, imagem, dimensões, alt, twitter:card) — inclui
 *     stubs "indisponível" (prévia = banner, nada do produto/demanda vaza).
 *  2. URLs absolutas HTTPS no domínio oficial, canônicas (sem "?").
 *  3. Home/institucionais/produto shell: og:image = banner oficial 1200x630
 *     (a arte `assets/vdv-banner-share-1200x630.jpg` que existe no repo —
 *     nunca substituta, nunca foto aleatória).
 *  4. Produto vivo: og:image = a própria foto -og.jpg (nunca o banner).
 *  5. A arte existe no disco.
 *
 * Padrão das suítes: node tests/og_contrato.test.js (regex, sem npm).
 */
var fs = require("fs");
var path = require("path");
var assert = require("assert");

var R = path.join(__dirname, "..");

var BANNER = "https://vitrinedevenda.com.br/assets/vdv-banner-share-1200x630.jpg";
var ALT_BANNER =
  "VDV — Vitrine de Vendas de Monte Sião. Produtos, serviços e oportunidades da região.";
var ORIGEM = "https://vitrinedevenda.com.br/";

var OBLIGATORIOS = [
  "og:type", "og:site_name", "og:title", "og:description",
  "og:url", "og:image", "og:image:width", "og:image:height",
  "og:image:alt", "twitter:card",
];

// <meta> multilinha — content pode estar em linha própria (stubs).
function metas(html) {
  var m = {};
  var re = /<meta\s+(?:property|name)="(og:[^"]+|twitter:card)"\s+content="([^"]*)"/g;
  var re2 = /<meta\s+content="([^"]*)"\s+(?:property|name)="(og:[^"]+|twitter:card)"/g;
  var hit;
  while ((hit = re.exec(html)) !== null) m[hit[1]] = hit[2];
  while ((hit = re2.exec(html)) !== null) m[hit[2]] = hit[1];
  return m;
}

function listaHtml(dir, acc) {
  acc = acc || [];
  fs.readdirSync(dir).forEach(function (f) {
    var p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (f === "_homolog" || f === ".git" || f === "node_modules") return;
      listaHtml(p, acc);
    } else if (/\.html$/.test(f)) {
      acc.push(p);
    }
  });
  return acc;
}

var paginas = listaHtml(R);
assert.ok(paginas.length >= 50, "esperava >= 50 HTML, achei " + paginas.length);

paginas.forEach(function (p) {
  var rel = path.relative(R, p).replace(/\\/g, "/");
  var html = fs.readFileSync(p, "utf8");
  var m = metas(html);
  var onde = "em " + rel + ":";

  // (1) conjunto completo — em toda página, sem exceção
  OBLIGATORIOS.forEach(function (k) {
    assert.ok(m[k] !== undefined && m[k] !== "", onde + " falta " + k);
  });

  // (2) absolutas HTTPS, domínio oficial, canônicas (sem "?")
  assert.ok(m["og:url"].indexOf(ORIGEM) === 0, onde + " og:url não é absoluta do domínio");
  assert.ok(m["og:image"].indexOf(ORIGEM) === 0, onde + " og:image não é absoluta do domínio");
  assert.ok(m["og:url"].indexOf("?") === -1, onde + " og:url com parâmetro");
  assert.ok(m["og:image"].indexOf("?") === -1, onde + " og:image com parâmetro");

  // twitter:card grande
  assert.ok(m["twitter:card"] === "summary_large_image", onde + " twitter:card");

  // (1b) dims = arquivo real 1200x630
  assert.ok(m["og:image:width"] === "1200" && m["og:image:height"] === "630",
    onde + " dims og:image não são 1200x630");
});

// (3) prévia institucional (banner) nas páginas sem imagem própria
[
  "index.html",
  "explorar/index.html",
  "favoritos/index.html",
  "produto/index.html",
  "anunciar.html", "como-funciona.html", "privacidade.html", "termos.html",
].forEach(function (rel) {
  var m = metas(fs.readFileSync(path.join(R, rel), "utf8"));
  assert.ok(m["og:image"] === BANNER, "em " + rel + ": og:image != banner oficial");
  assert.ok(m["og:image:alt"] === ALT_BANNER, "em " + rel + ": og:image:alt != alt oficial");
});

// categoria e procura (geradas; banner por decisão do exportador)
fs.readdirSync(path.join(R, "categoria")).forEach(function (slug) {
  var m = metas(fs.readFileSync(path.join(R, "categoria", slug, "index.html"), "utf8"));
  assert.ok(m["og:image"] === BANNER, "em categoria/" + slug + ": og:image != banner");
});
fs.readdirSync(path.join(R, "procura")).forEach(function (id) {
  var m = metas(fs.readFileSync(path.join(R, "procura", id, "index.html"), "utf8"));
  // procura viva usa a foto de referência quando a página exibe foto; sem
  // foto → banner. Ambos absolutos — aqui só garantimos NÃO-vazio acima.
  assert.ok(m["og:image"].indexOf(ORIGEM) === 0, "em procura/" + id);
});

// (4) produto vivo: og:image = foto da própria oferta (nunca o banner) —
//     "o resto continua igual" (decisão do Alison, 10/10).
//     Stub "indisponível": prévia = banner e NADA de produto.
fs.readdirSync(path.join(R, "produto")).forEach(function (id) {
  if (id === "index.html") return;
  var html = fs.readFileSync(path.join(R, "produto", id, "index.html"), "utf8");
  var m = metas(html);
  var viva = html.indexOf("noindex") === -1;
  if (viva) {
    assert.ok(m["og:image"] === ORIGEM + "assets/products/" + id + "-og.jpg",
      "em produto/" + id + ": preview não é a foto do produto");
  } else {
    assert.ok(m["og:image"] === BANNER, "em produto/" + id + " (stub): != banner");
    assert.ok(m["og:title"].indexOf("indisponível") !== -1, "em produto/" + id);
  }
});

// fornecedor: -og.jpg (logo) ou banner; alt coerente com o que exibe
fs.readdirSync(path.join(R, "fornecedor")).forEach(function (slug) {
  var html = fs.readFileSync(path.join(R, "fornecedor", slug, "index.html"), "utf8");
  var m = metas(html);
  var comLogo = m["og:image"] !== BANNER;
  assert.ok(comLogo ? m["og:image"].indexOf("/fornecedores/" + slug + "-") !== -1 : true,
    "em fornecedor/" + slug + ": og:image não é logo nem banner");
  if (!comLogo) {
    assert.ok(m["og:image:alt"] === ALT_BANNER, "em fornecedor/" + slug + ": alt do banner");
  }
  assert.ok(m["og:image"].indexOf(ORIGEM) === 0, "em fornecedor/" + slug);
});

// (5) a arte existe no repo (não pode sumir)
assert.ok(fs.existsSync(path.join(R, "assets", "vdv-banner-share-1200x630.jpg")),
  "banner oficial 1200x630 ausente de assets/");

// título do shell de produto NÃO volta a ser o vestígio "atacado"
assert.ok(metas(fs.readFileSync(path.join(R, "produto/index.html"), "utf8"))
  ["og:title"].indexOf("Produto — VDV") === 0,
  "og:title do produto shell regrediu ao vestígio");

console.log("OK — OG contrato: " + paginas.length + " páginas, conjunto completo, banner oficial nas institucionais, foto do produto preservada.");
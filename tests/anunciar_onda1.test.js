// Onda 1 — frente C: anunciar.html com números fáticos + vitrine exemplo
// (contrato do dono, 02/11/2026).
//
// Verifica CONTRA o products.json do repo (fonte geradora):
//  1. números do slot == contagens reais de vitrines/anúncios do JSON;
//  2. a vitrine exemplo é slug elegível real (página + foto/logo no ar);
//  3. ZERO dos termos proibidos (venda/alcance/conversão/procura-como-prova);
//  4. CTA e deep link do bot intactos (anunciar_cta_vitrine).
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const R = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let falhas = 0;
const falhou = (msg) => {
  console.error('FALHOU: ' + msg);
  falhas += 1;
};
const passa = (cond, msg) => {
  if (!cond) falhou(msg);
};

const catalogo = JSON.parse(R('data/products.json'));
const produtos = catalogo.products || [];
const pagina = R('anunciar.html');

// contagens esperadas (mesma regra do exportador: group por supplier_slug,
// "primeiro display vence")
const vitrines = new Set(
  produtos.filter((p) => p.supplier_slug).map((p) => p.supplier_slug)
).size;

// 1. números fáticos == products.json (ou omissos com < 2 vitrines)
if (vitrines >= 2) {
  const esperado =
    vitrines + ' vitrines no ar';
  passa(
    pagina.includes(esperado),
    'número de vitrines diverge do products.json: esperado conter "' + esperado + '"'
  );
  passa(
    pagina.includes(produtos.length + ' anúncios no ar'),
    'número de anúncios diverge do products.json'
  );
} else {
  passa(
    !pagina.includes('vitrines no ar'),
    'com < 2 vitrines o slot de números deve ficar vazio'
  );
}

// 2. vitrine exemplo é.slug elegível real
const slot = (nome) => {
  const m = pagina.match(
    new RegExp('<!-- export:' + nome + ' -->([\\s\\S]*?)<!-- /export:' + nome + ' -->')
  );
  return m ? m[1] : null;
};
const exemplo = slot('exemplo');
if (exemplo && exemplo.trim() !== '') {
  const m = exemplo.match(/href="fornecedor\/([^/"]+)\//);
  passa(m !== null, 'vitrine exemplo sem link de fornecedor');
  if (m) {
    const slug = m[1];
    const presente = produtos.some((p) => p.supplier_slug === slug);
    passa(
      presente,
      'vitrine exemplo (' + slug + ') não tem anúncio elegível no products.json'
    );
    const paginaFornecedor = 'fornecedor/' + slug + '/';
    passa(
      fs.existsSync(path.join(ROOT, paginaFornecedor, 'index.html')),
      'página da vitrine exemplo inexistente: ' + paginaFornecedor
    );
    const temVisual =
      /src="assets\/fornecedores\//.test(exemplo) ||
      /src="assets\/products\//.test(exemplo);
    passa(temVisual, 'vitrine exemplo sem logo e sem foto de anúncio');
  }
}

// 3. termos proibidos — nada de resultado comercial sem base
for (const termo of [
  'aumente suas vendas',
  'aumente as vendas',
  'alcance milhares',
  'taxa de conversão',
  'conversão de vendas',
  'milhares de compradores',
  'venda garantida',
]) {
  passa(
    !pagina.toLowerCase().includes(termo),
    'termo proibido em anunciar.html: "' + termo + '"'
  );
}
// buscas/procuras não podem aparecer como número de demanda
passa(
  !/procuras? (em |no )?(VDV )?(hoje|nesse mês|no ar)/i.test(pagina),
  'buscas não podem virar prova de demanda em anunciar.html'
);

// 4. CTA e deep link intactos
passa(
  pagina.includes('data-ga-origin="anunciar_cta_vitrine"'),
  'deep link/origem do CTA sumiu (anunciar_cta_vitrine)'
);
passa(
  pagina.includes('data-deep-link="vitrine"'),
  'data-deep-link="vitrine" sumiu do CTA'
);
// slots seguem presentes (o exportador precisa encontrá-los)
passa(slot('numeros') !== null, 'slot export:numeros desapareceu');
passa(slot('exemplo') !== null, 'slot export:exemplo desapareceu');

if (falhas > 0) process.exit(1);
console.log('OK — anunciar_onda1 (frente C)');
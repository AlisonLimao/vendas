# Vitrine de Atacado (vdv-vitrine)

Catálogo público estático da **Vitrine Inteligente de Atacado** (bot Telegram
`@vitrine_vendasbot`). Site 100% estático servido por GitHub Pages — sem
backend, sem login, sem coleta de dados.

> **Este repositório é gerado**: `data/products.json` e `assets/products/*`
> são **gerados** pelo exportador (`scripts/export_catalogo_web.py`, no repo
> privado do bot) e **nunca editados à mão**. Nada aqui escreve no banco.

## Fluxo (baliza)

```
POSTGRES (VDV, privado) → exportador read-only → data/products.json + assets
        → sincronizador (commit/push) → GitHub Pages (este site)
```

## Contrato público de dados (`data/products.json`)

Allowlist **fechada** (baliza §27.3) — só estes campos, nunca serialização de
ORM:

```json
{
  "generated_at": "…Z (UTC)",
  "bot_username": "vitrine_vendasbot",
  "total": 1,
  "products": [{
    "id": "<uuid>",
    "title": "…", "description": "…",
    "category": {"slug": "blusa", "name": "Blusa"},
    "price": "49.90",
    "minimum_order": 12,
    "availability": "pronta_entrega|em_producao|sob_pedido",
    "quantity": 80,
    "days_since_confirmation": 3,
    "seller_name": "Nome público do fornecedor",
    "city": "…", "state": "MG",
    "image": "assets/products/<uuid>.jpg",
    "offer_type": "atacado|peca_unica|varejo|lote|sob_encomenda|servico",
    "condition": {
      "subtype": "saldo_com_defeitos",
      "subtype_name": "Saldo com defeitos",
      "note": "Descrição objetiva do defeito/enquadramento (≤280)"
    }
  }]
}
```

`condition` aparece **só** nos 4 subtipos de saldos (`saldo_sem_defeitos`,
`saldo_com_defeitos`, `ponta_de_estoque`, `outra_oportunidade` — VDV-20261006-01);
`note` entra só nos 2 que exigem nota e fica `null`/ausente nos comuns. Fora do
ramo de saldos o campo não existe.

Nunca presente: contato/telefone (encriptado no banco), username ou id do
Telegram de pessoas, procuras, dados de moderação, eventos.

## Regras do catálogo

- Elegibilidade = regra canônica do feed do bot: anúncio `active` + publicado +
  fornecedor ativo + **foto principal ativa**. Sem foto → **fora do catálogo**.
- Frescura: `days_since_confirmation >= 7` mostra aviso; o auditor do bot
  auto-pausa anúncios com 14+ dias sem confirmação.

## Como rodar local

Abrir `index.html` (a busca é client-side sobre o JSON; nenhum build). Navegue
até `produto/index.html?id=<uuid>`.

## Sincronização

O dono do bot roda no repositório privado, a cada ciclo (manual v1):

```
.venv/bin/python scripts/sync_vitrine_web.py
```

Ele exporta catálogo + fotos, faz 1 commit e tenta 1 push; falha de push é só
log — o bot nunca depende disto.

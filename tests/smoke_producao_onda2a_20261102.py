# -*- coding: utf-8 -*-
"""Mandato A.2 — os OITO smokes públicos em PRODUÇÃO (URL real, leitura pura).

Variante do smoke_hm_web_20261102.py da A.1 apontada para o site real
(https://vitrinedevenda.com.br). Descoberta viva: ids/links vêm do ar
(products.json/procuras.json) e os diretórios locais do repo web servem de
candidatos (tombstones = dirs locais não vivos).

  1. Home 200 + contêiner da Procura intocado + min.js do dia
  2. Explorar 200
  3. Página de categoria 200 (link extraído do products.json do ar)
  4. Página de produto 200 (shell JS)
  5. Página de fornecedor 200 (link extraído do products.json do ar)
  6. Procuras vivas 200 + tombstones 200 com noindex
  7. Shape dos JSONs públicos (products.json 13 anúncios / procuras.json)
  8. Sem dados pessoais vazados (allowlist) em JSONs e páginas
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
import urllib.request

BASE = "https://vitrinedevenda.com.br/"
REPO = Path(r"C:\Users\Limao\vdv-vitrine")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126 Safari/537.36"}
ok_i = 0


def ok(msg: str) -> None:
    global ok_i
    ok_i += 1
    print("OK  " + msg)


def fetch(relative: str) -> str:
    req = urllib.request.Request(BASE + relative, headers=UA)
    with urllib.request.urlopen(req, timeout=20) as r:
        body = r.read().decode("utf-8", "replace")
        assert r.status == 200, f"{relative}: {r.status}"
    return body


def main() -> int:
    site = REPO

    # 1 — Home
    home = fetch("")
    assert '<div class="procura-list" id="grid-procuras">' in home, "contêiner procura ausente"
    min_js = re.search(r'vdv\.min\.js\?v=([0-9\-]+)', home)
    assert min_js and min_js.group(1) == "20261102-2", f"min.js != 20261102-2: {min_js and min_js.group(1)}"
    ok("1. Home 200 contêiner procura + vdv.min.js?v=20261102-2")

    # 2 — Explorar
    exp = fetch("explorar/index.html")
    ok(f"2. Explorar 200 ({len(exp):,} bytes)")

    # 7-precisa — JSONs primeiro (fontes da descoberta)
    products_raw = fetch("data/products.json")
    p_json = json.loads(products_raw)
    pro_raw = fetch("data/procuras.json")
    p_pro = json.loads(pro_raw)

    # 3 — categoria (slug real do primeiro produto)
    cat_slug = p_json["products"][0].get("category", {}).get("slug")
    assert cat_slug, "produto sem category.slug"
    cat_rel = f"categoria/{cat_slug}/index.html"
    fetch(cat_rel)
    ok(f"3. Página de categoria '{cat_rel}' 200")

    # 4 — produto shell
    prod = fetch("produto/index.html")
    ok(f"4. Página de produto 200 (shell JS; {len(prod):,} bytes)")

    # 5 — fornecedor (slug real do primeiro produto)
    forn_slug = p_json["products"][0].get("supplier_slug")
    assert forn_slug, "produto sem supplier_slug"
    forn_rel = f"fornecedor/{forn_slug}/index.html"
    fetch(forn_rel)
    ok(f"5. Página de fornecedor '{forn_rel}' 200")

    # 6 — procuras vivas (ids do ar) + tombstones (dirs locais fora do ar)
    ids_vivos = [p_["id"] for p_ in p_pro["procuras"]]
    for pid in ids_vivos:
        fetch(f"procura/{pid}/index.html")
    dirs_loc = sorted(d_.name for d_ in (site / "procura").iterdir() if d_.is_dir())
    tomb = [t for t in dirs_loc if t not in set(ids_vivos)]
    for t in tomb:
        h = fetch(f"procura/{t}/index.html")
        assert "noindex" in h and ("indisponível" in h or "Procura indisponível" in h), f"tombstone {t} incorreto"
    assert len(pro_raw) and len(ids_vivos) == p_pro["total"], "total procuras.json divergente"
    ok(f"6. Procuras vivas 200 ({len(ids_vivos)}) + tombstones 200 c/ noindex ({len(tomb)})")

    # 7 — shapes
    assert p_json["total"] == 13, f"products.json total={p_json['total']} (esperado 13)"
    assert len(p_json["products"]) == 13
    ok("7. products.json: 13 anúncios (zero regressão)")
    assert {"generated_at", "bot_username", "total", "procuras"} <= set(p_pro)
    assert all("id" in p and "description" in p for p in p_pro["procuras"])
    ok("7a. procuras.json: envelope público idêntico (aditivo)")

    # 8 — dados pessoais
    blobs = [products_raw, pro_raw, home] + [
        fetch(f"procura/{pid}/index.html") for pid in ids_vivos
    ]
    bad = [i for i, b in enumerate(blobs) if re.search(
        r"buyer_user_id|whatsapp_phone|@username|telegram_phone|\+\d{9,}", b)]
    assert not bad, f"vazamento suspeito em blobs índices {bad}"
    ok(f"8. Sem dados pessoais ({len(blobs)} blobs checados)")

    print(f"\nOK — {ok_i} checks em PRODUÇÃO ({BASE})")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print(f"SMOKES FALHARAM: {type(exc).__name__}: {exc}")
        sys.exit(1)
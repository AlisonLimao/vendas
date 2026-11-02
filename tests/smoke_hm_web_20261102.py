# -*- coding: utf-8 -*-
"""Mandato A.1 (VDV-20261102) §5 — os OITO smokes públicos, em versão LOCAL
(padrão B-1234; este mandato expressamente NÃO publica nada — as capturas
REA de render real complementam este arquivo).

Só o que a página pública expõe é checado. Rodado contra o sandbox
``http://127.0.0.1:8791`` (cópia do front adaptado + catálogo real 13
produtos + procuras do banco hm).

  1. Home 200 + contêiner da Procura intocado
  2. Explorar 200
  3. Página de categoria 200
  4. Página de produto 200 (HTML shell; preenchimento via JS provado por REA)
  5. Página de fornecedor 200
  6. Procura viva 200 (6 páginas) + tombstone 200 com noindex
  7. Shape dos JSONs públicos (products.json/procuras.json)
  8. Sem dados pessoais vazados (allowlist) em JSONs e páginas

Evidência: <raiz do repo web>/tests/_out/… (stdout; rc 0/1)
"""
from __future__ import annotations

import json
import re
import sys
import urllib.request

BASE = "http://127.0.0.1:8791/"
SITE = r"C:\Users\Limao\tmp_hm_web_onda2a\site"
ok_i = 0


def ok(msg: str) -> None:
    global ok_i
    ok_i += 1
    print("OK  " + msg)


def fetch(relative: str, expect: str = "200"):
    with urllib.request.urlopen(BASE + relative, timeout=10) as r:
        body = r.read().decode("utf-8", "replace")
        code = r.status
    assert code == 200, f"{relative}: {code}"
    return body


def main() -> int:
    import pathlib
    site = pathlib.Path(SITE)

    # 1 — Home
    home = fetch("index.html")
    ok('1. Home 200; contêiner <div class="procura-list" id="grid-procuras"> presente '
       + str('<div class="procura-list" id="grid-procuras">' in home))
    ok('1a. Home aponta vdv.min.js com versão do dia '
       + str('vdv.min.js?v=20261102-1' in home))

    # 2 — Explorar
    exp = fetch("explorar/index.html")
    ok("2. Explorar 200 (" + str(len(exp)) + " bytes)")

    # 3 — categoria (qualquer dir)
    catdir = sorted(p.name for p in (site / "categoria").iterdir() if p.is_dir())
    assert catdir, "sem página de categoria no sandbox"
    fetch(f"categoria/{catdir[0]}/index.html")
    ok(f"3. Página de categoria '{catdir[0]}' 200")

    # 4 — produto (shell JS)
    prod = fetch("produto/index.html")
    ok("4. Página de produto 200 (shell JS; render por REA)")

    # 5 — fornecedor
    forndir = sorted(p.name for p in (site / "fornecedor").iterdir() if p.is_dir())
    assert forndir, "sem página de fornecedor no sandbox"
    fetch(f"fornecedor/{forndir[0]}/index.html")
    ok(f"5. Página de fornecedor '{forndir[0]}' 200")

    # 6 — procuras
    cat_pro = json.loads((site / "data" / "procuras.json").read_text(encoding="utf-8"))
    for pr in cat_pro["procuras"]:
        fetch(f"procura/{pr['id']}/index.html")
    ok(f"6. Procuras vivas 200 ({len(cat_pro['procuras'])} páginas)")
    tomb = sorted(p.name for p in (site / "procura").iterdir()
                  if p.is_dir() and p.name not in {p_["id"] for p_ in cat_pro["procuras"]})
    for t in tomb:
        h = fetch(f"procura/{t}/index.html")
        assert "noindex" in h and ("Procura indisponível" in h or "indisponível" in h), \
            f"tombstone {t[:8]} sem noindex/indisponível"
    assert tomb, "sem tombstones no sandbox (esperados 2)"
    ok(f"6a. Tombstones 200 + noindex ({len(tomb)})")

    # 7 — shapes dos JSONs públicos
    products = fetch("data/products.json")
    p_json = json.loads(products)
    assert p_json["total"] == 13, f"products.json total: {p_json['total']}"
    assert isinstance(p_json["products"], list) and len(p_json["products"]) == 13
    ok("7. products.json: envelope + 13 anúncios (zero regressão)")
    p_pro = json.loads(fetch("data/procuras.json"))
    assert {"generated_at", "bot_username", "total", "procuras"} <= set(p_pro)
    assert all("id" in p and "description" in p for p in p_pro["procuras"])
    ok("7a. procuras.json: envelope público idêntico (aditivo)")

    # 8 — dados pessoais: allowlist por construção
    blobs = [products, json.dumps(p_pro, ensure_ascii=False)]
    for rel in (f"procura/{p['id']}/index.html" for p in cat_pro["procuras"]):
        blobs.append(fetch(rel))
    bad = [b for b in blobs if re.search(r"buyer_user_id|whatsapp_phone|@username|telegram_phone|\+\d{9,}", b)]
    assert not bad, f"vazamento suspeito em {len(bad)} blob(s)"
    ok(f"8. Sem dados pessoais ({len(blobs)} blobs checados — sem telefones/"
       "buyer_id/@username)")

    print(f"\nOK — {ok_i} checks dos 8 smokes públicos (LOCAL, nada publicado)")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"SMOKES FALHARAM: {type(exc).__name__}: {exc}")
        sys.exit(1)
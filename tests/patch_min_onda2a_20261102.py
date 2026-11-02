# -*- coding: utf-8 -*-
"""Mandato A.1 (VDV-20261102) — patch em bytes do ``vdv.min.js``.

Aplica no minificado as MESMAS mudanças semânticas do ``assets/app.js``
(fonte), que é o que as páginas de produção carregam (``vdv.min.js?v=…``):

1. Quantidade: só quando presente; unidade REAL quando informada
   (vocabulário 0034); "un" apenas para o registro legado (quantidade sem
   unidade); sem quantidade → segmento omitido (nunca "un" órfão).
2. Selo ("procura-tag"): serviço → "Serviço", aluguel → "Aluguel";
   compra e registro legado mantêm o selo atual ("Procura").

Cada trecho antigo DEVE ocorrer EXATAMENTE uma vez (aborta caso contrário).
``--dry`` imprime os fragmentos sem aplicar. Validado com ``node --check``.
Página de detalhe da procura: gerada pelo exportador do backend (zero JS)
— fora deste patch.
"""
from __future__ import annotations

import pathlib
import subprocess
import sys

MIN = pathlib.Path(__file__).resolve().parent.parent / "assets" / "js" / "vdv.min.js"

# " “ "
CURLY = "“"

# Fragmento ORIGINAL do innerHTML (idêntico nos dois ramos; o ramo 2a começa
# em "u.innerHTML=..." e o 2b em "}else t.innerHTML=...") até o fechamento de
# string + _(a) + " ” </span>" + d — bordas completas.
OLD_TAG_INNER = (
    "<span class=\"procura-tag\">Procura</span>"
    "<span class=\"procura-quote\">"
    + CURLY
    + "'+_(a)+\"”</span>\""
)
# Mesmo local com interpolado de w (strings 100% em aspas simples — balanceadas):
NEW_TAG_INNER = (
    "<span class=\"procura-tag\">"
    "'+_(w)+'</span><span class=\"procura-quote\">"
    + CURLY
    + "'"
    "+_(a)+\"”</span>\""
)
W_DEF = (
    "var u=document.createElement(\"span\"),w=e.need_type===\"aluguel\""
    "?\"Aluguel\":e.need_type===\"servico\"?\"Serviço\":\"Procura\";"
)

EDITS = [
    # 1) quantidade + preço (ordem preservada: categoria · quantidade · preço)
    (
        "c+=_(e.quantity)+\" un\",i&&(c+=\" · \"+i);",
        "null!=e.quantity&&(c+=_(String(e.quantity))+\" \"+"
        "(e.quantity_unit?_(e.quantity_unit):\"un\")),i&&(c+=(c?\" · \":\"\")+i);",
    ),
    # 2a) selo no ramo com miniatura (define w UMA vez; escopo do forEach)
    (
        "var u=document.createElement(\"span\");u.className=\"procura-body\","
        "u.innerHTML='" + OLD_TAG_INNER,
        W_DEF + "u.className=\"procura-body\",u.innerHTML='" + NEW_TAG_INNER,
    ),
    # 2b) selo no ramo textual (mesma w)
    (
        "}else t.innerHTML='" + OLD_TAG_INNER,
        "}else t.innerHTML='" + NEW_TAG_INNER,
    ),
]


def main() -> int:
    s = MIN.read_text(encoding="utf-8")
    for i, (old, _) in enumerate(EDITS):
        n = s.count(old)
        if n != 1:
            print(f"[min] ABORTADO: trecho {i+1} ocorre {n}x (esperado 1): {old[:52]!r}…")
            return 1
    if "--dry" in sys.argv:
        for i, (old, new) in enumerate(EDITS):
            print(f"--- trecho {i+1} OLD:\n{old}\n--- trecho {i+1} NEW:\n{new}\n")
        return 0
    for old, new in EDITS:
        s = s.replace(old, new)
    for old, _ in EDITS:
        assert old not in s, "trecho antigo sobrou no min.js"
    for _, new in EDITS:
        assert new in s, "trecho novo ausente no min.js"
    MIN.write_text(s, encoding="utf-8")
    # Validação de sintaxe real do min resultante:
    chk = subprocess.run(  # noqa: S603 — argumentos literais fixos
        ["node", "--check", str(MIN)],  # noqa: S603
        capture_output=True, text=True,
    )
    if chk.returncode != 0:
        print("[min] node --check FALHOU no resultado:\n" + chk.stderr[:600])
        return 1
    print(f"[min] OK — {len(EDITS)} trechos aplicados; node --check OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
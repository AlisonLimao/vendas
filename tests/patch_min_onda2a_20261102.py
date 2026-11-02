# -*- coding: utf-8 -*-
"""Mandato A.1 (VDV-20261102) — patch em bytes do ``vdv.min.js``.

Fonte ÚNICA da transformação: aplica sobre o min.js PRISTINE (e52c317, pré
Mandato A.1) as mudanças semânticas do ``assets/js/app.js`` (fonte), que as
páginas de produção carregam (``vdv.min.js?v=…``):

1. Loc: cada segmento leva o SEU separador condicional — categoria SEM
   "· " embutido; quantidade só quando presente (nunca "un" órfão /
   segmento vazio); unidade REAL do vocabulário 0034 quando informada;
   "un" fallback apenas para registro sem unidade; preço opcional como antes.
2. Selo ("procura-tag") derivado de need_type: serviço → "Serviço",
   aluguel → "Aluguel"; compra e registro legado mantêm "Procura".
   ``var w`` é inicializada ANTES do ``if(l)`` — dentro do ramo o hoisting a
   deixaria undefined no ramo textual (selo vazio; regressão vista no
   render REAL do sandbox hm e corrigida na rodada 2).

Cada trecho antigo DEVE ocorrer EXATAMENTE uma vez (aborta caso contrário).
``--dry`` imprime os fragmentos. Validado com ``node --check``.
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

# Edit 1 — quantidade/preço/separadores (loc da home)
OLD_LOC = (
    "var c=e.category&&e.category.name?_(e.category.name)+\" · \":\"\";"
    "c+=_(e.quantity)+\" un\",i&&(c+=\" · \"+i);"
)
NEW_LOC = (
    "var c=e.category&&e.category.name?_(e.category.name):\"\";"
    "null!=e.quantity&&(c+=(c?\" · \":\"\")+_(String(e.quantity))+\" \"+"
    "(e.quantity_unit?_(e.quantity_unit):\"un\")),i&&(c+=(c?\" · \":\"\")+i);"
)

# Edit 2 — selo com hoisting seguro do w (definido no mesmo var de d, ANTES
# do if(l)); innerHTML dos DOIS ramos interpola _(w) — strings single-quote
# balanceadas.
OLD_SELO = (
    "var d='<span class=\"procura-loc\">'+_(c)+\"</span>\";"
    "if(l){t.classList.add(\"procura-line--media\");"
    "var u=document.createElement(\"span\");"
    "u.className=\"procura-body\",u.innerHTML='"
    "<span class=\"procura-tag\">Procura</span>"
    "<span class=\"procura-quote\">" + CURLY + "'+_(a)+\"”</span>\"+d,"
    "t.appendChild(l),t.appendChild(u)}"
    "else t.innerHTML='<span class=\"procura-tag\">Procura</span>"
    "<span class=\"procura-quote\">" + CURLY + "'+_(a)+\"”</span>\"+d;"
)
NEW_SELO = (
    "var d='<span class=\"procura-loc\">'+_(c)+\"</span>\","
    "w=e.need_type===\"aluguel\"?\"Aluguel\":e.need_type===\"servico\""
    "?\"Serviço\":\"Procura\";"
    "if(l){t.classList.add(\"procura-line--media\");"
    "var u=document.createElement(\"span\");"
    "u.className=\"procura-body\",u.innerHTML='"
    "<span class=\"procura-tag\">'+_(w)+'</span>"
    "<span class=\"procura-quote\">" + CURLY + "'+_(a)+\"”</span>\"+d,"
    "t.appendChild(l),t.appendChild(u)}"
    "else t.innerHTML='<span class=\"procura-tag\">'+_(w)+'</span>"
    "<span class=\"procura-quote\">" + CURLY + "'+_(a)+\"”</span>\"+d;"
)

EDITS = [(OLD_LOC, NEW_LOC), (OLD_SELO, NEW_SELO)]


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
        print("[min] node --check FALHOU no resultado:\n" + (chk.stderr or "")[:600])
        return 1
    print(f"[min] OK — {len(EDITS)} trechos aplicados; node --check OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
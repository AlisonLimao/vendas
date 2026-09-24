/* Vitrine de Atacado — render client-side sobre data/products.json (estático).
 * Sem framework, sem backend, sem coleta de dados. Todo CTA vira deep link do
 * Telegram (BANCO → WEB — este site nunca escreve em lugar nenhum).
 *
 * Páginas: body[data-page="home"] (index.html), body[data-page="produto"],
 * body[data-page="explorar"] (explorar/index.html), body[data-page="favoritos"]
 * (favoritos/index.html) e páginas institucionais (data-page="institucional"
 * — só deep links).
 */
(function () {
  "use strict";

  var FRESH_DAYS = 7; // aviso de frescura a partir de 7 dias (decisão 31/08)
  var DEFAULT_BOT = "vitrine_vendasbot";
  // R5 (VDV-20260923-01) — snapshot de navegação compartilhado pela Home,
  // /explorar/ e /favoritos/: quem navega para um produto (ou para a outra
  // página) guarda filtros/rolagem; quem volta consome uma única vez.
  var HOME_STATE_KEY = "vdv:home-state";
  // Faixas editoriais só entram quando há catálogo suficiente pra não
  // duplicar card na tela (Home 2.0 — vitrine comprador-first).
  // R4 (VDV-20260923-01, mestre itens 13-15): trilho de grupo e rotação
  // "Em exposição agora" fundidos na seleção "Para você explorar".
  var RECENT_STRIP_MIN = 5;  // faixa "Acabou de chegar" com >= 5 produtos
  var NOVIDADES_CAP = 8;     // teto de cards em "Acabou de chegar" (grade)
  var EXPLORAR_CAP = 8;      // teto de cards em "Para você explorar"
  var VITRINES_CAP = 4;      // teto de chips em "Vitrines do VDV"
  var AVAILABILITY_LABELS = {
    pronta_entrega: "Pronta entrega",
    em_producao: "Em produção",
    sob_pedido: "Sob pedido",
  };
  var pageAttr = document.body.getAttribute("data-page") || "";
  var prefix = (pageAttr === "produto" || pageAttr === "explorar" ||
    pageAttr === "favoritos") ? "../" : "";

  function track(eventName, params) {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", eventName, params || {});
  }

  // Fatia 30 (VDV-20260909-05) — telemetria própria da vitrine, SEMPRE
  // consent-gated (mesma gate do GA): o wrapper abaixo intercepta a MESMA
  // função que liga o GA (TermsFeed, nível "tracking"; callbacks_force
  // re-dispara a cada visita com consentimento já dado). Antes do aceite,
  // nenhum byte sai — a coleta é opcional como o GA.
  //
  // Deploy dark encerrado (Alison liberou a ponte em 11/09/2026): a coleta
  // aponta para a rota própria do VDV no túnel Cloudflare
  // (api.vitrinedevenda.com.br). Continua SEMPRE consent-gated — sem aceite,
  // nenhum byte sai (mesma gate do GA).
  var TELEMETRIA_URL = 'https://api.vitrinedevenda.com.br/eventos';
  var consentimentoTelemetria = false;
  (function () {
    var original = window.vdvGrantAnalyticsAndTrackPage;
    window.vdvGrantAnalyticsAndTrackPage = function () {
      consentimentoTelemetria = true;
      if (typeof original === "function") original();
    };
  })();

  // sid: id aleatório de SESSÃO (sem valor próprio — o servidor persiste só
  // o hash efêmero sha256(sid + salt diário); o salt nunca sai do servidor).
  // Escopo de aba (sessionStorage); modo privado → id descartável.
  var vdvSid = (function () {
    try {
      var key = "vdv:sid";
      var v = sessionStorage.getItem(key);
      if (!v) {
        v = (Math.random().toString(36) + Date.now().toString(36) +
          Math.random().toString(36)).slice(0, 24);
        sessionStorage.setItem(key, v);
      }
      return v;
    } catch (e) {
      return (Math.random().toString(36) + Date.now().toString(36)).slice(0, 24);
    }
  })();

  // VDV-20260921-01 (Bloco 3) — origem de compartilhamento rastreável: a URL
  // compartilhada carrega ``?o=<canal>`` e o visitante que chega por ela
  // tem a origem preservada na navegação da sessão (sessionStorage — escopo
  // de aba, sem valor próprio além de "veio de um compartilhamento").
  // Allowlist fechada, espelhada na allowlist do servidor (migração 0026):
  // ``web`` (navegação direta), ``compartilhamento`` (share nativo, alvo
  // desconhecido), ``compartilhamento_whatsapp/facebook/google`` e
  // ``seller_share`` (compartilhamento do próprio vendedor). Falha ou
  // valor fora da lista = "web" (nunca inventar origem).
  var ORIGEM_PARAMS = {
    whatsapp: "compartilhamento_whatsapp",
    facebook: "compartilhamento_facebook",
    google: "compartilhamento_google",
    seller_share: "seller_share",
    compartilhamento: "compartilhamento"
  };
  var vdvOrigem = (function () {
    try {
      var p = new URL(window.location.href).searchParams.get("o");
      if (p && ORIGEM_PARAMS[p]) {
        sessionStorage.setItem("vdv:origem", ORIGEM_PARAMS[p]);
        return ORIGEM_PARAMS[p];
      }
      var v = sessionStorage.getItem("vdv:origem");
      if (v) return v;
    } catch (e) { /* silêncio */ }
    return "web";
  })();

  // Evento da vitrine (plano 08 §3): POST one-way via sendBeacon (text/plain
  // = requisição simples, sem preflight). Campos fechados; refs opcionais.
  // Falha = silêncio — telemetria nunca atrapalha nem atrasa a vitrine.
  function telemetria(tipo, refs) {
    if (!TELEMETRIA_URL || !consentimentoTelemetria) return;
    var payload = { type: tipo, sid: vdvSid, origin: vdvOrigem };
    if (refs) {
      if (refs.product) payload.product = refs.product;
      if (refs.supplier) payload.supplier = refs.supplier;
      if (refs.category) payload.category = refs.category;
      if (refs.channel) payload.channel = refs.channel;
    }
    try {
      navigator.sendBeacon(TELEMETRIA_URL, JSON.stringify(payload));
    } catch (e) { /* silêncio */ }
  }

  // VDV-20260912-01 — sinal OPERACIONAL (medição operacional mínima, decisão
  // de 12/09): sinais agregados de direção do produto que valem MESMO quando
  // o visitante recusa cookies. Diferenças da telemetria() consentida:
  // SEM gate de consentimento, SEM sid (nenhum identificador — nada é
  // hasheado nem persistido além de tipo/refs/canal), sem cookie, sem
  // localStorage de rastreamento, sem fingerprint. Campos fechados:
  // {type, origin, product?, category?, channel?} — supplier e tipos
  // da stream consentida não existem aqui. Tipos: page_view/like/share/
  // contact_click. Falha = silêncio (nunca atrapalha a vitrine).
  var SINAL_URL = 'https://api.vitrinedevenda.com.br/sinal';
  function sinal(tipo, refs) {
    if (!SINAL_URL) return;
    var payload = { type: tipo, origin: vdvOrigem };
    if (refs) {
      if (refs.product) payload.product = refs.product;
      if (refs.category) payload.category = refs.category;
      if (refs.channel) payload.channel = refs.channel;
    }
    try {
      navigator.sendBeacon(SINAL_URL, JSON.stringify(payload));
    } catch (e) { /* silêncio */ }
  }

  // Fase 0 do "gostei" (VDV-20260905-01): favoritos locais — a lista de
  // compras do comprador, salva no NAVEGADOR (localStorage), sem backend e
  // sem cadastro. O clique no coração "v❤️" envia o evento ``like`` pela
  // ponte de telemetria (consent-gated, igual aos outros) — APENAS ao
  // favoritar (desfavoritar não manda evento, para não inflar o sinal).
  // VDV-20260912-01: o like TAMBÉM vai pelo sinal operacional (sem
  // identificador, vale sem aceite) — desfavoritar segue sem evento.
  var favoritos = (function () {
    try {
      var v = JSON.parse(localStorage.getItem("vdv:favoritos") || "[]");
      return Array.isArray(v) ? v.filter(function (x) { return typeof x === "string"; }) : [];
    } catch (e) { return []; }
  })();

  function ehFavorito(id) { return favoritos.indexOf(id) !== -1; }

  // Atualiza todos os corações do produto (card + página) após um toggle.
  function sincronizarCores(productoId) {
    var liked = ehFavorito(productoId);
    Array.prototype.forEach.call(
      document.querySelectorAll('.card-like[data-id="' + productoId + '"]'),
      function (btn) { btn.classList.toggle("is-liked", liked); }
    );
    var likeBtn = document.getElementById("like-btn");
    if (likeBtn && likeBtn.getAttribute("data-id") === productoId) {
      likeBtn.classList.toggle("is-liked", liked);
      likeBtn.textContent = liked ? "❤ Gostando deste produto" : "❤ Gostei deste produto";
    }
  }

  function alternarFavorito(id) {
    var i = favoritos.indexOf(id);
    var agoraFavorito = i === -1;
    if (agoraFavorito) {
      favoritos.push(id);
      telemetria("like", { product: id });
      sinal("like", { product: id });
    } else {
      favoritos.splice(i, 1);
    }
    try { localStorage.setItem("vdv:favoritos", JSON.stringify(favoritos)); } catch (e) { /* silêncio */ }
    sincronizarCores(id);
    renderFavoritos();
    return agoraFavorito;
  }

  function botaoLike(productoId) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card-like" + (ehFavorito(productoId) ? " is-liked" : "");
    btn.setAttribute("data-id", productoId);
    btn.setAttribute("aria-label", "Gostei deste produto");
    btn.textContent = "v❤";
    btn.addEventListener("click", function (ev) {
      // O coração fica sobre o card (que é um link): o clique no coração
      // NÃO abre o produto.
      ev.preventDefault();
      ev.stopPropagation();
      alternarFavorito(productoId);
    });
    return btn;
  }

  // Favoritos: na Home, a seção some quando a lista fica vazia. Na página
  // /favoritos/ (R5 — VDV-20260923-01), ela nunca some: re-renderiza sobre o
  // catálogo a cada toggle e alterna com o estado vazio (CTA para /explorar/).
  function renderFavoritos() {
    var section = $("section-favoritos");
    if (!section) return; // páginas sem a seção (produto, institucionais)
    var grid = $("grid-favoritos");
    if (!grid) return;
    var presentes = (window.__vdvCatalogProducts || [])
      .filter(function (p) { return ehFavorito(p.id); });
    grid.innerHTML = "";
    presentes
      .slice()
      .reverse()
      .forEach(function (p) { grid.appendChild(cardEl(p)); });
    if (document.body.getAttribute("data-page") === "favoritos") {
      section.hidden = presentes.length === 0;
      var vazio = $("favoritos-vazio");
      if (vazio) vazio.hidden = presentes.length > 0;
      var count = $("favoritos-count");
      if (count) {
        count.textContent = presentes.length
          ? presentes.length + " produto" + (presentes.length > 1 ? "s" : "") +
            " salvo" + (presentes.length > 1 ? "s" : "")
          : "";
      }
      return;
    }
    section.hidden = presentes.length === 0;
  }

  function $(id) { return document.getElementById(id); }

  function esc(text) {
    return String(text == null ? "" : text).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Preço monetário pt-BR com milhar (VDV-20260903-01): "17000.00" -> "17.000,00".
  function fmtMoney(value) {
    var n = Number(value);
    if (!isFinite(n)) n = 0;
    var parts = n.toFixed(2).split(".");
    var inteira = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return inteira + "," + parts[1];
  }

  // VDV-20260906-01: campo renomeado de sale_type para offer_type no
  // exportador. Fallback legacy enquanto o JSON publicado anterior existir.
  function offerType(p) {
    return p.offer_type || p.sale_type || "atacado";
  }

  // VDV-20260911-01k: rótulos públicos do tipo de oferta (mesmos do bot) —
  // "atacado" deixou de ser regra global; páginas de produto apresentam o
  // tipo do anúncio.
  var OFFER_TYPE_LABELS = {
    atacado: "atacado",
    peca_unica: "peça única",
    varejo: "varejo",
    lote: "lote fechado",
    sob_encomenda: "sob encomenda",
    servico: "serviço"
  };

  // Fatia 26 (VDV-20260907-03): publicação assistida — o dono da oferta é o
  // vendedor exibido e quem recebe a negociação. Fallback legacy p/ JSON antigo.
  function publicationMode(p) {
    return p.publication_mode || "own_offer";
  }

  function isAssisted(p) {
    return publicationMode(p) === "assisted_for_third_party";
  }

  // VDV-20260906-02: o tipo de oferta define a leitura do preço (a categoria
  // descreve o QUE é anunciado; o tipo descreve COMO é oferecido). html=true
  // usa <small> nos cards; texto puro para o compartilhamento do WhatsApp.
  function priceLine(p, html) {
    var t = offerType(p);
    var temPreco = p.price != null && p.price !== "" && isFinite(Number(p.price));
    var preco = temPreco ? "R$ " + fmtMoney(p.price) : "";
    function nota(s) {
      return html ? " <small>· " + s + "</small>" : " (" + s + ")";
    }
    if (t === "sob_encomenda") {
      return temPreco ? preco + nota("Sob encomenda") : "Sob encomenda";
    }
    if (t === "servico") {
      return temPreco ? preco + nota("Consultar condições") : "Consultar condições";
    }
    if (t === "peca_unica") return preco + nota("Item único");
    if (t === "varejo") return preco + nota("Varejo");
    if (t === "lote") return preco + nota("Lote fechado");
    // atacado (default): preço por peça + pedido mínimo (só quando > 1).
    if (!temPreco) return "Preço sob consulta";
    var linha = preco + " / peça";
    if (p.minimum_order > 1) linha += nota("Mínimo: " + p.minimum_order + " peças");
    return linha;
  }

  function fmtPrice(p) {
    return priceLine(p, true);
  }

  function availabilityBadge(p) {
    if (!AVAILABILITY_LABELS[p.availability]) return "";
    var isReady = p.availability === "pronta_entrega";
    return '<span class="badge' + (isReady ? " badge-ok" : "") + '">' +
      esc(AVAILABILITY_LABELS[p.availability]) + "</span> ";
  }

  function freshnessBadge(p) {
    if (p.days_since_confirmation == null) return "";
    return p.days_since_confirmation >= FRESH_DAYS
      ? '<span class="badge badge-warn">Confirmar disponibilidade</span>'
      : "";
  }

  function saleBadge(p) {
    return offerType(p) === "peca_unica"
      ? '<span class="badge badge-sale">🏷️ PEÇA ÚNICA</span>'
      : "";
  }

  function freshText(p) {
    var d = p.days_since_confirmation;
    if (d == null) return "📅 Disponibilidade a confirmar";
    if (d >= FRESH_DAYS) {
      return "⚠️ Disponibilidade não confirmada há " + d +
        " dias — confirme com o fornecedor";
    }
    if (d === 0) return "✅ Disponibilidade confirmada hoje pelo fornecedor";
    return "✅ Disponibilidade confirmada há " + d + " dia" + (d > 1 ? "s" : "") +
      " pelo fornecedor";
  }

  function deepLink(kind, product) {
    var bot = window.__VDV_BOT__ || DEFAULT_BOT;
    // VDV-20260905-03: kind "denuncia" — com produto vira payload
    // denuncia_<uuid> (botão na página do produto), sem produto vira
    // "denuncia" (link do rodapé).
    // Fatia 29 (VDV-20260908-03): kind "comentario" — payload
    // comentario_<uuid> (o visitante comenta pelo bot; moderação no /admin).
    var map = {
      procura: "procura", vender: "vender", home: "",
      denuncia: "denuncia", comentario: "comentario"
    };
    var param;
    if (product) {
      var payloadPrefix = { denuncia: "denuncia_", comentario: "comentario_" }[kind];
      param = (payloadPrefix || "produto_") + product.id;
    } else {
      param = map[kind] || "";
    }
    return "https://t.me/" + bot + (param ? "?start=" + param : "");
  }

  /* URL pública de compartilhamento do produto (página estática com OG
   * resolvido no export — VDV-20260901-04). É a URL que vai na mensagem
   * compartilhada, para o card de preview sair com foto/título do produto.
   * Bloco 3 (VDV-20260921-01): ``?o=<origem>`` na URL compartilhada —
   * wa.me explícito = "whatsapp"; share nativo do sistema (alvo à escolha
   * da pessoa) = "compartilhamento" (sem alegar canal que não se sabe). */
  function shareUrl(product, origem) {
    var url = new URL(prefix + "produto/" + product.id + "/", window.location.href);
    if (origem) url.searchParams.set("o", origem);
    return url.href;
  }

  function whatsappShareUrl(product) {
    var msg = product.title + " — " + fmtPriceText(product) + "\n" + shareUrl(product, "whatsapp");
    return "https://wa.me/?text=" + encodeURIComponent(msg);
  }

  /* Logos oficiais dos canais (VDV-20260905-05) — SVG inline (24x24,
   * preenchimento currentColor; cores da marca ficam no CSS). Paths do
   * simple-icons.org (licença CC0), inline para não depender de rede/CDN. */
  var ICON_TELEGRAM =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>';
  var ICON_WHATSAPP =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';

  function fmtPriceText(p) {
    return priceLine(p, false);
  }

  function renderStaticLinks(bot) {
    window.__VDV_BOT__ = bot;
    Array.prototype.forEach.call(document.querySelectorAll("[data-deep-link]"), function (el) {
      el.setAttribute("href", deepLink(el.getAttribute("data-deep-link")));
      el.addEventListener("click", function () {
        track("clique_telegram", {
          origem: el.getAttribute("data-ga-origin") || el.getAttribute("data-deep-link") || "nao_identificada",
          event_category: "telegram",
          event_label: el.getAttribute("data-ga-origin") || el.getAttribute("data-deep-link") || "nao_identificada",
          transport_type: "beacon"
        });
        // Fatia 30: deep link de procura → procura_click; de vender
        // (anunciar) → advertise_click. Outros deep links não viram evento.
        var kind = el.getAttribute("data-deep-link");
        if (kind === "procura") telemetria("procura_click");
        else if (kind === "vender") telemetria("advertise_click");
      });
    });
  }

  // R2 (VDV-20260923-01, mestre item 12): contêiner de imagem 4:5 fixo.
  // cover é o padrão (moda = cena/modelo); Impressão 3D usa contain (produto
  // isolado — cortar confunde a leitura). Heurística pelo grupo da categoria.
  // Placeholder neutro quando a foto não existe ou falha o download (decisão
  // do Alison 23/09: falha de apresentação não desclassifica o anúncio).
  function isImpressao3d(p) {
    var g = p.category && p.category.group && p.category.group.slug;
    return g === "impressao_3d" || (p.category && p.category.slug === "impressao_3d");
  }

  // R4 — seleção "Para você explorar": funde o antigo trilho de grupo e a
  // rotação "Em exposição agora" em uma seleção única e honesta — recência
  // (ordem do exportador, published_at DESC) com distribuição entre
  // categorias (round-robin), cap fixo, sem ranking inventado e sem rotação.
  // Exclui os ids já exibidos (invariante "sem duplicar card na tela").
  function pickExplorar(products, excludeIds, cap) {
    var buckets = [];
    var byCat = {};
    products.forEach(function (p) {
      if (excludeIds[p.id]) return;
      var slug = (p.category && p.category.slug) || "_sem_categoria";
      if (!byCat[slug]) { byCat[slug] = []; buckets.push(byCat[slug]); }
      byCat[slug].push(p);
    });
    var picked = [];
    var round = 0;
    while (picked.length < cap) {
      var progressou = false;
      for (var b = 0; b < buckets.length; b++) {
        if (buckets[b].length > round) {
          picked.push(buckets[b][round]);
          progressou = true;
          if (picked.length >= cap) break;
        }
      }
      if (!progressou) break;
      round += 1;
    }
    return picked;
  }

  function cardImgPlaceholder() {
    var ph = document.createElement("div");
    ph.className = "card-imgph";
    ph.setAttribute("role", "img");
    ph.setAttribute("aria-label", "Sem foto");
    ph.textContent = "Sem foto";
    return ph;
  }

  function cardMedia(p) {
    if (!p.image) return cardImgPlaceholder();
    var img = document.createElement("img");
    img.loading = "lazy";
    img.src = prefix + p.image;
    img.alt = p.title;
    // R3 (VDV-20260923-01, mestre itens 12/41): card pequeno usa a thumbnail
    // WebP (400w) gerada pelo exportador; a original fica de fallback (e para
    // navegadores sem srcset). Se a thumb falhar, tenta a original antes de
    // aceitar o placeholder — falha de download não apaga o produto.
    if (p.image_thumb) {
      img.setAttribute("srcset", prefix + p.image_thumb + " 400w");
      img.setAttribute("sizes", "(max-width: 767px) 46vw, 276px");
      img.setAttribute("data-fallback-src", prefix + p.image);
    }
    if (isImpressao3d(p)) img.className = "card-img-contain";
    img.addEventListener("error", function () {
      var fb = img.getAttribute("data-fallback-src");
      if (fb) {
        img.removeAttribute("data-fallback-src");
        img.removeAttribute("srcset");
        img.src = fb;
        return;
      }
      img.replaceWith(cardImgPlaceholder());
    });
    return img;
  }

  function cardEl(p) {
    // Fase 0 do "gostei": o card vira um wrapper (card-wrap) com o link
    // inteiro de sempre + o coração (botão FORA do <a> — button dentro de
    // link é HTML inválido e o clique dispararia a navegação).
    var wrap = document.createElement("div");
    wrap.className = "card-wrap";
    var a = document.createElement("a");
    a.className = "card";
    a.href = prefix + "produto/index.html?id=" + encodeURIComponent(p.id);
    a.addEventListener("click", function () {
      track("abrir_produto", {
        produto_id: p.id,
        categoria: p.category.slug,
        seller_name: p.seller_name
      });
    });
    a.appendChild(cardMedia(p));
    var body = document.createElement("div");
    body.className = "card-body";
    body.innerHTML =
      '<p class="card-title">' + esc(p.title) + "</p>" +
      (p.seller_name
        ? '<span class="card-seller"' +
          (p.supplier_slug
            ? ' data-seller-href="' + esc(prefix + "fornecedor/" + p.supplier_slug + "/") + '"'
            : "") +
          ">" +
          esc(p.seller_name) + "</span>"
        : "") +
      '<p class="card-meta">' + (p.category && p.category.name ? esc(p.category.name) + " · " : "") +
      esc(p.city) + "/" + esc(p.state) + "</p>" +
      '<p class="card-price">' + fmtPrice(p) + "</p>" +
      '<p class="card-flags">' + availabilityBadge(p) + saleBadge(p) + freshnessBadge(p) + "</p>" +
      '<p class="card-more">Ver detalhes <span aria-hidden="true">→</span></p>';
    a.appendChild(body);
    // R2: fornecedor navegável no card — clique no nome não navega para o
    // produto, vai para a vitrine (mesmo padrão do coração: fora do fluxo do <a>).
    var sellerEl = body.querySelector(".card-seller");
    if (sellerEl && sellerEl.getAttribute("data-seller-href")) {
      sellerEl.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        track("abrir_vitrine", { seller_name: p.seller_name });
        location.href = sellerEl.getAttribute("data-seller-href");
      });
    }
    wrap.appendChild(a);
    wrap.appendChild(botaoLike(p.id));
    return wrap;
  }

  function fill(grid, list) {
    grid.innerHTML = "";
    list.forEach(function (p) { grid.appendChild(cardEl(p)); });
  }

  // ------------------------------------------------------------------ home
  function initHome(catalog) {
    var products = catalog.products || [];
    var status = $("status");
    var sectionRecent = $("section-novidades");
    var sectionEmpty = $("section-empty");
    var results = $("results");

    status.textContent = "";

    // R5 (VDV-20260923-01) — o catálogo segue acessível ao módulo de
    // favoritos (a página /favoritos/ re-renderiza sobre ele a cada toggle).
    window.__vdvCatalogProducts = products;

    // Faixas editoriais: só quando o catálogo sustenta (sem duplicar card).
    // VDV-20260907-14: a faixa fixa "⚡ Pronta entrega" saiu do topo — pronta
    // entrega é disponibilidade escolhida pelo anunciante, não faixa editorial;
    // o visitante filtra pelo chip em "Explore a vitrine".
    var hasPronta = products.some(function (p) { return p.availability === "pronta_entrega"; });
    var showRecentStrip = products.length >= RECENT_STRIP_MIN;
    sectionRecent.hidden = !showRecentStrip;
    // Fatia 32 — trilho horizontal: mais cards do que a antiga faixa de 4,
    // mas com teto (a grade exaustiva continua sendo "Explore a vitrine").
    if (showRecentStrip) fill($("grid-recent"), products.slice(0, NOVIDADES_CAP));

    // VDV-20260916-05 — contagem por grupo/sub em uma passada (reusada pelo
    // bloco único de categorias e pelo trilho de grupo da Fatia 32).
    var groups = {};
    products.forEach(function (p) {
      var c = p.category || {};
      var g = c.group || {};
      if (!g.slug) return;
      var gr = groups[g.slug] ||
        (groups[g.slug] = { slug: g.slug, name: g.name || g.slug, n: 0, subs: {} });
      gr.n += 1;
      var sub = gr.subs[c.slug] ||
        (gr.subs[c.slug] = { slug: c.slug, name: c.name || c.slug, n: 0 });
      sub.n += 1;
    });

    // VDV-20260916-05 — bloco único de categorias: um só ponto de navegação na
    // Home. Grupo em destaque — LINK para a página estática quando existe
    // (gate >= 5 já aplicado pelo exportador em catalog.category_pages; nunca
    // 404) ou FILTRO do grupo inteiro quando não. Subcategorias com anúncios
    // ficam logo abaixo como filtro local com contagem; categoria raiz
    // (group.slug === category.slug, ex.: Impressão 3D) não se repete. O bloco
    // NÃO some durante a busca (o filtro ativo precisa continuar na tela).
    // Zero telemetria nova: o filtro cai no telemetria("search") existente via
    // assinatura; o link reusa o evento abrir_categoria da Fatia 32.
    var sectionCategorias = $("section-categorias");
    var catPages = catalog.category_pages || [];
    var pageBySlug = {};
    catPages.forEach(function (cp) { pageBySlug[cp.slug] = cp; });
    var showCategorias = products.length > 0;
    sectionCategorias.hidden = !showCategorias;
    var catChips = $("chips-categorias");

    // VDV-20260921-01 (Bloco 1) — taxonomia navegável em 2 níveis, derivada
    // dos produtos (a taxonomia exportada é a fonte de verdade; nada
    // hardcoded). Nível 1: só raízes (grupos) + "Toda a vitrine". Nível 2,
    // só com raiz ativa E filhos diretos: "Tudo em <categoria>" + filhos.
    // Trocar de raiz limpa obrigatoriamente o filho; "Toda a vitrine" limpa
    // ambos (e a disponibilidade); "Tudo em <categoria>" limpa só o filho.
    // Raiz nunca vira link: a navegação para a página estática (gate >= 5)
    // mora no nível 2 como ação discreta — filtro e navegação não se
    // misturam. Busca textual combina sem apagar o termo.
    var selectedCategory = "";     // raiz ativa (slug do grupo)
    var selectedSubcategory = "";  // filho ativo (slug da sub)
    var AVAIL_FILTER = { value: "pronta_entrega", label: "⚡ Pronta entrega" };
    var activeAvail = "";
    function setChipPressed(chip) {
      var slug = chip.getAttribute("data-slug");
      var grp = chip.getAttribute("data-group");
      var avail = chip.getAttribute("data-avail");
      if (chip.hasAttribute("data-all")) {
        chip.setAttribute("aria-pressed",
          String(!selectedCategory && !selectedSubcategory));
      } else if (slug) {
        chip.setAttribute("aria-pressed", String(slug === selectedSubcategory));
      } else if (grp) {
        chip.setAttribute("aria-pressed",
          String(grp === selectedCategory && !selectedSubcategory));
      } else if (avail !== null) {
        chip.setAttribute("aria-pressed", String(avail === activeAvail));
      }
    }
    function syncChipStates() {
      Array.prototype.forEach.call(catChips.children, function (row) {
        Array.prototype.forEach.call(row.children, setChipPressed);
      });
    }
    function renderCatBlock() {
      catChips.innerHTML = "";
      if (!showCategorias) return;
      var row1 = document.createElement("div");
      row1.className = "cat-row cat-row-l1";
      var allChip = document.createElement("button");
      allChip.type = "button";
      allChip.className = "chip chip-all";
      allChip.setAttribute("aria-pressed", "false");
      allChip.setAttribute("data-all", "1");
      allChip.textContent = "Toda a vitrine";
      allChip.addEventListener("click", function () {
        selectedCategory = "";
        selectedSubcategory = "";
        activeAvail = "";
        renderCatBlock();
        renderSearch();
      });
      row1.appendChild(allChip);
      Object.keys(groups)
        .map(function (k) { return groups[k]; })
        .sort(function (a, b) { return b.n - a.n; })
        .forEach(function (gr) {
          var chip = document.createElement("button");
          chip.type = "button";
          chip.className = "chip chip-group";
          chip.setAttribute("aria-pressed", "false");
          chip.setAttribute("data-group", gr.slug);
          chip.textContent = gr.name + " (" + gr.n + ")";
          chip.addEventListener("click", function () {
            selectedCategory = selectedCategory === gr.slug ? "" : gr.slug;
            selectedSubcategory = "";
            renderCatBlock();
            renderSearch();
          });
          row1.appendChild(chip);
        });
      if (hasPronta) {
        var availChip = document.createElement("button");
        availChip.type = "button";
        availChip.className = "chip";
        availChip.setAttribute("aria-pressed", "false");
        availChip.setAttribute("data-avail", AVAIL_FILTER.value);
        availChip.textContent = AVAIL_FILTER.label;
        availChip.addEventListener("click", function () {
          activeAvail = activeAvail === AVAIL_FILTER.value ? "" : AVAIL_FILTER.value;
          renderCatBlock();
          renderSearch();
        });
        row1.appendChild(availChip);
      }
      catChips.appendChild(row1);
      var current = selectedCategory ? groups[selectedCategory] : null;
      if (!current) { syncChipStates(); return; }
      var children = Object.keys(current.subs)
        .map(function (k) { return current.subs[k]; })
        .filter(function (s) { return s.slug !== current.slug; })
        .sort(function (a, b) { return b.n - a.n; });
      if (children.length) {
        var row2 = document.createElement("div");
        row2.className = "cat-row cat-row-l2";
        var allIn = document.createElement("button");
        allIn.type = "button";
        allIn.className = "chip chip-group";
        allIn.setAttribute("aria-pressed", "false");
        allIn.setAttribute("data-group", current.slug);
        allIn.textContent = "Tudo em " + current.name;
        allIn.addEventListener("click", function () {
          selectedSubcategory = "";
          renderCatBlock();
          renderSearch();
        });
        row2.appendChild(allIn);
        children.forEach(function (s) {
          var chip = document.createElement("button");
          chip.type = "button";
          chip.className = "chip";
          chip.setAttribute("aria-pressed", "false");
          chip.setAttribute("data-slug", s.slug);
          chip.textContent = s.name + " " + s.n;
          chip.addEventListener("click", function () {
            selectedSubcategory = selectedSubcategory === s.slug ? "" : s.slug;
            renderCatBlock();
            renderSearch();
          });
          row2.appendChild(chip);
        });
        var page = pageBySlug[current.slug];
        if (page) {
          var pgLink = document.createElement("a");
          pgLink.className = "chip chip-page";
          pgLink.href = "categoria/" + encodeURIComponent(current.slug) + "/";
          pgLink.textContent = "Página de " + current.name + " →";
          pgLink.addEventListener("click", function () {
            track("abrir_categoria", { categoria_slug: current.slug, event_category: "navegacao" });
          });
          row2.appendChild(pgLink);
        }
        catChips.appendChild(row2);
      }
      syncChipStates();
    }
    renderCatBlock();

    // R4 — "Para você explorar": substitui o trilho de grupo da Fatia 32 e a
    // rotação "Em exposição agora" (VDV-20260907-08). Cards não repetem os da
    // faixa "Acabou de chegar" (invariante "sem duplicar card na tela").
    var sectionExplorar = $("section-explorar");
    var recentesIds = {};
    if (showRecentStrip) {
      products.slice(0, NOVIDADES_CAP).forEach(function (p) { recentesIds[p.id] = true; });
    }
    var explorarCards = pickExplorar(products, recentesIds, EXPLORAR_CAP);
    var showExplorar = explorarCards.length > 0;
    sectionExplorar.hidden = !showExplorar;
    if (showExplorar) fill($("grid-explorar"), explorarCards);

    // VDV-20260907-06 — seção "Vitrines do VDV": um chip por fornecedor
    // (dedup por supplier_slug, primeiro display vence — mesmo critério do
    // exportador). Some quando nenhum produto tem fornecedor resolvido.
    var sectionVitrines = $("section-vitrines");
    var seenSuppliers = {};
    var suppliers = [];
    products.forEach(function (p) {
      if (!p.supplier_slug || seenSuppliers[p.supplier_slug]) return;
      seenSuppliers[p.supplier_slug] = true;
      suppliers.push({ slug: p.supplier_slug, name: p.offer_owner_name || p.seller_name });
    });
    sectionVitrines.hidden = suppliers.length === 0;
    if (suppliers.length) {
      var chips = $("chips-vitrines");
      chips.innerHTML = "";
      suppliers.slice(0, VITRINES_CAP).forEach(function (s) {
        var a = document.createElement("a");
        a.className = "chip";
        a.href = "fornecedor/" + encodeURIComponent(s.slug) + "/";
        a.textContent = s.name;
        a.addEventListener("click", function () {
          track("abrir_vitrine", { fornecedor_slug: s.slug, event_category: "navegacao" });
          telemetria("supplier_view", { supplier: s.slug });
        });
        chips.appendChild(a);
      });
    }

    // R5 (VDV-20260923-01) — a grade completa "Explore a vitrine" saiu da
    // Home: ver o catálogo inteiro (com busca + filtros) virou a página
    // /explorar/, linkada no topo, no hero, no "Ver tudo" e no bottombar.

    var input = $("search");
    var clearBtn = $("clear-search");

    function setBrowseVisibility(searching) {
      // VDV-20260916-05 — o bloco de categorias NÃO some durante a busca: os
      // chips de filtro moram nele e o filtro ativo precisa continuar na tela
      // (trocar/desmarcar sem limpar a busca inteira).
      sectionCategorias.hidden = products.length === 0;
      sectionRecent.hidden = searching || !showRecentStrip;
      sectionExplorar.hidden = searching || !showExplorar;
      sectionEmpty.hidden = searching || products.length > 0;
    }

    // Fatia 30: busca é evento de intenção — 1 evento por assinatura
    // (termo+categoria+disponibilidade) mudada, não por tecla.
    var ultimaBuscaEnviada = "";
    function renderSearch() {
      var q = input.value.replace(/\s+/g, " ").trim().toLowerCase();
      var cat = selectedSubcategory;
      var grp = selectedCategory;
      var avail = activeAvail;
      var searching = q !== "" || cat !== "" || grp !== "" || avail !== "";
      results.hidden = !searching;
      clearBtn.hidden = !searching;
      setBrowseVisibility(searching);
      if (!searching) return;
      var found = products.filter(function (p) {
        if (avail && p.availability !== "pronta_entrega") return false;
        if (cat && p.category.slug !== cat) return false;
        if (grp && (!p.category.group || p.category.group.slug !== grp)) return false;
        if (!q) return true;
        var hay = (p.title + " " + p.description + " " + p.category.name + " " +
          p.city + " " + p.seller_name).toLowerCase();
        return q.split(" ").every(function (term) { return hay.indexOf(term) !== -1; });
      });
      // VDV-20260921-01 (Bloco 1) — contexto pai › filho ativo + contagem.
      var ctx = [];
      if (grp) ctx.push(groups[grp] ? groups[grp].name : grp);
      if (cat) {
        var g = groups[grp];
        ctx.push(g && g.subs[cat] ? g.subs[cat].name : cat);
      }
      var contagem = found.length
        ? found.length + " oferta" + (found.length > 1 ? "s" : "") + " encontrada" + (found.length > 1 ? "s" : "")
        : "Nada encontrado — tente outro termo";
      $("results-title").textContent = ctx.length
        ? ctx.join(" › ") + " · " + contagem
        : contagem;
      fill($("results-grid"), found);
      // Bloco 5 (VDV-20260921-01) — CTA de Procura contextual, só quando a
      // busca não acha nada (link já emite procura_click no deep link).
      $("results-procura").hidden = found.length > 0;
      var assinatura = q + "|" + cat + "|" + grp + "|" + avail;
      if (assinatura !== ultimaBuscaEnviada) {
        ultimaBuscaEnviada = assinatura;
        telemetria("search", { category: cat || grp || null });
        if (!found.length) telemetria("search_zero_result", { category: cat || grp || null });
      }
    }

    input.addEventListener("input", renderSearch);
    clearBtn.addEventListener("click", function () {
      input.value = "";
      selectedSubcategory = "";
      selectedCategory = "";
      activeAvail = "";
      renderCatBlock();
      results.hidden = true;
      clearBtn.hidden = true;
      setBrowseVisibility(false);
    });

    if (products.length === 0) {
      sectionCategorias.hidden = true;
      sectionRecent.hidden = true;
      sectionEmpty.hidden = false;
    }

    // VDV-20260909-01 — retorno ao feed com estado. Ao abrir um produto (ou
    // navegar para /explorar/ e /favoritos/, R5), a Home guarda rolagem, busca
    // e filtros em sessionStorage (escopo de aba). Ao voltar, o estado volta e
    // o snapshot é limpo — restaura uma única vez, sem contaminar entrada
    // direta/deep link.
    function saveHomeState() {
      try {
        sessionStorage.setItem(HOME_STATE_KEY, JSON.stringify({
          scrollY: window.scrollY,
          q: input.value,
          cat: selectedSubcategory,
          grp: selectedCategory,
          avail: activeAvail
        }));
      } catch (e) { /* modo privado: sem snapshot, a Home abre do zero */ }
    }
    document.addEventListener("click", function (ev) {
      if (ev.defaultPrevented || ev.button !== 0 ||
          ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
      var t = ev.target;
      var a = t && t.closest ? t.closest(
        'a[href*="produto/index.html?id="], a[href$="explorar/"], a[href$="favoritos/"]'
      ) : null;
      if (a) saveHomeState();
    });

    try {
      var raw = sessionStorage.getItem(HOME_STATE_KEY);
      if (raw) {
        sessionStorage.removeItem(HOME_STATE_KEY);
        var snap = JSON.parse(raw);
        if (snap && typeof snap === "object") {
          input.value = typeof snap.q === "string" ? snap.q : "";
          selectedCategory = typeof snap.grp === "string" ? snap.grp : "";
          selectedSubcategory = typeof snap.cat === "string" ? snap.cat : "";
          // VDV-20260921-01 (Bloco 1) — validação contra o catálogo atual:
          // raiz que não existe mais some; filho sem raiz válida (ou filho
          // que deixou de existir) nunca fica órfão.
          if (selectedCategory && !groups[selectedCategory]) selectedCategory = "";
          if (selectedSubcategory) {
            var gs = groups[selectedCategory];
            if (!gs || !gs.subs[selectedSubcategory] ||
                selectedSubcategory === selectedCategory) selectedSubcategory = "";
          }
          activeAvail = snap.avail === AVAIL_FILTER.value ? snap.avail : "";
          renderCatBlock();
          renderSearch();
          if (snap.scrollY) {
            requestAnimationFrame(function () { window.scrollTo(0, snap.scrollY); });
          }
        }
      }
    } catch (e) { /* snapshot inválido: segue com estado limpo */ }
  }

  // --------------------------------------------------------------- produto
  // VDV-20260916-04 — "Continue explorando": candidatos 100% client-side de
  // products.json (BANCO → WEB: nada novo no JSON). Primeiro o mesmo
  // anunciante, depois o mesmo grupo de categoria; produto atual excluído;
  // cap 8. A seção inteira some com menos de 2 itens (nunca título vazio).
  function relatedProducts(catalog, product) {
    var out = [];
    var seen = {};
    seen[product.id] = true;
    var pool = catalog.products || [];
    function addFrom(pred) {
      for (var i = 0; i < pool.length && out.length < 8; i++) {
        if (seen[pool[i].id] || !pred(pool[i])) continue;
        seen[pool[i].id] = true;
        out.push(pool[i]);
      }
    }
    var group = product.category && product.category.group;
    if (product.supplier_slug) {
      addFrom(function (p) { return p.supplier_slug === product.supplier_slug; });
    }
    if (group) {
      addFrom(function (p) {
        return !!(p.category && p.category.group &&
          p.category.group.slug === group.slug);
      });
    }
    return out;
  }

  function initProduto(catalog) {
    var main = $("produto-main");
    var status = $("status");
    var productId = new URLSearchParams(window.location.search).get("id") || "";
    var product = null;
    for (var i = 0; i < (catalog.products || []).length; i++) {
      if (catalog.products[i].id === productId) { product = catalog.products[i]; break; }
    }

    if (!product) {
      status.textContent = "Produto não encontrado — pode ter sido pausado, " +
        "expirado ou vendido. A reativação acontece no bot.";
      var back = document.createElement("a");
      back.className = "btn btn-primary btn-cta";
      back.href = prefix + "index.html";
      back.textContent = "Ver ofertas";
      main.appendChild(back);
      document.title = "Produto não encontrado — VDV, Vitrine de Vendas";
      return;
    }

    status.hidden = true;
    document.title = product.title + " — VDV, Vitrine de Vendas";
    // Fatia 30: visualização do produto (consent-gated; sem consentimento
    // nem TELEMETRIA_URL, é no-op). VDV-20260912-01: a abertura da página
    // de produto TAMBÉM é sinal operacional (sem identificador, vale sem
    // aceite) — o indicador de visitas é abertura de página.
    telemetria("product_view", { product: product.id });
    sinal("page_view", { product: product.id });
    var isPecaUnica = offerType(product) === "peca_unica";
    // Fatia 32: página do grupo existe? (decidido no export pelo gate — o
    // front só confere a lista das páginas publicadas).
    var prodGroup = product.category && product.category.group;
    var temPaginaGrupo = !!(prodGroup && (catalog.category_pages || []).some(
      function (cp) { return cp.slug === prodGroup.slug; }
    ));
    var ownerSuffix = (isAssisted(product) && product.offer_owner_name)
      ? " · oferta de " + product.offer_owner_name
      : "";
    // VDV-20260911-01k: o "atacado" não é regra global (pós-0015) — o OG
    // apresenta o tipo do anúncio (varejo, lote fechado, sob encomenda...).
    var typeLabel = OFFER_TYPE_LABELS[offerType(product)] || "atacado";
    setOg("og:title", product.title + " — " + typeLabel + " em " + product.city +
      "/" + product.state + ownerSuffix);
    setOg("og:description", product.description.slice(0, 160));
    var ogImg = document.querySelector('meta[property="og:image"]');
    if (!ogImg) {
      ogImg = document.createElement("meta");
      ogImg.setAttribute("property", "og:image");
      document.head.appendChild(ogImg);
    }
    ogImg.setAttribute("content", new URL(product.image, window.location.href).href);

    var qty = product.quantity ? " · " + product.quantity + " un em estoque" : "";
    // Idem: tipos de mínimo fixo (varejo/lote/sob encomenda/serviço) nascem
    // com minimum_order=1 — "Pedido mínimo: 1 unidades" é ruído; mesma regra
    // dos cards (só mostra mínimo quando > 1).
    var moLi = isPecaUnica
      ? "<li>🏷️ Peça única — valor da unidade</li>"
      : (product.minimum_order > 1
        ? "<li>🧾 Pedido mínimo: " + product.minimum_order + " unidades</li>"
        : "");
    // Galeria completa (VDV-20260903-03): principal + extras; sem `images`
    // (JSON antigo em cache), degrada para a foto única de sempre.
    var photos = (product.images && product.images.length > 0)
      ? product.images
      : [product.image];
    // VDV-20260911-07 — foto escolhida na galeria vira a foto compartilhada
    // (Web Share API Level 2; o preview do link em si não muda — ele é gerado
    // pelo servidor do WhatsApp a partir da og:image fixa do export).
    var fotoSelecionada = 0;
    var thumbs = photos.length > 1
      ? '<div class="prod-thumbs" role="group" aria-label="Fotos do produto">' +
        Array.prototype.map.call(photos, function (src, i) {
          return '<button type="button" class="prod-thumb' + (i === 0 ? " is-active" : "") +
            '" data-src="' + esc(prefix + src) + '" aria-label="Ver foto ' + (i + 1) + '">' +
            '<img loading="lazy" src="' + esc(prefix + src) + '" alt=""></button>';
        }).join("") +
        "</div>"
      : "";
    // Fatia 26: modo assistido com contato comercial do dono → canal único do
    // dono (href pronto no export, valor cru só dentro do href). Sem contato,
    // cai no deep link do bot (nunca mostra canal do publicador como se fosse
    // do dono).
    var assisted = isAssisted(product);
    var cc = (assisted && product.commercial_contact && product.commercial_contact.link)
      ? product.commercial_contact
      : null;
    var ownerLabel = (cc && cc.nome) || "o responsável pela oferta";
    var channelsHtml;
    if (cc && cc.tipo === "whatsapp") {
      channelsHtml =
        '<a class="btn-channel wa" target="_blank" rel="noopener" href="' +
        esc(cc.link) + '" data-wa-contact>' +
        ICON_WHATSAPP + "<span>Falar com " + esc(ownerLabel) + " no WhatsApp</span></a>";
    } else if (cc) {
      channelsHtml =
        '<a class="btn-channel tg" href="' +
        esc(cc.link) + '" data-ga-origin="produto_telegram_direto">' +
        ICON_TELEGRAM + "<span>Falar com " + esc(ownerLabel) + " no Telegram</span></a>";
    } else {
      channelsHtml =
        '<a class="btn-channel tg" href="' +
        esc(product.telegram_contact && product.telegram_contact.link
          ? product.telegram_contact.link
          : deepLink("interesse", product)) +
        '" data-ga-origin="' + (product.telegram_contact ? "produto_telegram_direto" : "produto_tenho_interesse") + '">' +
        ICON_TELEGRAM + "<span>Falar no Telegram</span></a>" +
        (product.whatsapp && product.whatsapp.link
          ? '<a class="btn-channel wa" target="_blank" rel="noopener" href="' +
            esc(product.whatsapp.link) + '" data-wa-contact>' +
            ICON_WHATSAPP + "<span>Falar no WhatsApp</span></a>"
          : "");
    }
    // VDV-20260916-04 — bloco do vendedor: quem vende em evidência, entre a
    // decisão (título/preço) e o contato. Iniciais em círculo (sem foto nova,
    // sem dado novo); link para a vitrine do fornecedor quando existe.
    var sellerName = (assisted && product.offer_owner_name) || product.seller_name;
    var initials = (sellerName || "?").trim().split(/\s+/)
      .map(function (w) { return w.charAt(0); }).slice(0, 2).join("").toUpperCase();
    var sellerCardHtml =
      '<div class="seller-card">' +
      '<span class="seller-avatar" aria-hidden="true">' + esc(initials) + "</span>" +
      '<div class="seller-info">' +
      '<p class="seller-name">' + esc(sellerName) + "</p>" +
      '<p class="seller-loc">' + esc(product.city) + "/" + esc(product.state) +
      (assisted ? " · 🤝 cadastro assistido no VDV" : "") + "</p>" +
      (product.supplier_slug
        ? '<a href="' + prefix + 'fornecedor/' + esc(product.supplier_slug) +
          '/">Ver todos os produtos de ' + esc(sellerName) + " &rarr;</a>"
        : "") +
      "</div></div>";

    main.innerHTML =
      '<div class="prod-gallery">' +
      '<img class="prod-photo" id="prod-photo-main" loading="lazy" width="640" height="640" src="' +
      esc(prefix + photos[0]) + '" alt="' + esc(product.title) + '">' +
      thumbs +
      "</div>" +
      '<h1 class="prod-title">' + esc(product.title) + "</h1>" +
      '<p class="prod-price">' + fmtPrice(product) + "</p>" +
      // Fase 0 do "gostei": favoritar pela página do produto (o estado vive
      // no localStorage junto com os corações dos cards — sincronizados).
      '<button type="button" class="prod-like' + (ehFavorito(product.id) ? " is-liked" : "") +
      '" id="like-btn" data-id="' + esc(product.id) + '" aria-label="Salvar este produto nos favoritos">❤ ' +
      (ehFavorito(product.id) ? "Gostando deste produto" : "Gostei deste produto") + "</button>" +
      // R6 (VDV-20260923-01, mestre item 19) — ordem de decisão: DISPONIBILIDADE
      // vem logo depois do preço; as CONDIÇÕES DA OFERTA (pedido mínimo etc.)
      // descem para depois da descrição.
      '<ul class="prod-facts prod-disp">' +
      "<li>📦 " + esc(AVAILABILITY_LABELS[product.availability] || "Disponível") + qty + "</li>" +
      "<li>🗓️ " + esc(freshText(product)) + "</li>" +
      "</ul>" +
      sellerCardHtml +
      // Canais de contato (VDV-20260905-05): os dois no MESMO tamanho padrão,
      // lado a lado, com as cores/logos oficiais dos canais — identifica pelo
      // ícone antes de ler. Telegram: chat DIRETO do anunciante (t.me gerado no
      // export, username só dentro do href — VDV-20260905-06); sem username,
      // cai para o deep link do bot. WhatsApp = link wa.me gerado no export.
      '<div class="contact-channels">' + channelsHtml + "</div>" +
      '<span class="wa-note">Escolha o canal para falar sobre este anúncio — o contato é direto com ' +
      (assisted ? "o responsável pela oferta." : "o anunciante.") + "</span>" +
      // VDV-20260916-04 — modelo de confiança explícito no momento da decisão
      // de contato: o VDV não fica no meio do pagamento.
      '<p class="trust-pill">O VDV não recebe o pagamento — a negociação é direta entre vocês</p>' +
      '<p class="prod-desc">' + esc(product.description) + "</p>" +
      // R6 — CONDIÇÕES DA OFERTA depois da descrição (mestre item 19): a
      // decisão (nome/preço/disp/vendedor/contato) vem primeiro. Sem campo
      // estruturado de condição de pagamento — quando o anunciante escreve,
      // já está na descrição.
      '<ul class="prod-facts prod-cond">' +
      moLi +
      (product.category && product.category.name
        ? "<li>Categoria: " + esc(product.category.name) + "</li>"
        : "") +
      "</ul>" +
      // VDV-20260910-02 — divulgação em bloco próprio, mesmo padrão de botão
      // dos canais de contato. GA #share-wa / compartilhar_produto intacto.
      '<span class="action-label">Divulgar</span>' +
      '<div class="action-grid"><a class="btn-channel share" target="_blank" rel="noopener" href="' +
      esc(whatsappShareUrl(product)) + '" id="share-wa">' +
      ICON_WHATSAPP + "<span>Compartilhar este produto</span></a></div>" +
      '<p class="prod-seller">A negociação acontece direto no bot, sem cadastro neste site.</p>' +
      // Fatia 29 (VDV-20260908-03) — comentários de visitantes: seção com os
      // comentários APROVADOS (vêm do export, só name/text/date) + CTA para
      // comentar pelo bot (payload comentario_<uuid>; moderação no /admin).
      (product.comments && product.comments.length > 0
        ? '<section class="prod-comments" aria-label="Comentários sobre este produto">' +
          '<h2>💬 Comentários (' + product.comments.length + ')</h2>' +
          '<ul class="comment-list">' +
          Array.prototype.map.call(product.comments, function (c) {
            var name = c.name || "Anônimo";
            var date = c.date ? ' <span class="comment-date">' + esc(c.date) + "</span>" : "";
            return '<li class="comment"><p class="comment-text">' + esc(c.text || "") +
              '</p><p class="comment-meta">— ' + esc(name) + date + "</p></li>";
          }).join("") +
          "</ul></section>"
        : "") +
      '<p class="prod-comment-cta"><a class="btn btn-ghost" href="#" id="comment-link">💬 Comentar sobre este produto</a></p>' +
      // Fatia 32 (VDV-20260916-01) — "Mais em <grupo> →" espelhando a página
      // estática. SÓ quando o grupo ganhou página (gate no export). R6: no
      // bloco de navegação pós-decisão (mestre item 19 — MAIS DESTA VITRINE).
      (temPaginaGrupo
        ? '<p class="prod-more"><a href="' + prefix + 'categoria/' +
          esc(product.category.group.slug) + '/">Mais em ' +
          esc(product.category.group.name || product.category.group.slug) +
          " &rarr;</a></p>"
        : "") +
      // VDV-20260916-04 — "Continue explorando": exploração depois da decisão
      // (mesmo anunciante → mesmo grupo; cap 8; some com < 2 itens).
      '<section class="prod-related" aria-label="Continue explorando">' +
      "<h2>Continue explorando</h2>" +
      '<div class="grid" id="prod-related-grid"></div>' +
      "</section>" +
      // VDV-20260905-03 — canal de denúncia (payload denuncia_<uuid> no bot).
      '<p class="prod-report"><a href="#" id="report-link">🚩 Denunciar este anúncio</a></p>';

    // R6 (VDV-20260923-01, mestre item 20) — sticky do produto no mobile:
    // PREÇO + WHATSAPP sempre acessíveis durante a rolagem. Usa o mesmo
    // canal autorizado do bloco de contato — WhatsApp do anunciante ou do
    // dono assistido; sem WhatsApp, deep link do bot ("Falar com o vendedor").
    // Escondida ≥768px no CSS (no desktop o CTA fica no fluxo).
    var stickyEl = $("prod-sticky");
    if (stickyEl) {
      var stickyWaLink = (cc && cc.tipo === "whatsapp" && cc.link)
        ? cc.link
        : (product.whatsapp && product.whatsapp.link ? product.whatsapp.link : "");
      stickyEl.innerHTML =
        '<span class="sticky-price">' + fmtPrice(product) + "</span>" +
        (stickyWaLink
          ? '<a class="btn-channel wa sticky-cta" target="_blank" rel="noopener" href="' +
            esc(stickyWaLink) + '">' + ICON_WHATSAPP + "<span>WhatsApp</span></a>"
          : '<a class="btn-channel tg sticky-cta" href="' +
            esc(deepLink("interesse", product)) + '">' + ICON_TELEGRAM +
            "<span>Falar com o vendedor</span></a>");
      stickyEl.hidden = false;
    }

    // VDV-20260916-04: preenche "Continue explorando" (reusa cardEl/fill).
    var relatedGrid = main.querySelector("#prod-related-grid");
    if (relatedGrid) {
      var related = relatedProducts(catalog, product);
      if (related.length >= 2) {
        fill(relatedGrid, related);
      } else {
        relatedGrid.closest(".prod-related").hidden = true;
      }
    }

    // Fatia 27/30: link para a vitrine do fornecedor. Páginas estáticas
    // `fornecedor/` são zero-JS — o supplier_view é medido no CLIQUE no link
    // (aqui e nos chips "Vitrines do VDV" da Home), nunca na página estática.
    var supplierLink = main.querySelector('a[href*="fornecedor/"]');
    if (supplierLink && product.supplier_slug) {
      supplierLink.addEventListener("click", function () {
        telemetria("supplier_view", { supplier: product.supplier_slug });
      });
    }

    // Fatia 32: idem para o link "Mais em <grupo>" — página estática zero-JS,
    // o clique é medido aqui (só GA — sem novo tipo na ponte de telemetria,
    // que exigiria mudar o servidor).
    var catLink = main.querySelector('a[href*="categoria/"]');
    if (catLink && prodGroup) {
      catLink.addEventListener("click", function () {
        track("abrir_categoria", { categoria_slug: prodGroup.slug, event_category: "navegacao" });
      });
    }

    // Troca da foto principal ao tocar a miniatura (galeria — VDV-20260903-03).
    var likeBtn = main.querySelector("#like-btn");
    if (likeBtn) {
      likeBtn.addEventListener("click", function () {
        alternarFavorito(product.id);
      });
    }

    var mainPhoto = main.querySelector("#prod-photo-main");
    Array.prototype.forEach.call(main.querySelectorAll(".prod-thumb"), function (btn) {
      btn.addEventListener("click", function () {
        if (mainPhoto && btn.getAttribute("data-src")) {
          mainPhoto.src = btn.getAttribute("data-src");
        }
        // VDV-20260911-07: a foto em exibição vira a candidata ao compartilhar.
        var idx = Array.prototype.indexOf.call(main.querySelectorAll(".prod-thumb"), btn);
        if (idx !== -1) fotoSelecionada = idx;
        Array.prototype.forEach.call(main.querySelectorAll(".prod-thumb"), function (b) {
          b.classList.remove("is-active");
        });
        btn.classList.add("is-active");
      });
    });

    var cta = main.querySelector('.btn-channel.tg');
    if (cta) {
      cta.addEventListener("click", function () {
        track("clique_telegram", {
          origem: cta.getAttribute("data-ga-origin") || "produto_tenho_interesse",
          event_category: "telegram",
          event_label: product.id,
          transport_type: "beacon"
        });
        telemetria("contact_click", { product: product.id, channel: "telegram" });
        sinal("contact_click", { product: product.id, channel: "telegram" });
      });
    }

    var share = main.querySelector("#share-wa");
    if (share) {
      // VDV-20260911-07b — desktop (navegadores sem Web Share de ARQUIVOS):
      // a foto em exibição é convertida e copiada para o CLIPBOARD; o wa.me
      // abre em nova aba e a pessoa cola a foto na conversa (Ctrl+V). Sem
      // clipboard (navegador velho) → wa.me de sempre, sem copiar nada.
      function desktopShare(blob) {
        var colar = navigator.clipboard && window.ClipboardItem;
        var img = new Image();
        var objUrl = URL.createObjectURL(blob);
        img.onload = function () {
          var canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext("2d").drawImage(img, 0, 0);
          URL.revokeObjectURL(objUrl);
          canvas.toBlob(function (png) {
            if (png && colar) {
              navigator.clipboard
                .write([new ClipboardItem({ "image/png": png })])
                .then(function () {
                  var nota = document.createElement("span");
                  nota.className = "copied-note";
                  nota.textContent =
                    "📷 Foto copiada! Abra a conversa do WhatsApp e cole com Ctrl+V.";
                  var grid = main.querySelector(".action-grid");
                  if (grid && grid.parentNode) {
                    grid.parentNode.insertBefore(nota, grid.nextSibling);
                    setTimeout(function () { nota.remove(); }, 10000);
                  }
                })
                .catch(function () { /* clipboard recusado: só o link */ });
            }
            window.open(share.href, "_blank", "noopener");
          }, "image/png");
        };
        img.onerror = function () {
          URL.revokeObjectURL(objUrl);
          window.location.href = share.href; // foto ilegível: wa.me de sempre
        };
        img.src = objUrl;
      }

      share.addEventListener("click", function (ev) {
        track("compartilhar_produto", {
          produto_id: product.id,
          event_category: "compartilhamento",
          event_label: product.id,
          transport_type: "beacon"
        });
        telemetria("share", { product: product.id });
        sinal("share", { product: product.id });
        // VDV-20260911-07 — a foto em exibição vai ANEXADA na conversa (Web
        // Share API Level 2, celular): mais dinâmico que o preview do link,
        // que é gerado pelo servidor do WhatsApp a partir da og:image fixa do
        // export e não pode variar por quem compartilha.
        // VDV-20260911-07c — a via de arquivos fica restrita a TELA DE TOQUE:
        // o Chrome/Edge do Windows TAMBÉM tem navigator.share com arquivos,
        // mas abre o painel nativo do Windows (sem WhatsApp Web lá — relato
        // do Alison). pointer: coarse = celular/tablet; desktop com mouse
        // (mesmo com tela touch, o ponteiro primário é fino) vai pro clipboard.
        var comArquivos = !!(window.matchMedia &&
          window.matchMedia("(pointer: coarse)").matches) &&
          navigator.share && navigator.canShare;
        ev.preventDefault();
        if (!comArquivos) {
          // Desktop: copia a foto e abre o WhatsApp para colar (Ctrl+V).
          fetch(prefix + (photos[fotoSelecionada] || photos[0]))
            .then(function (r) {
              if (!r.ok) throw new Error("HTTP " + r.status);
              return r.blob();
            })
            .then(desktopShare)
            .catch(function () { window.location.href = share.href; });
          return;
        }
        var src = prefix + (photos[fotoSelecionada] || photos[0]);
        var nome = "vdv-" + product.id +
          (fotoSelecionada > 0 ? "-" + (fotoSelecionada + 1) : "") + ".jpg";
        var arquivo = null;
        fetch(src)
          .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.blob(); })
          .then(function (blob) {
            arquivo = new File([blob], nome, { type: blob.type || "image/jpeg" });
            if (!navigator.canShare({ files: [arquivo] })) {
              desktopShare(blob); // suporte a arquivos ausente: via desktop
              return null;
            }
            return navigator.share({
              files: [arquivo],
              title: product.title,
              text: product.title + " — " + fmtPriceText(product),
              url: shareUrl(product, "compartilhamento")
            });
          })
          .catch(function (e) {
            // AbortError = pessoa fechou o menu de compartilhamento (nada a
            // fazer); qualquer outra falha cai no fallback de sempre.
            if (e && e.name === "AbortError") return;
            window.location.href = share.href;
          });
      });
    }

    // Fatia 24 (VDV-20260904-01): CTA do WhatsApp comercial do anunciante.
    var waContact = main.querySelector("[data-wa-contact]");
    if (waContact) {
      waContact.addEventListener("click", function () {
        track("contato_whatsapp", {
          produto_id: product.id,
          event_category: "contato",
          event_label: product.id,
          transport_type: "beacon"
        });
        telemetria("contact_click", { product: product.id, channel: "whatsapp" });
        sinal("contact_click", { product: product.id, channel: "whatsapp" });
      });
    }

    // VDV-20260905-03: link de denúncia do anúncio — binding manual (o
    // renderStaticLinks roda antes do innerHTML dinâmico).
    var report = main.querySelector("#report-link");
    if (report) {
      report.href = deepLink("denuncia", product);
      report.addEventListener("click", function () {
        track("produto_denuncia", {
          produto_id: product.id,
          event_category: "moderacao",
          event_label: product.id,
          transport_type: "beacon"
        });
      });
    }

    // Fatia 29 (VDV-20260908-03): CTA de comentário — deep link
    // comentario_<uuid>; o comentário nasce pending no bot e só aparece
    // aqui após aprovação no /admin (moderação antes de publicar).
    var commentCta = main.querySelector("#comment-link");
    if (commentCta) {
      commentCta.href = deepLink("comentario", product);
      commentCta.addEventListener("click", function () {
        track("comentar_produto", {
          produto_id: product.id,
          event_category: "engajamento",
          event_label: product.id,
          transport_type: "beacon"
        });
      });
    }
  }

  function setOg(prop, value) {
    var el = document.querySelector('meta[property="' + prop + '"]');
    if (el) el.setAttribute("content", value);
  }

  // ----------------------------------------------------------- explorar (R5)
  // R5 (VDV-20260923-01, mestre item 16) — página /explorar/ substitui a grade
  // completa "Explore a vitrine" da Home. Busca textual + filtros (categoria
  // em 2 níveis, disponibilidade e tipo de oferta — só os que têm dados no
  // catálogo; sem filtro de preço/cidade com catálogo pequeno), ordenação
  // (recentes/preço), contagem, chips de filtros ativos removíveis e
  // zero-result com caminhos. Sem login: favoritos ficam no localStorage.
  // Filtros preservados ao voltar: reusa o HOME_STATE_KEY da Home.
  function initExplorar(catalog) {
    var products = catalog.products || [];
    var status = $("status");
    if (status) status.textContent = "";
    window.__vdvCatalogProducts = products;

    var input = $("search");
    var clearBtn = $("clear-search");
    var selGrupo = $("x-grupo");
    var selSub = $("x-sub");
    var selTipo = $("x-tipo");
    var selOrdem = $("x-ordem");
    var availBtn = $("x-avail");
    var countEl = $("x-count");
    var chipsEl = $("x-chips");
    var gridEl = $("x-grid");
    var zeroEl = $("x-zero");

    var AVAIL_FILTER = { value: "pronta_entrega", label: "⚡ Pronta entrega" };
    var q = "", grp = "", sub = "", tipo = "", avail = "";
    var ordem = "recentes";
    var ultimaBuscaEnviada = "";

    // Taxonomia em 2 níveis derivada dos produtos (mesma fonte da Home).
    var groups = {};
    products.forEach(function (p) {
      var c = p.category || {};
      var g = c.group || {};
      if (!g.slug) return;
      var gr = groups[g.slug] ||
        (groups[g.slug] = { slug: g.slug, name: g.name || g.slug, n: 0, subs: {} });
      gr.n += 1;
      var subG = gr.subs[c.slug] ||
        (gr.subs[c.slug] = { slug: c.slug, name: c.name || c.slug, n: 0 });
      subG.n += 1;
    });

    // Filtros só com dados no catálogo (nunca botão que não faz nada).
    var hasPronta = products.some(function (p) {
      return p.availability === "pronta_entrega";
    });
    if (availBtn) availBtn.hidden = !hasPronta;

    var tipos = {};
    products.forEach(function (p) { tipos[offerType(p)] = true; });
    Object.keys(tipos).sort().forEach(function (t) {
      var opt = document.createElement("option");
      opt.value = t;
      opt.textContent = OFFER_TYPE_LABELS[t] || t;
      selTipo.appendChild(opt);
    });

    function fillGrupoOptions() {
      selGrupo.innerHTML = "";
      var optAll = document.createElement("option");
      optAll.value = "";
      optAll.textContent = "Todas as categorias";
      selGrupo.appendChild(optAll);
      Object.keys(groups)
        .map(function (k) { return groups[k]; })
        .sort(function (a, b) { return b.n - a.n; })
        .forEach(function (gr) {
          var opt = document.createElement("option");
          opt.value = gr.slug;
          opt.textContent = gr.name + " (" + gr.n + ")";
          selGrupo.appendChild(opt);
        });
    }
    function fillSubOptions() {
      selSub.innerHTML = "";
      var optAll = document.createElement("option");
      optAll.value = "";
      optAll.textContent = "Todas as subcategorias";
      selSub.appendChild(optAll);
      var current = grp ? groups[grp] : null;
      selSub.disabled = !current;
      if (!current) return;
      Object.keys(current.subs)
        .map(function (k) { return current.subs[k]; })
        .filter(function (s) { return s.slug !== current.slug; })
        .sort(function (a, b) { return b.n - a.n; })
        .forEach(function (s) {
          var opt = document.createElement("option");
          opt.value = s.slug;
          opt.textContent = s.name + " (" + s.n + ")";
          selSub.appendChild(opt);
        });
    }
    fillGrupoOptions();
    fillSubOptions();

    // Chips de filtros ativos, removíveis (um por filtro aplicado).
    function activeChips() {
      var out = [];
      if (grp) {
        out.push({
          label: groups[grp] ? groups[grp].name : grp,
          clear: function () { grp = ""; sub = ""; }
        });
      }
      if (sub) {
        var g = groups[grp];
        var nome = g && g.subs[sub] ? g.subs[sub].name : sub;
        out.push({
          label: nome,
          clear: function () { sub = ""; }
        });
      }
      if (avail) {
        out.push({
          label: AVAIL_FILTER.label,
          clear: function () { avail = ""; }
        });
      }
      if (tipo) {
        out.push({
          label: OFFER_TYPE_LABELS[tipo] || tipo,
          clear: function () { tipo = ""; }
        });
      }
      if (q) {
        out.push({
          label: "“" + q + "”",
          clear: function () { q = ""; input.value = ""; }
        });
      }
      return out;
    }

    function aplicar() {
      var searching = q !== "" || grp !== "" || sub !== "" ||
        tipo !== "" || avail !== "";
      var found = products.filter(function (p) {
        if (avail && p.availability !== "pronta_entrega") return false;
        if (sub && p.category.slug !== sub) return false;
        if (grp && (!p.category.group || p.category.group.slug !== grp)) return false;
        if (tipo && offerType(p) !== tipo) return false;
        if (!q) return true;
        var hay = (p.title + " " + p.description + " " + p.category.name + " " +
          p.city + " " + p.seller_name).toLowerCase();
        return q.split(" ").every(function (term) {
          return hay.indexOf(term) !== -1;
        });
      });
      if (ordem === "preco") {
        found = found.slice().sort(function (a, b) {
          return Number(a.price) - Number(b.price);
        });
      }

      var ctx = [];
      if (grp) ctx.push(groups[grp] ? groups[grp].name : grp);
      if (sub) {
        var g = groups[grp];
        ctx.push(g && g.subs[sub] ? g.subs[sub].name : sub);
      }
      countEl.textContent = found.length
        ? found.length + " oferta" + (found.length > 1 ? "s" : "") +
          (q ? " para “" + input.value.trim() + "”" : "") +
          (ctx.length ? " · " + ctx.join(" › ") : "")
        : "";

      chipsEl.innerHTML = "";
      activeChips().forEach(function (chip) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "chip chip-x";
        b.setAttribute("aria-label", "Remover filtro " + chip.label);
        b.innerHTML = esc(chip.label) + ' <span aria-hidden="true">×</span>';
        b.addEventListener("click", function () {
          chip.clear();
          syncControles();
          aplicar();
        });
        chipsEl.appendChild(b);
      });

      gridEl.innerHTML = "";
      found.forEach(function (p) { gridEl.appendChild(cardEl(p)); });
      gridEl.hidden = found.length === 0;
      zeroEl.hidden = !(searching && found.length === 0);
      if (clearBtn) clearBtn.hidden = !searching;

      // Fatia 30 — busca é evento de intenção: 1 evento por assinatura mudada.
      var assinatura = q + "|" + sub + "|" + grp + "|" + tipo + "|" + avail;
      if (assinatura !== ultimaBuscaEnviada) {
        ultimaBuscaEnviada = assinatura;
        telemetria("search", { category: sub || grp || null });
        if (searching && !found.length) {
          telemetria("search_zero_result", { category: sub || grp || null });
        }
      }
    }

    // Controles seguem o estado (restore, chips removíveis e botão limpar).
    function syncControles() {
      input.value = q;
      selGrupo.value = grp;
      fillSubOptions();
      selSub.value = sub;
      selTipo.value = tipo;
      selOrdem.value = ordem;
      if (availBtn) {
        availBtn.setAttribute("aria-pressed", String(avail === AVAIL_FILTER.value));
      }
    }

    input.addEventListener("input", function () {
      q = input.value.replace(/\s+/g, " ").trim().toLowerCase();
      aplicar();
    });
    function limparTudo() {
      q = ""; grp = ""; sub = ""; tipo = ""; avail = "";
      syncControles();
      aplicar();
      input.focus({ preventScroll: true });
    }
    clearBtn.addEventListener("click", limparTudo);
    var zeroLimpar = $("x-limpar");
    if (zeroLimpar) zeroLimpar.addEventListener("click", limparTudo);
    selGrupo.addEventListener("change", function () {
      grp = selGrupo.value;
      sub = "";
      fillSubOptions();
      aplicar();
    });
    selSub.addEventListener("change", function () {
      sub = selSub.value;
      aplicar();
    });
    selTipo.addEventListener("change", function () {
      tipo = selTipo.value;
      aplicar();
    });
    selOrdem.addEventListener("change", function () {
      ordem = selOrdem.value;
      aplicar();
    });
    if (availBtn) {
      availBtn.addEventListener("click", function () {
        avail = avail === AVAIL_FILTER.value ? "" : AVAIL_FILTER.value;
        syncControles();
        aplicar();
      });
    }

    // Filtros preservados ao voltar (reuso do snapshot da Home/Vitrine).
    function saveExplorarState() {
      try {
        sessionStorage.setItem(HOME_STATE_KEY, JSON.stringify({
          scrollY: window.scrollY,
          q: input.value,
          cat: sub,
          grp: grp,
          avail: avail,
          tipo: tipo,
          ordem: ordem
        }));
      } catch (e) { /* modo privado: sem snapshot */ }
    }
    document.addEventListener("click", function (ev) {
      if (ev.defaultPrevented || ev.button !== 0 ||
          ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
      var t = ev.target;
      var a = t && t.closest ? t.closest(
        'a[href*="produto/index.html?id="], a[href="../"]'
      ) : null;
      if (a) saveExplorarState();
    });

    try {
      var raw = sessionStorage.getItem(HOME_STATE_KEY);
      if (raw) {
        sessionStorage.removeItem(HOME_STATE_KEY);
        var snap = JSON.parse(raw);
        if (snap && typeof snap === "object") {
          q = typeof snap.q === "string" ? snap.q.toLowerCase() : "";
          grp = typeof snap.grp === "string" ? snap.grp : "";
          sub = typeof snap.cat === "string" ? snap.cat : "";
          avail = snap.avail === AVAIL_FILTER.value ? snap.avail : "";
          tipo = Object.prototype.hasOwnProperty.call(tipos, snap.tipo)
            ? snap.tipo : "";
          ordem = snap.ordem === "preco" ? "preco" : "recentes";
          if (grp && !groups[grp]) { grp = ""; sub = ""; }
          if (sub) {
            var gs = groups[grp];
            if (!gs || !gs.subs[sub] || sub === grp) sub = "";
          }
          syncControles();
          aplicar();
          if (snap.scrollY) {
            requestAnimationFrame(function () { window.scrollTo(0, snap.scrollY); });
          }
        }
      }
    } catch (e) { /* snapshot inválido: segue com estado limpo */ }
  }

  // ---------------------------------------------------------- favoritos (R5)
  // Página /favoritos/ — a lista de compras do comprador vira página própria
  // (antes: seção da Home). Sem login: corações salvos no localStorage; só
  // produtos ainda presentes no catálogo aparecem. Estado vazio com CTA para
  // /explorar/ (plano R5, mestre item 17).
  function initFavoritos(catalog) {
    var status = $("status");
    if (status) status.textContent = "";
    window.__vdvCatalogProducts = catalog.products || [];
    renderFavoritos();
  }

  // ------------------------------------------------- bottom bar (VDV-20260916-04)
  // VDV-20260916-04 — navegação mobile fixa. R5 (VDV-20260923-01): Explorar e
  // Favoritos viram páginas próprias — links de navegação (href sem "#")
  // navegam de verdade; só âncoras locais são interceptadas para rolar suave.
  // Procura rola ao topo e foca o campo de busca (a página /explorar/ também
  // tem input#search — o atalho funciona nas duas). Zero telemetria nova.
  function initBottombar() {
    var bar = document.querySelector(".bottombar");
    if (!bar) return;
    var reduceMotion = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var scrollOpt = { behavior: reduceMotion ? "auto" : "smooth" };
    var links = bar.querySelectorAll("a");

    function markCurrent(link) {
      for (var i = 0; i < links.length; i++) {
        links[i].removeAttribute("aria-current");
      }
      if (link) link.setAttribute("aria-current", "page");
    }

    bar.addEventListener("click", function (ev) {
      var link = ev.target.closest("a");
      if (!link) return;
      var hash = link.getAttribute("href") || "";
      if (hash.charAt(0) !== "#") return; // navegação entre páginas: deixa passar
      ev.preventDefault();
      markCurrent(link);
      // R8 (VDV-20260923-01): Procura não tem caso especial — o item leva ao
      // bloco único (#procura) que explica ANTES de sair da página; o deep
      // link para o bot só existe no CTA do bloco (com telemetria própria).
      var target = $(hash.slice(1));
      if (!target || target.hidden) return;
      target.scrollIntoView(scrollOpt);
    });
  }

  // ------------------------------------------------------------------ boot
  document.addEventListener("DOMContentLoaded", function () {
    initBottombar();
    fetch(prefix + "data/products.json")
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (catalog) {
        renderStaticLinks(catalog.bot_username || DEFAULT_BOT);
        var page = document.body.getAttribute("data-page");
        if (page === "produto") initProduto(catalog);
        else if (page === "explorar") initExplorar(catalog);
        else if (page === "favoritos") initFavoritos(catalog);
        else if (page === "home") {
          initHome(catalog);
          // VDV-20260912-01: abertura da HOME é sinal operacional sem
          // referência — o denominador do funil (chegou → interagiu).
          sinal("page_view");
        }
      })
      .catch(function () {
        var s = $("status");
        if (s) s.textContent =
          "Não foi possível carregar o catálogo agora. Recarregue a página em alguns instantes.";
        ["section-novidades"].forEach(function (id) {
          var el = $(id);
          if (el) el.hidden = true;
        });
      });
  });
})();

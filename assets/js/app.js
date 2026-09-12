/* Vitrine de Atacado — render client-side sobre data/products.json (estático).
 * Sem framework, sem backend, sem coleta de dados. Todo CTA vira deep link do
 * Telegram (BANCO → WEB — este site nunca escreve em lugar nenhum).
 *
 * Páginas: body[data-page="home"] (index.html), body[data-page="produto"] e
 * páginas institucionais (data-page="institucional" — só deep links).
 */
(function () {
  "use strict";

  var FRESH_DAYS = 7; // aviso de frescura a partir de 7 dias (decisão 31/08)
  var DEFAULT_BOT = "vitrine_vendasbot";
  var EXPLORE_PAGE = 8; // página inicial da grade "Explore a vitrine"
  // VDV-20260907-08 — rodízio "Em exposição agora": 4 cards girando (2×2 no
  // celular, fileira de 4 no desktop), 1 troca animada a cada 4s (wrap-around
  // pelo catálogo inteiro) enquanto a página está aberta.
  var EXPOSICAO_SIZE = 4;
  var EXPOSICAO_STEP_MS = 4000;
  var EXPOSICAO_EXIT_MS = 450; // duração da animação de saída (vdv-card-out)
  // Faixas editoriais só entram quando há catálogo suficiente pra não
  // duplicar card na tela (Home 2.0 — vitrine comprador-first).
  var RECENT_STRIP_MIN = 5;  // faixa "Acabou de chegar" com >= 5 produtos
  var AVAILABILITY_LABELS = {
    pronta_entrega: "Pronta entrega",
    em_producao: "Em produção",
    sob_pedido: "Sob pedido",
  };
  var prefix = document.body.getAttribute("data-page") === "produto" ? "../" : "";

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

  // Evento da vitrine (plano 08 §3): POST one-way via sendBeacon (text/plain
  // = requisição simples, sem preflight). Campos fechados; refs opcionais.
  // Falha = silêncio — telemetria nunca atrapalha nem atrasa a vitrine.
  function telemetria(tipo, refs) {
    if (!TELEMETRIA_URL || !consentimentoTelemetria) return;
    var payload = { type: tipo, sid: vdvSid, origin: "web" };
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

  // Fase 0 do "gostei" (VDV-20260905-01): favoritos locais — a lista de
  // compras do comprador, salva no NAVEGADOR (localStorage), sem backend e
  // sem cadastro. O clique no coração "v❤️" envia o evento ``like`` pela
  // ponte de telemetria (consent-gated, igual aos outros) — APENAS ao
  // favoritar (desfavoritar não manda evento, para não inflar o sinal).
  // Sem contagem pública: o like é sinal para o /admin, nunca exportado
  // (regra do mínimo do desenho de 05/09 — nunca mostrar "0 curtidas").
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

  // Seção "Meus favoritos" da Home: os produtos favoritados que ainda estão
  // no catálogo, na ordem de favoritamento (mais recente primeiro). Some
  // quando a lista fica vazia (ou o favorito saiu da vitrine).
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

  function fmtPrice(p) {
    var out = "R$ " + fmtMoney(p.price);
    if (offerType(p) === "peca_unica") return out + ' <small>(peça única)</small>';
    if (p.minimum_order > 1) out += ' <small>(pedido mín. ' + p.minimum_order + " un)</small>";
    return out;
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
   * compartilhada, para o card de preview sair com foto/título do produto. */
  function shareUrl(product) {
    return new URL(prefix + "produto/" + product.id + "/", window.location.href).href;
  }

  function whatsappShareUrl(product) {
    var msg = product.title + " — " + fmtPriceText(product) + "\n" + shareUrl(product);
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
    var out = "R$ " + fmtMoney(p.price);
    if (offerType(p) === "peca_unica") return out + " (peça única)";
    if (p.minimum_order > 1) out += " (pedido mín. " + p.minimum_order + " un)";
    return out;
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

  function cardEl(p) {
    // Fase 0 do "gostei": o card vira um wrapper (card-wrap) com o link
    // inteiro de sempre + o coração (botão FORA do <a> — button dentro de
    // link é HTML inválido e o clique dispararia a navegação).
    var wrap = document.createElement("div");
    wrap.className = "card-wrap";
    var a = document.createElement("a");
    a.className = "card";
    a.href = "produto/index.html?id=" + encodeURIComponent(p.id);
    a.addEventListener("click", function () {
      track("abrir_produto", {
        produto_id: p.id,
        categoria: p.category.slug,
        seller_name: p.seller_name
      });
    });
    a.innerHTML =
      '<img loading="lazy" src="' + esc(prefix + p.image) + '" alt="' + esc(p.title) + '">' +
      '<div class="card-body">' +
      '<p class="card-title">' + esc(p.title) + "</p>" +
      (p.seller_name ? '<p class="card-seller">' + esc(p.seller_name) + "</p>" : "") +
      '<p class="card-meta">' + (p.category && p.category.name ? esc(p.category.name) + " · " : "") +
      esc(p.city) + "/" + esc(p.state) + "</p>" +
      '<p class="card-price">' + fmtPrice(p) + "</p>" +
      '<p class="card-flags">' + availabilityBadge(p) + saleBadge(p) + freshnessBadge(p) + "</p>" +
      '<p class="card-more">Ver detalhes <span aria-hidden="true">→</span></p>' +
      "</div>";
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
    var sectionVitrine = $("section-vitrine");
    var sectionEmpty = $("section-empty");
    var results = $("results");

    status.textContent = "";

    // Fase 0 do "gostei": o catálogo carregado fica acessível ao módulo de
    // favoritos (a seção "Meus favoritos" re-renderiza sobre ele a cada
    // toggle — só produtos ainda presentes na vitrine aparecem).
    window.__vdvCatalogProducts = products;
    renderFavoritos();

    // Faixas editoriais: só quando o catálogo sustenta (sem duplicar card).
    // VDV-20260907-14: a faixa fixa "⚡ Pronta entrega" saiu do topo — pronta
    // entrega é disponibilidade escolhida pelo anunciante, não faixa editorial;
    // o visitante filtra pelo chip em "Explore a vitrine".
    var hasPronta = products.some(function (p) { return p.availability === "pronta_entrega"; });
    var showRecentStrip = products.length >= RECENT_STRIP_MIN;
    sectionRecent.hidden = !showRecentStrip;
    if (showRecentStrip) fill($("grid-recent"), products.slice(0, 4));

    // VDV-20260907-08 — seção giratória "Em exposição agora": 8 slots fixos;
    // a cada tick troca 1 card (posição rotativa) pelo próximo produto do
    // catálogo (wrap-around). Só aparece com catálogo maior que a página da
    // grade "Explore" — abaixo disso tudo já está visível logo adiante.
    var sectionExposicao = $("section-exposicao");
    var showExposicao = products.length > EXPLORE_PAGE;
    sectionExposicao.hidden = !showExposicao;
    if (showExposicao) {
      var expoGrid = $("grid-exposicao");
      // VDV-20260907-09 — rodízio igualitário por anunciante: fila por turnos
      // (fair_rotation.js), cada anunciante 1× a cada N ticks independente do
      // tamanho do catálogo; ordem sorteada a cada visita.
      var rotation = window.VDVFairRotation.createRotation(products);
      var expoSlots = [];
      for (var ei = 0; ei < Math.min(EXPOSICAO_SIZE, products.length); ei++) {
        var slotEl = cardEl(rotation.next());
        expoGrid.appendChild(slotEl);
        expoSlots.push(slotEl);
      }
      var expoPos = 0; // próximo slot a ser substituído
      setInterval(function () {
        // Pausa: aba em segundo plano (economia/bateria) ou seção oculta
        // pelo modo busca — o timer continua mas nada troca.
        if (document.hidden || sectionExposicao.hidden) return;
        var p = rotation.next();
        var pos = expoPos % expoSlots.length;
        expoPos += 1;
        var leaving = expoSlots[pos];
        // Troca em 2 tempos: o antigo anima a saída ocupando o próprio
        // espaço (a grade não pula), então o novo entra no lugar dele.
        leaving.classList.add("card-leaving");
        setTimeout(function () {
          var fresh = cardEl(p);
          fresh.classList.add("card-entering");
          leaving.replaceWith(fresh);
          expoSlots[pos] = fresh;
        }, EXPOSICAO_EXIT_MS);
      }, EXPOSICAO_STEP_MS);
    }

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
      suppliers.forEach(function (s) {
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

    // Grade principal: a vitrine inteira, paginada client-side.
    // VDV-20260907-08 — rolagem infinita: quando o fim da grade entra na
    // viewport, a próxima página carrega sozinha (IntersectionObserver).
    // O botão "Carregar mais" permanece como fallback para navegadores
    // sem suporte a observer — só é escondido no modo infinito.
    var shown = Math.min(EXPLORE_PAGE, products.length);
    var loadBtn = $("load-more");
    var infiniteScroll = "IntersectionObserver" in window;
    function renderExplore() {
      fill($("grid-all"), products.slice(0, shown));
      var exhausted = shown >= products.length;
      loadBtn.hidden = infiniteScroll || exhausted;
      if (exhausted) loadBtn.parentElement.hidden = true;
    }
    renderExplore();
    loadBtn.addEventListener("click", function () {
      shown = Math.min(shown + EXPLORE_PAGE, products.length);
      renderExplore();
      telemetria("load_more");
    });
    if (infiniteScroll) {
      loadBtn.hidden = true;
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting || shown >= products.length) return;
        shown = Math.min(shown + EXPLORE_PAGE, products.length);
        renderExplore();
      }, { rootMargin: "400px" });
      io.observe(loadBtn.parentElement);
    }

    var activeCat = "";
    // VDV-20260907-14 — filtro de disponibilidade: o chip "⚡ Pronta entrega"
    // deixa a escolha com o visitante (era faixa fixa no topo da Home). Vive na
    // mesma fileira de chips de categoria e coexiste com eles (semântica E).
    var AVAIL_FILTER = { value: "pronta_entrega", label: "⚡ Pronta entrega" };
    var activeAvail = "";
    var input = $("search");
    var clearBtn = $("clear-search");
    var catBox = $("categories");
    var seen = {};

    if (hasPronta) {
      var availChip = document.createElement("button");
      availChip.type = "button";
      availChip.className = "chip";
      availChip.setAttribute("aria-pressed", "false");
      availChip.setAttribute("data-avail", AVAIL_FILTER.value);
      availChip.textContent = AVAIL_FILTER.label;
      availChip.addEventListener("click", function () {
        activeAvail = activeAvail === AVAIL_FILTER.value ? "" : AVAIL_FILTER.value;
        availChip.setAttribute("aria-pressed", String(activeAvail === AVAIL_FILTER.value));
        renderSearch();
      });
      catBox.appendChild(availChip);
    }
    products.forEach(function (p) {
      if (!seen[p.category.slug]) {
        seen[p.category.slug] = true;
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        chip.setAttribute("aria-pressed", "false");
        chip.setAttribute("data-slug", p.category.slug);
        chip.textContent = p.category.name;
        chip.addEventListener("click", function () {
          activeCat = activeCat === p.category.slug ? "" : p.category.slug;
          // VDV-20260909-01 — escolher categoria recomeça a combinação: o
          // estado de disponibilidade sai (lógico E visual). Sem isso o chip
          // desmarcava na tela, mas `activeAvail` ficava preso e a busca
          // seguia aplicando "pronta entrega" E categoria juntas.
          activeAvail = "";
          if (availChip) availChip.setAttribute("aria-pressed", "false");
          Array.prototype.forEach.call(catBox.children, function (c) {
            if (c.getAttribute("data-avail")) return; // já sincronizado acima
            c.setAttribute("aria-pressed", String(c.getAttribute("data-slug") === activeCat));
          });
          renderSearch();
        });
        catBox.appendChild(chip);
      }
    });

    function setBrowseVisibility(searching) {
      sectionRecent.hidden = searching || !showRecentStrip;
      sectionExposicao.hidden = searching || !showExposicao;
      sectionVitrine.hidden = searching || products.length === 0;
      sectionEmpty.hidden = searching || products.length > 0;
    }

    // Fatia 30: busca é evento de intenção — 1 evento por assinatura
    // (termo+categoria+disponibilidade) mudada, não por tecla.
    var ultimaBuscaEnviada = "";
    function renderSearch() {
      var q = input.value.replace(/\s+/g, " ").trim().toLowerCase();
      var cat = activeCat;
      var avail = activeAvail;
      var searching = q !== "" || cat !== "" || avail !== "";
      results.hidden = !searching;
      clearBtn.hidden = !searching;
      setBrowseVisibility(searching);
      if (!searching) return;
      var found = products.filter(function (p) {
        if (avail && p.availability !== "pronta_entrega") return false;
        if (cat && p.category.slug !== cat) return false;
        if (!q) return true;
        var hay = (p.title + " " + p.description + " " + p.category.name + " " +
          p.city + " " + p.seller_name).toLowerCase();
        return q.split(" ").every(function (term) { return hay.indexOf(term) !== -1; });
      });
      $("results-title").textContent = found.length
        ? found.length + " oferta" + (found.length > 1 ? "s" : "") + " encontrada" + (found.length > 1 ? "s" : "")
        : "Nada encontrado — tente outro termo";
      fill($("results-grid"), found);
      var assinatura = q + "|" + cat + "|" + avail;
      if (assinatura !== ultimaBuscaEnviada) {
        ultimaBuscaEnviada = assinatura;
        telemetria("search", { category: cat || null });
        if (!found.length) telemetria("search_zero_result", { category: cat || null });
      }
    }

    input.addEventListener("input", renderSearch);
    clearBtn.addEventListener("click", function () {
      input.value = "";
      activeCat = "";
      activeAvail = "";
      Array.prototype.forEach.call(catBox.children, function (c) {
        c.setAttribute("aria-pressed", "false");
      });
      results.hidden = true;
      clearBtn.hidden = true;
      setBrowseVisibility(false);
    });

    if (products.length === 0) {
      sectionRecent.hidden = true;
      sectionVitrine.hidden = true;
      sectionEmpty.hidden = false;
    }

    // VDV-20260909-01 — retorno ao feed com estado. Ao abrir um produto, a
    // Home guarda rolagem, busca, filtros e cards carregados em sessionStorage
    // (escopo de aba). Ao voltar pelo "← Vitrine", o estado volta e o snapshot
    // é limpo — restaura uma única vez, sem contaminar entrada direta/deep link.
    var HOME_STATE_KEY = "vdv:home-state";
    function saveHomeState() {
      try {
        sessionStorage.setItem(HOME_STATE_KEY, JSON.stringify({
          scrollY: window.scrollY,
          q: input.value,
          cat: activeCat,
          avail: activeAvail,
          shown: shown
        }));
      } catch (e) { /* modo privado: sem snapshot, a Home abre do zero */ }
    }
    document.addEventListener("click", function (ev) {
      if (ev.defaultPrevented || ev.button !== 0 ||
          ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
      var t = ev.target;
      var a = t && t.closest ? t.closest('a[href*="produto/index.html?id="]') : null;
      if (a) saveHomeState();
    });

    try {
      var raw = sessionStorage.getItem(HOME_STATE_KEY);
      if (raw) {
        sessionStorage.removeItem(HOME_STATE_KEY);
        var snap = JSON.parse(raw);
        if (snap && typeof snap === "object") {
          input.value = typeof snap.q === "string" ? snap.q : "";
          activeCat = typeof snap.cat === "string" ? snap.cat : "";
          activeAvail = snap.avail === AVAIL_FILTER.value ? snap.avail : "";
          if (typeof snap.shown === "number" && snap.shown > 0) {
            shown = Math.min(snap.shown, products.length);
          }
          Array.prototype.forEach.call(catBox.children, function (c) {
            var on = c.getAttribute("data-slug") === activeCat ||
              (c.getAttribute("data-avail") !== null && activeAvail !== "");
            c.setAttribute("aria-pressed", String(on));
          });
          renderExplore();
          renderSearch();
          if (snap.scrollY) {
            requestAnimationFrame(function () { window.scrollTo(0, snap.scrollY); });
          }
        }
      }
    } catch (e) { /* snapshot inválido: segue com estado limpo */ }
  }

  // --------------------------------------------------------------- produto
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
    // nem TELEMETRIA_URL, é no-op).
    telemetria("product_view", { product: product.id });
    var isPecaUnica = offerType(product) === "peca_unica";
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
      '<ul class="prod-facts">' +
      (isAssisted(product)
        ? "<li>🤝 Oferta de <strong>" +
          esc(product.offer_owner_name || product.seller_name) +
          "</strong> · " +
          esc(product.city) + "/" + esc(product.state) + "</li>"
        : "<li>🏪 Vendido por <strong>" + esc(product.seller_name) + "</strong> · " +
          esc(product.city) + "/" + esc(product.state) + "</li>") +
      "<li>📦 " + esc(AVAILABILITY_LABELS[product.availability] || "Disponível") + qty + "</li>" +
      moLi +
      "<li>🗓️ " + esc(freshText(product)) + "</li>" +
      "</ul>" +
      // Fatia 27 (VDV-20260907-05) — segunda forma de navegação: a vitrine do
      // fornecedor ("Gostei dessa peça da Sarah. O que mais ela tem?"). Some
      // quando o anúncio não tem fornecedor resolvido (legado sem backfill).
      (product.supplier_slug
        ? '<p class="prod-more"><a href="' + prefix + 'fornecedor/' +
          esc(product.supplier_slug) + '/">Ver todos os produtos de ' +
          esc(product.offer_owner_name || product.seller_name || "este anunciante") +
          " &rarr;</a></p>"
        : "") +
      '<p class="prod-desc">' + esc(product.description) + "</p>" +
      // Canais de contato (VDV-20260905-05): os dois no MESMO tamanho padrão,
      // lado a lado, com as cores/logos oficiais dos canais — identifica pelo
      // ícone antes de ler. Telegram: chat DIRETO do anunciante (t.me gerado no
      // export, username só dentro do href — VDV-20260905-06); sem username,
      // cai para o deep link do bot. WhatsApp = link wa.me gerado no export.
      '<div class="contact-channels">' + channelsHtml + "</div>" +
      '<span class="wa-note">Escolha o canal para falar sobre este anúncio — o contato é direto com ' +
      (assisted ? "o responsável pela oferta." : "o anunciante.") + "</span>" +
      // VDV-20260910-02 — divulgação em bloco próprio, mesmo padrão de botão
      // dos canais de contato (deixa de parecer acessório; separação visual
      // contato ≠ divulgação). GA #share-wa / compartilhar_produto intacto.
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
      '<p class="prod-more">Gostou? <a href="' + prefix + 'index.html">Veja mais produtos na nossa vitrine</a></p>' +
      // VDV-20260905-03 — canal de denúncia (payload denuncia_<uuid> no bot).
      '<p class="prod-report"><a href="#" id="report-link">🚩 Denunciar este anúncio</a></p>';

    // Fatia 27/30: link para a vitrine do fornecedor. Páginas estáticas
    // `fornecedor/` são zero-JS — o supplier_view é medido no CLIQUE no link
    // (aqui e nos chips "Vitrines do VDV" da Home), nunca na página estática.
    var supplierLink = main.querySelector('a[href*="fornecedor/"]');
    if (supplierLink && product.supplier_slug) {
      supplierLink.addEventListener("click", function () {
        telemetria("supplier_view", { supplier: product.supplier_slug });
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
      });
    }

    var share = main.querySelector("#share-wa");
    if (share) {
      share.addEventListener("click", function () {
        track("compartilhar_produto", {
          produto_id: product.id,
          event_category: "compartilhamento",
          event_label: product.id,
          transport_type: "beacon"
        });
        telemetria("share", { product: product.id });
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

  // ------------------------------------------------------------------ boot
  document.addEventListener("DOMContentLoaded", function () {
    fetch(prefix + "data/products.json")
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (catalog) {
        renderStaticLinks(catalog.bot_username || DEFAULT_BOT);
        var page = document.body.getAttribute("data-page");
        if (page === "produto") initProduto(catalog);
        else if (page === "home") initHome(catalog);
      })
      .catch(function () {
        var s = $("status");
        if (s) s.textContent =
          "Não foi possível carregar o catálogo agora. Recarregue a página em alguns instantes.";
        ["section-novidades", "section-vitrine"].forEach(function (id) {
          var el = $(id);
          if (el) el.hidden = true;
        });
      });
  });
})();

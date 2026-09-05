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
  // Faixas editoriais só entram quando há catálogo suficiente pra não
  // duplicar card na tela (Home 2.0 — vitrine comprador-first).
  var PRONTA_STRIP_MIN = 2;  // faixa "Pronta entrega" com >= 2 itens prontos
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

  function fmtPrice(p) {
    var out = "R$ " + fmtMoney(p.price);
    if (p.sale_type === "peca_unica") return out + ' <small>(peça única)</small>';
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
    return p.sale_type === "peca_unica"
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
    var map = { procura: "procura", vender: "vender", home: "" };
    var param = product ? "produto_" + product.id : map[kind] || "";
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

  function fmtPriceText(p) {
    var out = "R$ " + fmtMoney(p.price);
    if (p.sale_type === "peca_unica") return out + " (peça única)";
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
      });
    });
  }

  function cardEl(p) {
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
      '<p class="card-meta">' + esc(p.city) + "/" + esc(p.state) + "</p>" +
      '<p class="card-price">' + fmtPrice(p) + "</p>" +
      '<p class="card-flags">' + availabilityBadge(p) + saleBadge(p) + freshnessBadge(p) + "</p>" +
      '<p class="card-more">Ver detalhes <span aria-hidden="true">→</span></p>' +
      "</div>";
    return a;
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
    var sectionPronta = $("section-pronta");
    var sectionVitrine = $("section-vitrine");
    var sectionEmpty = $("section-empty");
    var results = $("results");

    status.textContent = "";

    // Faixas editoriais: só quando o catálogo sustenta (sem duplicar card).
    var pronta = products.filter(function (p) { return p.availability === "pronta_entrega"; });
    var showProntaStrip = pronta.length >= PRONTA_STRIP_MIN;
    var showRecentStrip = products.length >= RECENT_STRIP_MIN;
    sectionPronta.hidden = !showProntaStrip;
    if (showProntaStrip) fill(sectionPronta.querySelector("[data-slot]"), pronta.slice(0, 4));
    sectionRecent.hidden = !showRecentStrip;
    if (showRecentStrip) fill($("grid-recent"), products.slice(0, 4));

    // Grade principal: a vitrine inteira, paginada client-side.
    var shown = Math.min(EXPLORE_PAGE, products.length);
    var loadBtn = $("load-more");
    function renderExplore() {
      fill($("grid-all"), products.slice(0, shown));
      loadBtn.hidden = shown >= products.length;
      if (shown >= products.length) loadBtn.parentElement.hidden = true;
    }
    renderExplore();
    loadBtn.addEventListener("click", function () {
      shown = Math.min(shown + EXPLORE_PAGE, products.length);
      renderExplore();
    });

    var activeCat = "";
    var input = $("search");
    var clearBtn = $("clear-search");
    var catBox = $("categories");
    var seen = {};
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
          Array.prototype.forEach.call(catBox.children, function (c) {
            c.setAttribute("aria-pressed", String(c.getAttribute("data-slug") === activeCat));
          });
          renderSearch();
        });
        catBox.appendChild(chip);
      }
    });

    function setBrowseVisibility(searching) {
      sectionPronta.hidden = searching || !showProntaStrip;
      sectionRecent.hidden = searching || !showRecentStrip;
      sectionVitrine.hidden = searching || products.length === 0;
      sectionEmpty.hidden = searching || products.length > 0;
    }

    function renderSearch() {
      var q = input.value.replace(/\s+/g, " ").trim().toLowerCase();
      var cat = activeCat;
      var searching = q !== "" || cat !== "";
      results.hidden = !searching;
      clearBtn.hidden = !searching;
      setBrowseVisibility(searching);
      if (!searching) return;
      var found = products.filter(function (p) {
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
    }

    input.addEventListener("input", renderSearch);
    clearBtn.addEventListener("click", function () {
      input.value = "";
      activeCat = "";
      Array.prototype.forEach.call(catBox.children, function (c) {
        c.setAttribute("aria-pressed", "false");
      });
      results.hidden = true;
      clearBtn.hidden = true;
      setBrowseVisibility(false);
    });

    if (products.length === 0) {
      sectionPronta.hidden = true;
      sectionRecent.hidden = true;
      sectionVitrine.hidden = true;
      sectionEmpty.hidden = false;
    }
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
    var isPecaUnica = product.sale_type === "peca_unica";
    setOg("og:title", product.title + " — " +
      (isPecaUnica ? "peça única" : "atacado") + " em " + product.city + "/" + product.state);
    setOg("og:description", product.description.slice(0, 160));
    var ogImg = document.querySelector('meta[property="og:image"]');
    if (!ogImg) {
      ogImg = document.createElement("meta");
      ogImg.setAttribute("property", "og:image");
      document.head.appendChild(ogImg);
    }
    ogImg.setAttribute("content", new URL(product.image, window.location.href).href);

    var qty = product.quantity ? " · " + product.quantity + " un em estoque" : "";
    var moLi = isPecaUnica
      ? "<li>🏷️ Peça única — valor da unidade</li>"
      : "<li>🧾 Pedido mínimo: " + product.minimum_order + " unidades</li>";
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
    main.innerHTML =
      '<div class="prod-gallery">' +
      '<img class="prod-photo" id="prod-photo-main" loading="lazy" width="640" height="640" src="' +
      esc(prefix + photos[0]) + '" alt="' + esc(product.title) + '">' +
      thumbs +
      "</div>" +
      '<h1 class="prod-title">' + esc(product.title) + "</h1>" +
      '<p class="prod-price">' + fmtPrice(product) + "</p>" +
      '<ul class="prod-facts">' +
      "<li>🏪 Vendido por <strong>" + esc(product.seller_name) + "</strong> · " +
      esc(product.city) + "/" + esc(product.state) + "</li>" +
      "<li>📦 " + esc(AVAILABILITY_LABELS[product.availability] || "Disponível") + qty + "</li>" +
      moLi +
      "<li>🗓️ " + esc(freshText(product)) + "</li>" +
      "</ul>" +
      '<p class="prod-desc">' + esc(product.description) + "</p>" +
      '<a class="btn btn-primary btn-cta" href="' +
      esc(deepLink("interesse", product)) + '" data-ga-origin="produto_tenho_interesse">Tenho interesse — falar no Telegram</a>' +
      // Fatia 24 (VDV-20260904-01): CTA secundário do WhatsApp comercial do
      // anunciante — link wa.me gerado no export (número só dentro do href).
      (product.whatsapp && product.whatsapp.link
        ? '<p class="wa-contact"><a class="btn btn-ghost" target="_blank" rel="noopener" href="' +
          esc(product.whatsapp.link) + '" data-wa-contact>📲 Falar com ' +
          esc(product.whatsapp.nome || product.seller_name) + " pelo WhatsApp</a>" +
          '<span class="wa-note">Ao clicar, você inicia contato direto via WhatsApp ' +
          "sobre este anúncio.</span></p>"
        : "") +
      '<p class="share-row"><a class="btn btn-ghost" target="_blank" rel="noopener" href="' +
      esc(whatsappShareUrl(product)) + '" id="share-wa">Compartilhar no WhatsApp</a></p>' +
      '<p class="prod-seller">A negociação acontece direto no bot, sem cadastro neste site.</p>' +
      '<p class="prod-more">Gostou? <a href="' + prefix + 'index.html">Veja mais produtos na nossa vitrine</a></p>';

    // Troca da foto principal ao tocar a miniatura (galeria — VDV-20260903-03).
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

    var cta = main.querySelector('[data-ga-origin="produto_tenho_interesse"]');
    if (cta) {
      cta.addEventListener("click", function () {
        track("clique_telegram", {
          origem: "produto_tenho_interesse",
          event_category: "telegram",
          event_label: product.id,
          transport_type: "beacon"
        });
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
        ["section-novidades", "section-pronta", "section-vitrine"].forEach(function (id) {
          var el = $(id);
          if (el) el.hidden = true;
        });
      });
  });
})();

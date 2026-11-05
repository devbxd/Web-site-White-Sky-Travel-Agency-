/* White Sky Travel Agency — hotel detail page (calls /api/hotels/details) */
(function(){
  "use strict";

  document.addEventListener("DOMContentLoaded", function(){
    var loadingEl = document.getElementById("hdLoading");
    var errorEl = document.getElementById("hdError");
    var contentEl = document.getElementById("hdContent");
    if (!loadingEl || !contentEl) return;

    var params = new URLSearchParams(window.location.search);
    var id = params.get("id") || "";
    var checkin = params.get("checkin") || "";
    var checkout = params.get("checkout") || "";
    var rooms = params.get("rooms") || "1";
    var adults = params.get("adults") || "2";
    var nationality = params.get("nationality") || "KW";
    var fallbackName = params.get("name") || "";

    if (fallbackName) document.getElementById("hdCrumbName").textContent = fallbackName;

    if (!id) {
      loadingEl.hidden = true;
      errorEl.hidden = false;
      errorEl.textContent = "No hotel selected. Please search again from the Hotels page.";
      return;
    }

    function el(tag, cls, text){
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    }
    function money(price, currency){ return (currency || "USD") + " " + Number(price).toFixed(0); }
    function niceDate(iso){
      if (!iso) return "";
      var d = new Date(iso + "T00:00:00");
      return isNaN(d) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    }
    function norm(s){ return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }

    function whatsAppUrl(roomName, price, currency){
      var lines = [
        "🏨 *Hotel Enquiry — White Sky Travel Agency*",
        "",
        "*Hotel:* " + document.getElementById("hdName").textContent,
        "*Room:* " + (roomName || "Best available rate"),
        "*Check-in:* " + (checkin || "—"),
        "*Check-out:* " + (checkout || "—"),
        "*Guests:* " + adults + " adult(s), " + rooms + " room(s)"
      ];
      if (price != null) lines.push("*Quoted rate:* " + money(price, currency) + " (total stay)");
      lines.push("", "Could you please confirm availability and finalize this booking? Thank you!");
      return "https://wa.me/96598818699?text=" + encodeURIComponent(lines.join("\n"));
    }

    /* ---------- Full-screen photo viewer ---------- */
    var lb = document.getElementById("hdLightbox");
    var lbImg = document.getElementById("lbImg");
    var lbCap = document.getElementById("lbCap");
    var lbList = [], lbIndex = 0;
    function lbShow(i){
      lbIndex = (i + lbList.length) % lbList.length;
      var p = lbList[lbIndex];
      lbImg.src = p.hdUrl || p.url;
      lbImg.alt = p.label || "";
      lbCap.textContent = (p.label ? p.label + " · " : "") + (lbIndex + 1) + " / " + lbList.length;
    }
    function openViewer(list, i){
      if (!list.length) return;
      lbList = list;
      lb.hidden = false;
      document.documentElement.style.overflow = "hidden";
      lbShow(i || 0);
    }
    function closeViewer(){
      lb.hidden = true;
      document.documentElement.style.overflow = "";
      lbImg.src = "";
    }
    lb.querySelector(".lb-close").addEventListener("click", closeViewer);
    lb.querySelector(".lb-prev").addEventListener("click", function(){ lbShow(lbIndex - 1); });
    lb.querySelector(".lb-next").addEventListener("click", function(){ lbShow(lbIndex + 1); });
    lb.addEventListener("click", function(e){ if (e.target === lb) closeViewer(); });
    document.addEventListener("keydown", function(e){
      if (lb.hidden) return;
      if (e.key === "Escape") closeViewer();
      if (e.key === "ArrowLeft") lbShow(lbIndex - 1);
      if (e.key === "ArrowRight") lbShow(lbIndex + 1);
    });
    var touchX = null;
    lb.addEventListener("touchstart", function(e){ touchX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function(e){
      if (touchX == null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) lbShow(lbIndex + (dx < 0 ? 1 : -1));
      touchX = null;
    });

    var qs = new URLSearchParams({ id: id, checkin: checkin, checkout: checkout, rooms: rooms, adults: adults, nationality: nationality });
    var controller = new AbortController();
    var timeoutId = setTimeout(function(){ controller.abort(); }, 15000);

    fetch("/api/hotels/details?" + qs.toString(), { signal: controller.signal })
      .then(function(r){
        clearTimeout(timeoutId);
        if (!r.ok) throw new Error("Failed (" + r.status + ")");
        return r.json();
      })
      .then(function(hotel){
        loadingEl.hidden = true;

        document.title = hotel.name + " — White Sky Travel Agency";
        document.getElementById("hdCrumbName").textContent = hotel.name;
        document.getElementById("hdName").textContent = hotel.name;
        var stars = Math.max(0, Math.min(5, Math.round(hotel.stars || 0)));
        document.getElementById("hdStars").innerHTML = new Array(stars + 1).join("<span></span>");

        var addrWrap = document.getElementById("hdAddress");
        if (hotel.address) addrWrap.querySelector("span:last-child").textContent = hotel.address;
        else addrWrap.hidden = true;

        /* ---------- Description: a few lines, the rest behind "Read more" ---------- */
        var descEl = document.getElementById("hdDescription");
        var descMore = document.getElementById("hdDescMore");
        if (hotel.description) {
          descEl.textContent = hotel.description;
          if (hotel.description.length > 420) {
            descEl.classList.add("clamped");
            descMore.hidden = false;
            descMore.addEventListener("click", function(){
              var closed = descEl.classList.toggle("clamped");
              descMore.textContent = closed ? "Read more" : "Show less";
            });
          }
        } else {
          document.getElementById("hdAboutBlock").hidden = true;
        }

        /* ---------- Facilities: first ten, the rest behind a toggle ---------- */
        var facilities = hotel.facilities || [];
        var facEl = document.getElementById("hdFacilities");
        var facMore = document.getElementById("hdFacMore");
        facilities.forEach(function(f, i){
          facEl.appendChild(el("span", "hd-chip" + (i >= 10 ? " extra" : ""), f));
        });
        if (!facilities.length) document.getElementById("hdFacBlock").hidden = true;
        if (facilities.length > 10) {
          facEl.classList.add("collapsed");
          facMore.hidden = false;
          facMore.textContent = "+ " + (facilities.length - 10) + " more";
          facMore.addEventListener("click", function(){
            var collapsed = facEl.classList.toggle("collapsed");
            facMore.textContent = collapsed ? "+ " + (facilities.length - 10) + " more" : "Show less";
          });
        }

        /* ---------- Photos: one list for the viewer, hotel photos first then each room ---------- */
        var all = (hotel.images || []).filter(function(p){ return p.url; }).map(function(p){
          return { url: p.url, hdUrl: p.hdUrl, label: p.caption || "" };
        });
        var roomGroups = (hotel.roomGalleries || []).filter(function(g){ return g.images && g.images.length; });
        roomGroups.forEach(function(g){
          g.start = all.length;
          g.images.forEach(function(p){ all.push({ url: p.url, hdUrl: p.hdUrl, label: g.name }); });
        });

        var mosaic = document.getElementById("hdMosaic");
        if (all.length) {
          all.slice(0, 5).forEach(function(p, i){
            var b = el("button", "hd-tile");
            b.type = "button";
            var img = el("img");
            img.src = i === 0 ? (p.hdUrl || p.url) : p.url;
            img.alt = p.label || hotel.name;
            if (i) img.loading = "lazy";
            b.appendChild(img);
            if (i === 4 && all.length > 5) b.appendChild(el("span", "hd-tile-more", "+" + (all.length - 5) + " photos"));
            b.addEventListener("click", function(){ openViewer(all, i); });
            mosaic.appendChild(b);
          });
          mosaic.classList.add("n" + Math.min(5, all.length));
        } else {
          mosaic.hidden = true;
        }

        /* ---------- Room types: one card each, photos open in the viewer ---------- */
        if (roomGroups.length) {
          var rtWrap = document.getElementById("hdRoomTypes");
          roomGroups.forEach(function(g){
            var card = el("button", "hd-roomtype");
            card.type = "button";
            var img = el("img");
            img.src = g.images[0].url;
            img.alt = g.name;
            img.loading = "lazy";
            card.appendChild(img);
            var txt = el("span", "hd-roomtype-text");
            txt.appendChild(el("b", null, g.name));
            txt.appendChild(el("small", null, g.images.length + (g.images.length === 1 ? " photo" : " photos")));
            card.appendChild(txt);
            card.addEventListener("click", function(){ openViewer(all, g.start); });
            rtWrap.appendChild(card);
          });
          document.getElementById("hdRoomTypesBlock").hidden = false;
        }
        function photosFor(roomName){
          var n = norm(roomName);
          for (var i = 0; i < roomGroups.length; i++) {
            var g = norm(roomGroups[i].name);
            if (g && n && (g === n || n.indexOf(g) !== -1 || g.indexOf(n) !== -1)) return roomGroups[i];
          }
          return null;
        }

        /* ---------- Rates ---------- */
        if (checkin && checkout) {
          document.getElementById("hdDates").textContent =
            niceDate(checkin) + " → " + niceDate(checkout) + " · " + adults + " adult" + (adults === "1" ? "" : "s") + ", " + rooms + " room" + (rooms === "1" ? "" : "s");
        }
        var roomsList = document.getElementById("hdRoomsList");
        var rates = hotel.rooms || [];
        if (!rates.length) {
          roomsList.appendChild(el("p", "hd-no-rates", "No live rates for these dates. Send us a request and an agent will confirm availability."));
          var ask = el("a", "btn btn-wa btn-block", "Ask on WhatsApp");
          ask.href = whatsAppUrl(null, null, null);
          ask.target = "_blank";
          ask.rel = "noopener";
          roomsList.appendChild(ask);
        } else {
          document.getElementById("hdFromPrice").textContent = money(rates[0].price, rates[0].currency);
          document.getElementById("hdFrom").hidden = false;

          rates.forEach(function(room){
            var row = el("div", "hd-room-row");
            var group = photosFor(room.name);
            if (group) {
              var th = el("button", "hd-room-thumb");
              th.type = "button";
              th.setAttribute("aria-label", "Photos of " + group.name);
              var ti = el("img");
              ti.src = group.images[0].url;
              ti.alt = group.name;
              ti.loading = "lazy";
              th.appendChild(ti);
              th.addEventListener("click", function(){ openViewer(all, group.start); });
              row.appendChild(th);
            }
            var info = el("div", "hd-room-info");
            info.appendChild(el("span", "hd-room-name", room.name || "Room"));
            var badges = el("div", "hs-card-meta");
            if (room.board) badges.appendChild(el("span", "hs-badge", room.board));
            if (room.freeCancellation) badges.appendChild(el("span", "hs-badge free-cancel", "Free cancellation"));
            if (badges.children.length) info.appendChild(badges);

            var priceWrap = el("div", "hd-room-price");
            priceWrap.appendChild(el("span", "amount", money(room.price, room.currency)));
            var bookBtn = el("a", "btn btn-gold", "Request");
            bookBtn.href = whatsAppUrl(room.name, room.price, room.currency);
            bookBtn.target = "_blank";
            bookBtn.rel = "noopener";
            priceWrap.appendChild(bookBtn);
            info.appendChild(priceWrap);

            row.appendChild(info);
            roomsList.appendChild(row);
          });
        }

        contentEl.hidden = false;
      })
      .catch(function(){
        clearTimeout(timeoutId);
        loadingEl.hidden = true;
        errorEl.hidden = false;
        errorEl.textContent = "We couldn't load this hotel's details right now. Please go back and try again, or send us a request and an agent will help directly.";
      });
  });
})();

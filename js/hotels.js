/* White Sky Travel Agency — hotel search (calls /api/hotels/search) */
(function(){
  "use strict";

  document.addEventListener("DOMContentLoaded", function(){
    var form = document.getElementById("hotelSearchForm");
    if (!form) return;

    var destinationInput = document.getElementById("destination");
    var suggestBox = document.getElementById("hsSuggestions");
    var checkinInput = document.getElementById("checkin");
    var checkoutInput = document.getElementById("checkout");
    var statusEl = document.getElementById("hsStatus");
    var resultsEl = document.getElementById("hsResults");
    var resultsList = document.getElementById("hsResultsList");
    var resultsCount = document.getElementById("hsResultsCount");
    var resultsTitle = document.getElementById("hsResultsTitle");
    var emptyEl = document.getElementById("hsEmpty");
    var selectedDestination = null;

    /* ---------- Default dates: tonight +7 nights ---------- */
    function toISODate(d){ return d.toISOString().slice(0,10); }
    var today = new Date();
    var in7 = new Date(today.getTime() + 7 * 86400000);
    var in10 = new Date(today.getTime() + 10 * 86400000);
    if (checkinInput && !checkinInput.value) checkinInput.value = toISODate(in7);
    if (checkoutInput && !checkoutInput.value) checkoutInput.value = toISODate(in10);
    if (checkinInput) checkinInput.min = toISODate(today);
    if (checkoutInput) checkoutInput.min = checkinInput ? checkinInput.value : toISODate(in7);
    if (checkinInput) {
      checkinInput.addEventListener("change", function(){
        if (checkoutInput) checkoutInput.min = checkinInput.value;
        if (checkoutInput && checkoutInput.value <= checkinInput.value) {
          var next = new Date(checkinInput.value);
          next.setDate(next.getDate() + 1);
          checkoutInput.value = toISODate(next);
        }
      });
    }

    /* ---------- Destination autocomplete ---------- */
    var suggestTimer = null;
    function hideSuggestions(){ suggestBox.hidden = true; suggestBox.innerHTML = ""; }
    function showSuggestions(items){
      if (!items || !items.length) { hideSuggestions(); return; }
      suggestBox.innerHTML = "";
      items.forEach(function(item){
        var btn = document.createElement("button");
        btn.type = "button";
        var name = document.createElement("span");
        name.textContent = item.label;
        var sub = document.createElement("span");
        sub.className = "hs-sugg-sub";
        sub.textContent = item.country || "";
        btn.appendChild(name);
        if (item.country) btn.appendChild(sub);
        btn.addEventListener("click", function(){
          selectedDestination = item;
          destinationInput.value = item.label;
          hideSuggestions();
        });
        suggestBox.appendChild(btn);
      });
      suggestBox.hidden = false;
    }

    if (destinationInput) {
      destinationInput.addEventListener("input", function(){
        selectedDestination = null;
        var q = destinationInput.value.trim();
        clearTimeout(suggestTimer);
        if (q.length < 2) { hideSuggestions(); return; }
        suggestTimer = setTimeout(function(){
          fetch("/api/hotels/destinations?q=" + encodeURIComponent(q))
            .then(function(r){ return r.ok ? r.json() : { results: [] }; })
            .then(function(data){ showSuggestions(data.results || []); })
            .catch(function(){ hideSuggestions(); });
        }, 250);
      });
      document.addEventListener("click", function(e){
        if (!suggestBox.contains(e.target) && e.target !== destinationInput) hideSuggestions();
      });
    }

    /* ---------- Status / skeleton helpers ---------- */
    function setStatus(msg, isError){
      statusEl.hidden = !msg;
      statusEl.classList.toggle("is-error", !!isError);
      statusEl.innerHTML = "";
      if (!msg) return;
      if (!isError) {
        var spin = document.createElement("span");
        spin.className = "hs-spinner";
        statusEl.appendChild(spin);
      }
      var text = document.createElement("span");
      text.textContent = msg;
      statusEl.appendChild(text);
    }

    function showSkeleton(){
      resultsEl.hidden = true;
      emptyEl.hidden = true;
      resultsList.innerHTML = "";
      for (var i = 0; i < 4; i++) {
        var card = document.createElement("div");
        card.className = "hs-skeleton-card";
        card.innerHTML =
          '<div><div class="hs-skeleton-line" style="height:18px;width:55%;margin-bottom:12px;"></div>' +
          '<div class="hs-skeleton-line" style="height:12px;width:75%;"></div></div>' +
          '<div class="hs-skeleton-line" style="height:24px;width:80px;"></div>';
        resultsList.appendChild(card);
      }
      resultsList.parentElement.hidden = false;
    }

    /* ---------- Render results ---------- */
    function starMarkup(stars){
      var n = Math.max(0, Math.min(5, Math.round(stars || 0)));
      var html = '<span class="hs-stars">';
      for (var i = 0; i < n; i++) html += "<span></span>";
      html += "</span>";
      return html;
    }

    function renderResults(payload, params){
      var hotels = payload.hotels || [];
      resultsList.innerHTML = "";
      var oldNote = resultsEl.querySelector(".hs-demo-note");
      if (oldNote) oldNote.remove();

      if (!hotels.length) {
        resultsEl.hidden = true;
        emptyEl.hidden = false;
        return;
      }

      emptyEl.hidden = true;
      resultsTitle.textContent = "Hotels in " + (params.destinationLabel || params.destination);
      resultsCount.textContent = hotels.length + (hotels.length === 1 ? " property" : " properties") + " found";

      if (payload.demo) {
        var demoNote = document.createElement("div");
        demoNote.className = "hs-demo-note";
        demoNote.textContent = "Showing sample rates — connect a live rates key to pull real-time pricing.";
        resultsList.parentElement.insertBefore(demoNote, resultsList);
      }

      hotels.forEach(function(hotel){
        var card = document.createElement("article");
        card.className = "hs-card";

        var main = document.createElement("div");
        main.className = "hs-card-main";

        var top = document.createElement("div");
        top.className = "hs-card-top";
        var nameEl = document.createElement("span");
        nameEl.className = "hs-card-name";
        nameEl.textContent = hotel.name || "Hotel";
        top.appendChild(nameEl);
        if (hotel.stars) {
          var starsWrap = document.createElement("span");
          starsWrap.innerHTML = starMarkup(hotel.stars);
          top.appendChild(starsWrap.firstChild);
        }
        main.appendChild(top);

        if (hotel.address) {
          var addr = document.createElement("div");
          addr.className = "hs-card-address";
          addr.innerHTML = '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.4"/></svg>';
          var addrText = document.createElement("span");
          addrText.textContent = hotel.address;
          addr.appendChild(addrText);
          main.appendChild(addr);
        }

        var meta = document.createElement("div");
        meta.className = "hs-card-meta";
        if (hotel.board) {
          var boardBadge = document.createElement("span");
          boardBadge.className = "hs-badge";
          boardBadge.textContent = hotel.board;
          meta.appendChild(boardBadge);
        }
        if (hotel.freeCancellation) {
          var cancelBadge = document.createElement("span");
          cancelBadge.className = "hs-badge free-cancel";
          cancelBadge.textContent = "Free cancellation";
          meta.appendChild(cancelBadge);
        }
        if (meta.children.length) main.appendChild(meta);

        var priceWrap = document.createElement("div");
        priceWrap.className = "hs-card-price";
        var amount = document.createElement("span");
        amount.className = "amount";
        amount.textContent = hotel.price != null
          ? (hotel.currency || "USD") + " " + Number(hotel.price).toFixed(0)
          : "On request";
        var perNight = document.createElement("span");
        perNight.className = "per-night";
        perNight.textContent = hotel.price != null ? "total stay" : "";
        priceWrap.appendChild(amount);
        priceWrap.appendChild(perNight);

        var bookBtn = document.createElement("a");
        bookBtn.className = "btn btn-gold";
        bookBtn.textContent = "Request This Rate";
        var msg = "Hotel enquiry — White Sky Travel Agency\n" +
          "Hotel: " + (hotel.name || "") + "\n" +
          "Destination: " + (params.destinationLabel || params.destination) + "\n" +
          "Check-in: " + params.checkin + "\n" +
          "Check-out: " + params.checkout + "\n" +
          "Guests: " + params.adults + " adult(s), " + params.rooms + " room(s)" +
          (hotel.price != null ? "\nQuoted rate: " + (hotel.currency || "USD") + " " + Number(hotel.price).toFixed(0) : "");
        bookBtn.href = "https://wa.me/96598818699?text=" + encodeURIComponent(msg);
        bookBtn.target = "_blank";
        bookBtn.rel = "noopener";
        priceWrap.appendChild(bookBtn);

        card.appendChild(main);
        card.appendChild(priceWrap);
        resultsList.appendChild(card);
      });

      resultsEl.hidden = false;
    }

    /* ---------- Submit ---------- */
    form.addEventListener("submit", function(e){
      e.preventDefault();

      var destination = destinationInput.value.trim();
      if (!destination) { setStatus("Please enter a destination.", true); return; }

      var params = {
        destination: destination,
        destinationLabel: (selectedDestination && selectedDestination.label) || destination,
        placeId: (selectedDestination && selectedDestination.placeId) || "",
        checkin: checkinInput.value,
        checkout: checkoutInput.value,
        rooms: document.getElementById("rooms").value,
        adults: document.getElementById("adults").value,
        nationality: document.getElementById("nationality").value
      };

      resultsEl.hidden = true;
      emptyEl.hidden = true;
      setStatus("Searching live rates…", false);
      showSkeleton();

      var qs = new URLSearchParams({
        destination: params.destination,
        placeId: params.placeId,
        checkin: params.checkin,
        checkout: params.checkout,
        rooms: params.rooms,
        adults: params.adults,
        nationality: params.nationality
      });

      fetch("/api/hotels/search?" + qs.toString())
        .then(function(r){
          if (!r.ok) throw new Error("Search failed (" + r.status + ")");
          return r.json();
        })
        .then(function(data){
          setStatus("", false);
          renderResults(data, params);
        })
        .catch(function(err){
          resultsEl.hidden = true;
          setStatus("We couldn't reach live rates right now — try again, or send us a request below and an agent will quote you directly.", true);
        });
    });
  });
})();

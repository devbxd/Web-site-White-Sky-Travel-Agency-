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

    function starMarkup(stars){
      var n = Math.max(0, Math.min(5, Math.round(stars || 0)));
      var html = "";
      for (var i = 0; i < n; i++) html += "<span></span>";
      return html;
    }

    function whatsAppUrl(roomName, price, currency){
      var lines = [
        "Hotel enquiry — White Sky Travel Agency",
        "Hotel: " + document.getElementById("hdName").textContent,
        "Room: " + (roomName || "Best available rate"),
        "Check-in: " + (checkin || "—"),
        "Check-out: " + (checkout || "—"),
        "Guests: " + adults + " adult(s), " + rooms + " room(s)"
      ];
      if (price != null) lines.push("Quoted rate: " + (currency || "USD") + " " + Number(price).toFixed(0));
      return "https://wa.me/96598818699?text=" + encodeURIComponent(lines.join("\n"));
    }

    var qs = new URLSearchParams({ id: id, checkin: checkin, checkout: checkout, rooms: rooms, adults: adults, nationality: nationality });

    fetch("/api/hotels/details?" + qs.toString())
      .then(function(r){
        if (!r.ok) throw new Error("Failed (" + r.status + ")");
        return r.json();
      })
      .then(function(hotel){
        loadingEl.hidden = true;

        document.title = hotel.name + " — White Sky Travel Agency";
        document.getElementById("hdCrumbName").textContent = hotel.name;
        document.getElementById("hdName").textContent = hotel.name;
        document.getElementById("hdStars").innerHTML = starMarkup(hotel.stars);

        var addrWrap = document.getElementById("hdAddress");
        if (hotel.address) {
          addrWrap.querySelector("span:last-child").textContent = hotel.address;
        } else {
          addrWrap.hidden = true;
        }

        var descEl = document.getElementById("hdDescription");
        if (hotel.description) {
          descEl.textContent = hotel.description;
        } else {
          descEl.hidden = true;
        }

        var facilitiesEl = document.getElementById("hdFacilities");
        (hotel.facilities || []).forEach(function(f){
          var chip = document.createElement("span");
          chip.className = "hd-chip";
          chip.textContent = f;
          facilitiesEl.appendChild(chip);
        });

        /* ---------- Gallery ---------- */
        var images = (hotel.images || []).filter(function(img){ return img.url; });
        var mainImg = document.getElementById("hdMainImage");
        var strip = document.getElementById("hdGalleryStrip");

        function setMain(url, alt){
          mainImg.src = url;
          mainImg.alt = alt || hotel.name;
        }

        if (images.length) {
          setMain(images[0].url, hotel.name);
          images.forEach(function(img, i){
            var thumb = document.createElement("button");
            thumb.type = "button";
            thumb.className = "hd-strip-thumb" + (i === 0 ? " active" : "");
            var thumbImg = document.createElement("img");
            thumbImg.src = img.url;
            thumbImg.alt = img.caption || hotel.name;
            thumbImg.loading = "lazy";
            thumb.appendChild(thumbImg);
            thumb.addEventListener("click", function(){
              setMain(img.url, img.caption || hotel.name);
              strip.querySelectorAll(".hd-strip-thumb").forEach(function(t){ t.classList.remove("active"); });
              thumb.classList.add("active");
            });
            strip.appendChild(thumb);
          });
        } else {
          document.querySelector(".hd-gallery").hidden = true;
        }

        /* ---------- Rooms / rates ---------- */
        var roomsList = document.getElementById("hdRoomsList");
        var rooms_ = hotel.rooms || [];

        if (!rooms_.length) {
          var noRates = document.createElement("p");
          noRates.className = "hd-no-rates";
          noRates.textContent = "No live rates for these dates — send us a request and an agent will confirm availability.";
          roomsList.appendChild(noRates);
        } else {
          rooms_.forEach(function(room){
            var row = document.createElement("div");
            row.className = "hd-room-row";

            var info = document.createElement("div");
            info.className = "hd-room-info";
            var name = document.createElement("span");
            name.className = "hd-room-name";
            name.textContent = room.name || "Room";
            info.appendChild(name);

            var badges = document.createElement("div");
            badges.className = "hs-card-meta";
            if (room.board) {
              var b = document.createElement("span");
              b.className = "hs-badge";
              b.textContent = room.board;
              badges.appendChild(b);
            }
            if (room.freeCancellation) {
              var fc = document.createElement("span");
              fc.className = "hs-badge free-cancel";
              fc.textContent = "Free cancellation";
              badges.appendChild(fc);
            }
            info.appendChild(badges);

            var priceWrap = document.createElement("div");
            priceWrap.className = "hd-room-price";
            var amount = document.createElement("span");
            amount.className = "amount";
            amount.textContent = (room.currency || "USD") + " " + Number(room.price).toFixed(0);
            var bookBtn = document.createElement("a");
            bookBtn.className = "btn btn-gold";
            bookBtn.textContent = "Request This Rate";
            bookBtn.href = whatsAppUrl(room.name, room.price, room.currency);
            bookBtn.target = "_blank";
            bookBtn.rel = "noopener";
            priceWrap.appendChild(amount);
            priceWrap.appendChild(bookBtn);

            row.appendChild(info);
            row.appendChild(priceWrap);
            roomsList.appendChild(row);
          });
        }

        contentEl.hidden = false;
      })
      .catch(function(){
        loadingEl.hidden = true;
        errorEl.hidden = false;
        errorEl.textContent = "We couldn't load this hotel's details right now. Please go back and try again, or send us a request and an agent will help directly.";
      });
  });
})();

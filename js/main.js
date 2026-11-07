/* White Sky Travel Agency — site behaviour (no frameworks, no backend) */
(function(){
  "use strict";

  /* ---------- Office directory (single source of truth) ---------- */
  var OFFICES = {
    kuwait: {
      label: "Kuwait Office",
      address: "Kuwait City – Al Douwaliya Complex, Kuwait",
      phoneDisplay: "+965 9881 8699",
      phoneWa: "96598818699",
      email: "info@whiteskytravelsagency.com"
    },
    lebanon: {
      label: "Lebanon Office",
      address: "Cheka, Lebanon",
      phoneDisplay: "+961 76 141 918",
      phoneWa: "96176141918",
      email: "majd@mstravelagency.com"
    }
  };
  window.WHITE_SKY_OFFICES = OFFICES;

  document.addEventListener("DOMContentLoaded", function(){

    /* ---------- Mobile nav toggle ---------- */
    var toggle = document.querySelector(".nav-toggle");
    var links = document.querySelector(".nav-links");
    if (toggle && links) {
      toggle.addEventListener("click", function(){
        links.classList.toggle("open");
        toggle.classList.toggle("active");
      });
      links.querySelectorAll("a").forEach(function(a){
        a.addEventListener("click", function(){ links.classList.remove("open"); toggle.classList.remove("active"); });
      });
    }

    /* ---------- Footer year ---------- */
    document.querySelectorAll("[data-year]").forEach(function(el){
      el.textContent = new Date().getFullYear();
    });

    /* ---------- Reveal on scroll ---------- */
    var revealEls = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window && revealEls.length) {
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
      revealEls.forEach(function(el){ io.observe(el); });
    } else {
      revealEls.forEach(function(el){ el.classList.add("in"); });
    }

    /* ---------- Home "boarding pass": sends the trip to the office you fly from ---------- */
    var trip = document.getElementById("quickTrip");
    if (trip) {
      var fromSel = trip.querySelector("#qtFrom");
      var toInput = trip.querySelector("#qtTo");
      var FROM = { kuwait: ["KWI", "Kuwait City"], lebanon: ["BEY", "Beirut"] };
      var setText = function(sel, txt){ var el = document.querySelector(sel); if (el) el.textContent = txt; };
      fromSel.addEventListener("change", function(){
        setText("[data-from-code]", FROM[fromSel.value][0]);
        setText("[data-from-city]", FROM[fromSel.value][1]);
      });
      toInput.addEventListener("input", function(){
        var v = toInput.value.trim();
        setText("[data-to-code]", v ? v.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "???" : "???");
        setText("[data-to-city]", v || "Anywhere");
      });
      trip.addEventListener("submit", function(e){
        e.preventDefault();
        var office = OFFICES[fromSel.value] || OFFICES.kuwait;
        var dates = trip.querySelector("#qtDates").value.trim();
        var lines = [
          "✈️ *Trip request — White Sky Travel Agency*",
          "",
          "*From:* " + FROM[fromSel.value][1],
          "*To:* " + toInput.value.trim()
        ];
        if (dates) lines.push("*When:* " + dates);
        lines.push("*Travellers:* " + trip.querySelector("#qtPax").value, "", "Could you send me some options? Thank you!");
        window.open("https://wa.me/" + office.phoneWa + "?text=" + encodeURIComponent(lines.join("\n")), "_blank", "noopener");
      });
    }

    /* ---------- Request / quote form ---------- */
    var form = document.getElementById("requestForm");
    if (form) {

      /* Pre-select a service passed via ?service=flights|hotels|visa|packages */
      var params = new URLSearchParams(window.location.search);
      var svc = params.get("service");
      var serviceSelect = form.querySelector("#service");
      if (svc && serviceSelect) {
        var opt = serviceSelect.querySelector('option[value="' + svc + '"]');
        if (opt) serviceSelect.value = svc;
      }
      var destParam = params.get("destination");
      var destInput = form.querySelector("#destination");
      if (destParam && destInput) destInput.value = destParam;
      var officeParam = params.get("office");
      var officeSelect = form.querySelector("#office");
      if (officeParam && officeSelect) {
        var oOpt = officeSelect.querySelector('option[value="' + officeParam + '"]');
        if (oOpt) officeSelect.value = officeParam;
      }

      function buildMessage() {
        var data = new FormData(form);
        var name = (data.get("name") || "").toString().trim();
        var email = (data.get("email") || "").toString().trim();
        var phone = (data.get("phone") || "").toString().trim();
        var office = (data.get("office") || "kuwait").toString();
        var service = (data.get("service") || "").toString();
        var destination = (data.get("destination") || "").toString().trim();
        var dates = (data.get("dates") || "").toString().trim();
        var message = (data.get("message") || "").toString().trim();

        var serviceLabels = {
          flights: "Flight Tickets",
          hotels: "Hotel Reservation",
          visa: "Visa Assistance",
          packages: "Tours & Packages",
          other: "Other"
        };

        var lines = [
          "New enquiry — White Sky Travel Agency",
          "Name: " + name,
          "Phone: " + phone
        ];
        if (email) lines.push("Email: " + email);
        lines.push("Service: " + (serviceLabels[service] || "Not specified"));
        if (destination) lines.push("Destination: " + destination);
        if (dates) lines.push("Preferred dates: " + dates);
        if (message) lines.push("Notes: " + message);

        return { text: lines.join("\n"), office: OFFICES[office] || OFFICES.kuwait, name: name, phone: phone };
      }

      function validate() {
        var name = form.querySelector("#name");
        var phone = form.querySelector("#phone");
        var ok = true;
        [name, phone].forEach(function(field){
          if (field && !field.value.trim()) {
            field.style.borderColor = "#c0954c";
            ok = false;
          } else if (field) {
            field.style.borderColor = "";
          }
        });
        return ok;
      }

      var status = document.getElementById("formStatus");
      function showStatus(msg) {
        if (!status) return;
        status.textContent = msg;
        status.classList.add("show");
      }

      var waBtn = document.getElementById("sendWhatsApp");
      if (waBtn) {
        waBtn.addEventListener("click", function(){
          if (!validate()) { showStatus("Please fill in your name and phone number first."); return; }
          var payload = buildMessage();
          var url = "https://wa.me/" + payload.office.phoneWa + "?text=" + encodeURIComponent(payload.text);
          showStatus("Opening WhatsApp with your request pre-filled to our " + payload.office.label + " — just hit send.");
          window.open(url, "_blank", "noopener");
        });
      }

      var mailBtn = document.getElementById("sendEmail");
      if (mailBtn) {
        mailBtn.addEventListener("click", function(){
          if (!validate()) { showStatus("Please fill in your name and phone number first."); return; }
          var payload = buildMessage();
          var subject = "Travel enquiry from " + payload.name;
          var url = "mailto:" + payload.office.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(payload.text);
          showStatus("Opening your email app with your request pre-filled to our " + payload.office.label + ".");
          window.location.href = url;
        });
      }

      form.addEventListener("submit", function(e){ e.preventDefault(); });
    }
  });
})();

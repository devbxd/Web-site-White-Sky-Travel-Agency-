/* White Sky — Christmas & New Year season.
   The whole festive look switches itself on from 1 November to 7 January, then the normal site returns.
   Preview any time with ?season=on or ?season=off. To change the dates, edit isSeason(). */
(function () {
  "use strict";

  var now = new Date();
  var forced = new URLSearchParams(location.search).get("season");

  function isSeason(d) {
    var month = d.getMonth(), day = d.getDate();
    return month === 10 || month === 11 || (month === 0 && day <= 7);
  }
  if (forced === "off" || (forced !== "on" && !isSeason(now))) return;

  document.documentElement.classList.add("season");

  /* The year we are counting towards: 2027 during Nov/Dec 2026, and still 2027 in early January. */
  var newYear = now.getMonth() === 0 ? now.getFullYear() : now.getFullYear() + 1;

  /* What the headline counts towards depends on the day it is read. */
  function moment() {
    var at = new Date(), xmas = new Date(newYear - 1, 11, 25), xmasEnd = new Date(newYear - 1, 11, 26), ny = new Date(newYear, 0, 1);
    if (at < xmas) return { head: "Christmas is coming", target: xmas };
    if (at < xmasEnd) return { head: "Merry Christmas", target: ny };
    if (at < ny) return { head: newYear + " is coming", target: ny };
    return { head: "Happy New Year", target: null };
  }

  function runCountdown(box, head) {
    var labels = ["Days", "Hours", "Min", "Sec"];
    box.innerHTML = labels.map(function (label) { return "<div><b>00</b><span>" + label + "</span></div>"; }).join("");
    var cells = box.querySelectorAll("b");
    function pad(n) { return n < 10 ? "0" + n : String(n); }
    function tick() {
      var m = moment();
      if (head && head.textContent !== m.head) head.textContent = m.head;
      if (!m.target) { box.hidden = true; return; }
      var left = Math.max(0, Math.floor((m.target - new Date()) / 1000));
      var values = [Math.floor(left / 86400), Math.floor(left / 3600) % 24, Math.floor(left / 60) % 60, left % 60];
      values.forEach(function (v, i) { var t = pad(v); if (cells[i].textContent !== t) cells[i].textContent = t; });
      setTimeout(tick, 1000 - Date.now() % 1000);
    }
    tick();
  }

  function loadScript(src) {
    var script = document.createElement("script");
    script.src = src;
    document.body.appendChild(script);
  }

  /* A real garland hung under a bar; its fairy lights twinkle in two alternating sets. */
  function hangGarland(host) {
    var garland = document.createElement("div");
    garland.className = "season-garland";
    garland.setAttribute("aria-hidden", "true");
    garland.innerHTML = "<i></i><i></i>";
    host.appendChild(garland);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.content = "#0b241a";

    var tag = document.querySelector(".tl-tag");
    if (tag) tag.innerHTML = '<a href="tel:+96598818699">Christmas is coming. Call us for our new offers</a>';

    var countdown = document.querySelector("[data-xm-count]");
    if (countdown) runCountdown(countdown, document.querySelector("[data-xm-head]"));

    /* a snowy picture instead of the sea on the About page */
    var side = document.querySelector(".about-img img");
    if (side) { side.src = "assets/season/about-side.webp"; side.alt = "Snow-covered tree under street lamps at night"; }

    var header = document.querySelector(".hdr");
    if (header) hangGarland(header);
    var footer = document.querySelector(".site-footer");
    if (footer) hangGarland(footer);

    if (!matchMedia("(prefers-reduced-motion:reduce)").matches) loadScript("js/season-flakes.js");
    if (document.getElementById("xmas")) loadScript("js/season-scene.js");
  });
})();

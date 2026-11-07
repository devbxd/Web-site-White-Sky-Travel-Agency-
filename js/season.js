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
  window.WHITE_SKY_SEASON = { year: newYear };

  function daysUntil(month, day, year) {
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((new Date(year, month, day) - today) / 864e5);
  }

  /* What the headline says depends on the day it is read. */
  function moment() {
    var toXmas = now.getMonth() === 0 ? -1 : daysUntil(11, 25, now.getFullYear());
    var toYear = daysUntil(0, 1, newYear);
    if (toXmas > 1) return { count: toXmas + " days to Christmas", head: 'Christmas is <em>coming.</em>' };
    if (toXmas === 1) return { count: "Christmas Eve", head: 'Christmas is <em>here.</em>' };
    if (toXmas === 0) return { count: "Today", head: 'Merry <em>Christmas.</em>' };
    if (toYear > 0) return { count: toYear + (toYear === 1 ? " day to " : " days to ") + newYear, head: newYear + ' is <em>coming.</em>' };
    return { count: "Welcome to " + newYear, head: 'Happy New <em>Year.</em>' };
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
    if (theme) theme.content = "#1c0f0b";

    var tag = document.querySelector(".tl-tag");
    if (tag) tag.innerHTML = '<a href="tel:+96598818699">Christmas is coming. Call us for our new offers</a>';

    var m = moment();
    document.querySelectorAll("[data-xm-count]").forEach(function (el) { el.textContent = m.count; });
    document.querySelectorAll("[data-xm-head]").forEach(function (el) { el.innerHTML = m.head; });

    var header = document.querySelector(".hdr");
    if (header) hangGarland(header);
    var footer = document.querySelector(".site-footer");
    if (footer) hangGarland(footer);

    if (!matchMedia("(prefers-reduced-motion:reduce)").matches) loadScript("js/season-flakes.js");
    if (document.getElementById("xmas")) loadScript("js/season-scene.js");
  });
})();

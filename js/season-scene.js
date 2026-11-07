/* White Sky — the Christmas opening: three full-screen photographs. One scroll or swipe plays the
   dissolve to the next one; after the last, the page scrolls normally. */
(function () {
  "use strict";

  var stage = document.getElementById("xmas");
  if (!stage) return;
  var sticky = stage.querySelector(".xm-sticky");
  var shots = [].slice.call(stage.querySelectorAll(".xm-shot"));
  var panels = [].slice.call(stage.querySelectorAll(".xm-panel"));
  var next = stage.querySelector(".xm-next");
  var reduced = matchMedia("(prefers-reduced-motion:reduce)").matches;
  var STOPS = [0, 0.5, 1];

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function smooth(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  function travel() { return stage.offsetHeight - sticky.offsetHeight; }
  function progress() { return clamp(-stage.getBoundingClientRect().top / travel(), 0, 1); }

  function draw(p) {
    var fades = [1, clamp(p / 0.5, 0, 1), clamp((p - 0.5) / 0.5, 0, 1)];
    var zoom = [p, p - 0.2, p - 0.55];
    shots.forEach(function (shot, i) {
      shot.style.opacity = fades[i].toFixed(3);
      if (!reduced) shot.style.transform = "scale(" + (1.03 + Math.max(zoom[i], 0) * 0.12).toFixed(4) + ")";
    });
    var copy = [
      1 - smooth(0.02, 0.2, p),
      smooth(0.3, 0.48, p) * (1 - smooth(0.52, 0.7, p)),
      smooth(0.8, 0.98, p)
    ];
    panels.forEach(function (panel, i) {
      panel.style.opacity = copy[i].toFixed(3);
      panel.style.transform = "translateY(" + ((1 - copy[i]) * 22).toFixed(1) + "px)";
      panel.style.visibility = copy[i] < 0.02 ? "hidden" : "visible";
      panel.classList.toggle("on", copy[i] > 0.5);
    });
  }

  addEventListener("scroll", function () { draw(progress()); }, { passive: true });
  addEventListener("resize", function () { draw(progress()); });
  draw(progress());

  /* ---------- one gesture, one scene ---------- */
  var moving = false, stoppedAt = 0, lastWheel = 0;

  function stopY(p) {
    if (p === 0) return 0;
    return stage.getBoundingClientRect().top + scrollY + p * travel();
  }
  function glideTo(y) {
    var from = scrollY, begin = performance.now(), length = reduced ? 1 : 2000;
    moving = true;
    (function step(now) {
      var t = clamp((now - begin) / length, 0, 1);
      var eased = (1 - Math.cos(t * Math.PI)) / 2;
      scrollTo({ top: from + (y - from) * eased, behavior: "instant" });
      if (t < 1) { requestAnimationFrame(step); return; }
      moving = false;
      stoppedAt = performance.now();
    })(begin);
  }
  /* the scene to move to, or null when the page should simply scroll */
  function target(direction) {
    if (-stage.getBoundingClientRect().top > travel() + 2) return null;
    var p = progress(), found = null;
    STOPS.forEach(function (stop) {
      if (direction > 0 && found === null && stop > p + 0.01) found = stop;
      if (direction < 0 && stop < p - 0.01) found = stop;
    });
    return found;
  }

  addEventListener("wheel", function (e) {
    if (e.ctrlKey || !e.deltaY) return;
    var now = performance.now(), gap = now - lastWheel;
    lastWheel = now;
    if (moving) { e.preventDefault(); return; }
    var stop = target(e.deltaY > 0 ? 1 : -1);
    if (stop === null) return;
    e.preventDefault();
    /* ignore the tail of a trackpad flick that already moved a scene */
    if (gap < 120 && now - stoppedAt < 900) return;
    glideTo(stopY(stop));
  }, { passive: false });

  var touchY = null;
  stage.addEventListener("touchstart", function (e) { touchY = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener("touchmove", function (e) {
    if (touchY === null) return;
    var delta = touchY - e.touches[0].clientY;
    if (moving || (Math.abs(delta) > 2 && target(delta > 0 ? 1 : -1) !== null)) {
      if (e.cancelable) e.preventDefault();
    }
  }, { passive: false });
  stage.addEventListener("touchend", function (e) {
    if (touchY === null) return;
    var delta = touchY - e.changedTouches[0].clientY;
    touchY = null;
    if (moving || Math.abs(delta) < 24) return;
    var stop = target(delta > 0 ? 1 : -1);
    if (stop !== null) glideTo(stopY(stop));
  });

  if (next) next.addEventListener("click", function () {
    var stop = target(1);
    glideTo(stop !== null ? stopY(stop) : stage.getBoundingClientRect().bottom + scrollY - sticky.getBoundingClientRect().top);
  });
})();

/* White Sky — the Christmas opening: three full-screen photographs that dissolve into one
   another as you scroll, each with its own headline. */
(function () {
  "use strict";

  var stage = document.getElementById("xmas");
  if (!stage) return;
  var sticky = stage.querySelector(".xm-sticky");
  var shots = [].slice.call(stage.querySelectorAll(".xm-shot"));
  var panels = [].slice.call(stage.querySelectorAll(".xm-panel"));
  var hint = stage.querySelector(".xm-hint");
  var reduced = matchMedia("(prefers-reduced-motion:reduce)").matches;

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function smooth(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  var current = 0, target = 0, running = false;

  function draw(p) {
    /* each photograph holds, then dissolves into the next */
    var fades = [1, smooth(0.24, 0.42, p), smooth(0.62, 0.8, p)];
    /* a slow push-in tied to scroll, like a shot in a film */
    var zoom = [p, p - 0.2, p - 0.55];
    shots.forEach(function (shot, i) {
      shot.style.opacity = fades[i].toFixed(3);
      if (!reduced) shot.style.transform = "scale(" + (1.03 + Math.max(zoom[i], 0) * 0.12).toFixed(4) + ")";
    });
    /* the words leave a little before their photograph does */
    var copy = [
      1 - smooth(0.16, 0.3, p),
      smooth(0.36, 0.46, p) * (1 - smooth(0.56, 0.68, p)),
      smooth(0.74, 0.84, p)
    ];
    panels.forEach(function (panel, i) {
      panel.style.opacity = copy[i].toFixed(3);
      panel.style.transform = "translateY(" + ((1 - copy[i]) * 22).toFixed(1) + "px)";
      panel.style.visibility = copy[i] < 0.02 ? "hidden" : "visible";
      panel.classList.toggle("on", copy[i] > 0.5);
    });
    if (hint) hint.style.opacity = (1 - smooth(0.01, 0.1, p)).toFixed(3);
  }

  function loop() {
    current += (target - current) * (reduced ? 1 : 0.12);
    if (Math.abs(target - current) < 0.0005) current = target;
    draw(current);
    if (current !== target) requestAnimationFrame(loop);
    else running = false;
  }

  function read() {
    var rect = stage.getBoundingClientRect();
    target = clamp(-rect.top / (rect.height - sticky.offsetHeight), 0, 1);
    if (!running) { running = true; requestAnimationFrame(loop); }
  }

  addEventListener("scroll", read, { passive: true });
  addEventListener("resize", read);
  read();
  current = target;
  draw(current);
})();

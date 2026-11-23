// Jarvis : quand le clavier monte, l'image ne rétrécit plus. Seule la barre d'écriture remonte.
(function () {
  var art = document.getElementById("art"), bar = document.getElementById("bar"), ms = document.getElementById("msgs");
  if (!art || !bar || !ms) return;
  var max = window.innerHeight, w = window.innerWidth;
  function fix() {
    if (window.innerWidth !== w) { w = window.innerWidth; max = window.innerHeight; }   // rotation de l'écran
    if (window.innerHeight > max) max = window.innerHeight;
    var kb = max - window.innerHeight;
    if (kb > 120) {
      art.style.height = max + "px";
      bar.style.transform = "translateY(-" + kb + "px)";
      ms.style.bottom = "calc(12% + " + kb + "px)";
      ms.scrollTop = ms.scrollHeight;
    } else {
      art.style.height = "";
      bar.style.transform = "";
      ms.style.bottom = "";
    }
  }
  window.addEventListener("resize", fix);
  fix();
})();

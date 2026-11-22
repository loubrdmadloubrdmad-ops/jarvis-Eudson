// Correctif d'affichage : les cartes de code ne doivent jamais s'écraser quand la discussion est longue
(function () {
  var f = document.createElement("style");
  f.textContent = ".code{flex:none !important}.m{flex:none}";
  document.head.appendChild(f);
})();

// Bandeau "Installer Jarvis" : apparaît tout seul à l'ouverture du site
(function () {
  var standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (standalone) return;
  try { if (Date.now() - Number(localStorage.getItem("jarvis_inst_x") || 0) < 3 * 86400000) return; } catch (e) {}

  var st = document.createElement("style");
  st.textContent =
    "#inst{position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 68px);transform:translateX(-50%);z-index:60;" +
    "width:min(92vw,400px);display:flex;align-items:center;gap:10px;padding:10px 10px 10px 16px;border-radius:999px;" +
    "background:#0b0b0d;border:1px solid rgba(255,255,255,.55);box-shadow:0 0 18px rgba(220,228,240,.3);color:#e8ebf0;" +
    "font:14px system-ui,sans-serif}" +
    "#inst span{flex:1;line-height:1.25}" +
    "#inst b{flex:none;background:#d9dde4;color:#000;border:0;border-radius:999px;padding:9px 14px;font:600 14px system-ui,sans-serif;cursor:pointer}" +
    "#inst i{flex:none;font-style:normal;width:30px;height:30px;display:grid;place-items:center;color:#8e939c;font-size:20px;cursor:pointer}";
  document.head.appendChild(st);

  var box = null, ev = null;
  function close(save) {
    if (box) { box.remove(); box = null; }
    if (save) { try { localStorage.setItem("jarvis_inst_x", String(Date.now())); } catch (e) {} }
  }
  function show(text, btn, fn) {
    if (box) box.remove();
    box = document.createElement("div"); box.id = "inst";
    var s = document.createElement("span"); s.textContent = text; box.appendChild(s);
    if (btn) { var b = document.createElement("b"); b.textContent = btn; b.onclick = fn; box.appendChild(b); }
    var x = document.createElement("i"); x.textContent = "×"; x.onclick = function () { close(true); }; box.appendChild(x);
    document.body.appendChild(box);
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); ev = e;
    show("Installer Jarvis sur ton téléphone", "Installer", function () {
      ev.prompt();
      ev.userChoice.then(function () { ev = null; close(false); });
    });
  });
  window.addEventListener("appinstalled", function () { close(false); });

  // Si Chrome ne propose pas l'installation automatique : on explique quoi toucher
  setTimeout(function () {
    if (!box && /Android/i.test(navigator.userAgent)) {
      show("Pour installer : touche ⋮ puis « Ajouter à l'écran d'accueil »");
    }
  }, 2500);
})();

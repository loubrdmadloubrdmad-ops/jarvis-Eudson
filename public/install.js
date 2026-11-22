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

// ---------- Images : "fais-moi une image de..." ----------
(function () {
  var st = document.createElement("style");
  st.textContent =
    ".m.gen{background:none;border:0;padding:0;border-radius:0}" +
    ".m.gen img{display:block;width:min(300px,76vw);aspect-ratio:1/1;object-fit:cover;border-radius:24px;cursor:pointer}" +
    ".m.gen button{margin-top:8px;background:#d9dde4;color:#000;border:0;border-radius:999px;padding:8px 14px;font:600 13px system-ui,sans-serif;cursor:pointer}";
  document.head.appendChild(st);

  if (typeof ask !== "function") return;
  var orig = ask;
  var norm = function (s) { return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); };
  var A = /\b(fais|fait|faire|genere|generer|cree|creer|dessine|dessiner|donne|montre|imagine|invente)\b.{0,30}\b(image|photo|illustration|dessin|logo|affiche|wallpaper|portrait|visuel|fond d.ecran)s?\b/;
  var B = /^\s*(une?\s+)?(image|photo|dessin|illustration)\s+(de|d.)/;
  function isImg(t) { var n = norm(t); return A.test(n) || B.test(n); }

  window.ask = function (text) {
    if (!text || busy || (typeof pending !== "undefined" && pending) || !isImg(text)) return orig(text);
    return makeImage(text);
  };

  async function makeImage(text) {
    busy = true; stopSpeak();
    add(text, "u");
    var wait = document.createElement("div");
    wait.className = "m j dots"; wait.innerHTML = "<i></i><i></i><i></i>";
    msgs.appendChild(wait); msgs.scrollTop = msgs.scrollHeight;
    var data = {}, status = 0;
    try {
      var r = await fetch("/api/image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text })
      });
      status = r.status;
      try { data = await r.json(); } catch (e) {}
    } catch (e) { data = { reply: "Je n'arrive pas à joindre le serveur. Vérifie ta connexion." }; }
    wait.remove();
    var said;
    if (data.image) {
      var d = document.createElement("div"); d.className = "m j gen";
      var im = document.createElement("img"); im.src = data.image; im.className = "zoomable"; im.alt = "Image créée";
      var b = document.createElement("button"); b.textContent = "Télécharger";
      b.onclick = function () { var a = document.createElement("a"); a.href = data.image; a.download = "jarvis-image.jpg"; a.click(); };
      d.append(im, b); msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
      said = "Voilà ton image, mon gars.";
      record(text, false, "🖼 Image créée.");
    } else {
      said = data.reply || ("Erreur du serveur (" + status + ")");
      add(said, "j");
    }
    speak(said);
    history.push({ role: "user", content: text }, { role: "assistant", content: data.image ? "(image créée)" : said });
    history = history.slice(-10);
    busy = false;
  }
})();

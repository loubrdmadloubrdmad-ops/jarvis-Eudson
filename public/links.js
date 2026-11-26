// Jarvis : Centre de liens. Les liens (envoyés ou reçus dans le chat, ou collés à la main) sont rangés par catégorie.
(function () {
  var art = document.getElementById("art"), msgs = document.getElementById("msgs");
  if (!art || !msgs) return;
  var KEY = "jarvis_links", CATS = ["Vidéos", "Images", "Images 3D", "Modèles 3D", "Code", "Autres"];
  var cat = "Tous", ord = "new";

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
  function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a.slice(-300))); } catch (e) {} }
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return ""; } }
  function guess(u) {
    var l = u.toLowerCase(), h = host(u), img = /\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/.test(l);
    if (/\.(stl|obj|fbx|glb|gltf|3mf|blend)(\?|#|$)/.test(l) || /(sketchfab|thingiverse|printables|cults3d|turbosquid|cgtrader|myminifactory)\./.test(h)) return "Modèles 3D";
    if ((img || /(artstation|blendswap)\./.test(h)) && /3d/.test(l)) return "Images 3D";
    if (/(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|tiktok\.com|twitch\.tv)/.test(h) || /\.(mp4|webm|mov|mkv)(\?|#|$)/.test(l)) return "Vidéos";
    if (img || /(unsplash|pexels|pixabay|pinterest|imgur|flickr)\./.test(h)) return "Images";
    if (/(github\.com|gitlab\.com|stackoverflow\.com|codepen\.io|replit\.com|developer\.mozilla\.org)/.test(h)) return "Code";
    return "Autres";
  }
  function ago(ts) {
    var s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return "à l'instant";
    var m = Math.floor(s / 60); if (m < 60) return "il y a " + m + " min";
    var h = Math.floor(m / 60); if (h < 24) return "il y a " + h + " h";
    var d = Math.floor(h / 24); if (d < 30) return "il y a " + d + " jour" + (d > 1 ? "s" : "");
    var mo = Math.floor(d / 30); if (mo < 12) return "il y a " + mo + " mois";
    var y = Math.floor(d / 365); return "il y a " + y + " an" + (y > 1 ? "s" : "");
  }
  function addLink(u, c) {
    u = String(u || "").trim().replace(/[.,;:!?)\]]+$/, "");
    if (!/^https?:\/\/[^\s]+\.[^\s]+/i.test(u)) return false;
    if (host(u) === location.hostname) return false;
    var a = load();
    if (a.some(function (x) { return x.url === u; })) return false;
    var p = ""; try { var o = new URL(u); p = o.pathname + o.search; } catch (e) {}
    a.push({ url: u, title: (host(u) + (p === "/" ? "" : p)).slice(0, 60), cat: c || guess(u), ts: Date.now() });
    save(a); return true;
  }

  var css = document.createElement("style");
  css.textContent =
    "#lc{position:absolute;inset:0;z-index:40;background:#050507;display:none;flex-direction:column;padding:72px 14px 16px;color:#e8ebf0;font-family:system-ui,sans-serif}" +
    "#lc.open{display:flex}" +
    "#lc .lh{display:flex;align-items:center;justify-content:space-between;flex:none;margin-bottom:10px}" +
    "#lc .lh b{font-size:21px;font-weight:600}" +
    "#lc button{font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}" +
    "#lc .lx{background:none;border:1px solid rgba(255,255,255,.35);color:#e8ebf0;width:36px;height:36px;border-radius:50%;font-size:16px}" +
    "#lc .lcats{display:flex;gap:8px;overflow-x:auto;flex:none;padding-bottom:10px;scrollbar-width:none}" +
    "#lc .lcats::-webkit-scrollbar{display:none}" +
    "#lc .lcats button{flex:none;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.04);color:#e8ebf0;border-radius:999px;padding:8px 15px;font-size:14px}" +
    "#lc .lcats button.on,#lc .lord button.on{background:#d9dde4;color:#000;border-color:#d9dde4;font-weight:600}" +
    "#lc .lord{display:flex;gap:8px;flex:none;margin-bottom:10px}" +
    "#lc .lord button{flex:1;border:1px solid rgba(255,255,255,.3);background:none;color:#e8ebf0;border-radius:12px;padding:9px;font-size:14px}" +
    "#lc .ladd{display:flex;gap:8px;flex:none;margin-bottom:10px}" +
    "#lc .ladd input{flex:1;min-width:0;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:12px;padding:10px 12px;font-size:15px;outline:none}" +
    "#lc .ladd button{background:#d9dde4;color:#000;border:0;border-radius:12px;padding:0 16px;font-weight:600;font-size:14px}" +
    "#lc .llist{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}" +
    "#lc .li{display:flex;align-items:center;gap:10px;padding:11px 12px;margin-bottom:8px;border:1px solid rgba(255,255,255,.16);border-radius:14px;background:rgba(255,255,255,.03)}" +
    "#lc .lt{flex:1;min-width:0}" +
    "#lc .lt b{display:block;font-weight:500;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    "#lc .lt span{display:block;font-size:12px;color:#8f96a3;margin-top:3px}" +
    "#lc .lb{display:flex;gap:6px;flex:none}" +
    "#lc .lb a,#lc .lb button{background:rgba(255,255,255,.1);color:#e8ebf0;border:0;border-radius:10px;padding:8px 11px;font-size:13px;text-decoration:none}" +
    "#lc .lb .dl{background:none;color:#8f96a3;padding:8px 6px}" +
    "#lc .vide{color:#8f96a3;text-align:center;padding:30px 10px;font-size:15px;line-height:1.4}";
  document.head.appendChild(css);

  var lc = document.createElement("div"); lc.id = "lc";
  lc.innerHTML = '<div class="lh"><b>Centre de liens</b><button class="lx" aria-label="Fermer">✕</button></div>' +
    '<div class="lcats"></div>' +
    '<div class="lord"><button data-o="new">Nouveaux</button><button data-o="old">Anciens</button></div>' +
    '<div class="ladd"><input type="url" placeholder="Colle un lien ici" autocomplete="off"><button>Ajouter</button></div>' +
    '<div class="llist"></div>';
  art.appendChild(lc);
  var elCats = lc.querySelector(".lcats"), elList = lc.querySelector(".llist"), inp = lc.querySelector(".ladd input");

  function el(t, c, txt) { var e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; }
  function copy(t, btn) {
    var done = function () { var o = btn.textContent; btn.textContent = "Copié ✓"; setTimeout(function () { btn.textContent = o; }, 1400); };
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(done, function () {
      var a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select();
      try { document.execCommand("copy"); } catch (e) {} a.remove(); done();
    });
  }
  function render() {
    elCats.textContent = "";
    ["Tous"].concat(CATS).forEach(function (c) {
      var b = el("button", c === cat ? "on" : "", c); b.onclick = function () { cat = c; render(); }; elCats.appendChild(b);
    });
    lc.querySelectorAll(".lord button").forEach(function (b) { b.classList.toggle("on", b.dataset.o === ord); });
    var a = load().filter(function (x) { return cat === "Tous" || x.cat === cat; });
    a.sort(function (x, y) { return ord === "new" ? y.ts - x.ts : x.ts - y.ts; });
    elList.textContent = "";
    if (!a.length) { elList.appendChild(el("div", "vide", "Aucun lien ici pour l'instant.\nColle un lien plus haut, ou envoie-en un dans le chat : je le range tout seul.")); elList.lastChild.style.whiteSpace = "pre-line"; return; }
    a.forEach(function (x) {
      var row = el("div", "li"), t = el("div", "lt");
      t.appendChild(el("b", "", x.title)); t.appendChild(el("span", "", x.cat + " · " + ago(x.ts)));
      var bar = el("div", "lb");
      var o = el("a", "", "Ouvrir"); o.href = x.url; o.target = "_blank"; o.rel = "noopener";
      var c = el("button", "", "Copier"); c.onclick = function () { copy(x.url, c); };
      var d = el("button", "dl", "✕"); d.setAttribute("aria-label", "Supprimer");
      d.onclick = function () { save(load().filter(function (y) { return y.url !== x.url; })); render(); };
      bar.append(o, c, d); row.append(t, bar); elList.appendChild(row);
    });
  }
  function open() { render(); lc.classList.add("open"); }
  function close() { lc.classList.remove("open"); }
  lc.querySelector(".lx").onclick = close;
  lc.querySelectorAll(".lord button").forEach(function (b) { b.onclick = function () { ord = b.dataset.o; render(); }; });
  function ajouter() {
    var v = inp.value.trim(); if (!v) return;
    if (!/^https?:\/\//i.test(v)) v = "https://" + v;
    if (addLink(v, cat === "Tous" ? "" : cat)) { inp.value = ""; render(); } else { inp.value = ""; inp.placeholder = "Lien invalide ou déjà là"; setTimeout(function () { inp.placeholder = "Colle un lien ici"; }, 1800); }
  }
  lc.querySelector(".ladd button").onclick = ajouter;
  inp.addEventListener("keydown", function (e) { if (e.key === "Enter") ajouter(); });

  // la ligne « Centre de liens » du panneau du bas ouvre cette page
  var panel = document.getElementById("panel");
  if (panel) panel.addEventListener("click", function (e) {
    var r = e.target.closest(".row");
    if (r && /Centre de liens/.test(r.textContent)) { e.stopImmediatePropagation(); panel.classList.remove("open"); open(); }
  }, true);

  // les liens vus dans le chat sont rangés automatiquement
  var re = /https?:\/\/[^\s<>"'`]+/g;
  function scan() {
    msgs.querySelectorAll(".m").forEach(function (m) {
      if (m.dataset.lk) return; m.dataset.lk = "1";
      var found = (m.textContent || "").match(re) || [];
      found.forEach(function (u) { addLink(u); });
    });
  }
  var tm; new MutationObserver(function () { clearTimeout(tm); tm = setTimeout(scan, 400); }).observe(msgs, { childList: true, subtree: true });
  window.jarvisLinks = { open: open, add: addLink };
})();

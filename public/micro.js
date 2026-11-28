// Jarvis : micro en direct + bouton Envoyer qui devient Arrêt pendant que tu parles.
(function () {
  var AUTO_SEND = true;   // true : quand tu t'arrêtes de parler, le message part tout seul. false : le texte reste dans la zone pour que tu l'envoies.
  var inp = document.getElementById("inp"), mic = document.getElementById("mic"),
      send = document.getElementById("send"), bar = document.getElementById("bar");
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!inp || !mic || !send || !bar || !SR || window.__micro) return;
  window.__micro = true;

  // ---------- Style ----------
  var css = document.createElement("style");
  css.textContent =
    "#send{position:relative;transition:background-color .25s,transform .25s}" +
    "#send svg{transition:opacity .22s,transform .3s cubic-bezier(.3,1.4,.5,1)}" +
    "#send .st{position:absolute;opacity:0;transform:scale(.3) rotate(-90deg);fill:currentColor;stroke:none}" +
    "#send.stop{background:#ff5a52;color:#fff;animation:mstop 1.3s ease-in-out infinite}" +
    "#send.stop svg:not(.st){opacity:0;transform:scale(.3) rotate(90deg)}" +
    "#send.stop .st{opacity:1;transform:none}" +
    "@keyframes mstop{0%,100%{box-shadow:0 0 0 0 rgba(255,90,82,.5)}50%{box-shadow:0 0 0 9px rgba(255,90,82,0)}}" +
    "#mic{transition:width .3s ease,opacity .2s ease,margin .3s ease}" +
    "#bar.rec #mic{width:0;opacity:0;margin-left:-6px;overflow:hidden;pointer-events:none;animation:none}" +
    "#inp.rec{color:transparent;caret-color:transparent}" +
    "#inp.rec::placeholder{color:transparent}" +
    "#lv{position:absolute;display:none;align-items:center;justify-content:flex-start;white-space:nowrap;overflow:hidden;" +
    "pointer-events:none;color:#fff;font-size:16px;font-family:inherit;box-sizing:border-box}" +
    "#lv.on{display:flex}" +
    "#lv .w{display:inline-block;margin-right:.3em;animation:wIn .26s ease both}" +
    "#lv .w.i{color:#aeb3bc}" +
    "@keyframes wIn{from{opacity:0;transform:translateY(7px);filter:blur(3px)}to{opacity:1;transform:none;filter:blur(0)}}" +
    "#lv .hint{color:#8e939c}";
  document.head.appendChild(css);

  // Icône « stop » cachée dans le bouton d'envoi : les deux icônes se transforment l'une en l'autre
  var NS = "http://www.w3.org/2000/svg";
  var st = document.createElementNS(NS, "svg");
  st.setAttribute("viewBox", "0 0 24 24"); st.setAttribute("class", "st");
  var rc = document.createElementNS(NS, "rect");
  rc.setAttribute("x", "6.5"); rc.setAttribute("y", "6.5"); rc.setAttribute("width", "11"); rc.setAttribute("height", "11"); rc.setAttribute("rx", "2.5");
  st.appendChild(rc); send.appendChild(st);

  // Calque qui affiche les mots un par un, par-dessus la zone de saisie
  var lv = document.createElement("div"); lv.id = "lv"; bar.appendChild(lv);

  // ---------- État ----------
  var rec = null, active = false, manual = false, base = "", finalTxt = "", gotFinal = false, sendAfter = false;
  var spans = [];

  function place() {
    lv.style.left = inp.offsetLeft + "px"; lv.style.top = inp.offsetTop + "px";
    lv.style.width = inp.offsetWidth + "px"; lv.style.height = inp.offsetHeight + "px";
    lv.style.paddingLeft = lv.style.paddingRight = "6px";
  }
  function words(t) { return String(t).split(/\s+/).filter(Boolean); }
  function show(final, interim) {
    var all = words(base + " " + final).map(function (w) { return [w, false]; })
      .concat(words(interim).map(function (w) { return [w, true]; }));
    place();
    lv.classList.add("on");
    while (spans.length > all.length) lv.removeChild(spans.pop());
    all.forEach(function (it, i) {
      var s = spans[i];
      if (!s) {
        s = document.createElement("span"); s.className = "w"; spans.push(s); lv.appendChild(s);
        s.textContent = it[0];                       // nouveau mot : il apparaît avec l'animation
      } else if (s.textContent !== it[0]) {
        s.textContent = it[0]; s.style.animation = "none"; void s.offsetWidth; s.style.animation = "";
      }
      s.classList.toggle("i", it[1]);
    });
    // texte court : collé à gauche ; texte long : on garde les derniers mots visibles
    lv.style.justifyContent = "flex-start";
    if (lv.scrollWidth > lv.clientWidth + 1) lv.style.justifyContent = "flex-end";
    // la zone de saisie contient toujours le vrai texte (final + provisoire)
    inp.value = (base + " " + final + " " + interim).replace(/\s+/g, " ").trim();
  }
  function clearOverlay() {
    spans = []; lv.textContent = ""; lv.classList.remove("on");
  }
  function ui(on) {
    bar.classList.toggle("rec", on); inp.classList.toggle("rec", on);
    send.classList.toggle("stop", on); mic.classList.toggle("on", false);
    send.setAttribute("aria-label", on ? "Arrêter le micro" : "Envoyer");
    inp.readOnly = on;
  }

  // ---------- Démarrer / arrêter ----------
  function start() {
    try { if (typeof stopSpeak === "function") stopSpeak(); } catch (e) {}
    base = inp.value.trim(); finalTxt = ""; gotFinal = false; manual = false; sendAfter = false;
    rec = new SR();
    rec.lang = (window.CONFIG && CONFIG.LANG) || "fr-FR";
    rec.interimResults = true; rec.continuous = false;
    rec.onstart = function () { active = true; ui(true); show("", ""); };
    rec.onresult = function (ev) {
      var fin = "", itm = "";
      for (var i = 0; i < ev.results.length; i++) {
        var r = ev.results[i], t = (r[0] && r[0].transcript) || "";
        if (r.isFinal !== false) { fin += " " + t; gotFinal = true; } else itm += " " + t;
      }
      finalTxt = fin.trim();
      show(finalTxt, itm.trim());
    };
    rec.onerror = function (e) {
      var c = (e && e.error) || "";
      if (c === "not-allowed" || c === "service-not-allowed") { try { toast("Le micro est bloqué : autorise-le dans les réglages."); } catch (x) {} }
    };
    rec.onend = function () { finish(); };
    try { rec.start(); } catch (e) { finish(); }
  }
  function stop() {
    manual = true;
    try { rec && rec.stop(); } catch (e) {}
    setTimeout(function () { if (active) finish(); }, 1500);   // sécurité si le navigateur ne répond pas
  }
  function finish() {
    if (!active && !bar.classList.contains("rec")) return;
    active = false;
    var text = (base + " " + finalTxt).replace(/\s+/g, " ").trim();
    if (manual && !finalTxt) text = (inp.value || base).trim();   // arrêt manuel : on garde ce qui était déjà affiché
    clearOverlay(); ui(false);
    inp.value = text;
    var go = sendAfter || (AUTO_SEND && !manual && gotFinal && text);
    if (go && text) { inp.value = ""; window.ask(text); }
    else if (text) { try { inp.focus(); } catch (e) {} }
  }

  // ---------- Boutons (on passe avant les anciens gestionnaires de la page) ----------
  mic.addEventListener("click", function (e) {
    e.stopImmediatePropagation(); e.preventDefault();
    if (active) stop(); else start();
  }, true);
  send.addEventListener("click", function (e) {
    if (!active) return;                       // pas d'enregistrement : l'envoi normal continue
    e.stopImmediatePropagation(); e.preventDefault();
    stop();
  }, true);
  inp.addEventListener("keydown", function (e) {
    if (active && e.key === "Enter") { e.stopImmediatePropagation(); e.preventDefault(); sendAfter = true; stop(); }
  }, true);
  window.addEventListener("resize", function () { if (active) place(); });
})();

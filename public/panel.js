(function () {
  var art = document.getElementById("art");
  if (!art) return;

  var css = document.createElement("style");
  css.textContent =
    "#pgrip{position:absolute;left:50%;top:85.4%;transform:translateX(-50%);width:34%;height:26px;z-index:20;background:none;border:0;padding:0;cursor:pointer}" +
    "#pgrip:after{content:'';position:absolute;left:50%;top:10px;transform:translateX(-50%);width:44px;height:5px;border-radius:3px;background:rgba(255,255,255,.55)}" +
    "#panel{position:absolute;left:0;right:0;bottom:0;top:34%;z-index:30;background:rgba(10,12,15,.99);border-radius:30px 30px 0 0;" +
      "border-top:1px solid rgba(255,255,255,.18);transform:translateY(102%);transition:transform .35s cubic-bezier(.2,.8,.2,1);" +
      "display:flex;flex-direction:column;overflow:hidden;touch-action:pan-y}" +
    "#panel.open{transform:none}" +
    "#pg2{height:26px;flex:none;background:none;border:0;position:relative;cursor:pointer}" +
    "#pg2:after{content:'';position:absolute;left:50%;top:10px;transform:translateX(-50%);width:44px;height:5px;border-radius:3px;background:rgba(255,255,255,.55)}" +
    "#chips{display:flex;gap:10px;padding:6px 14px 14px;overflow-x:auto;flex:none;scrollbar-width:none}" +
    "#chips::-webkit-scrollbar{display:none}" +
    ".chip{flex:none;width:84px;height:84px;border-radius:26px;border:1.5px solid rgba(255,255,255,.35);background:rgba(255,255,255,.04);" +
      "color:#e8ebf0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;font:400 14px system-ui,sans-serif;cursor:pointer;text-align:center;line-height:1.1}" +
    ".chip small{font-size:11px;opacity:.8}" +
    ".chip svg,.row svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}" +
    "#list{flex:1;overflow-y:auto;padding:0 8px 24px;-webkit-overflow-scrolling:touch}" +
    ".row{display:flex;align-items:center;gap:16px;padding:14px 12px;border-radius:16px;color:#e8ebf0;cursor:pointer;background:none;border:0;width:100%;text-align:left;font-family:system-ui,sans-serif}" +
    ".row:active,.chip:active{background:rgba(255,255,255,.1)}" +
    ".row svg{color:#c7ccd4;flex:none}" +
    ".row b{display:block;font-weight:500;font-size:18px}" +
    ".row span{display:block;font-size:14px;color:#8f96a3;margin-top:2px}" +
    "#ptoast{position:absolute;left:50%;bottom:16%;transform:translateX(-50%) translateY(10px);z-index:50;background:#fff;color:#000;padding:10px 16px;" +
      "border-radius:999px;font:500 14px system-ui,sans-serif;opacity:0;pointer-events:none;transition:.25s;white-space:nowrap}" +
    "#ptoast.show{opacity:1;transform:translateX(-50%)}";
  document.head.appendChild(css);

  var I = {
    img: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 8"/></svg>',
    cam: '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    code: '<svg viewBox="0 0 24 24"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>',
    bt: '<svg viewBox="0 0 24 24"><path d="M7 7l10 10-5 4V3l5 4L7 17"/></svg>',
    folder: '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    git: '<svg viewBox="0 0 24 24"><path d="M9 19c-4 1.5-4-2-6-2m12 4v-3.5a3 3 0 0 0-.8-2.3c2.800-.3 5.800-1.400 5.800-6.200a4.800 4.800 0 0 0-1.300-3.300 4.500 4.500 0 0 0-.1-3.300s-1.100-.3-3.500 1.300a12 12 0 0 0-6.200 0C6.500 2.800 5.400 3.100 5.400 3.100a4.500 4.500 0 0 0-.1 3.300A4.800 4.800 0 0 0 4 9.700c0 4.800 3 5.900 5.800 6.200a3 3 0 0 0-.8 2.300V21"/></svg>',
    share: '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.600 13.500l6.800 4M15.400 6.500l-6.800 4"/></svg>',
    cube: '<svg viewBox="0 0 24 24"><path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/></svg>',
    music: '<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.300l2-1.500-2-3.400-2.400 1a7 7 0 0 0-2.200-1.300L14 3h-4l-.3 2.500a7 7 0 0 0-2.200 1.300l-2.400-1-2 3.400 2 1.500a7 7 0 0 0 0 2.600l-2 1.500 2 3.400 2.400-1a7 7 0 0 0 2.200 1.300L10 21h4l.3-2.500a7 7 0 0 0 2.200-1.300l2.400 1 2-3.400-2-1.500c.1-.4.100-.9.100-1.300z"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>'
  };

  // "remplir" = écrit le début de la phrase dans la barre ; "photo" = ouvre la galerie ; "lien" = ouvre une adresse ; "bientot" = pas encore branché
  var chips = [
    ["Image", "", I.img, "remplir", "Génère une image de "],
    ["Code", "", I.code, "remplir", "Écris-moi un code pour "],
    ["Photo", "", I.cam, "photo", ""],
    ["GitHub", "", I.git, "lien", "https://github.com/loubrdmadloubrdmad-ops/jarvis-Eudson"],
    ["Partager", "(Xender)", I.share, "bientot", "Partager"],
    ["Fichiers", "", I.folder, "bientot", "Fichiers"]
  ];
  var rows = [
    ["Création 3D", "Visualiser et modéliser", I.cube],
    ["Se connecter aux appareils", "Par bluetooth ou d'autres moyens", I.bt],
    ["Créer de la musique", "Créez des pistes audio", I.music],
    ["Améliorations", "Désactiver les tâches avec ou sans moi", I.gear],
    ["Antivirus & Sécurité", "Désactiver le module avec ou sans moi", I.shield],
    ["Centre de liens", "Tous tes liens, classés par catégorie", I.link]
  ];

  var grip = document.createElement("button");
  grip.id = "pgrip"; grip.setAttribute("aria-label", "Ouvrir le menu");
  var panel = document.createElement("div");
  panel.id = "panel";
  var html = '<button id="pg2" aria-label="Fermer le menu"></button><div id="chips">';
  chips.forEach(function (c, i) {
    html += '<button class="chip" data-c="' + i + '">' + c[2] + c[0] + (c[1] ? "<small>" + c[1] + "</small>" : "") + "</button>";
  });
  html += '</div><div id="list">';
  rows.forEach(function (r, i) {
    html += '<button class="row" data-r="' + i + '">' + r[2] + "<div><b>" + r[0] + "</b><span>" + r[1] + "</span></div></button>";
  });
  html += "</div>";
  panel.innerHTML = html;
  var toast = document.createElement("div");
  toast.id = "ptoast";
  art.appendChild(grip); art.appendChild(panel); art.appendChild(toast);

  var tt;
  function say(t) {
    toast.textContent = t; toast.classList.add("show");
    clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove("show"); }, 1800);
  }
  function open() { panel.classList.add("open"); }
  function close() { panel.classList.remove("open"); }
  grip.addEventListener("click", open);
  panel.querySelector("#pg2").addEventListener("click", close);

  // glisser vers le haut pour ouvrir, vers le bas pour fermer
  var y0 = null;
  function down(e) { y0 = (e.touches ? e.touches[0] : e).clientY; }
  function up(e, el) {
    if (y0 === null) return;
    var y1 = (e.changedTouches ? e.changedTouches[0] : e).clientY;
    if (y0 - y1 > 30 && el === grip) open();
    if (y1 - y0 > 30 && el === panel) close();
    y0 = null;
  }
  grip.addEventListener("touchstart", down, { passive: true });
  grip.addEventListener("touchend", function (e) { up(e, grip); }, { passive: true });
  panel.addEventListener("touchstart", down, { passive: true });
  panel.addEventListener("touchend", function (e) { up(e, panel); }, { passive: true });

  panel.addEventListener("click", function (e) {
    var c = e.target.closest(".chip"), r = e.target.closest(".row");
    if (c) {
      var d = chips[+c.dataset.c];
      if (d[3] === "lien") {
        var a = document.createElement("a"); a.href = d[4]; a.target = "_blank"; a.rel = "noopener";
        document.body.appendChild(a); a.click(); a.remove();
      } else if (d[3] === "remplir") {
        var inp = document.getElementById("inp");
        if (inp) { inp.value = d[4]; inp.dispatchEvent(new Event("input", { bubbles: true })); close(); setTimeout(function () { inp.focus(); }, 380); }
      } else if (d[3] === "photo") {
        var f = document.getElementById("file"); close(); if (f) f.click();
      } else say(d[4] + " : bientôt disponible");
    } else if (r) {
      say(rows[+r.dataset.r][0] + " : bientôt disponible");
    }
  });
})();

// Jarvis : barre d'actions sous chaque réponse (copier, partager, voix, j'aime, j'aime pas, refaire)
(function () {
  if (typeof msgs === "undefined") return;
  var st = document.createElement("style");
  st.textContent =
    ".abar{align-self:flex-start;display:flex;align-items:center;gap:0;margin:-6px 0 6px 4px;flex:none}" +
    ".abar button{background:none;border:0;padding:8px 9px;border-radius:50%;color:#aeb3bc;cursor:pointer;display:flex;-webkit-tap-highlight-color:transparent}" +
    ".abar button:active{background:rgba(255,255,255,.12)}" +
    ".abar button.on{color:#fff}" +
    ".abar svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}" +
    ".abar .em{font-size:22px;line-height:1;margin-left:6px;animation:in .25s ease both}" +
    ".abar .nt{font-size:12px;color:#aeb3bc;margin-left:6px}";
  document.head.appendChild(st);

  var ICON = {
    copy: '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/>',
    share: '<path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
    voice: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
    up: '<path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.2 2.5L12.7 9H19a2 2 0 0 1 2 2.3l-1.2 6.6A2 2 0 0 1 17.8 19.500H7"/>',
    down: '<g transform="translate(0 24) scale(1 -1)"><path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.2 2.5L12.7 9H19a2 2 0 0 1 2 2.3l-1.2 6.6A2 2 0 0 1 17.8 19.500H7"/></g>',
    redo: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>'
  };
  function btn(name, label, fn) {
    var b = document.createElement("button");
    b.type = "button"; b.setAttribute("aria-label", label);
    b.innerHTML = '<svg viewBox="0 0 24 24">' + ICON[name] + "</svg>";
    b.onclick = fn;
    return b;
  }
  function isBubble(n) { return n.classList.contains("m") && n.classList.contains("j") && !n.classList.contains("dots") && !n.classList.contains("gen"); }

  function copyText(t) {
    return (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).catch(function () {
      var a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select();
      try { document.execCommand("copy"); } catch (e) {}
      a.remove();
    });
  }

  function make(grp) {
    var bar = document.createElement("div"); bar.className = "abar";
    var note = document.createElement("span"); note.className = "nt";
    var emo = document.createElement("span"); emo.className = "em";
    function say(t) { note.textContent = t; setTimeout(function () { if (note.textContent === t) note.textContent = ""; }, 1600); }
    function text() {
      var t = grp.filter(isBubble).map(function (n) { return n.textContent.trim(); }).join("\n\n").trim();
      if (!t) t = grp.map(function (n) { return n.textContent; }).join("\n");
      return t;
    }
    var like = btn("up", "J'aime", function () {
      var on = like.classList.toggle("on"); dis.classList.remove("on");
      emo.textContent = on ? "🙂" : "";
    });
    var dis = btn("down", "Je n'aime pas", function () {
      var on = dis.classList.toggle("on"); like.classList.remove("on");
      emo.textContent = on ? "😡" : "";
    });
    bar.append(
      btn("copy", "Copier", function () { copyText(text()).then(function () { say("Copié ✓"); }); }),
      btn("share", "Partager", function () {
        var t = text();
        if (navigator.share) navigator.share({ text: t }).catch(function () {});
        else copyText(t).then(function () { say("Copié, colle-le où tu veux ✓"); });
      }),
      btn("voice", "Écouter", function () { try { stopSpeak(); speak(text()); } catch (e) {} }),
      like, dis,
      btn("redo", "Refaire", function () {
        if (typeof busy !== "undefined" && busy) return;
        var n = grp[0].previousElementSibling;
        while (n && !(n.classList.contains("m") && n.classList.contains("u") && !n.classList.contains("ph"))) n = n.previousElementSibling;
        if (n && n.textContent.trim()) window.ask(n.textContent.trim());
      }),
      emo, note
    );
    return bar;
  }

  function scan() {
    var grp = [], atEnd = false;
    function flush() {
      if (grp.length) {
        var last = grp[grp.length - 1], nx = last.nextElementSibling;
        if (!(nx && nx.classList.contains("abar")) && grp.some(function (n) { return n.textContent.trim(); })) {
          last.after(make(grp.slice()));
          if (!last.nextElementSibling.nextElementSibling) atEnd = true;
        }
      }
      grp = [];
    }
    Array.prototype.slice.call(msgs.children).forEach(function (n) {
      if (isBubble(n) || n.classList.contains("code")) grp.push(n); else flush();
    });
    flush();
    if (atEnd) msgs.scrollTop = msgs.scrollHeight;
  }

  var tm;
  new MutationObserver(function () { clearTimeout(tm); tm = setTimeout(scan, 350); })
    .observe(msgs, { childList: true, subtree: true, characterData: true });
  scan();
})();

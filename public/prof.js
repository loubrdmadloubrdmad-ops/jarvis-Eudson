// Jarvis : mode professeur. "Active le mode professeur" -> il explique étape par étape. "Mode normal" -> retour au pote.
(function () {
  if (typeof ask !== "function") return;
  var KEY = "jarvis_prof";
  function on() { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } }
  function set(v) { try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) {} badge(); }

  var st = document.createElement("style");
  st.textContent = "#profb{position:absolute;left:50%;top:calc(env(safe-area-inset-top) + 18px);transform:translateX(-50%);z-index:6;" +
    "padding:6px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.35);background:rgba(8,8,10,.7);color:#e8ebf0;font:500 13px system-ui,sans-serif;display:none}" +
    "#profb.on{display:block}";
  document.head.appendChild(st);
  var b = document.createElement("div"); b.id = "profb"; b.textContent = "🎓 Mode professeur";
  (document.getElementById("art") || document.body).appendChild(b);
  function badge() { b.classList.toggle("on", on()); }
  badge();

  var ON = /\b(active|activer|mets|met|passe|lance)\b.*\b(mode )?(prof|professeur|cours)\b|\bmode (prof|professeur|cours)\b(?!.*(stop|arr|desactiv|normal))/i;
  var OFF = /\bmode normal\b|\b(arrete|arrête|desactive|désactive|stop|quitte|enleve|enlève)\b.*\b(mode )?(prof|professeur|cours)\b/i;

  var orig = window.ask;
  function repondre(text, rep) {
    add(text, "u"); add(rep, "j");
    try { record(text, false, rep); } catch (e) {}
    try { speak(rep); } catch (e) {}
    history.push({ role: "user", content: text }, { role: "assistant", content: rep });
    history = history.slice(-10);
  }
  window.ask = function (text) {
    if (!text || busy || (typeof pending !== "undefined" && pending) || String(text).length > 90) return orig(text);
    if (OFF.test(text)) { set(false); return repondre(text, "OK, retour au mode normal, mon gars."); }
    if (ON.test(text)) { set(true); return repondre(text, "Mode professeur activé. Dis-moi ce que tu veux apprendre, et on y va étape par étape."); }
    return orig(text);
  };

  var f = window.fetch;
  window.fetch = function (u, o) {
    try {
      if (on() && typeof u === "string" && u.indexOf("/api/chat") !== -1 && o && typeof o.body === "string") {
        var j = JSON.parse(o.body);
        j.message = "[Mode professeur : explique en détail, étape par étape, avec un exemple concret, puis pose-moi une petite question pour vérifier que j'ai compris.]\n" + j.message;
        o = Object.assign({}, o, { body: JSON.stringify(j) });
      }
    } catch (e) {}
    return f.call(this, u, o);
  };
})();

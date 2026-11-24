// Jarvis : mémoire. "Retiens que mon frère s'appelle Jean" -> il s'en souvient dans toutes les discussions.
(function () {
  if (typeof ask !== "function") return;
  var KEY = "jarvis_memory";
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
  function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a.slice(-40))); } catch (e) {} }

  var RET = /^\s*(?:jarvis[ ,]+)?(?:retiens(?: bien)?|souviens[- ]toi|rappelle[- ]toi|n['’]oublie pas)\s+(?:que\s+|qu['’]|de\s+|d['’])?(.{3,300})$/i;
  var OUB = /^\s*(?:jarvis[ ,]+)?(?:oublie|efface)\s+(?:tout|ta m[ée]moire|la m[ée]moire|ce que je t['’]ai dit)\b/i;
  var QUE = /(qu['’]est[- ]ce que tu sais (?:sur|de) moi|que sais[- ]tu (?:sur|de) moi|ce que tu sais sur moi|ta m[ée]moire|ma m[ée]moire)/i;

  var orig = window.ask;
  function repondre(text, rep) {
    add(text, "u"); add(rep, "j");
    try { record(text, false, rep); } catch (e) {}
    try { speak(rep); } catch (e) {}
    history.push({ role: "user", content: text }, { role: "assistant", content: rep });
    history = history.slice(-10);
  }

  window.ask = function (text) {
    if (!text || busy || (typeof pending !== "undefined" && pending)) return orig(text);
    var t = String(text), m;
    if (OUB.test(t)) { save([]); return repondre(t, "C'est fait, j'ai tout oublié."); }
    if ((m = t.match(RET))) {
      var fait = m[1].trim().replace(/[.!\s]+$/, "");
      var mem = load();
      if (mem.indexOf(fait) === -1) mem.push(fait);
      save(mem);
      return repondre(t, "C'est noté, je m'en souviendrai.");
    }
    if (QUE.test(t) && t.length < 80) {
      var l = load();
      return repondre(t, l.length ? "Voilà ce que je sais : " + l.join(" ; ") + "." : "Je ne sais encore rien de spécial sur toi. Dis-moi « retiens que… » et je le garde.");
    }
    return orig(text);
  };

  // À chaque message, on glisse la mémoire au début de la conversation envoyée à Jarvis
  var f = window.fetch;
  window.fetch = function (u, o) {
    try {
      if (typeof u === "string" && u.indexOf("/api/chat") !== -1 && o && typeof o.body === "string") {
        var mem = load();
        if (mem.length) {
          var b = JSON.parse(o.body), h = (b.history || []).slice(-8);
          while (h.length && h[0].role !== "user") h.shift();
          b.history = [
            { role: "user", content: "Voici ce que tu dois savoir sur moi : " + mem.join(" ; ") + ". Utilise-le naturellement, sans le réciter." },
            { role: "assistant", content: "Compris, je m'en souviendrai." }
          ].concat(h);
          o = Object.assign({}, o, { body: JSON.stringify(b) });
        }
      }
    } catch (e) {}
    return f.call(this, u, o);
  };
})();

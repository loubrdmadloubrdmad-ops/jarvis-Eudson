// Jarvis × GitHub (côté page) : "change la couleur du bouton dans index.html"
(function () {
  if (typeof ask !== "function") return;
  var st = document.createElement("style");
  st.textContent =
    ".ghc{align-self:stretch;max-width:100%;background:#0b0b0d;border:1px solid rgba(255,255,255,.22);border-radius:16px;overflow:hidden;flex:none;animation:in .25s ease both}" +
    ".ghc .gh{padding:12px 14px;background:#161618;font-size:14px;line-height:1.35}" +
    ".ghc .gh small{display:block;color:#aeb3bc;margin-top:2px;font-size:12px}" +
    ".ghc pre{margin:0;padding:10px 12px;overflow:auto;max-height:42vh;font:12px/1.45 ui-monospace,Menlo,Consolas,monospace;white-space:pre;color:#c9ced6}" +
    ".ghc pre .a{color:#7ee787;background:rgba(46,160,67,.15);display:block}" +
    ".ghc pre .d{color:#ff9b93;background:rgba(248,81,73,.15);display:block}" +
    ".ghc pre .g{color:#6e7681;display:block}" +
    ".ghc .gb{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:10px 12px;font-size:13px}" +
    ".ghc .gb button,.ghc .gb a{background:#d9dde4;color:#000;border:0;border-radius:999px;padding:9px 15px;font:600 13px system-ui,sans-serif;cursor:pointer;text-decoration:none}" +
    ".ghc .gb .no{background:transparent;color:#e8ebf0;border:1px solid rgba(255,255,255,.35)}" +
    ".ghc .gb button[disabled]{opacity:.5}";
  document.head.appendChild(st);

  var orig = window.ask;
  var norm = function (s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); };
  var V = /\b(modifie|modifier|change|changer|ajoute|ajouter|rajoute|corrige|corriger|supprime|supprimer|remplace|remplacer|mets|met|retire|retirer|enleve|enlever|update|edit)\b/;
  var T = /(github|depot|\brepo\b|\b[a-z0-9_-]+\.(html|js|css)\b)/;
  function isGh(t) { var n = norm(t); return V.test(n) && T.test(n); }

  window.ask = function (text) {
    if (!text || busy || (typeof pending !== "undefined" && pending) || !isGh(text)) return orig(text);
    return plan(text);
  };

  function pin(force) {
    var p = "";
    try { p = force ? "" : (localStorage.getItem("jarvis_pin") || ""); } catch (e) {}
    if (!p) {
      p = prompt("Code secret de Jarvis (celui que tu as mis dans Cloudflare) :") || "";
      try { if (p) localStorage.setItem("jarvis_pin", p); } catch (e) {}
    }
    return p;
  }
  async function api(path, body) {
    var p = pin(false);
    if (!p) return { status: 0, data: { reply: "Il me faut ton code secret pour toucher au dépôt." } };
    var r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", "x-jarvis-pin": p }, body: JSON.stringify(body) });
    var d = {}; try { d = await r.json(); } catch (e) {}
    if (r.status === 401) { try { localStorage.removeItem("jarvis_pin"); } catch (e) {} }
    return { status: r.status, data: d };
  }
  function line(t) { var s = document.createElement("span"); var c = t.charAt(0); s.className = c === "+" ? "a" : c === "-" ? "d" : "g"; s.textContent = t.length > 1 ? t : " "; return s; }

  async function plan(text) {
    busy = true; stopSpeak();
    add(text, "u");
    var wait = document.createElement("div");
    wait.className = "m j dots"; wait.innerHTML = "<i></i><i></i><i></i>";
    msgs.appendChild(wait); msgs.scrollTop = msgs.scrollHeight;
    var res;
    try { res = await api("/api/gh/plan", { instruction: text }); }
    catch (e) { res = { status: 0, data: { reply: "Je n'arrive pas à joindre le serveur. Vérifie ta connexion." } }; }
    wait.remove();
    var d = res.data;
    if (!d.path) {
      var m = d.reply || ("Erreur du serveur (" + res.status + ")");
      add(m, "j"); speak(m);
    } else {
      card(d);
      speak("J'ai préparé la modification. Regarde ce qui change, et confirme si c'est bon.");
      record(text, false, "🛠 Modification proposée sur " + d.path);
    }
    history.push({ role: "user", content: text }, { role: "assistant", content: d.path ? "(modification proposée sur " + d.path + ")" : (d.reply || "") });
    history = history.slice(-10);
    busy = false;
  }

  function card(d) {
    var box = document.createElement("div"); box.className = "ghc";
    var h = document.createElement("div"); h.className = "gh";
    h.textContent = "Modification proposée : " + d.path;
    var sm = document.createElement("small"); sm.textContent = "+" + d.add + " ligne(s) ajoutée(s) · −" + d.del + " supprimée(s) · rien n'est enregistré tant que tu n'as pas confirmé";
    h.appendChild(sm);
    var pre = document.createElement("pre");
    d.diff.forEach(function (t) { pre.appendChild(line(t)); });
    var bar = document.createElement("div"); bar.className = "gb";
    var ok = document.createElement("button"); ok.textContent = "Confirmer";
    var no = document.createElement("button"); no.textContent = "Annuler"; no.className = "no";
    bar.append(ok, no);
    box.append(h, pre, bar); msgs.appendChild(box); msgs.scrollTop = msgs.scrollHeight;

    no.onclick = function () { bar.textContent = "Annulé. Rien n'a été changé."; };
    ok.onclick = async function () {
      ok.disabled = no.disabled = true; ok.textContent = "Envoi…";
      var r; try { r = await api("/api/gh/apply", { path: d.path, content: d.content, instruction: d.instruction }); }
      catch (e) { r = { status: 0, data: { reply: "Connexion perdue." } }; }
      if (!r.data.number) { bar.textContent = r.data.reply || ("Erreur (" + r.status + ")"); return; }
      bar.textContent = "";
      var info = document.createElement("span"); info.textContent = "Préparé sur une branche à part (n°" + r.data.number + "). Le site n'a pas changé.";
      var see = document.createElement("a"); see.href = r.data.url; see.target = "_blank"; see.rel = "noopener"; see.textContent = "Voir sur GitHub";
      var go = document.createElement("button"); go.textContent = "Fusionner et mettre en ligne";
      bar.append(info, see, go);
      go.onclick = async function () {
        go.disabled = true; go.textContent = "Fusion…";
        var m; try { m = await api("/api/gh/merge", { number: r.data.number }); } catch (e) { m = { status: 0, data: { reply: "Connexion perdue." } }; }
        if (m.data.merged) { bar.textContent = "C'est fusionné ✓ Le site se met à jour dans 1 à 2 minutes : ferme et rouvre Jarvis ensuite."; }
        else { bar.textContent = m.data.reply || ("Erreur (" + m.status + ")"); }
      };
    };
  }
})();

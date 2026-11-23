// Jarvis : si la voix ElevenLabs n'a plus de crédits, il parle avec la voix du téléphone (gratuite)
(function () {
  if (typeof speak !== "function" || typeof player === "undefined") return;
  var offKey = "jarvis_el_off";
  function offUntil() { try { return parseInt(localStorage.getItem(offKey) || "0", 10) || 0; } catch (e) { return 0; } }
  function setOff(ms) { try { localStorage.setItem(offKey, String(Date.now() + ms)); } catch (e) {} }

  function shorten(t, n) {
    t = String(t).replace(/\s+/g, " ").trim();
    if (t.length <= n) return t;
    var c = t.slice(0, n), k = Math.max(c.lastIndexOf(". "), c.lastIndexOf("! "), c.lastIndexOf("? "));
    return k > 60 ? c.slice(0, k + 1) : c;
  }

  var baseStop = stopSpeak;
  window.stopSpeak = function () {
    baseStop();
    try { if (window.JarvisApp && JarvisApp.stopSay) JarvisApp.stopSay(); } catch (e) {}
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
  };

  // Les voix du téléphone arrivent parfois avec un petit retard : on les attend (1 seconde au plus)
  function voices() {
    return new Promise(function (ok) {
      var s = window.speechSynthesis, v = s.getVoices();
      if (v && v.length) return ok(v);
      var done = false;
      function fin() { if (done) return; done = true; ok(s.getVoices() || []); }
      s.onvoiceschanged = fin;
      setTimeout(fin, 1000);
    });
  }

  async function phoneSpeak(text) {
    var t = shorten(text, 500);
    try {
      if (window.JarvisApp && JarvisApp.say) { JarvisApp.say(t); return; }   // application Jarvis : voix native d'Android
    } catch (e) {}
    try {
      var s = window.speechSynthesis;
      if (!s || typeof SpeechSynthesisUtterance === "undefined") { toast("Ce navigateur n'a pas de voix. Ouvre Jarvis dans Chrome."); return; }
      s.cancel();
      var list = await voices();
      var u = new SpeechSynthesisUtterance(t);
      u.lang = "fr-FR"; u.rate = 1.0; u.volume = 1;
      var v = list.filter(function (x) { return /^fr/i.test(x.lang); })[0];
      if (v) { try { u.voice = v; } catch (e) {} }
      u.onstart = function () { spk.classList.add("talk"); };
      u.onend = function () { spk.classList.remove("talk"); };
      u.onerror = function (e) {
        spk.classList.remove("talk");
        var c = (e && e.error) || "inconnue";
        if (c === "interrupted" || c === "canceled") return;
        toast(c === "language-unavailable" || c === "synthesis-unavailable"
          ? "Il manque la voix française du téléphone (Réglages > Synthèse vocale)"
          : "Voix du téléphone bloquée (" + c + "). Touche l'écran puis réessaie.");
      };
      if (!v && list.length) toast("Pas de voix française trouvée sur le téléphone");
      s.speak(u);
      try { s.resume(); } catch (e) {}
    } catch (e) { toast("Voix du téléphone impossible"); }
  }

  window.speak = async function (text) {
    if (!voiceOn || !text) return;
    if (Date.now() < offUntil()) return phoneSpeak(text);
    try {
      var r = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: shorten(text, 260) })
      });
      if (!r.ok) {
        setOff(3 * 3600 * 1000);   // on réessaie ElevenLabs dans 3 heures
        return phoneSpeak(text);
      }
      var blob = await r.blob();
      if (player.src && player.src.startsWith("blob:")) URL.revokeObjectURL(player.src);
      player.src = URL.createObjectURL(blob);
      spk.classList.add("talk");
      await player.play();
    } catch (e) {
      spk.classList.remove("talk");
      phoneSpeak(text);
    }
  };
})();

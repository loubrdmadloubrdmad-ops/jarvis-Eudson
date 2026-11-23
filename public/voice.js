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
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
  };

  function phoneSpeak(text) {
    try {
      if (!window.speechSynthesis) return;
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(shorten(text, 500));
      u.lang = "fr-FR"; u.rate = 1.02;
      var v = (speechSynthesis.getVoices() || []).filter(function (x) { return /^fr/i.test(x.lang); })[0];
      if (v) u.voice = v;
      u.onstart = function () { spk.classList.add("talk"); };
      u.onend = u.onerror = function () { spk.classList.remove("talk"); };
      speechSynthesis.speak(u);
    } catch (e) {}
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
        toast("Ma voix ElevenLabs n'a plus de crédits : j'utilise la voix du téléphone");
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

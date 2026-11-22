const SYSTEM =
  "Tu es Jarvis, l'assistant personnel d'Eudson, qui vit en Haïti. Tu es un vrai pote intelligent, pas un robot de service. " +
  "Tu le tutoies et tu parles comme à l'oral : naturel, chaleureux, avec de l'humour et de la répartie, " +
  "et des expressions familières quand ça colle (mon gars, ça marche, pas de souci), sans en abuser. " +
  "Tu t'adaptes à son ton : s'il plaisante, tu plaisantes ; s'il est fatigué ou stressé, tu es posé et rassurant ; " +
  "s'il veut du sérieux, tu es précis. " +
  "Réponds court, une à trois phrases, et réponds d'abord à ce qu'il demande. " +
  "Ne dis pas Bonjour Eudson à chaque message : tu salues seulement au tout premier échange. " +
  "Évite les phrases de chatbot comme Que puis-je faire pour toi, En tant qu'IA ou N'hésite pas. " +
  "Pose au plus une question, seulement si elle est utile. Donne ton avis franchement. " +
  "Si tu ne sais pas, dis-le simplement. " +
  "Pas de markdown, pas de listes, pas d'émojis : tes réponses seront lues à voix haute.";

const json = (status, obj) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ---- Voix : transforme un texte en audio avec ta voix ElevenLabs ----
    if (url.pathname === "/api/speak" && request.method === "POST") {
      if (!env.ELEVENLABS_API_KEY || !env.ELEVENLABS_VOICE_ID) {
        return json(500, { reply: "Voix non configurée." });
      }
      let b;
      try { b = await request.json(); }
      catch { return json(400, { reply: "Requête invalide." }); }
      const text = String(b.text || "").trim().slice(0, 700);
      if (!text) return json(400, { reply: "Texte vide." });
      try {
        const r = await fetch(
          "https://api.elevenlabs.io/v1/text-to-speech/" + encodeURIComponent(env.ELEVENLABS_VOICE_ID)
            + "?output_format=mp3_44100_64",
          {
            method: "POST",
            headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "content-type": "application/json" },
            body: JSON.stringify({
              text,
              model_id: env.ELEVENLABS_MODEL || "eleven_flash_v2_5",
              voice_settings: { stability: 0.45, similarity_boost: 0.8 }
            })
          }
        );
        if (!r.ok) {
          const detail = (await r.text()).slice(0, 200);
          return json(502, { reply: "ElevenLabs " + r.status + " : " + detail });
        }
        return new Response(r.body, {
          status: 200,
          headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" }
        });
      } catch (e) {
        return json(502, { reply: "ElevenLabs injoignable." });
      }
    }

    if (url.pathname !== "/api/chat" || request.method !== "POST") {
      return new Response("Not found", { status: 404 });
    }
    if (!env.GEMINI_API_KEY) return json(500, { reply: "Clé API non configurée." });

    let body;
    try { body = await request.json(); }
    catch { return json(400, { reply: "Requête invalide." }); }

    const message = String(body.message || "").trim().slice(0, 1000) || (body.image ? "Regarde cette photo et dis-moi ce que tu vois." : "");
    const image = typeof body.image === "string" && body.image.length < 2500000 ? body.image : "";
    const mime = body.mime === "image/png" ? "image/png" : "image/jpeg";
    if (!message && !image) return json(400, { reply: "Message vide." });

    const contents = [];
    for (const h of Array.isArray(body.history) ? body.history.slice(-10) : []) {
      if (h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string") {
        contents.push({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content.slice(0, 1000) }]
        });
      }
    }
    const parts = [];
    if (image) parts.push({ inline_data: { mime_type: mime, data: image } });
    parts.push({ text: message });
    contents.push({ role: "user", parts });

    // Plusieurs modèles : si l'un est surchargé (503), on essaie le suivant.
    const models = [
      env.GEMINI_MODEL || "gemini-flash-latest",
      "gemini-2.5-flash",
      "gemini-flash-lite-latest",
      "gemini-2.5-flash-lite"
    ];

    const makePayload = (rapide) => JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents,
      generationConfig: Object.assign(
        { maxOutputTokens: 400, temperature: 0.9 },
        // Réflexion coupée = réponse beaucoup plus rapide
        rapide ? { thinkingConfig: { thinkingBudget: 0 } } : {}
      )
    });

    const appeler = async (model, rapide) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 9000);   // pas plus de 9 s par essai
      try {
        return await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
          {
            method: "POST",
            headers: {
              "x-goog-api-key": env.GEMINI_API_KEY,
              "content-type": "application/json"
            },
            body: makePayload(rapide),
            signal: ctrl.signal
          }
        );
      } finally { clearTimeout(t); }
    };

    let lastStatus = 0;
    for (const model of models) {
      try {
        let r = await appeler(model, true);
        if (r.status === 400) r = await appeler(model, false);   // ce modèle refuse l'option rapide
        if (r.ok) {
          const data = await r.json();
          const outParts = (data.candidates && data.candidates[0] && data.candidates[0].content
            && data.candidates[0].content.parts) || [];
          const reply = outParts.map((p) => p.text || "").join("").trim();
          return json(200, { reply: reply || "Je n'ai pas de réponse." });
        }
        lastStatus = r.status;       // surcharge ou erreur : on passe tout de suite au modèle suivant
      } catch (e) {
        lastStatus = -1;             // trop lent ou réseau : modèle suivant
      }
    }
    return json(502, {
      reply: "Jarvis est très sollicité en ce moment, réessaie dans quelques secondes. (code " + lastStatus + ")"
    });
  }
};

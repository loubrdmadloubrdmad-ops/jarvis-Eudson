const SYSTEM =
  "Tu es Jarvis-Eudson, l'assistant personnel d'Eudson. Réponds en français, " +
  "en 2 à 3 phrases maximum, car tes réponses sont lues à voix haute. " +
  "Pas de markdown, pas d'émojis.";

const json = (status, obj) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/chat" || request.method !== "POST") {
      return new Response("Not found", { status: 404 });
    }
    if (!env.GEMINI_API_KEY) return json(500, { reply: "Clé API non configurée." });

    let body;
    try { body = await request.json(); }
    catch { return json(400, { reply: "Requête invalide." }); }

    const message = String(body.message || "").trim().slice(0, 1000);
    if (!message) return json(400, { reply: "Message vide." });

    const contents = [];
    for (const h of Array.isArray(body.history) ? body.history.slice(-10) : []) {
      if (h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string") {
        contents.push({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content.slice(0, 1000) }]
        });
      }
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    // Plusieurs modèles : si l'un est surchargé (503), on essaie le suivant.
    const models = [
      env.GEMINI_MODEL || "gemini-flash-latest",
      "gemini-2.5-flash",
      "gemini-flash-lite-latest",
      "gemini-2.5-flash-lite"
    ];

    const payload = JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents,
      generationConfig: { maxOutputTokens: 800 }
    });

    let lastStatus = 0;
    for (const model of models) {
      for (let essai = 0; essai < 2; essai++) {
        try {
          const r = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
            {
              method: "POST",
              headers: {
                "x-goog-api-key": env.GEMINI_API_KEY,
                "content-type": "application/json"
              },
              body: payload
            }
          );
          if (r.ok) {
            const data = await r.json();
            const parts = (data.candidates && data.candidates[0] && data.candidates[0].content
              && data.candidates[0].content.parts) || [];
            const reply = parts.map((p) => p.text || "").join("").trim();
            return json(200, { reply: reply || "Je n'ai pas de réponse." });
          }
          lastStatus = r.status;
          if (r.status === 503 || r.status === 429 || r.status === 500) {
            await wait(600);      // surcharge : on réessaie, puis on change de modèle
            continue;
          }
          break;                   // autre erreur (404, 400...) : modèle suivant
        } catch (e) {
          lastStatus = -1;
          break;
        }
      }
    }
    return json(502, {
      reply: "Jarvis est très sollicité en ce moment, réessaie dans quelques secondes. (code " + lastStatus + ")"
    });
  }
};

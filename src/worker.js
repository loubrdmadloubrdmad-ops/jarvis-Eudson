const SYSTEM =
  "Tu es Jarvis-Eudson, l'assistant personnel d'Eudson. Réponds en français, " +
  "en 2 à 3 phrases maximum, car tes réponses sont lues à voix haute. " +
  "Pas de markdown, pas d'émojis.";

const json = (status, obj) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/chat" || request.method !== "POST") {
      return new Response("Not found", { status: 404 });
    }
    if (!env.ANTHROPIC_API_KEY) return json(500, { reply: "Clé API non configurée." });

    let body;
    try { body = await request.json(); }
    catch { return json(400, { reply: "Requête invalide." }); }

    const message = String(body.message || "").trim().slice(0, 1000);
    if (!message) return json(400, { reply: "Message vide." });

    const messages = [];
    for (const h of Array.isArray(body.history) ? body.history.slice(-10) : []) {
      if (h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string") {
        messages.push({ role: h.role, content: h.content.slice(0, 1000) });
      }
    }
    messages.push({ role: "user", content: message });

    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-haiku-5-5",
          max_tokens: 300,
          system: SYSTEM,
          messages
        })
      });
      if (!r.ok) return json(502, { reply: "Le cerveau de Jarvis ne répond pas." });
      const data = await r.json();
      const reply = (data.content || []).map((b) => b.text || "").join("").trim();
      return json(200, { reply: reply || "Je n'ai pas de réponse." });
    } catch (e) {
      return json(500, { reply: "Erreur interne du serveur." });
    }
  }
};

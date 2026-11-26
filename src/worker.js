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
  "Ne donne JAMAIS une adresse de site ou un lien écrit de mémoire, tu risques de te tromper : si on te demande un lien, dis que tu vas le chercher. " +
  "Pas de markdown, pas de listes, pas d'émojis : tes réponses seront lues à voix haute.";

const CODE_RULES =
  " MODE CODE : on te demande du code. Écris le code complet, fonctionnel et prêt à copier, dans un bloc entouré de trois accents graves avec le nom du langage (par exemple ```html ou ```python). " +
  "Ne coupe jamais le code et n'écris pas de commentaires inutiles. Après le bloc, ajoute une ou deux phrases courtes pour dire comment l'utiliser. " +
  "Pour tout le reste de ta réponse, garde ton ton de pote, sans autre markdown.";

const PROF_SYSTEM =
  "Tu es Jarvis en MODE PROFESSEUR pour Eudson, qui vit en Haïti. Tu es un vrai professeur : patient, clair, motivant. " +
  "Tu le tutoies et tu parles comme à l'oral, avec chaleur, sans jargon inutile. " +
  "Tu enseignes toutes les matières : mathématiques, français, histoire (y compris l'histoire d'Haïti), géographie, sciences, biologie, physique, chimie, économie, informatique, langues, culture générale. " +
  "MÉTHODE : 1) explique l'idée simplement ; 2) montre un exemple résolu, étape par étape ; 3) donne un petit exercice à Eudson et attends sa réponse ; " +
  "4) quand il répond, corrige avec bienveillance, explique l'erreur s'il y en a une, puis propose le suivant, un peu plus dur s'il a réussi. " +
  "Si tu ne connais pas son niveau, demande-le en une seule question. " +
  "ÉCRITURE : écris toujours les nombres en CHIFFRES et les calculs avec des symboles, jamais en toutes lettres. " +
  "Exemples : 3/4 ; 2/5 + 1/5 = 3/5 ; 12 × 3 = 36 ; 144 ÷ 12 = 12 ; 7 − 2 = 5 ; 25 % ; x² ; √9 = 3 ; chiffres romains XIV = 14. " +
  "Pose les calculs sur plusieurs lignes quand c'est utile, une étape par ligne. Écris les dates en chiffres. " +
  "Pour les faits (histoire, dates, biologie, géographie) sois exact ; si tu n'es pas sûr, dis-le franchement au lieu d'inventer. " +
  "Tu peux utiliser des retours à la ligne et des lignes numérotées simples (1. 2. 3.), mais pas de markdown : pas de **, pas de #, pas de tableaux. " +
  "Longueur : 80 à 220 mots selon le sujet, jamais un cours interminable. Termine par l'exercice ou par une courte question.";

// Demande d'un lien / d'un site : on le cherche vraiment sur internet (Google), on n'invente rien
const LINK_INTENT = /\b(envoie|envoi|envoyer|donne|donner|trouve|trouver|cherche|chercher|passe|balance|montre|file|veux|voudrais|besoin)\b[^.?!]{0,50}\b(lien|liens|link|url|site)\b|\b(lien|liens|link|site) (officiel|de|du|des|d['’])/i;

async function searchLinks(env, contents) {
  const models = [env.GEMINI_MODEL || "gemini-flash-latest", "gemini-3.8-flash", "gemini-flash-lite-latest"];
  for (const model of models) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 20000);
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
        method: "POST",
        headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM + " MODE RECHERCHE : tu viens de chercher sur internet le site demandé. Dis en une ou deux phrases courtes que tu l'as trouvé et ce que c'est, sans écrire aucune adresse internet (les liens sont affichés à part)." }] },
          contents,
          tools: [{ google_search: {} }],
          generationConfig: { maxOutputTokens: 300, temperature: 0.4 }
        }),
        signal: ctrl.signal
      });
      clearTimeout(t);
      if (!r.ok) continue;
      const d = await r.json();
      const c = d.candidates && d.candidates[0];
      const text = ((c && c.content && c.content.parts) || []).map((p) => p.text || "").join("").replace(/\bhttps?:\/\/\S+/gi, "").trim();
      const chunks = (c && c.groundingMetadata && c.groundingMetadata.groundingChunks) || [];
      const links = [], seen = {};
      for (const ch of chunks) {
        if (ch.web && ch.web.uri && !seen[ch.web.uri]) {
          seen[ch.web.uri] = 1;
          links.push({ title: String(ch.web.title || "Site").slice(0, 70), url: ch.web.uri });
        }
      }
      if (links.length) return { reply: text || "Voilà ce que j'ai trouvé.", links: links.slice(0, 4) };
      return { reply: "Je n'ai pas trouvé de lien fiable pour ça. Dis-moi le nom exact du site, ou colle le lien toi-même.", links: [] };
    } catch (e) { /* modèle suivant */ }
  }
  return null;
}

const CODE_WORDS = /\b(code|coder|coding|script|fonction|programme|programmer|html|css|javascript|js|python|java|kotlin|react|node|api|bug|erreur|compile|algorithme|sql|application|appli|site|page web|classe|boucle|variable|github|worker|json)\b/i;

// ---- Autres cerveaux (secours) : actifs seulement si leur clé existe dans Cloudflare ----
function chatMessages(history, message) {
  const msgs = [];
  for (const h of history.slice(-10)) {
    if (h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string" && h.content) {
      msgs.push({ role: h.role, content: h.content.slice(0, 6000) });
    }
  }
  msgs.push({ role: "user", content: message });
  return msgs;
}

function otherBrains(env) {
  const list = [];
  const openaiLike = (name, key, url, model) => {
    if (!key) return;
    list.push({
      name,
      async call(system, msgs, max, temp, signal) {
        const r = await fetch(url, {
          method: "POST",
          headers: { Authorization: "Bearer " + key, "content-type": "application/json" },
          body: JSON.stringify({
            model, max_tokens: max, temperature: temp,
            messages: [{ role: "system", content: system }].concat(msgs)
          }),
          signal
        });
        if (!r.ok) return null;
        const d = await r.json();
        return ((d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || "").trim();
      }
    });
  };
  // Groq (gratuit), xAI Grok, OpenAI ChatGPT
  openaiLike("groq", env.GROQ_API_KEY, "https://api.groq.com/openai/v1/chat/completions", env.GROQ_MODEL || "llama-3.3-70b-versatile");
  openaiLike("grok", env.XAI_API_KEY, "https://api.x.ai/v1/chat/completions", env.XAI_MODEL || "grok-4-fast");
  openaiLike("openai", env.OPENAI_API_KEY, "https://api.openai.com/v1/chat/completions", env.OPENAI_MODEL || "gpt-4o-mini");
  // Claude (Anthropic)
  if (env.ANTHROPIC_API_KEY) {
    list.push({
      name: "claude",
      async call(system, msgs, max, temp, signal) {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model: env.ANTHROPIC_MODEL || "claude-haiku-5-5",
            max_tokens: max, temperature: temp, system, messages: msgs
          }),
          signal
        });
        if (!r.ok) return null;
        const d = await r.json();
        return ((d.content || []).map((p) => p.text || "").join("")).trim();
      }
    });
  }
  return list;
}

const json = (status, obj) =>
Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/jconst SYSTEM =
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
  "Ne donne JAMAIS une adresse de site ou un lien écrit de mémoire, tu risques de te tromper : si on te demande un lien, dis que tu vas le chercher. " +
  "Pas de markdown, pas de listes, pas d'émojis : tes réponses seront lues à voix haute.";

const CODE_RULES =
  " MODE CODE : on te demande du code. Écris le code complet, fonctionnel et prêt à copier, dans un bloc entouré de trois accents graves avec le nom du langage (par exemple ```html ou ```python). " +
  "Ne coupe jamais le code et n'écris pas de commentaires inutiles. Après le bloc, ajoute une ou deux phrases courtes pour dire comment l'utiliser. " +
  "Pour tout le reste de ta réponse, garde ton ton de pote, sans autre markdown.";

const PROF_SYSTEM =
  "Tu es Jarvis en MODE PROFESSEUR pour Eudson, qui vit en Haïti. Tu es un vrai professeur : patient, clair, motivant. " +
  "Tu le tutoies et tu parles comme à l'oral, avec chaleur, sans jargon inutile. " +
  "Tu enseignes toutes les matières : mathématiques, français, histoire (y compris l'histoire d'Haïti), géographie, sciences, biologie, physique, chimie, économie, informatique, langues, culture générale. " +
  "MÉTHODE : 1) explique l'idée simplement ; 2) montre un exemple résolu, étape par étape ; 3) donne un petit exercice à Eudson et attends sa réponse ; " +
  "4) quand il répond, corrige avec bienveillance, explique l'erreur s'il y en a une, puis propose le suivant, un peu plus dur s'il a réussi. " +
  "Si tu ne connais pas son niveau, demande-le en une seule question. " +
  "ÉCRITURE : écris toujours les nombres en CHIFFRES et les calculs avec des symboles, jamais en toutes lettres. " +
  "Exemples : 3/4 ; 2/5 + 1/5 = 3/5 ; 12 × 3 = 36 ; 144 ÷ 12 = 12 ; 7 − 2 = 5 ; 25 % ; x² ; √9 = 3 ; chiffres romains XIV = 14. " +
  "Pose les calculs sur plusieurs lignes quand c'est utile, une étape par ligne. Écris les dates en chiffres. " +
  "Pour les faits (histoire, dates, biologie, géographie) sois exact ; si tu n'es pas sûr, dis-le franchement au lieu d'inventer. " +
  "Tu peux utiliser des retours à la ligne et des lignes numérotées simples (1. 2. 3.), mais pas de markdown : pas de **, pas de #, pas de tableaux. " +
  "Longueur : 80 à 220 mots selon le sujet, jamais un cours interminable. Termine par l'exercice ou par une courte question.";

// Demande d'un lien / d'un site : on le cherche vraiment sur internet (Google), on n'invente rien
const LINK_INTENT = /\b(envoie|envoi|envoyer|donne|donner|trouve|trouver|cherche|chercher|passe|balance|montre|file|veux|voudrais|besoin)\b[^.?!]{0,50}\b(lien|liens|link|url|site)\b|\b(lien|liens|link|site) (officiel|de|du|des|d['’])/i;

async function searchLinks(env, contents) {
  const models = [env.GEMINI_MODEL || "gemini-flash-latest", "gemini-3.8-flash", "gemini-flash-lite-latest"];
  for (const model of models) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 20000);
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
        method: "POST",
        headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM + " MODE RECHERCHE : tu viens de chercher sur internet le site demandé. Dis en une ou deux phrases courtes que tu l'as trouvé et ce que c'est, sans écrire aucune adresse internet (les liens sont affichés à part)." }] },
          contents,
          tools: [{ google_search: {} }],
          generationConfig: { maxOutputTokens: 300, temperature: 0.4 }
        }),
        signal: ctrl.signal
      });
      clearTimeout(t);
      if (!r.ok) continue;
      const d = await r.json();
      const c = d.candidates && d.candidates[0];
      const text = ((c && c.content && c.content.parts) || []).map((p) => p.text || "").join("").replace(/\bhttps?:\/\/\S+/gi, "").trim();
      const chunks = (c && c.groundingMetadata && c.groundingMetadata.groundingChunks) || [];
      const links = [], seen = {};
      for (const ch of chunks) {
        if (ch.web && ch.web.uri && !seen[ch.web.uri]) {
          seen[ch.web.uri] = 1;
          links.push({ title: String(ch.web.title || "Site").slice(0, 70), url: ch.web.uri });
        }
      }
      if (links.length) return { reply: text || "Voilà ce que j'ai trouvé.", links: links.slice(0, 4) };
      return { reply: "Je n'ai pas trouvé de lien fiable pour ça. Dis-moi le nom exact du site, ou colle le lien toi-même.", links: [] };
    } catch (e) { /* modèle suivant */ }
  }
  return null;
}

const CODE_WORDS = /\b(code|coder|coding|script|fonction|programme|programmer|html|css|javascript|js|python|java|kotlin|react|node|api|bug|erreur|compile|algorithme|sql|application|appli|site|page web|classe|boucle|variable|github|worker|json)\b/i;

// ---- Autres cerveaux (secours) : actifs seulement si leur clé existe dans Cloudflare ----
function chatMessages(history, message) {
  const msgs = [];
  for (const h of history.slice(-10)) {
    if (h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string" && h.content) {
      msgs.push({ role: h.role, content: h.content.slice(0, 6000) });
    }
  }
  msgs.push({ role: "user", content: message });
  return msgs;
}

function otherBrains(env) {
  const list = [];
  const openaiLike = (name, key, url, model) => {
    if (!key) return;
    list.push({
      name,
      async call(system, msgs, max, temp, signal) {
        const r = await fetch(url, {
          method: "POST",
          headers: { Authorization: "Bearer " + key, "content-type": "application/json" },
          body: JSON.stringify({
            model, max_tokens: max, temperature: temp,
            messages: [{ role: "system", content: system }].concat(msgs)
          }),
          signal
        });
        if (!r.ok) return null;
        const d = await r.json();
        return ((d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || "").trim();
      }
    });
  };
  // Groq (gratuit), xAI Grok, OpenAI ChatGPT
  openaiLike("groq", env.GROQ_API_KEY, "https://api.groq.com/openai/v1/chat/completions", env.GROQ_MODEL || "llama-3.3-70b-versatile");
  openaiLike("grok", env.XAI_API_KEY, "https://api.x.ai/v1/chat/completions", env.XAI_MODEL || "grok-4-fast");
  openaiLike("openai", env.OPENAI_API_KEY, "https://api.openai.com/v1/chat/completions", env.OPENAI_MODEL || "gpt-4o-mini");
  // Claude (Anthropic)
  if (env.ANTHROPIC_API_KEY) {
    list.push({
      name: "claude",
      async call(system, msgs, max, temp, signal) {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model: env.ANTHROPIC_MODEL || "claude-haiku-5-5",
            max_tokens: max, temperature: temp, system, messages: msgs
          }),
          signal
        });
        if (!r.ok) return null;
        const d = await r.json();
        return ((d.content || []).map((p) => p.text || "").join("")).trim();
      }
    });
  }
  return list;
}

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

    // ---- Images : Cloudflare Workers AI (FLUX), gratuit chaque jour ----
    if (url.pathname === "/api/image" && request.method === "POST") {
      if (!env.AI) return json(500, { reply: "Les images ne sont pas encore activées (il manque la liaison AI dans wrangler.jsonc)." });
      let b;
      try { b = await request.json(); }
      catch { return json(400, { reply: "Requête invalide." }); }
      const raw = String(b.prompt || "").trim().slice(0, 600);
      if (!raw) return json(400, { reply: "Dis-moi ce que tu veux voir." });

      // FLUX comprend mieux l'anglais : on traduit et on détaille la demande (si ça échoue, on garde ta phrase)
      let prompt = raw;
      if (env.GEMINI_API_KEY) {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 5000);
          const r = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/" + (env.GEMINI_MODEL || "gemini-flash-latest") + ":generateContent",
            {
              method: "POST",
              headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: "Transforme la demande de l'utilisateur en un prompt anglais précis et détaillé pour un générateur d'images (sujet, style, lumière, ambiance). Réponds uniquement avec le prompt, sans guillemets, en une ou deux phrases." }] },
                contents: [{ role: "user", parts: [{ text: raw }] }],
                generationConfig: { maxOutputTokens: 200, temperature: 0.7, thinkingConfig: { thinkingBudget: 0 } }
              }),
              signal: ctrl.signal
            }
          );
          clearTimeout(t);
          if (r.ok) {
            const d = await r.json();
            const p = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [];
            const en = p.map((x) => x.text || "").join("").trim();
            if (en) prompt = en.slice(0, 700);
          }
        } catch (e) { /* on garde la phrase d'origine */ }
      }

      try {
        const out = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", { prompt, steps: 4 });
        const img = out && out.image;
        if (!img) throw new Error("pas d'image");
        return json(200, { image: "data:image/jpeg;base64," + img, prompt });
      } catch (e) {
        const m = String((e && e.message) || e);
        if (/limit|quota|neuron|capacity|exceed|4006/i.test(m)) {
          return json(429, { reply: "J'ai atteint la limite d'images gratuites pour aujourd'hui. Réessaie demain." });
        }
        return json(502, { reply: "Je n'arrive pas à créer l'image pour l'instant. (" + m.slice(0, 80) + ")" });
      }
    }

    if (url.pathname !== "/api/chat" || request.method !== "POST") {
      return new Response("Not found", { status: 404 });
    }
    if (!env.GEMINI_API_KEY) return json(500, { reply: "Clé API non configurée." });

    let body;
    try { body = await request.json(); }
    catch { return json(400, { reply: "Requête invalide." }); }

    const message = String(body.message || "").trim().slice(0, 6000) || (body.image ? "Regarde cette photo et dis-moi ce que tu vois." : "");
    const image = typeof body.image === "string" && body.image.length < 2500000 ? body.image : "";
    const mime = body.mime === "image/png" ? "image/png" : "image/jpeg";
    if (!message && !image) return json(400, { reply: "Message vide." });

    const contents = [];
    for (const h of Array.isArray(body.history) ? body.history.slice(-10) : []) {
      if (h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string") {
        contents.push({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content.slice(0, 6000) }]
        });
      }
    }
    const hist = Array.isArray(body.history) ? body.history : [];
    const lastBot = hist.length ? String((hist[hist.length - 1] || {}).content || "") : "";
    const prof = body.prof === true;
    const codeMode = !prof && (CODE_WORDS.test(message) || lastBot.indexOf("```") !== -1);
    const sys = prof ? PROF_SYSTEM : (codeMode ? SYSTEM + CODE_RULES : SYSTEM);

    const parts = [];
    if (image) parts.push({ inline_data: { mime_type: mime, data: image } });
    parts.push({ text: message });
    contents.push({ role: "user", parts });

    // Demande de lien : vraie recherche internet, jamais de lien inventé
    if (!image && !prof && LINK_INTENT.test(message)) {
      const found = await searchLinks(env, contents);
      if (found) return json(200, found);
    }

    // Plusieurs modèles : si l'un est surchargé (503) ou absent (404), on essaie le suivant.
    // (les anciens modèles 2.5 sont en fin de liste : Google les réserve aux anciens utilisateurs)
    const models = [
      env.GEMINI_MODEL || "gemini-flash-latest",
      "gemini-3.8-flash",
      "gemini-3.6-flash",
      "gemini-flash-lite-latest",
      "gemini-3.5-flash-lite",
      "gemini-2.5-flash"
    ];

    const makePayload = (rapide) => JSON.stringify({
      systemInstruction: { parts: [{ text: sys }] },
      contents,
      generationConfig: Object.assign(
        prof ? { maxOutputTokens: 1500, temperature: 0.5 } : codeMode ? { maxOutputTokens: 8192, temperature: 0.4 } : { maxOutputTokens: 400, temperature: 0.9 },
        // Réflexion coupée = réponse beaucoup plus rapide
        rapide ? { thinkingConfig: { thinkingBudget: 0 } } : {}
      )
    });

    const appeler = async (model, rapide) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), (codeMode || prof) ? 40000 : 9000);   // 9 s en discussion, 40 s pour du code ou un cours
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
    for (let tour = 0; tour < 2; tour++) {
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
          // 404 = modèle indisponible : on garde le vrai code d'erreur (surcharge...) pour le message
          if (r.status !== 404 || !lastStatus) lastStatus = r.status;
        } catch (e) {
          if (!lastStatus) lastStatus = -1;   // trop lent ou réseau : modèle suivant
        }
      }
      // Gemini est surchargé : on essaie les autres cerveaux (sans photo)
      if (tour === 0 && !image) {
        const msgs = chatMessages(hist, message);
        for (const b of otherBrains(env)) {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), (codeMode || prof) ? 40000 : 12000);
          try {
            const text = await b.call(sys, msgs,
              prof ? 1500 : codeMode ? 8192 : 400, prof ? 0.5 : codeMode ? 0.4 : 0.9, ctrl.signal);
            if (text) return json(200, { reply: text });
          } catch (e) { /* on passe au suivant */ }
          finally { clearTimeout(t); }
        }
      }
      if (lastStatus === 503 || lastStatus === 429) await new Promise((ok) => setTimeout(ok, 1200));   // deuxième tour si surchargé
      else break;
    }
    return json(502, {
      reply: "Jarvis est très sollicité en ce moment, réessaie dans quelques secondes. (code " + lastStatus + ")"
    });
  }
};son; charset=utf-8" }
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

    // ---- Images : Cloudflare Workers AI (FLUX), gratuit chaque jour ----
    if (url.pathname === "/api/image" && request.method === "POST") {
      if (!env.AI) return json(500, { reply: "Les images ne sont pas encore activées (il manque la liaison AI dans wrangler.jsonc)." });
      let b;
      try { b = await request.json(); }
      catch { return json(400, { reply: "Requête invalide." }); }
      const raw = String(b.prompt || "").trim().slice(0, 600);
      if (!raw) return json(400, { reply: "Dis-moi ce que tu veux voir." });

      // FLUX comprend mieux l'anglais : on traduit et on détaille la demande (si ça échoue, on garde ta phrase)
      let prompt = raw;
      if (env.GEMINI_API_KEY) {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 5000);
          const r = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/" + (env.GEMINI_MODEL || "gemini-flash-latest") + ":generateContent",
            {
              method: "POST",
              headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: "Transforme la demande de l'utilisateur en un prompt anglais précis et détaillé pour un générateur d'images (sujet, style, lumière, ambiance). Réponds uniquement avec le prompt, sans guillemets, en une ou deux phrases." }] },
                contents: [{ role: "user", parts: [{ text: raw }] }],
                generationConfig: { maxOutputTokens: 200, temperature: 0.7, thinkingConfig: { thinkingBudget: 0 } }
              }),
              signal: ctrl.signal
            }
          );
          clearTimeout(t);
          if (r.ok) {
            const d = await r.json();
            const p = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [];
            const en = p.map((x) => x.text || "").join("").trim();
            if (en) prompt = en.slice(0, 700);
          }
        } catch (e) { /* on garde la phrase d'origine */ }
      }

      try {
        const out = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", { prompt, steps: 4 });
        const img = out && out.image;
        if (!img) throw new Error("pas d'image");
        return json(200, { image: "data:image/jpeg;base64," + img, prompt });
      } catch (e) {
        const m = String((e && e.message) || e);
        if (/limit|quota|neuron|capacity|exceed|4006/i.test(m)) {
          return json(429, { reply: "J'ai atteint la limite d'images gratuites pour aujourd'hui. Réessaie demain." });
        }
        return json(502, { reply: "Je n'arrive pas à créer l'image pour l'instant. (" + m.slice(0, 80) + ")" });
      }
    }

    if (url.pathname !== "/api/chat" || request.method !== "POST") {
      return new Response("Not found", { status: 404 });
    }
    if (!env.GEMINI_API_KEY) return json(500, { reply: "Clé API non configurée." });

    let body;
    try { body = await request.json(); }
    catch { return json(400, { reply: "Requête invalide." }); }

    const message = String(body.message || "").trim().slice(0, 6000) || (body.image ? "Regarde cette photo et dis-moi ce que tu vois." : "");
    const image = typeof body.image === "string" && body.image.length < 2500000 ? body.image : "";

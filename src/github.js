// Jarvis × GitHub : il propose des modifications dans une branche à part, tu confirmes, tu fusionnes.
const J = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

// Seuls ces fichiers peuvent être modifiés (jamais les secrets, ni .github, ni l'app Android)
const ALLOWED_RE = /^(public\/[A-Za-z0-9_.\-\/]+\.(html|js|css|json|webmanifest)|src\/[A-Za-z0-9_.\-\/]+\.js)$/;
// Jamais : son propre garde-fou, le service worker, la config de déploiement
const PROTECTED = /^(src\/github\.js|public\/github\.js|public\/sw\.js)$/;
const ALLOWED = { test: (p) => ALLOWED_RE.test(p) && !PROTECTED.test(p) };

const b64enc = (s) => {
  const b = new TextEncoder().encode(s); let bin = "";
  for (let i = 0; i < b.length; i += 8192) bin += String.fromCharCode.apply(null, b.subarray(i, i + 8192));
  return btoa(bin);
};
const b64dec = (s) => {
  const bin = atob(String(s).replace(/\n/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

async function gem(env, system, user, max, temp, ms) {
  if (!env.GEMINI_API_KEY) throw new Error("clé Gemini manquante");
  const models = [env.GEMINI_MODEL || "gemini-flash-latest", "gemini-3.8-flash", "gemini-flash-lite-latest"];
  for (const model of models) {
    for (const rapide of [true, false]) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), ms);
        const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
          method: "POST",
          headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: Object.assign({ maxOutputTokens: max, temperature: temp }, rapide ? { thinkingConfig: { thinkingBudget: 0 } } : {})
          }),
          signal: ctrl.signal
        });
        clearTimeout(t);
        if (r.status === 400 && rapide) continue;
        if (!r.ok) break;
        const d = await r.json();
        const p = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [];
        const txt = p.map((x) => x.text || "").join("");
        if (txt.trim()) return txt;
        break;
      } catch (e) { break; }
    }
  }
  throw new Error("Gemini est surchargé, réessaie dans un instant");
}

// Petit comparateur de lignes (avant / après)
function diffLines(a, b) {
  const A = a.split("\n"), B = b.split("\n");
  let s = 0;
  while (s < A.length && s < B.length && A[s] === B[s]) s++;
  let ea = A.length, eb = B.length;
  while (ea > s && eb > s && A[ea - 1] === B[eb - 1]) { ea--; eb--; }
  const a2 = A.slice(s, ea), b2 = B.slice(s, eb), n = a2.length, m = b2.length;
  if (n * m > 4000000) return { add: m, del: n, lines: ["(modification trop grosse pour afficher le détail)"] };
  const W = m + 1, L = new Uint16Array((n + 1) * W);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    L[i * W + j] = a2[i] === b2[j] ? L[(i + 1) * W + j + 1] + 1 : Math.max(L[(i + 1) * W + j], L[i * W + j + 1]);
  const ops = []; let i = 0, j = 0;
  while (i < n && j < m) {
    if (a2[i] === b2[j]) { ops.push(["=", a2[i]]); i++; j++; }
    else if (L[(i + 1) * W + j] >= L[i * W + j + 1]) { ops.push(["-", a2[i]]); i++; }
    else { ops.push(["+", b2[j]]); j++; }
  }
  while (i < n) ops.push(["-", a2[i++]]);
  while (j < m) ops.push(["+", b2[j++]]);
  const pre = A.slice(Math.max(0, s - 2), s).map((x) => ["=", x]);
  const post = A.slice(ea, ea + 2).map((x) => ["=", x]);
  const all = pre.concat(ops, post);
  const keep = new Array(all.length).fill(false);
  all.forEach((o, k) => { if (o[0] !== "=") for (let d = -2; d <= 2; d++) if (all[k + d]) keep[k + d] = true; });
  const lines = []; let gap = false, add = 0, del = 0;
  all.forEach((o, k) => {
    if (o[0] === "+") add++; if (o[0] === "-") del++;
    if (keep[k]) { lines.push(o[0] + " " + o[1].slice(0, 160)); gap = false; }
    else if (!gap) { lines.push("… "); gap = true; }
  });
  return { add, del, lines: lines.slice(0, 160) };
}

export async function handleGithub(request, env, url) {
  if (!url.pathname.startsWith("/api/gh/")) return null;
  if (request.method !== "POST") return J(405, { reply: "Méthode non permise." });
  if (!env.JARVIS_PIN) return J(500, { reply: "Il manque le secret JARVIS_PIN dans Cloudflare." });
  const given = String(request.headers.get("x-jarvis-pin") || "");
  let diff = given.length ^ env.JARVIS_PIN.length;
  for (let i = 0; i < env.JARVIS_PIN.length; i++) diff |= (given.charCodeAt(i) || 0) ^ env.JARVIS_PIN.charCodeAt(i);
  if (diff !== 0) { await new Promise((ok) => setTimeout(ok, 1500)); return J(401, { reply: "Code secret incorrect." }); }
  if (!env.GITHUB_TOKEN) return J(500, { reply: "Il manque le secret GITHUB_TOKEN dans Cloudflare." });

  const repo = env.GITHUB_REPO || "loubrdmadloubrdmad-ops/jarvis-Eudson";
  const gh = async (path, opts) => {
    const r = await fetch("https://api.github.com/repos/" + repo + path, Object.assign({}, opts, {
      headers: {
        Authorization: "Bearer " + env.GITHUB_TOKEN, Accept: "application/vnd.github+json",
        "User-Agent": "jarvis-eudson", "X-GitHub-Api-Version": "2022-11-28", "content-type": "application/json"
      }
    }));
    const txt = await r.text(); let d = {};
    try { d = JSON.parse(txt); } catch (e) {}
    if (!r.ok) throw new Error("GitHub " + r.status + (d.message ? " : " + String(d.message).slice(0, 120) : ""));
    return d;
  };

  let body;
  try { body = await request.json(); } catch (e) { return J(400, { reply: "Requête invalide." }); }

  try {
    // 1) Préparer : lire le fichier, demander la modification, montrer ce qui change
    if (url.pathname === "/api/gh/plan") {
      const instruction = String(body.instruction || "").trim().slice(0, 1500);
      if (!instruction) return J(400, { reply: "Dis-moi ce que je dois modifier." });

      const tree = await gh("/git/trees/main?recursive=1");
      const files = (tree.tree || []).filter((x) => x.type === "blob" && ALLOWED.test(x.path)).map((x) => x.path);
      if (!files.length) return J(404, { reply: "Je ne trouve aucun fichier modifiable dans le dépôt." });

      const low = instruction.toLowerCase();
      let path = files.find((f) => low.indexOf(f.split("/").pop().toLowerCase()) !== -1);
      if (!path) {
        const pick = (await gem(env,
          "Tu choisis le fichier à modifier. Réponds uniquement avec un chemin exact pris dans la liste, rien d'autre.",
          "Fichiers :\n" + files.join("\n") + "\n\nDemande : " + instruction, 60, 0, 12000)).trim().replace(/[`'"]/g, "");
        path = files.find((f) => f === pick);
      }
      if (!path) return J(404, { reply: "Je ne sais pas quel fichier modifier. Dis-moi son nom, par exemple index.html." });

      const file = await gh("/contents/" + path.split("/").map(encodeURIComponent).join("/") + "?ref=main");
      const before = b64dec(file.content);
      if (before.length > 90000) return J(413, { reply: "Ce fichier est trop gros pour que je le modifie en une fois." });

      let after = await gem(env,
        "Tu es un développeur expert. Applique UNIQUEMENT la modification demandée au fichier ci-dessous. " +
        "Réponds avec le fichier COMPLET modifié, du premier au dernier caractère, sans aucune explication et sans balises markdown. " +
        "Ne change rien d'autre : garde le même style, la même indentation, les mêmes noms.",
        "Fichier : " + path + "\n\nModification demandée : " + instruction + "\n\n===== DÉBUT DU FICHIER =====\n" + before + "\n===== FIN DU FICHIER =====",
        32000, 0.2, 90000);
      after = after.replace(/^\s*```[\w-]*\n/, "").replace(/\n```\s*$/, "");
      if (before.endsWith("\n") && !after.endsWith("\n")) after += "\n";

      if (after === before) return J(200, { reply: "Je n'ai rien eu à changer : le fichier est déjà comme tu le veux." });
      if (after.length < before.length * 0.5 && !/supprim|retire|enl[eè]ve|vide/i.test(instruction)) {
        return J(200, { reply: "Le résultat me semble coupé (le fichier est devenu trop court), je ne te le propose pas. Réessaie avec une demande plus précise." });
      }
      const d = diffLines(before, after);
      return J(200, { path, content: after, add: d.add, del: d.del, diff: d.lines, instruction });
    }

    // 2) Appliquer : branche à part + demande de fusion (jamais directement sur le site)
    if (url.pathname === "/api/gh/apply") {
      const path = String(body.path || ""), content = String(body.content || "");
      if (!ALLOWED.test(path) || path.indexOf("..") !== -1) return J(403, { reply: "Ce fichier n'est pas autorisé." });
      if (!content || content.length > 120000) return J(400, { reply: "Contenu invalide." });
      const title = "Jarvis : " + String(body.instruction || "modification").replace(/\s+/g, " ").slice(0, 60);

      const ref = await gh("/git/ref/heads/main");
      const branch = "jarvis/" + Date.now();
      await gh("/git/refs", { method: "POST", body: JSON.stringify({ ref: "refs/heads/" + branch, sha: ref.object.sha }) });
      const cur = await gh("/contents/" + path.split("/").map(encodeURIComponent).join("/") + "?ref=" + encodeURIComponent(branch));
      await gh("/contents/" + path.split("/").map(encodeURIComponent).join("/"), {
        method: "PUT",
        body: JSON.stringify({ message: title, content: b64enc(content), sha: cur.sha, branch })
      });
      const pr = await gh("/pulls", {
        method: "POST",
        body: JSON.stringify({ title, head: branch, base: "main", body: "Modification préparée par Jarvis.\n\nDemande : " + String(body.instruction || "").slice(0, 500) })
      });
      return J(200, { number: pr.number, url: pr.html_url, branch });
    }

    // 3) Fusionner : seulement les demandes créées par Jarvis
    if (url.pathname === "/api/gh/merge") {
      const n = parseInt(body.number, 10);
      if (!n) return J(400, { reply: "Numéro invalide." });
      const pr = await gh("/pulls/" + n);
      if (!pr.head || !/^jarvis\//.test(pr.head.ref)) return J(403, { reply: "Je ne fusionne que les demandes créées par Jarvis." });
      if (pr.state !== "open") return J(409, { reply: "Cette demande est déjà fermée." });
      await gh("/pulls/" + n + "/merge", { method: "PUT", body: JSON.stringify({ merge_method: "squash" }) });
      try { await gh("/git/refs/heads/" + pr.head.ref.split("/").map(encodeURIComponent).join("/"), { method: "DELETE" }); } catch (e) {}
      return J(200, { merged: true });
    }
    return J(404, { reply: "Action inconnue." });
  } catch (e) {
    return J(502, { reply: String((e && e.message) || e).slice(0, 220) });
  }
                     }

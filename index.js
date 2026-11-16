import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY manquante : ajoute-la dans les variables Render.');
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PERSONNALITE =
  "Tu es Jarvis, mon assistant personnel haïtien. Tu parles français et créole. " +
  "Tu es cool, efficace et tu m'appelles 'mon gars'.";

const MODELES = ['gemini-flash-latest', 'gemini-flash-lite-latest'];

const PAGE = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jarvis</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; }
    body {
      font-family: Arial, sans-serif;
      background: #0b0b0f;
      color: #fff;
      display: flex;
      flex-direction: column;
      height: 100dvh;
    }
    header {
      padding: 14px 16px;
      background: #15151c;
      border-bottom: 1px solid #23232e;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    header h1 { margin: 0; font-size: 18px; }
    header h1 span { color: #00ff88; }
    #nouveau {
      background: transparent;
      color: #9aa;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 13px;
      cursor: pointer;
    }
    #chat {
      flex: 1;
      overflow-y: auto;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .bulle {
      max-width: 82%;
      padding: 10px 14px;
      border-radius: 18px;
      font-size: 16px;
      line-height: 1.4;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .user {
      align-self: flex-end;
      background: #00ff88;
      color: #05150d;
      border-bottom-right-radius: 4px;
    }
    .jarvis {
      align-self: flex-start;
      background: #1e1e28;
      color: #e9fff3;
      border-bottom-left-radius: 4px;
    }
    .erreur {
      align-self: flex-start;
      background: #3a1a1a;
      color: #ffb3b3;
      border-bottom-left-radius: 4px;
    }
    .reflexion { opacity: 0.7; font-style: italic; }
    #barre {
      display: flex;
      gap: 8px;
      padding: 10px;
      background: #15151c;
      border-top: 1px solid #23232e;
    }
    #message {
      flex: 1;
      padding: 12px 14px;
      border-radius: 22px;
      border: none;
      font-size: 16px;
      background: #23232e;
      color: #fff;
      outline: none;
    }
    #envoyer {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      border: none;
      background: #00ff88;
      color: #05150d;
      font-size: 20px;
      font-weight: bold;
      cursor: pointer;
    }
    #envoyer:disabled { opacity: 0.5; }
  </style>
</head>
<body>
  <header>
    <h1>Jarvis <span>●</span></h1>
    <button id="nouveau">Nouvelle conversation</button>
  </header>

  <div id="chat"></div>

  <div id="barre">
    <input type="text" id="message" placeholder="Écris ton message..." autocomplete="off">
    <button id="envoyer" aria-label="Envoyer">&#10148;</button>
  </div>

  <script>
    var chat = document.getElementById('chat');
    var champ = document.getElementById('message');
    var bouton = document.getElementById('envoyer');
    var historique = [];
    var enCours = false;

    function ajouterBulle(texte, classe) {
      var div = document.createElement('div');
      div.className = 'bulle ' + classe;
      div.textContent = texte;
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
      return div;
    }

    function accueil() {
      chat.innerHTML = '';
      ajouterBulle('Wesh mon gars ! Je suis Jarvis. Kisa pou m f\u00e8 pou ou ?', 'jarvis');
    }

    async function envoyer() {
      var msg = champ.value.trim();
      if (!msg || enCours) return;

      enCours = true;
      bouton.disabled = true;
      champ.value = '';
      ajouterBulle(msg, 'user');
      var attente = ajouterBulle('Jarvis r\u00e9fl\u00e9chit...', 'jarvis reflexion');

      try {
        var reponse = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg, historique: historique })
        });
        var data = await reponse.json();
        if (data.reply) {
          historique.push({ role: 'user', parts: [{ text: msg }] });
          historique.push({ role: 'model', parts: [{ text: data.reply }] });
          attente.className = 'bulle jarvis';
          attente.textContent = data.reply;
        } else {
          attente.className = 'bulle erreur';
          attente.textContent = data.error || 'Erreur inconnue';
        }
      } catch (erreur) {
        attente.className = 'bulle erreur';
        attente.textContent = 'Erreur r\u00e9seau : ' + erreur.message;
      }

      enCours = false;
      bouton.disabled = false;
      chat.scrollTop = chat.scrollHeight;
      champ.focus();
    }

    bouton.addEventListener('click', envoyer);
    champ.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') envoyer();
    });
    document.getElementById('nouveau').addEventListener('click', function () {
      historique = [];
      accueil();
    });

    accueil();
  </script>
</body>
</html>`;

async function demanderAGemini(contents) {
  let derniereErreur;
  for (const model of MODELES) {
    for (let essai = 0; essai < 2; essai++) {
      try {
        return await ai.models.generateContent({
          model,
          contents,
          config: { systemInstruction: PERSONNALITE },
        });
      } catch (err) {
        derniereErreur = err;
        console.error(`Échec avec ${model} (essai ${essai + 1}):`, err.message);
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }
  throw derniereErreur;
}

app.get('/', (req, res) => {
  res.send(PAGE);
});

app.post('/chat', async (req, res) => {
  try {
    const { message, historique = [] } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message vide.' });
    }

    const response = await demanderAGemini([
      ...historique,
      { role: 'user', parts: [{ text: message }] },
    ]);

    res.json({ reply: response.text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Jarvis est surchargé, réessaie dans un instant.' });
  }
});

// Liste les modèles disponibles pour ta clé (utile si tu as une 404)
app.get('/modeles', async (req, res) => {
  try {
    const liste = [];
    const pager = await ai.models.list();
    for await (const m of pager) liste.push(m.name);
    res.json(liste);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Jarvis tourne sur le port ${PORT}`);
});

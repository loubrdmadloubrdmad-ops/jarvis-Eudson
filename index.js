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

const PAGE = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mon Jarvis</title>
  <style>
    body { font-family: Arial, sans-serif; background: #111; color: white; padding: 20px; text-align: center; }
    input { width: 80%; padding: 10px; margin-top: 20px; border-radius: 5px; border: none; }
    button { padding: 10px 20px; background: #00ff88; border: none; border-radius: 5px; font-weight: bold; margin-top: 10px; cursor: pointer; }
    #reponse { margin-top: 20px; font-size: 18px; color: #00ff88; background: #222; padding: 20px; border-radius: 10px; min-height: 50px; text-align: left; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>Wesh mon gars, je suis Jarvis 🤖</h1>
  <input type="text" id="message" placeholder="Écris ton message ici...">
  <br>
  <button id="btn">Parler à Jarvis</button>
  <div id="reponse">...</div>

  <script>
    const champ = document.getElementById('message');
    const divReponse = document.getElementById('reponse');
    const historique = [];

    async function envoyer() {
      const msg = champ.value.trim();
      if (!msg) return;
      champ.value = '';
      divReponse.innerText = 'Jarvis réfléchit...';

      try {
        const reponse = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg, historique })
        });
        const data = await reponse.json();
        if (data.reply) {
          historique.push({ role: 'user', parts: [{ text: msg }] });
          historique.push({ role: 'model', parts: [{ text: data.reply }] });
          divReponse.innerText = data.reply;
        } else {
          divReponse.innerText = data.error || 'Erreur inconnue';
        }
      } catch (erreur) {
        divReponse.innerText = 'Erreur réseau: ' + erreur.message;
      }
    }

    document.getElementById('btn').addEventListener('click', envoyer);
    champ.addEventListener('keydown', (e) => { if (e.key === 'Enter') envoyer(); });
  </script>
</body>
</html>`;

app.get('/', (req, res) => {
  res.send(PAGE);
});

app.post('/chat', async (req, res) => {
  try {
    const { message, historique = [] } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message vide.' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [...historique, { role: 'user', parts: [{ text: message }] }],
      config: { systemInstruction: PERSONNALITE },
    });

    res.json({ reply: response.text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur du serveur : ' + error.message });
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

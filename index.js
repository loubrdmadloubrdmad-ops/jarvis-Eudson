import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mon Jarvis</title>
        <style>
            body { font-family: Arial; background: #111; color: white; padding: 20px; text-align: center; }
            input { width: 80%; padding: 10px; margin-top: 20px; border-radius: 5px; border: none; }
            button { padding: 10px 20px; background: #00ff88; border: none; border-radius: 5px; font-weight: bold; margin-top: 10px; cursor: pointer; }
            #reponse { margin-top: 20px; font-size: 18px; color: #00ff88; background: #222; padding: 20px; border-radius: 10px; min-height: 50px; text-align: left;}
        </style>
    </head>
    <body>
        <h1>Wesh mon gars, je suis Jarvis 🤖</h1>
        <input type="text" id="message" placeholder="Écris ton message ici...">
        <br>
        <button onclick="envoyer()">Parler à Jarvis</button>
        <div id="reponse">...</div>

        <script>
            async function envoyer() {
                const msg = document.getElementById('message').value;
                const divReponse = document.getElementById('reponse');
                divReponse.innerText = "Jarvis réfléchit...";

                try {
                    const reponse = await fetch('/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: msg })
                    });
                    const data = await reponse.json();
                    divReponse.innerText = data.reply ? data.reply : (data.error || "Erreur inconnue");
                } catch (erreur) {
                    divReponse.innerText = "Erreur réseau: " + erreur.message;
                }
            }
        </script>
    </body>
    </html>
  `);
});

app.post('/chat', async (req, res) => {
  try {
    const messageUtilisateur = req.body.message;
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "Tu es Jarvis, mon assistant personnel haïtien. Tu parles français et créole. Tu es cool, efficace et tu m'appelles 'mon gars'. Voici mon message : " + messageUtilisateur;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur du serveur : " + error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Jarvis tourne sur le port ${PORT}`);
});

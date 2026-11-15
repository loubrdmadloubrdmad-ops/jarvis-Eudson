import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// On prépare la connexion avec l'IA (on mettra la vraie clé secrète plus tard sur Render)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'TA_CLE_SECRETE_ICI',
});

// Une petite route pour tester si le serveur est en vie
app.get('/', (req, res) => {
  res.send('Wesh mon gars, Jarvis est en ligne et prêt à bosser ! 🤖🔥');
});

// La route pour discuter avec Jarvis
app.post('/chat', async (req, res) => {
  try {
    const messageUtilisateur = req.body.message;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Le cerveau de base
      messages: [
        { 
          role: 'system', 
          content: 'Tu es Jarvis, mon assistant personnel. Tu parles français, anglais, espagnol et créole haïtien. Tu es cool, efficace et tu m\'appelles "mon gars" ou "frérot" quand tu me parles.' 
        },
        { role: 'user', content: messageUtilisateur }
      ],
    });

    res.json({ reply: response.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Le serveur écoute (sur Render, ça utilisera le bon port automatiquement)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Jarvis tourne sur le port ${PORT}`);
});

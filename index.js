import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Connexion au cerveau Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Route pour tester si Jarvis est en ligne
app.get('/', (req, res) => {
  res.send('Wesh mon gars, Jarvis est en ligne et prêt à bosser ! 🤖🔥');
});

// Route pour discuter avec Jarvis
app.post('/chat', async (req, res) => {
  try {
    const messageUtilisateur = req.body.message;
    
    // On configure le cerveau
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: "Tu es Jarvis, mon assistant personnel haïtien. Tu parles français et créole. Tu es cool, efficace et tu m'appelles 'mon gars'."
    });

    // Jarvis réfléchit et répond
    const result = await model.generateContent(messageUtilisateur);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Jarvis tourne sur le port ${PORT}`);
});

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- LA PAGE WEB STYLE CYBERPUNK ---
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>JARVIS - Interface</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
            
            body { 
                margin: 0; padding: 0; 
                background-color: #000; 
                color: #00ff00; 
                font-family: 'Share Tech Mono', monospace;
                overflow: hidden;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
            }

            /* Code binaire en arrière-plan */
            #matrix-bg {
                position: absolute;
                top: 0; left: 0; width: 100%; height: 100%;
                opacity: 0.1;
                z-index: 0;
                pointer-events: none;
            }

            /* Le conteneur principal en "verre" */
            .glass-panel {
                position: relative;
                z-index: 1;
                width: 90%;
                max-width: 500px;
                background: rgba(0, 20, 0, 0.6);
                backdrop-filter: blur(10px);
                border: 1px solid #00ff00;
                box-shadow: 0 0 20px rgba(0, 255, 0, 0.2);
                border-radius: 10px;
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            h1 {
                text-shadow: 0 0 10px #00ff00;
                letter-spacing: 5px;
                margin-bottom: 5px;
            }

            .status {
                font-size: 12px;
                color: #00aa00;
                margin-bottom: 20px;
            }

            /* L'égaliseur qui vibre */
            .equalizer {
                display: flex;
                gap: 5px;
                height: 40px;
                align-items: flex-end;
                margin-bottom: 20px;
            }
            .bar {
                width: 5px;
                background-color: #00ff00;
                box-shadow: 0 0 5px #00ff00;
                border-radius: 2px;
                transition: height 0.1s ease;
            }
            /* Animation au repos */
            .equalizer.idle .bar { height: 5px; }

            /* Zone de chat */
            #reponse {
                width: 100%;
                min-height: 100px;
                background: rgba(0, 0, 0, 0.8);
                border: 1px solid #005500;
                color: #00ff00;
                padding: 10px;
                margin-bottom: 15px;
                box-sizing: border-box;
                font-size: 14px;
                overflow-y: auto;
                max-height: 200px;
            }

            input {
                width: 100%;
                background: transparent;
                border: 1px solid #00ff00;
                color: #00ff00;
                padding: 10px;
                font-family: 'Share Tech Mono', monospace;
                outline: none;
                box-sizing: border-box;
                margin-bottom: 10px;
            }
            input::placeholder { color: #005500; }

            button {
                width: 100%;
                background: #00ff00;
                color: #000;
                border: none;
                padding: 12px;
                font-family: 'Share Tech Mono', monospace;
                font-weight: bold;
                cursor: pointer;
                text-transform: uppercase;
                letter-spacing: 2px;
                box-shadow: 0 0 10px #00ff00;
                transition: 0.2s;
            }
            button:active { background: #00aa00; box-shadow: none; }
        </style>
    </head>
    <body>

        <!-- Effet visuel de code -->
        <canvas id="matrix-bg"></canvas>

        <!-- Panneau en verre -->
        <div class="glass-panel">
            <h1>JARVIS</h1>
            <div class="status">SYSTEM ONLINE // SECURE CONNECTION</div>

            <!-- Les barres qui vibrent -->
            <div class="equalizer idle" id="eq">
                <div class="bar"></div><div class="bar"></div><div class="bar"></div>
                <div class="bar"></div><div class="bar"></div><div class="bar"></div>
                <div class="bar"></div><div class="bar"></div><div class="bar"></div>
            </div>

            <div id="reponse">En attente d'instruction...</div>

            <input type="text" id="message" placeholder="Entrez votre commande...">
            <button onclick="envoyer()">Transmettre</button>
        </div>

        <script>
            // Animation des barres (Egaliseur)
            const bars = document.querySelectorAll('.bar');
            let isTalking = false;
            setInterval(() => {
                if (isTalking) {
                    bars.forEach(bar => {
                        bar.style.height = Math.random() * 40 + 'px';
                    });
                } else {
                    bars.forEach(bar => {
                        bar.style.height = Math.random() * 10 + 5 + 'px';
                    });
                }
            }, 100);

            // Effet Matrix (Pluie de code)
            const canvas = document.getElementById('matrix-bg');
            const ctx = canvas.getContext('2d');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const chars = "0101010101010101JARVIS01";
            const fontSize = 16;
            const columns = canvas.width / fontSize;
            const drops = [];
            for (let x = 0; x < columns; x++) drops[x] = 1;

            function drawMatrix() {
                ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "#00ff00";
                ctx.font = fontSize + "px monospace";
                for (let i = 0; i < drops.length; i++) {
                    const text = chars[Math.floor(Math.random() * chars.length)];
                    ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                    if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
                    drops[i]++;
                }
            }
            setInterval(drawMatrix, 50);

            // Envoi du message
            async function envoyer() {
                const msg = document.getElementById('message').value;
                const divReponse = document.getElementById('reponse');
                if (!msg) return;

                divReponse.innerText = "> Traitement en cours...";
                document.getElementById('message').value = "";
                isTalking = true; // Active les barres

                try {
                    const reponse = await fetch('/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: msg })
                    });
                    const data = await reponse.json();
                    
                    divReponse.innerText = "> " + (data.reply ? data.reply : (data.error || "Erreur"));
                } catch (erreur) {
                    divReponse.innerText = "> ERREUR RESEAU: " + erreur.message;
                } finally {
                    isTalking = false; // Désactive les barres
                }
            }
        </script>
    </body>
    </html>
  `);
});

// --- LE CERVEAU (GEMINI) ---
app.post('/chat', async (req, res) => {
  try {
    const messageUtilisateur = req.body.message;
    
    // Utilisation du modèle le plus récent
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

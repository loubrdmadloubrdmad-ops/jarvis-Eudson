package com.eudson.jarvis

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale
import kotlin.concurrent.thread

class JarvisService : Service(), TextToSpeech.OnInitListener {

    companion object {
        const val CHANNEL_ID = "jarvis_ecoute"
        const val NOTIF_ID = 1
        const val ACTION_STOP = "com.eudson.jarvis.STOP"
        const val ACTION_LISTEN = "com.eudson.jarvis.LISTEN"
        const val SERVER_URL = "https://jarvis-eudson.onrender.com/chat"

        @Volatile
        var enMarche = false
    }

    private val main = Handler(Looper.getMainLooper())
    private var recognizer: SpeechRecognizer? = null
    private var tts: TextToSpeech? = null
    private var ttsPret = false
    private var occupe = false
    private val historique = JSONArray()

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            arreter()
            return START_NOT_STICKY
        }
        try {
            demarrerPremierPlan()
        } catch (e: Exception) {
            arreter()
            return START_NOT_STICKY
        }
        if (!enMarche) {
            enMarche = true
            tts = TextToSpeech(this, this)
        }
        if (intent?.action == ACTION_LISTEN) {
            demanderEcoute()
        }
        return START_NOT_STICKY
    }

    private fun demarrerPremierPlan() {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "Jarvis", NotificationManager.IMPORTANCE_LOW)
        )
        val parler = PendingIntent.getService(
            this, 2,
            Intent(this, JarvisService::class.java).setAction(ACTION_LISTEN),
            PendingIntent.FLAG_IMMUTABLE
        )
        val stop = PendingIntent.getService(
            this, 0,
            Intent(this, JarvisService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_IMMUTABLE
        )
        val ouvrir = PendingIntent.getActivity(
            this, 1, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE
        )
        val notif = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentTitle("Jarvis est actif")
            .setContentText("Appuie sur « Parler » pour me parler")
            .setContentIntent(ouvrir)
            .addAction(0, "Parler", parler)
            .addAction(0, "Arrêter", stop)
            .setOngoing(true)
            .build()
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(NOTIF_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        } else {
            startForeground(NOTIF_ID, notif)
        }
    }

    // ---------- Démarrage de l'écoute ----------

    private fun demanderEcoute() {
        if (occupe) return
        occupe = true
        tts?.stop()
        ecouter()
    }

    private fun reprendre() {
        occupe = false
        recognizer?.destroy()
        recognizer = null
    }

    // ---------- Reconnaissance de la voix ----------

    private fun ecouter() {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            dire("La reconnaissance vocale n'est pas disponible sur ce téléphone.")
            return
        }
        recognizer?.destroy()
        recognizer = SpeechRecognizer.createSpeechRecognizer(this)
        recognizer?.setRecognitionListener(object : RecognitionListener {
            override fun onResults(results: Bundle?) {
                val texte = results
                    ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull()
                if (texte.isNullOrBlank()) reprendre() else traiter(texte)
            }

            override fun onError(error: Int) {
                reprendre()
            }

            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onPartialResults(partialResults: Bundle?) {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "fr-FR")
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
        }
        recognizer?.startListening(intent)
    }

    // ---------- Ce que Jarvis fait de ta demande ----------

    private fun traiter(texte: String) {
        val commande = Regex(
            "^(ouvre|ouvrir|lance|lancer|démarre|démarrer)\\s+(.+)$",
            RegexOption.IGNORE_CASE
        ).find(texte.trim())

        if (commande != null) {
            ouvrirApp(commande.groupValues[2])
            return
        }

        thread {
            val reponse = demanderAJarvis(texte)
            main.post { dire(reponse) }
        }
    }

    private fun ouvrirApp(demande: String) {
        val cible = demande.lowercase(Locale.FRENCH)
            .replace("l'application", "")
            .replace("l’application", "")
            .replace("application", "")
            .replace("l'", "")
            .trim()

        val pm = packageManager
        val lanceur = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        val apps = pm.queryIntentActivities(lanceur, 0)

        fun nomDe(info: android.content.pm.ResolveInfo) =
            info.loadLabel(pm).toString().lowercase(Locale.FRENCH)

        val trouvee = apps.firstOrNull { nomDe(it) == cible }
            ?: apps.firstOrNull { val n = nomDe(it); n.length >= 3 && (n.contains(cible) || cible.contains(n)) }

        if (trouvee == null) {
            dire("Je ne trouve pas l'application $cible.")
            return
        }

        val nom = trouvee.loadLabel(pm).toString()
        val lancement = pm.getLaunchIntentForPackage(trouvee.activityInfo.packageName)
        if (lancement == null) {
            dire("Je n'arrive pas à ouvrir $nom.")
            return
        }
        lancement.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            startActivity(lancement)
            dire("J'ouvre $nom.")
        } catch (e: Exception) {
            dire("Je n'arrive pas à ouvrir $nom.")
        }
    }

    private fun demanderAJarvis(message: String): String {
        return try {
            val corps = JSONObject()
                .put("message", message)
                .put("historique", historique)
                .put("langue", "fr")
            val c = URL(SERVER_URL).openConnection() as HttpURLConnection
            c.requestMethod = "POST"
            c.setRequestProperty("Content-Type", "application/json")
            c.connectTimeout = 20000
            c.readTimeout = 90000
            c.doOutput = true
            c.outputStream.use { it.write(corps.toString().toByteArray()) }
            val flux = if (c.responseCode in 200..299) c.inputStream else c.errorStream
            val brut = flux.bufferedReader().use { it.readText() }
            val json = JSONObject(brut)
            val reponse = json.optString("reply", "")
            if (reponse.isNotBlank()) {
                ajouterHistorique("user", message)
                ajouterHistorique("model", reponse)
                reponse
            } else {
                json.optString("error", "Je n'ai pas de réponse.")
            }
        } catch (e: Exception) {
            "Je n'arrive pas à joindre mon serveur."
        }
    }

    private fun ajouterHistorique(role: String, texte: String) {
        historique.put(
            JSONObject()
                .put("role", role)
                .put("parts", JSONArray().put(JSONObject().put("text", texte)))
        )
        while (historique.length() > 20) historique.remove(0)
    }

    // ---------- Voix de Jarvis ----------

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts?.language = Locale.FRENCH
            tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {}
                override fun onDone(utteranceId: String?) {
                    main.post { reprendre() }
                }

                override fun onError(utteranceId: String?) {
                    main.post { reprendre() }
                }
            })
            ttsPret = true
        }
    }

    private fun dire(texte: String) {
        if (!ttsPret) {
            reprendre()
            return
        }
        val propre = texte.replace("*", " ").replace("#", " ").replace("_", " ")
        tts?.speak(propre, TextToSpeech.QUEUE_FLUSH, null, "jarvis")
    }

    // ---------- Arrêt ----------

    private fun nettoyer() {
        enMarche = false
        occupe = false
        recognizer?.destroy()
        recognizer = null
        tts?.shutdown()
        tts = null
        ttsPret = false
    }

    private fun arreter() {
        nettoyer()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        nettoyer()
        super.onDestroy()
    }
}

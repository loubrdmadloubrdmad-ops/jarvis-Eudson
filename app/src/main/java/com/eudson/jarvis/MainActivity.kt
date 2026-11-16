package com.eudson.jarvis

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.InputType
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : Activity() {

    private lateinit var etat: TextView
    private lateinit var champCle: EditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val prefs = getSharedPreferences("jarvis", MODE_PRIVATE)

        val racine = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 110, 48, 48)
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(0xFF1A0B3D.toInt(), 0xFF4A0E8F.toInt(), 0xFFC2185B.toInt())
            )
        }

        racine.addView(texte("JARVIS", 34f, true))
        racine.addView(texte("Dis « Jarvis » pour me parler, même écran éteint.", 15f, false))
        etat = texte("", 17f, true)
        racine.addView(etat)

        champCle = EditText(this).apply {
            hint = "Clé Picovoice (AccessKey)"
            setHintTextColor(0x99FFFFFF.toInt())
            setTextColor(Color.WHITE)
            inputType = InputType.TYPE_CLASS_TEXT
            setText(prefs.getString("cle", ""))
        }
        racine.addView(champCle, marges())

        racine.addView(bouton("Activer Jarvis", 0xFFFF3D9A.toInt()) { demarrer() }, marges())
        racine.addView(bouton("Arrêter Jarvis", 0xFF5C5C8A.toInt()) { arreter() }, marges())
        racine.addView(bouton("Autoriser l'ouverture des applis", 0xFFFF9F1C.toInt()) { autoriserSuperposition() }, marges())
        racine.addView(bouton("Réglage batterie (ne pas couper Jarvis)", 0xFF22AFCF.toInt()) { reglageBatterie() }, marges())

        val defil = ScrollView(this).apply {
            isFillViewport = true
            addView(racine)
        }
        setContentView(defil)
    }

    override fun onResume() {
        super.onResume()
        afficherEtat()
    }

    private fun afficherEtat() {
        etat.text = if (JarvisService.enMarche) "Jarvis est ACTIF" else "Jarvis est arrêté"
    }

    private fun demarrer() {
        val cle = champCle.text.toString().trim()
        if (cle.isEmpty()) {
            etat.text = "Colle d'abord ta clé Picovoice."
            return
        }
        getSharedPreferences("jarvis", MODE_PRIVATE).edit().putString("cle", cle).apply()

        val manquantes = ArrayList<String>()
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            manquantes.add(Manifest.permission.RECORD_AUDIO)
        }
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            manquantes.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        if (manquantes.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, manquantes.toTypedArray(), 1)
            return
        }
        lancer()
    }

    private fun lancer() {
        ContextCompat.startForegroundService(this, Intent(this, JarvisService::class.java))
        etat.postDelayed({ afficherEtat() }, 800)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            lancer()
        } else {
            etat.text = "Sans le micro, Jarvis ne peut pas t'écouter."
        }
    }

    private fun arreter() {
        startService(Intent(this, JarvisService::class.java).setAction(JarvisService.ACTION_STOP))
        etat.postDelayed({ afficherEtat() }, 800)
    }

    private fun autoriserSuperposition() {
        if (!Settings.canDrawOverlays(this)) {
            startActivity(
                Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName"))
            )
        } else {
            etat.text = "Ouverture des applis : déjà autorisée."
        }
    }

    private fun reglageBatterie() {
        startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
    }

    private fun marges() = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT
    ).apply { topMargin = 28 }

    private fun texte(t: String, taille: Float, gras: Boolean) = TextView(this).apply {
        text = t
        textSize = taille
        setTextColor(Color.WHITE)
        if (gras) setTypeface(typeface, Typeface.BOLD)
        setPadding(0, 12, 0, 12)
    }

    private fun bouton(label: String, couleur: Int, action: () -> Unit) = Button(this).apply {
        text = label
        setTextColor(Color.WHITE)
        background = GradientDrawable().apply {
            cornerRadius = 60f
            setColor(couleur)
        }
        setOnClickListener { action() }
    }
}

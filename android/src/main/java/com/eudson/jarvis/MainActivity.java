package com.eudson.jarvis;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Base64;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.Toast;

import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import java.io.OutputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;

public class MainActivity extends Activity {

    static final String SITE = "https://jarvis-eudson.loubrdmadloubrdmad.workers.dev/";
    static final String HOST = "jarvis-eudson.loubrdmadloubrdmad.workers.dev";

    // Le micro du site (SpeechRecognition) n'existe pas dans une WebView : on le remplace par le micro d'Android.
    static final String SHIM =
        "(function(){"
        + "function R(){this.lang='fr-FR';this.interimResults=false;this.continuous=false;}"
        + "R.prototype.start=function(){window.__jr=this;window.JarvisApp.listen(this.lang||'fr-FR');};"
        + "R.prototype.stop=function(){window.JarvisApp.stopListening();};"
        + "R.prototype.abort=R.prototype.stop;"
        + "window.SpeechRecognition=R;window.webkitSpeechRecognition=R;"
        + "window.__jv=function(e,t){var r=window.__jr;if(!r)return;"
        + "if(e==='start'&&r.onstart)r.onstart();"
        + "else if(e==='result'&&r.onresult)r.onresult({results:[[{transcript:t}]]});"
        + "else if(e==='error'&&r.onerror)r.onerror({error:t});"
        + "else if(e==='end'&&r.onend)r.onend();};"
        + "})();";

    WebView web;
    SpeechRecognizer sr;
    ValueCallback<Uri[]> fileCb;
    boolean wantListen = false;
    String listenLang = "fr-FR";

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        getWindow().getDecorView().setBackgroundColor(Color.BLACK);

        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);

        web.addJavascriptInterface(new Bridge(), "JarvisApp");

        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            Set<String> origins = new HashSet<>();
            origins.add("https://" + HOST);
            WebViewCompat.addDocumentStartJavaScript(web, SHIM, origins);
        }

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (HOST.equals(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) { }
                return true;
            }

            @Override
            public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (r.isForMainFrame()) {
                    String html = "<html><body style='background:#000;color:#e8ebf0;font-family:sans-serif;"
                        + "display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0'>"
                        + "<p>Pas de connexion, mon gars.</p>"
                        + "<a href='" + SITE + "' style='color:#000;background:#d9dde4;padding:12px 22px;"
                        + "border-radius:999px;text-decoration:none;font-weight:600'>Réessayer</a></body></html>";
                    v.loadDataWithBaseURL(null, html, "text/html", "utf-8", null);
                }
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> request.grant(request.getResources()));
            }

            @Override
            public boolean onShowFileChooser(WebView w, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb;
                try {
                    startActivityForResult(p.createIntent(), 2);
                } catch (Exception e) {
                    fileCb = null;
                    return false;
                }
                return true;
            }

            @Override
            public boolean onJsAlert(WebView v, String url, String msg, final JsResult r) {
                new AlertDialog.Builder(MainActivity.this).setMessage(msg)
                    .setPositiveButton("OK", (d, i) -> r.confirm())
                    .setOnCancelListener(d -> r.cancel()).show();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView v, String url, String msg, final JsResult r) {
                new AlertDialog.Builder(MainActivity.this).setMessage(msg)
                    .setPositiveButton("OK", (d, i) -> r.confirm())
                    .setNegativeButton("Annuler", (d, i) -> r.cancel())
                    .setOnCancelListener(d -> r.cancel()).show();
                return true;
            }

            @Override
            public boolean onJsPrompt(WebView v, String url, String msg, String def, final JsPromptResult r) {
                final EditText in = new EditText(MainActivity.this);
                if (def != null) in.setText(def);
                new AlertDialog.Builder(MainActivity.this).setMessage(msg).setView(in)
                    .setPositiveButton("OK", (d, i) -> r.confirm(in.getText().toString()))
                    .setNegativeButton("Annuler", (d, i) -> r.cancel())
                    .setOnCancelListener(d -> r.cancel()).show();
                return true;
            }
        });

        web.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String ua, String cd, String mime, long len) {
                String name = URLUtil.guessFileName(url, cd, mime);
                if (url.startsWith("data:")) {
                    saveDataUrl(url, name);
                } else if (url.startsWith("blob:")) {
                    web.evaluateJavascript(
                        "fetch('" + url + "').then(function(r){return r.blob()}).then(function(b){"
                        + "var f=new FileReader();f.onload=function(){window.JarvisApp.saveData(f.result,"
                        + org.json.JSONObject.quote(name) + ")};f.readAsDataURL(b)})", null);
                } else {
                    try {
                        DownloadManager.Request q = new DownloadManager.Request(Uri.parse(url));
                        q.setMimeType(mime);
                        q.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                        q.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
                        ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(q);
                        toast("Téléchargement : " + name);
                    } catch (Exception e) { toast("Téléchargement impossible"); }
                }
            }
        });

        web.loadUrl(SITE);
    }

    // ---------- pont entre le site et Android ----------
    class Bridge {
        @JavascriptInterface
        public void listen(final String lang) { runOnUiThread(() -> startListen(lang)); }

        @JavascriptInterface
        public void stopListening() {
            runOnUiThread(() -> { if (sr != null) sr.stopListening(); });
        }

        @JavascriptInterface
        public void saveData(String dataUrl, String name) { saveDataUrl(dataUrl, name); }
    }

    void js(String ev, String text) {
        final String code = "window.__jv&&window.__jv('" + ev + "'," + org.json.JSONObject.quote(text) + ")";
        runOnUiThread(() -> web.evaluateJavascript(code, null));
    }

    void startListen(String lang) {
        listenLang = lang;
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            wantListen = true;
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, 1);
            return;
        }
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            toast("La reconnaissance vocale de Google n'est pas disponible sur ce téléphone.");
            js("error", "service-not-allowed");
            js("end", "");
            return;
        }
        if (sr != null) sr.destroy();
        sr = SpeechRecognizer.createSpeechRecognizer(this);
        sr.setRecognitionListener(new RecognitionListener() {
            public void onReadyForSpeech(Bundle p) { js("start", ""); }
            public void onBeginningOfSpeech() { }
            public void onRmsChanged(float v) { }
            public void onBufferReceived(byte[] b) { }
            public void onEndOfSpeech() { }
            public void onPartialResults(Bundle p) { }
            public void onEvent(int t, Bundle p) { }
            public void onError(int e) { js("error", "code-" + e); js("end", ""); }
            public void onResults(Bundle r) {
                ArrayList<String> l = r.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (l != null && !l.isEmpty()) js("result", l.get(0));
                js("end", "");
            }
        });
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
        i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
        sr.startListening(i);
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        if (code == 1 && wantListen) {
            wantListen = false;
            if (res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED) {
                startListen(listenLang);
            } else {
                toast("Sans le micro, je ne peux pas t'entendre. Autorise-le dans les réglages.");
                js("error", "not-allowed");
                js("end", "");
            }
        }
    }

    // ---------- fichiers : photos envoyées au site, images et code téléchargés ----------
    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == 2 && fileCb != null) {
            fileCb.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data));
            fileCb = null;
        }
    }

    void saveDataUrl(String url, String name) {
        try {
            int c = url.indexOf(',');
            String head = url.substring(5, c);
            String mime = head.split(";")[0];
            if (mime.isEmpty()) mime = "application/octet-stream";
            byte[] bytes = head.contains("base64")
                ? Base64.decode(url.substring(c + 1), Base64.DEFAULT)
                : Uri.decode(url.substring(c + 1)).getBytes("UTF-8");
            ContentValues v = new ContentValues();
            v.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
            v.put(MediaStore.MediaColumns.MIME_TYPE, mime);
            v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
            Uri u = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
            OutputStream o = getContentResolver().openOutputStream(u);
            o.write(bytes);
            o.close();
            toast("Enregistré dans Téléchargements : " + name);
        } catch (Exception e) {
            toast("Je n'ai pas pu enregistrer le fichier.");
        }
    }

    void toast(final String t) {
        runOnUiThread(() -> Toast.makeText(MainActivity.this, t, Toast.LENGTH_LONG).show());
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (sr != null) sr.destroy();
        super.onDestroy();
    }
  }

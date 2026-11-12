package com.example

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.HapticFeedbackConstants
import android.view.View
import android.view.ViewGroup
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat

class MainActivity : ComponentActivity() {

    private var currentWebView: WebView? = null
    private var pendingPermissionRequest: PermissionRequest? = null

    private val cameraPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            if (isGranted) {
                pendingPermissionRequest?.let { request ->
                    request.grant(request.resources)
                    pendingPermissionRequest = null
                }
            } else {
                pendingPermissionRequest?.deny()
                pendingPermissionRequest = null
                Toast.makeText(this, "Camera permission needed for scanning", Toast.LENGTH_SHORT).show()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                val wv = currentWebView
                if (wv != null) {
                    // Dispatch a custom popstate or handleBack event to web app
                    wv.evaluateJavascript("window.handleAndroidBackPressed ? window.handleAndroidBackPressed() : false") { result ->
                        if (result != "true") {
                            if (wv.canGoBack()) {
                                wv.goBack()
                            } else {
                                isEnabled = false
                                onBackPressedDispatcher.onBackPressed()
                            }
                        }
                    }
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        setContent {
            Surface(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFF090D16)),
                color = Color(0xFF090D16)
            ) {
                CubeRushWebViewContainer(
                    onWebViewCreated = { webView ->
                        currentWebView = webView
                        setupWebView(webView)
                    }
                )
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView(webView: WebView) {
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            vibratorManager?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            @Suppress("DEPRECATION")
            allowFileAccessFromFileURLs = true
            @Suppress("DEPRECATION")
            allowUniversalAccessFromFileURLs = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportZoom(false)
            displayZoomControls = false
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        webView.setBackgroundColor(0xFF090D16.toInt())

        // Hardware acceleration support
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)

        // Javascript Interface for Android Haptics and Utilities
        webView.addJavascriptInterface(
            WebAppInterface(this, webView, vibrator) {
                checkAndRequestCameraPermission()
            },
            "AndroidBridge"
        )

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                val hasCamera = request.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)
                if (hasCamera) {
                    if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(request.resources)
                    } else {
                        pendingPermissionRequest = request
                        cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                    }
                } else {
                    request.grant(request.resources)
                }
            }

            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                android.util.Log.d("CubeRushWeb", "${consoleMessage?.message()} -- line ${consoleMessage?.lineNumber()} of ${consoleMessage?.sourceId()}")
                return true
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                android.util.Log.e("CubeRushWeb", "WebView Error: ${error?.description} on ${request?.url}")
                super.onReceivedError(view, request, error)
            }
        }

        // Load the bundled Vite/React app
        webView.loadUrl("file:///android_asset/web/index.html")
    }

    private fun checkAndRequestCameraPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    class WebAppInterface(
        private val context: Context,
        private val webView: WebView,
        private val vibrator: Vibrator?,
        private val onCameraPermissionRequested: () -> Unit
    ) {
        @JavascriptInterface
        fun vibrate(milliseconds: Long) {
            if (vibrator?.hasVibrator() == true) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(
                        VibrationEffect.createOneShot(
                            milliseconds.coerceIn(5, 500),
                            VibrationEffect.DEFAULT_AMPLITUDE
                        )
                    )
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(milliseconds.coerceIn(5, 500))
                }
            }
        }

        @JavascriptInterface
        fun hapticClick() {
            webView.post {
                webView.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
            }
        }

        @JavascriptInterface
        fun hapticTick() {
            webView.post {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                    webView.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
                } else {
                    webView.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                }
            }
        }

        @JavascriptInterface
        fun hapticSuccess() {
            vibrate(40)
        }

        @JavascriptInterface
        fun showToast(message: String) {
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
        }

        @JavascriptInterface
        fun requestCameraPermission() {
            onCameraPermissionRequested()
        }

        @JavascriptInterface
        fun isCameraPermissionGranted(): Boolean {
            return ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        }

        @JavascriptInterface
        fun isAndroidNative(): Boolean {
            return true
        }
    }
}

@Composable
fun CubeRushWebViewContainer(
    onWebViewCreated: (WebView) -> Unit,
    modifier: Modifier = Modifier
) {
    AndroidView(
        modifier = modifier.fillMaxSize(),
        factory = { context ->
            WebView(context).apply {
                layoutParams = FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
                onWebViewCreated(this)
            }
        }
    )
}

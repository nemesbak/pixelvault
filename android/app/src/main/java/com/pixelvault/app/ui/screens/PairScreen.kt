package com.pixelvault.app.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.util.Size
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import com.pixelvault.app.ui.components.PixelShape
import com.pixelvault.app.ui.theme.*
import com.pixelvault.app.viewmodel.AppViewModel

// ── Code entry with numeric PIN pad ──────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PairCodeScreen(
    viewModel: AppViewModel,
    onPaired: () -> Unit,
    onBack: () -> Unit
) {
    val state by viewModel.state.collectAsState()
    var digits by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    val isDiscovering by viewModel.isDiscovering.collectAsState()
    val discoveredUrl by viewModel.discoveredUrl.collectAsState()
    val savedUrl = state.serverUrl.ifBlank { null }

    LaunchedEffect(Unit) { viewModel.startServerDiscovery() }
    DisposableEffect(Unit) { onDispose { viewModel.stopServerDiscovery() } }

    fun redeem() {
        if (digits.length != 6) return
        error = null
        viewModel.redeemCode(digits) { ok, msg ->
            if (ok) onPaired() else { error = msg; digits = "" }
        }
    }

    Scaffold(
        containerColor = DarkBg,
        topBar = {
            TopAppBar(
                title = { Text("PAIR DEVICE", style = MaterialTheme.typography.titleMedium) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.stopServerDiscovery(); onBack() }) {
                        Icon(Icons.Default.ArrowBack, null, tint = NeonGreen)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkBg)
            )
        }
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .background(DarkBg)
                .padding(padding)
                .padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.height(24.dp))

            // Server discovery status
            DiscoveryStatus(isDiscovering, discoveredUrl, savedUrl)

            Spacer(Modifier.height(40.dp))

            Text("ENTER CODE", style = MaterialTheme.typography.headlineMedium)
            Spacer(Modifier.height(8.dp))
            Text(
                "Generated on web UI → Settings → Pair Device",
                style = MaterialTheme.typography.labelSmall,
                color = TextSecondary,
                textAlign = TextAlign.Center
            )

            Spacer(Modifier.height(32.dp))

            // Digit display
            PinDisplay(digits = digits, length = 6)

            error?.let {
                Spacer(Modifier.height(12.dp))
                Text(it, style = MaterialTheme.typography.labelSmall, color = ErrorRed, textAlign = TextAlign.Center)
            }

            Spacer(Modifier.height(32.dp))

            // Pixel numpad
            NumPad(
                onDigit = { if (digits.length < 6) { digits += it; if (digits.length == 6) redeem() } },
                onDelete = { if (digits.isNotEmpty()) digits = digits.dropLast(1) },
                onOk = { redeem() },
                enabled = !state.isLoading,
                okEnabled = digits.length == 6 && (isDiscovering || discoveredUrl != null || savedUrl != null)
            )
        }
    }
}

@Composable
private fun DiscoveryStatus(isDiscovering: Boolean, discoveredUrl: String?, savedUrl: String?) {
    val dotAnim by rememberInfiniteTransition(label = "dots").animateFloat(
        initialValue = 0f, targetValue = 3f,
        animationSpec = infiniteRepeatable(tween(1200, easing = LinearEasing)),
        label = "dot"
    )
    val dots = ".".repeat((dotAnim.toInt() % 3) + 1).padEnd(3, ' ')

    val hasFallback = !isDiscovering && discoveredUrl == null && savedUrl != null
    val borderColor = when {
        discoveredUrl != null -> NeonGreen
        hasFallback -> Color(0xFFFFCC00)
        else -> TextSecondary
    }
    val dotColor = when {
        discoveredUrl != null -> NeonGreen
        isDiscovering -> NeonGreen.copy(alpha = 0.4f)
        hasFallback -> Color(0xFFFFCC00)
        else -> ErrorRed
    }
    val label = when {
        discoveredUrl != null -> "SERVER FOUND ✓"
        isDiscovering -> "SCANNING LAN$dots"
        hasFallback -> "USING SAVED SERVER"
        else -> "SERVER NOT FOUND"
    }
    val labelColor = when {
        discoveredUrl != null -> NeonGreen
        hasFallback -> Color(0xFFFFCC00)
        else -> TextSecondary
    }

    Row(
        Modifier
            .fillMaxWidth()
            .border(1.dp, borderColor, PixelShape)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(Modifier.size(8.dp).background(dotColor))
        Spacer(Modifier.width(12.dp))
        Text(label, style = MaterialTheme.typography.bodyMedium, color = labelColor)
    }
}

@Composable
private fun PinDisplay(digits: String, length: Int) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        repeat(length) { i ->
            val char = digits.getOrNull(i)
            Box(
                Modifier
                    .size(44.dp)
                    .border(2.dp, if (i == digits.length) NeonGreen else TextSecondary, PixelShape)
                    .background(DarkCard),
                contentAlignment = Alignment.Center
            ) {
                if (char != null) {
                    Text(char.toString(), style = MaterialTheme.typography.headlineMedium, color = NeonGreen)
                } else if (i == digits.length) {
                    // blinking cursor
                    val alpha by rememberInfiniteTransition(label = "c$i").animateFloat(
                        initialValue = 1f, targetValue = 0f,
                        animationSpec = infiniteRepeatable(tween(500), RepeatMode.Reverse), label = "cur"
                    )
                    Box(Modifier.width(2.dp).height(20.dp).alpha(alpha).background(NeonGreen))
                }
            }
            if (i == 2) Spacer(Modifier.width(4.dp))
        }
    }
}

@Composable
private fun NumPad(
    onDigit: (String) -> Unit,
    onDelete: () -> Unit,
    onOk: () -> Unit,
    enabled: Boolean,
    okEnabled: Boolean
) {
    val rows = listOf(
        listOf("1","2","3"),
        listOf("4","5","6"),
        listOf("7","8","9"),
        listOf("←","0","OK")
    )
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        rows.forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { key ->
                    val isOk = key == "OK"
                    val isDel = key == "←"
                    val active = enabled && (if (isOk) okEnabled else true)
                    Box(
                        Modifier
                            .size(72.dp)
                            .border(
                                2.dp,
                                when { isOk && active -> NeonGreen; !active -> TextSecondary.copy(alpha = 0.3f); else -> TextSecondary },
                                PixelShape
                            )
                            .background(if (isOk && active) NeonGreen.copy(alpha = 0.08f) else DarkCard)
                            .clickable(enabled = active) {
                                when { isOk -> onOk(); isDel -> onDelete(); else -> onDigit(key) }
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            key,
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontSize = if (isDel || isOk) 10.sp else 16.sp
                            ),
                            color = when { isOk && active -> NeonGreen; !active -> TextSecondary.copy(alpha = 0.3f); else -> TextSecondary }
                        )
                    }
                }
            }
        }
    }
}

// ── QR Scan screen ────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QrScanScreen(
    viewModel: AppViewModel,
    onPaired: () -> Unit,
    onBack: () -> Unit
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    var error by remember { mutableStateOf<String?>(null) }
    var hasCameraPermission by remember {
        mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)
    }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        hasCameraPermission = it
    }

    LaunchedEffect(Unit) {
        if (!hasCameraPermission) launcher.launch(Manifest.permission.CAMERA)
    }

    fun onQrDetected(raw: String) {
        // QR format from web UI: http://host:port/pair/CODE
        // Extract host:port and code
        val match = Regex("(https?://[^/]+)/pair/([A-Z0-9]+)", RegexOption.IGNORE_CASE).find(raw)
        if (match != null) {
            val serverUrl = match.groupValues[1]
            val code = match.groupValues[2]
            viewModel.setServerUrl(serverUrl)
            viewModel.redeemCode(code) { ok, msg -> if (ok) onPaired() else error = msg }
        } else {
            // Try federation QR (pvconnect://base64payload)
            if (raw.startsWith("pvconnect://")) {
                viewModel.redeemFederationQr(raw.removePrefix("pvconnect://")) { ok, msg ->
                    if (ok) onPaired() else error = msg
                }
            } else {
                error = "QR no reconocido. Usa el QR de Settings → Pair Device."
            }
        }
    }

    Scaffold(
        containerColor = Color.Black,
        topBar = {
            TopAppBar(
                title = { Text("SCAN QR", style = MaterialTheme.typography.titleMedium, color = NeonGreen) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, null, tint = NeonGreen) } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Black)
            )
        }
    ) { padding ->
        Box(Modifier.fillMaxSize().background(Color.Black).padding(padding)) {
            if (hasCameraPermission) {
                QrCameraView(
                    onDetected = ::onQrDetected,
                    isProcessing = state.isLoading
                )
            } else {
                Column(
                    Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text("CAMERA REQUIRED", style = MaterialTheme.typography.headlineMedium, color = NeonGreen)
                    Spacer(Modifier.height(16.dp))
                    Text("Allow camera access to scan QR codes.", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                }
            }

            // Crosshair overlay
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Box(
                    Modifier
                        .size(220.dp)
                        .border(2.dp, NeonGreen, PixelShape)
                )
            }

            // Bottom info
            Column(
                Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(Color.Black.copy(alpha = 0.7f))
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                if (state.isLoading) {
                    CircularProgressIndicator(color = NeonGreen, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.height(8.dp))
                    Text("CONNECTING...", style = MaterialTheme.typography.bodyMedium, color = NeonGreen)
                } else {
                    Text(
                        error ?: "Point at the QR code on your web UI",
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (error != null) ErrorRed else TextSecondary,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}

@androidx.annotation.OptIn(androidx.camera.core.ExperimentalGetImage::class)
@Composable
private fun QrCameraView(onDetected: (String) -> Unit, isProcessing: Boolean) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val previewView = remember { PreviewView(context) }
    val scanner = remember { BarcodeScanning.getClient() }
    var detected by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        val provider = ProcessCameraProvider.getInstance(context).get()
        val preview = Preview.Builder().build().also { it.setSurfaceProvider(previewView.surfaceProvider) }
        val analysis = ImageAnalysis.Builder()
            .setTargetResolution(Size(1280, 720))
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .build()

        analysis.setAnalyzer(ContextCompat.getMainExecutor(context)) { proxy ->
            val img = proxy.image
            if (img != null && !detected && !isProcessing) {
                val input = InputImage.fromMediaImage(img, proxy.imageInfo.rotationDegrees)
                scanner.process(input)
                    .addOnSuccessListener { barcodes ->
                        barcodes.firstOrNull()?.rawValue?.let {
                            if (!detected) { detected = true; onDetected(it) }
                        }
                    }
                    .addOnCompleteListener { proxy.close() }
            } else proxy.close()
        }
        provider.unbindAll()
        provider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
    }

    AndroidView(factory = { previewView }, modifier = Modifier.fillMaxSize())
}

package com.pixelvault.app.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.util.Size
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import com.pixelvault.app.ui.components.*
import com.pixelvault.app.ui.theme.*
import com.pixelvault.app.viewmodel.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PairScreen(viewModel: AppViewModel, onPaired: () -> Unit, onBack: () -> Unit) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    var code by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var showCamera by remember { mutableStateOf(false) }
    var cameraPermission by remember {
        mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)
    }
    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        cameraPermission = it; if (it) showCamera = true
    }

    fun redeem(input: String) {
        error = null
        viewModel.redeemCode(input) { ok, msg -> if (ok) onPaired() else error = msg }
    }

    Scaffold(
        containerColor = DarkBg,
        topBar = {
            TopAppBar(
                title = { Text("PAIR DEVICE", style = MaterialTheme.typography.titleMedium) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, null, tint = NeonGreen) } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkBg)
            )
        }
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .background(DarkBg)
                .padding(padding)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (showCamera && cameraPermission) {
                Box(Modifier.fillMaxWidth().height(280.dp).pixelBorder()) {
                    QrCamera(onDetected = { payload -> showCamera = false; redeem(payload) })
                }
                Spacer(Modifier.height(16.dp))
                TextButton(onClick = { showCamera = false }) {
                    Text("ENTER CODE MANUALLY", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                }
            } else {
                Text("ENTER 6-DIGIT CODE", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                Text(
                    "Generate a code on the web UI\nSettings → Pair Device",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextSecondary,
                    textAlign = TextAlign.Center
                )
                Spacer(Modifier.height(24.dp))

                PixelTextField(
                    value = code,
                    onValueChange = { if (it.length <= 7) code = it.uppercase(); error = null },
                    label = "ABC-123",
                    modifier = Modifier.fillMaxWidth()
                )

                error?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, style = MaterialTheme.typography.labelSmall, color = ErrorRed)
                }

                Spacer(Modifier.height(16.dp))

                PixelButton(
                    text = if (state.isLoading) "..." else "REDEEM",
                    onClick = { redeem(code) },
                    enabled = !state.isLoading && code.replace("-", "").length == 6,
                    modifier = Modifier.fillMaxWidth().height(52.dp)
                )

                Spacer(Modifier.height(24.dp))
                HorizontalDivider(color = TextSecondary, thickness = 1.dp)
                Spacer(Modifier.height(24.dp))

                PixelButton(
                    text = "SCAN QR CODE",
                    onClick = {
                        if (cameraPermission) showCamera = true
                        else permissionLauncher.launch(Manifest.permission.CAMERA)
                    },
                    modifier = Modifier.fillMaxWidth().height(52.dp)
                )
            }
        }
    }
}

@androidx.annotation.OptIn(androidx.camera.core.ExperimentalGetImage::class)
@Composable
private fun QrCamera(onDetected: (String) -> Unit) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val previewView = remember { PreviewView(context) }
    val scanner = remember { BarcodeScanning.getClient() }
    var detected by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        val cameraProvider = ProcessCameraProvider.getInstance(context).get()
        val preview = Preview.Builder().build().also { it.setSurfaceProvider(previewView.surfaceProvider) }
        val analysis = ImageAnalysis.Builder()
            .setTargetResolution(Size(1280, 720))
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .build()
        analysis.setAnalyzer(ContextCompat.getMainExecutor(context)) { proxy ->
            val mediaImage = proxy.image
            if (mediaImage != null && !detected) {
                val img = InputImage.fromMediaImage(mediaImage, proxy.imageInfo.rotationDegrees)
                scanner.process(img)
                    .addOnSuccessListener { barcodes ->
                        barcodes.firstOrNull()?.rawValue?.let {
                            if (!detected) { detected = true; onDetected(it) }
                        }
                    }
                    .addOnCompleteListener { proxy.close() }
            } else proxy.close()
        }
        cameraProvider.unbindAll()
        cameraProvider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
    }

    AndroidView(factory = { previewView }, modifier = Modifier.fillMaxSize())
}

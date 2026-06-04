package com.pixelvault.app.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.pixelvault.app.ui.components.PixelButton
import com.pixelvault.app.ui.theme.*

private val LOGO = """
██████╗ ██╗   ██╗
██╔══██╗██║   ██║
██████╔╝██║   ██║
██╔═══╝ ╚██╗ ██╔╝
██║      ╚████╔╝
╚═╝       ╚═══╝
""".trimIndent()

@Composable
fun ConnectScreen(
    onScanQr: () -> Unit,
    onEnterCode: () -> Unit,
    onLoginManual: () -> Unit
) {
    // blink animation for the cursor
    val blink by rememberInfiniteTransition(label = "blink").animateFloat(
        initialValue = 1f, targetValue = 0f,
        animationSpec = infiniteRepeatable(tween(600), RepeatMode.Reverse),
        label = "cursor"
    )

    Box(
        Modifier
            .fillMaxSize()
            .background(DarkBg),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(0.dp)
        ) {

            // Logo
            Text(
                LOGO,
                style = MaterialTheme.typography.labelSmall.copy(
                    fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                ),
                color = NeonGreen,
                textAlign = TextAlign.Center
            )

            Spacer(Modifier.height(4.dp))

            Text(
                "VAULT",
                style = MaterialTheme.typography.displayLarge,
                color = NeonGreen
            )

            Spacer(Modifier.height(6.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("v0.2.0", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                Spacer(Modifier.width(6.dp))
                Text("█", style = MaterialTheme.typography.labelSmall,
                    color = NeonGreen, modifier = Modifier.alpha(blink))
            }

            Spacer(Modifier.height(56.dp))

            // Primary action
            PixelButton(
                text = "▶  SCAN QR CODE",
                onClick = onScanQr,
                modifier = Modifier
                    .fillMaxWidth(0.75f)
                    .height(56.dp)
            )

            Spacer(Modifier.height(16.dp))

            // Secondary action
            PixelButton(
                text = "#  ENTER CODE",
                onClick = onEnterCode,
                modifier = Modifier
                    .fillMaxWidth(0.75f)
                    .height(52.dp),
                color = TextSecondary
            )

            Spacer(Modifier.height(48.dp))

            Text(
                "Web UI → Settings → Pair Device",
                style = MaterialTheme.typography.labelSmall,
                color = TextSecondary,
                textAlign = TextAlign.Center
            )

            Spacer(Modifier.height(24.dp))

            TextButton(onClick = onLoginManual) {
                Text(
                    "login with password",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextSecondary.copy(alpha = 0.5f)
                )
            }
        }
    }
}

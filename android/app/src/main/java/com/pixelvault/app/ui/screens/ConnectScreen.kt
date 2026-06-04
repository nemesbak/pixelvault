package com.pixelvault.app.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pixelvault.app.ui.components.PixelButton
import com.pixelvault.app.ui.theme.*

@Composable
fun ConnectScreen(
    onScanQr: () -> Unit,
    onEnterCode: () -> Unit
) {
    val blink by rememberInfiniteTransition(label = "blink").animateFloat(
        initialValue = 1f, targetValue = 0f,
        animationSpec = infiniteRepeatable(tween(500), RepeatMode.Reverse),
        label = "cursor"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .padding(horizontal = 36.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // ── Logo ──────────────────────────────────────────────────────────
        Text(
            "PIXEL",
            fontFamily = FontFamily.Monospace,
            fontSize = 30.sp,
            letterSpacing = 10.sp,
            color = NeonGreen
        )
        Text(
            "VAULT",
            fontFamily = FontFamily.Monospace,
            fontSize = 30.sp,
            letterSpacing = 10.sp,
            color = NeonGreen
        )

        Spacer(Modifier.height(10.dp))
        Text(
            "▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰",
            fontSize = 6.sp,
            color = NeonGreen.copy(alpha = 0.25f)
        )
        Spacer(Modifier.height(10.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("v0.2.0", fontFamily = FontFamily.Monospace, fontSize = 10.sp, color = TextSecondary)
            Spacer(Modifier.width(8.dp))
            Text("█", fontFamily = FontFamily.Monospace, fontSize = 10.sp,
                color = NeonGreen, modifier = Modifier.alpha(blink))
        }

        Spacer(Modifier.height(64.dp))

        // ── Botones ───────────────────────────────────────────────────────
        PixelButton(
            text = "▶  SCAN QR CODE",
            onClick = onScanQr,
            modifier = Modifier.fillMaxWidth().height(62.dp)
        )

        Spacer(Modifier.height(16.dp))

        PixelButton(
            text = "#  ENTER CODE",
            onClick = onEnterCode,
            modifier = Modifier.fillMaxWidth().height(58.dp),
            color = TextSecondary
        )

        Spacer(Modifier.height(52.dp))

        // ── Instrucción ───────────────────────────────────────────────────
        Text(
            "Web UI  →  Settings  →  Pair Device",
            fontFamily = FontFamily.Monospace,
            fontSize = 8.sp,
            color = TextSecondary,
            textAlign = TextAlign.Center
        )
    }
}

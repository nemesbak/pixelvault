package com.pixelvault.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val PixelColorScheme = darkColorScheme(
    primary          = NeonGreen,
    onPrimary        = DarkBg,
    primaryContainer = GreenDim,
    onPrimaryContainer = NeonGreen,
    secondary        = NeonGreen,
    onSecondary      = DarkBg,
    background       = DarkBg,
    onBackground     = NeonGreen,
    surface          = DarkSurface,
    onSurface        = NeonGreen,
    surfaceVariant   = DarkCard,
    onSurfaceVariant = TextSecondary,
    error            = ErrorRed,
    onError          = DarkBg,
    outline          = NeonGreen,
)

@Composable
fun PixelVaultTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = PixelColorScheme,
        typography  = PixelTypography,
        content     = content
    )
}

package com.pixelvault.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.sp

// Press Start 2P bundled as asset — add the TTF to res/font/ to enable.
// Falls back to system monospace which keeps the retro terminal look.
val PressStart2P = FontFamily.Monospace

val PixelTypography = Typography(
    displayLarge   = TextStyle(fontFamily = PressStart2P, fontSize = 22.sp,  color = TextPrimary,   letterSpacing = 2.sp),
    headlineLarge  = TextStyle(fontFamily = PressStart2P, fontSize = 16.sp,  color = TextPrimary),
    headlineMedium = TextStyle(fontFamily = PressStart2P, fontSize = 12.sp,  color = TextPrimary),
    titleLarge     = TextStyle(fontFamily = PressStart2P, fontSize = 10.sp,  color = TextPrimary),
    titleMedium    = TextStyle(fontFamily = PressStart2P, fontSize = 9.sp,   color = TextPrimary),
    bodyLarge      = TextStyle(fontFamily = PressStart2P, fontSize = 9.sp,   color = TextPrimary),
    bodyMedium     = TextStyle(fontFamily = PressStart2P, fontSize = 8.sp,   color = TextSecondary),
    labelSmall     = TextStyle(fontFamily = PressStart2P, fontSize = 7.sp,   color = TextSecondary),
)

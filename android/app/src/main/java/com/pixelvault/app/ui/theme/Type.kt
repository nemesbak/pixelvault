package com.pixelvault.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.googlefonts.Font
import androidx.compose.ui.text.googlefonts.GoogleFont
import androidx.compose.ui.unit.sp
import com.pixelvault.app.R

val fontProvider = GoogleFont.Provider(
    providerAuthority = "com.google.android.gms.fonts",
    providerPackage = "com.google.android.gms",
    certificates = R.array.com_google_android_gms_fonts_certs
)

val PressStart2P = FontFamily(
    Font(googleFont = GoogleFont("Press Start 2P"), fontProvider = fontProvider)
)

val PixelTypography = Typography(
    displayLarge  = TextStyle(fontFamily = PressStart2P, fontSize = 18.sp, color = TextPrimary),
    headlineLarge = TextStyle(fontFamily = PressStart2P, fontSize = 14.sp, color = TextPrimary),
    headlineMedium= TextStyle(fontFamily = PressStart2P, fontSize = 11.sp, color = TextPrimary),
    titleLarge    = TextStyle(fontFamily = PressStart2P, fontSize = 10.sp, color = TextPrimary),
    titleMedium   = TextStyle(fontFamily = PressStart2P, fontSize = 8.sp,  color = TextPrimary),
    bodyLarge     = TextStyle(fontFamily = PressStart2P, fontSize = 8.sp,  color = TextPrimary),
    bodyMedium    = TextStyle(fontFamily = PressStart2P, fontSize = 7.sp,  color = TextSecondary),
    labelSmall    = TextStyle(fontFamily = PressStart2P, fontSize = 6.sp,  color = TextSecondary),
)

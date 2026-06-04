package com.pixelvault.app.ui.components

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.pixelvault.app.ui.theme.*

val PixelShape = RoundedCornerShape(0.dp)

fun Modifier.pixelBorder(color: Color = NeonGreen, width: Dp = 2.dp): Modifier =
    this.border(width, color, PixelShape)

@Composable
fun PixelButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    color: Color = NeonGreen
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        shape = PixelShape,
        colors = ButtonDefaults.buttonColors(
            containerColor = Color.Transparent,
            contentColor = color,
            disabledContainerColor = Color.Transparent,
            disabledContentColor = TextSecondary
        ),
        modifier = modifier
            .then(if (enabled) Modifier.pixelBorder(color) else Modifier.pixelBorder(TextSecondary))
    ) {
        Text(text, style = MaterialTheme.typography.bodyLarge)
    }
}

@Composable
fun PixelTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    singleLine: Boolean = true,
    enabled: Boolean = true
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, style = MaterialTheme.typography.labelSmall) },
        modifier = modifier,
        visualTransformation = visualTransformation,
        keyboardOptions = keyboardOptions,
        keyboardActions = keyboardActions,
        singleLine = singleLine,
        enabled = enabled,
        shape = PixelShape,
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = NeonGreen,
            unfocusedBorderColor = TextSecondary,
            focusedLabelColor = NeonGreen,
            unfocusedLabelColor = TextSecondary,
            cursorColor = NeonGreen,
            focusedTextColor = NeonGreen,
            unfocusedTextColor = NeonGreen,
        )
    )
}

@Composable
fun PixelCard(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = modifier.pixelBorder(),
        shape = PixelShape,
        colors = CardDefaults.cardColors(containerColor = DarkCard)
    ) {
        Column(content = content)
    }
}

@Composable
fun PixelLoading(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = NeonGreen, strokeWidth = 2.dp)
    }
}

@Composable
fun PixelError(message: String, onRetry: (() -> Unit)? = null) {
    Column(
        Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("[ ERROR ]", style = MaterialTheme.typography.headlineMedium, color = ErrorRed)
        Spacer(Modifier.height(16.dp))
        Text(message, style = MaterialTheme.typography.bodyMedium, color = ErrorRed)
        onRetry?.let {
            Spacer(Modifier.height(24.dp))
            PixelButton("RETRY", onClick = it)
        }
    }
}

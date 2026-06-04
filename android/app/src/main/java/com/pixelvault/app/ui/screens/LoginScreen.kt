package com.pixelvault.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.pixelvault.app.ui.components.*
import com.pixelvault.app.ui.theme.*
import com.pixelvault.app.viewmodel.AppViewModel

@Composable
fun LoginScreen(
    viewModel: AppViewModel,
    onLoggedIn: () -> Unit,
    onPair: () -> Unit
) {
    val state by viewModel.state.collectAsState()
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isRegister by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    Box(
        Modifier
            .fillMaxSize()
            .background(DarkBg)
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {

            Text(
                if (isRegister) "NEW ACCOUNT" else "LOGIN",
                style = MaterialTheme.typography.headlineLarge
            )

            Spacer(Modifier.height(8.dp))
            Text(state.serverUrl, style = MaterialTheme.typography.labelSmall, color = TextSecondary)

            Spacer(Modifier.height(40.dp))

            PixelTextField(
                value = username,
                onValueChange = { username = it; error = null },
                label = "USERNAME",
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(Modifier.height(16.dp))

            PixelTextField(
                value = password,
                onValueChange = { password = it; error = null },
                label = "PASSWORD",
                modifier = Modifier.fillMaxWidth(),
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
            )

            error?.let {
                Spacer(Modifier.height(8.dp))
                Text(it, style = MaterialTheme.typography.labelSmall, color = ErrorRed)
            }

            Spacer(Modifier.height(24.dp))

            PixelButton(
                text = if (state.isLoading) "..." else if (isRegister) "CREATE ACCOUNT" else "LOGIN",
                onClick = {
                    error = null
                    val cb: (Boolean, String?) -> Unit = { ok, msg ->
                        if (ok) onLoggedIn() else error = msg
                    }
                    if (isRegister) viewModel.register(username, password, cb)
                    else viewModel.login(username, password, cb)
                },
                enabled = !state.isLoading && username.isNotBlank() && password.length >= 4,
                modifier = Modifier.fillMaxWidth().height(52.dp)
            )

            Spacer(Modifier.height(16.dp))

            TextButton(onClick = { isRegister = !isRegister; error = null }) {
                Text(
                    if (isRegister) "Already have an account? LOGIN" else "New here? CREATE ACCOUNT",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextSecondary,
                    textAlign = TextAlign.Center
                )
            }

            Spacer(Modifier.height(8.dp))

            TextButton(onClick = onPair) {
                Text(
                    "PAIR WITH CODE / QR",
                    style = MaterialTheme.typography.labelSmall,
                    color = NeonGreen
                )
            }
        }
    }
}

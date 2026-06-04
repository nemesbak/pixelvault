package com.pixelvault.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    viewModel: AppViewModel,
    onLoggedIn: () -> Unit,
    onBack: () -> Unit
) {
    val state by viewModel.state.collectAsState()
    var serverUrl by remember { mutableStateOf(state.serverUrl.ifBlank { "http://" }) }
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isRegister by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var serverVerified by remember { mutableStateOf(state.serverUrl.isNotBlank()) }

    Scaffold(
        containerColor = DarkBg,
        topBar = {
            TopAppBar(
                title = { Text(if (isRegister) "NEW ACCOUNT" else "LOGIN", style = MaterialTheme.typography.titleMedium) },
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
                .padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Server URL (advanced / manual path)
            if (!serverVerified) {
                Text("SERVER URL", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(12.dp))
                PixelTextField(
                    value = serverUrl,
                    onValueChange = { serverUrl = it; error = null },
                    label = "http://192.168.x.x:3000",
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(12.dp))
                PixelButton(
                    text = if (state.isLoading) "..." else "CONNECT",
                    onClick = {
                        viewModel.verifyServer(serverUrl) { ok, msg ->
                            if (ok) serverVerified = true else error = msg
                        }
                    },
                    enabled = !state.isLoading && serverUrl.startsWith("http"),
                    modifier = Modifier.fillMaxWidth().height(48.dp)
                )
            } else {
                // Credentials
                Text(state.serverUrl, style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                Spacer(Modifier.height(32.dp))

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
                Spacer(Modifier.height(24.dp))
                PixelButton(
                    text = if (state.isLoading) "..." else if (isRegister) "CREATE ACCOUNT" else "LOGIN",
                    onClick = {
                        error = null
                        val cb: (Boolean, String?) -> Unit = { ok, msg -> if (ok) onLoggedIn() else error = msg }
                        if (isRegister) viewModel.register(username, password, cb)
                        else viewModel.login(username, password, cb)
                    },
                    enabled = !state.isLoading && username.isNotBlank() && password.length >= 4,
                    modifier = Modifier.fillMaxWidth().height(52.dp)
                )
                Spacer(Modifier.height(12.dp))
                TextButton(onClick = { isRegister = !isRegister; error = null }) {
                    Text(
                        if (isRegister) "already have an account? login" else "new here? create account",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary,
                        textAlign = TextAlign.Center
                    )
                }
            }

            error?.let {
                Spacer(Modifier.height(12.dp))
                Text(it, style = MaterialTheme.typography.labelSmall, color = ErrorRed, textAlign = TextAlign.Center)
            }
        }
    }
}

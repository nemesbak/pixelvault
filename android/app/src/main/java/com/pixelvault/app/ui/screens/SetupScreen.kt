package com.pixelvault.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.pixelvault.app.ui.components.*
import com.pixelvault.app.ui.theme.*
import com.pixelvault.app.viewmodel.AppViewModel

@Composable
fun SetupScreen(viewModel: AppViewModel, onConnected: () -> Unit) {
    val state by viewModel.state.collectAsState()
    var url by remember { mutableStateOf(state.serverUrl.ifBlank { "http://192.168.1." }) }
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
                "PIXEL\nVAULT",
                style = MaterialTheme.typography.displayLarge,
                textAlign = TextAlign.Center,
                color = NeonGreen
            )

            Spacer(Modifier.height(8.dp))
            Text("v0.1.0", style = MaterialTheme.typography.labelSmall, color = TextSecondary)

            Spacer(Modifier.height(48.dp))
            Text("SERVER URL", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(12.dp))

            PixelTextField(
                value = url,
                onValueChange = { url = it; error = null },
                label = "http://ip:3000",
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Uri,
                    imeAction = ImeAction.Done
                ),
                keyboardActions = KeyboardActions(onDone = { connect(viewModel, url, onConnected) { error = it } })
            )

            error?.let {
                Spacer(Modifier.height(8.dp))
                Text(it, style = MaterialTheme.typography.labelSmall, color = ErrorRed)
            }

            Spacer(Modifier.height(24.dp))

            PixelButton(
                text = if (state.isLoading) "CONNECTING..." else "CONNECT",
                onClick = { connect(viewModel, url, onConnected) { error = it } },
                enabled = !state.isLoading && url.isNotBlank(),
                modifier = Modifier.fillMaxWidth().height(52.dp)
            )

            Spacer(Modifier.height(32.dp))
            Text(
                "Point to your PixelVault server.\nLocal network: http://192.168.x.x:3000",
                style = MaterialTheme.typography.labelSmall,
                color = TextSecondary,
                textAlign = TextAlign.Center
            )
        }
    }
}

private fun connect(vm: AppViewModel, url: String, onOk: () -> Unit, onErr: (String) -> Unit) {
    if (!url.startsWith("http")) { onErr("URL must start with http:// or https://"); return }
    vm.verifyServer(url) { ok, msg ->
        if (ok) onOk() else onErr(msg ?: "Connection failed")
    }
}

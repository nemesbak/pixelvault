package com.pixelvault.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.pixelvault.app.data.MediaItem
import com.pixelvault.app.ui.components.*
import com.pixelvault.app.ui.theme.*
import com.pixelvault.app.viewmodel.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryScreen(viewModel: AppViewModel, onPlay: (String) -> Unit, onLogout: () -> Unit) {
    val state by viewModel.state.collectAsState()
    var search by remember { mutableStateOf("") }
    var searchOpen by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { viewModel.loadMedia() }
    LaunchedEffect(search) {
        kotlinx.coroutines.delay(400)
        viewModel.loadMedia(search)
    }

    Scaffold(
        containerColor = DarkBg,
        topBar = {
            TopAppBar(
                title = {
                    if (searchOpen) {
                        OutlinedTextField(
                            value = search,
                            onValueChange = { search = it },
                            placeholder = { Text("SEARCH...", style = MaterialTheme.typography.labelSmall, color = TextSecondary) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = NeonGreen,
                                unfocusedBorderColor = TextSecondary,
                                focusedTextColor = NeonGreen,
                                unfocusedTextColor = NeonGreen,
                                cursorColor = NeonGreen
                            ),
                            modifier = Modifier.fillMaxWidth().height(48.dp)
                        )
                    } else {
                        Text("PIXELVAULT", style = MaterialTheme.typography.titleLarge)
                    }
                },
                actions = {
                    IconButton(onClick = {
                        searchOpen = !searchOpen
                        if (!searchOpen) { search = ""; viewModel.loadMedia() }
                    }) {
                        Icon(if (searchOpen) Icons.Default.Close else Icons.Default.Search, null, tint = NeonGreen)
                    }
                    IconButton(onClick = { viewModel.loadMedia(search.ifBlank { null }) }) {
                        Icon(Icons.Default.Refresh, null, tint = NeonGreen)
                    }
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Default.ExitToApp, null, tint = TextSecondary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkBg)
            )
        }
    ) { padding ->
        Box(Modifier.fillMaxSize().background(DarkBg).padding(padding)) {
            when {
                state.isLoading && state.media.isEmpty() -> PixelLoading()
                state.error != null -> PixelError(state.error!!) { viewModel.loadMedia() }
                state.media.isEmpty() -> EmptyLibrary()
                else -> MediaGrid(
                    items = state.media,
                    thumbnailUrl = { viewModel.thumbnailUrl(it) },
                    onPlay = onPlay
                )
            }
        }
    }
}

@Composable
private fun MediaGrid(
    items: List<MediaItem>,
    thumbnailUrl: (String?) -> String?,
    onPlay: (String) -> Unit
) {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(160.dp),
        contentPadding = PaddingValues(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(items, key = { it.id }) { item ->
            MediaCard(item = item, thumbnailUrl = thumbnailUrl(item.thumbnail), onClick = { onPlay(item.id) })
        }
    }
}

@Composable
private fun MediaCard(item: MediaItem, thumbnailUrl: String?, onClick: () -> Unit) {
    Box(
        Modifier
            .aspectRatio(16f / 9f)
            .pixelBorder()
            .background(DarkCard)
            .clickable(onClick = onClick)
    ) {
        if (thumbnailUrl != null) {
            AsyncImage(
                model = thumbnailUrl,
                contentDescription = item.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        }
        Box(
            Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .background(DarkBg.copy(alpha = 0.85f))
                .padding(6.dp)
        ) {
            Column {
                Text(
                    item.title,
                    style = MaterialTheme.typography.labelSmall,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    color = NeonGreen
                )
                item.duration?.let {
                    Text(formatDuration(it), style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                }
            }
        }
    }
}

@Composable
private fun EmptyLibrary() {
    Column(
        Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("[ NO FILES ]", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(16.dp))
        Text("Put videos in your media folder\nand press SCAN on the web UI.",
            style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
    }
}

private fun formatDuration(seconds: Int): String {
    val h = seconds / 3600
    val m = (seconds % 3600) / 60
    val s = seconds % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, s) else "%d:%02d".format(m, s)
}

package com.pixelvault.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.pixelvault.app.data.Show
import com.pixelvault.app.ui.components.*
import com.pixelvault.app.ui.theme.*
import com.pixelvault.app.viewmodel.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryScreen(
    viewModel: AppViewModel,
    onShowClick: (Show) -> Unit,
    onLogout: () -> Unit
) {
    val state by viewModel.state.collectAsState()
    var search by remember { mutableStateOf("") }
    var searchOpen by remember { mutableStateOf(false) }
    var activeFilter by remember { mutableStateOf<String?>(null) } // null=all, "movie", "series"

    LaunchedEffect(Unit) { viewModel.loadShows() }
    LaunchedEffect(search) {
        kotlinx.coroutines.delay(400)
        viewModel.loadShows(type = activeFilter, search = search)
    }
    LaunchedEffect(activeFilter) {
        viewModel.loadShows(type = activeFilter, search = search.ifBlank { null })
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
                        if (!searchOpen) { search = ""; viewModel.loadShows(type = activeFilter) }
                    }) {
                        Icon(if (searchOpen) Icons.Default.Close else Icons.Default.Search, null, tint = NeonGreen)
                    }
                    IconButton(onClick = { viewModel.loadShows(type = activeFilter, search = search.ifBlank { null }) }) {
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
        Column(
            Modifier
                .fillMaxSize()
                .background(DarkBg)
                .padding(padding)
        ) {
            // ── Filter tabs ──────────────────────────────────────────────────
            FilterRow(activeFilter) { activeFilter = it }

            // ── Content ──────────────────────────────────────────────────────
            Box(Modifier.fillMaxSize()) {
                when {
                    state.isLoading && state.shows.isEmpty() -> PixelLoading()
                    state.error != null -> PixelError(state.error!!) { viewModel.loadShows(type = activeFilter) }
                    state.shows.isEmpty() -> EmptyLibrary()
                    else -> ShowGrid(
                        shows = state.shows,
                        posterUrl = { viewModel.thumbnailUrl(it) },
                        onClick = onShowClick
                    )
                }
            }
        }
    }
}

@Composable
private fun FilterRow(active: String?, onSelect: (String?) -> Unit) {
    val filters = listOf(null to "ALL", "movie" to "MOVIES", "series" to "SERIES")
    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        filters.forEach { (value, label) ->
            val selected = active == value
            Box(
                Modifier
                    .border(1.dp, if (selected) NeonGreen else TextSecondary.copy(alpha = 0.4f), PixelShape)
                    .background(if (selected) NeonGreen.copy(alpha = 0.12f) else DarkCard)
                    .clickable { onSelect(value) }
                    .padding(horizontal = 14.dp, vertical = 6.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    label,
                    style = MaterialTheme.typography.labelSmall,
                    fontSize = 9.sp,
                    color = if (selected) NeonGreen else TextSecondary
                )
            }
        }
    }
}

@Composable
private fun ShowGrid(
    shows: List<Show>,
    posterUrl: (String?) -> String?,
    onClick: (Show) -> Unit
) {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(130.dp),
        contentPadding = PaddingValues(8.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(shows, key = { it.id }) { show ->
            ShowCard(show = show, posterUrl = posterUrl(show.poster), onClick = { onClick(show) })
        }
    }
}

@Composable
private fun ShowCard(show: Show, posterUrl: String?, onClick: () -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Poster (portrait 2:3)
        Box(
            Modifier
                .fillMaxWidth()
                .aspectRatio(2f / 3f)
                .pixelBorder()
                .background(DarkCard)
        ) {
            if (posterUrl != null) {
                AsyncImage(
                    model = posterUrl,
                    contentDescription = show.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            } else {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        show.title.take(2).uppercase(),
                        style = MaterialTheme.typography.headlineMedium,
                        color = NeonGreen.copy(alpha = 0.4f)
                    )
                }
            }

            // Type badge
            Box(
                Modifier
                    .align(Alignment.TopEnd)
                    .padding(4.dp)
                    .background(if (show.type == "series") DarkBg.copy(alpha = 0.85f) else NeonGreen.copy(alpha = 0.15f))
                    .padding(horizontal = 4.dp, vertical = 2.dp)
            ) {
                Text(
                    if (show.type == "series") "TV" else "MV",
                    style = MaterialTheme.typography.labelSmall,
                    fontSize = 7.sp,
                    color = if (show.type == "series") TextSecondary else NeonGreen
                )
            }

            // Episode count for series
            if (show.type == "series" && show.item_count > 0) {
                Box(
                    Modifier
                        .align(Alignment.BottomStart)
                        .padding(4.dp)
                        .background(DarkBg.copy(alpha = 0.85f))
                        .padding(horizontal = 4.dp, vertical = 2.dp)
                ) {
                    Text(
                        "${show.item_count} ep",
                        style = MaterialTheme.typography.labelSmall,
                        fontSize = 7.sp,
                        color = TextSecondary
                    )
                }
            }
        }

        Spacer(Modifier.height(4.dp))

        // Title
        Text(
            show.title,
            style = MaterialTheme.typography.labelSmall,
            fontSize = 8.sp,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
            color = NeonGreen,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 2.dp)
        )

        // Year
        show.first_air_date?.take(4)?.let { year ->
            Text(year, style = MaterialTheme.typography.labelSmall, fontSize = 7.sp, color = TextSecondary)
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
        Text(
            "Put videos in your media folder\nand press SCAN on the web UI.",
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary,
            textAlign = TextAlign.Center
        )
    }
}

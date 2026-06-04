package com.pixelvault.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.pixelvault.app.data.MediaItem
import com.pixelvault.app.ui.components.*
import com.pixelvault.app.ui.theme.*
import com.pixelvault.app.viewmodel.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShowDetailScreen(
    showId: String,
    viewModel: AppViewModel,
    onPlay: (String) -> Unit,
    onBack: () -> Unit
) {
    val state by viewModel.state.collectAsState()
    val show = state.showDetail

    LaunchedEffect(showId) { viewModel.loadShowDetail(showId) }

    Scaffold(
        containerColor = DarkBg,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        show?.title ?: "...",
                        style = MaterialTheme.typography.titleMedium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                },
                navigationIcon = {
                    IconButton(onClick = { viewModel.clearShowDetail(); onBack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = NeonGreen)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkBg)
            )
        }
    ) { padding ->
        Box(Modifier.fillMaxSize().background(DarkBg).padding(padding)) {
            when {
                state.isLoading && show == null -> PixelLoading()
                state.error != null && show == null -> PixelError(state.error!!) {
                    viewModel.loadShowDetail(showId)
                }
                show != null -> ShowContent(
                    show = show,
                    posterUrl = viewModel.thumbnailUrl(show.poster),
                    thumbnailUrl = { viewModel.thumbnailUrl(it) },
                    onPlay = onPlay
                )
            }
        }
    }
}

@Composable
private fun ShowContent(
    show: com.pixelvault.app.data.ShowDetail,
    posterUrl: String?,
    thumbnailUrl: (String?) -> String?,
    onPlay: (String) -> Unit
) {
    val grouped = show.episodes.groupBy { it.season ?: 0 }.toSortedMap()

    LazyColumn(
        contentPadding = PaddingValues(bottom = 24.dp)
    ) {
        // ── Header ──────────────────────────────────────────────────────────
        item {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Poster
                Box(
                    Modifier
                        .width(90.dp)
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
                    }
                }

                // Metadata
                Column(Modifier.weight(1f)) {
                    show.first_air_date?.take(4)?.let {
                        Text(it, style = MaterialTheme.typography.labelSmall, fontSize = 8.sp, color = TextSecondary)
                    }
                    show.vote_average?.toFloatOrNull()?.let { score ->
                        Text(
                            "★ ${"%.1f".format(score)}",
                            style = MaterialTheme.typography.labelSmall,
                            fontSize = 8.sp,
                            color = NeonGreen
                        )
                    }
                    Spacer(Modifier.height(8.dp))
                    if (show.overview?.isNotBlank() == true) {
                        Text(
                            show.overview,
                            style = MaterialTheme.typography.labelSmall,
                            fontSize = 8.sp,
                            color = TextSecondary,
                            maxLines = 6,
                            overflow = TextOverflow.Ellipsis,
                            lineHeight = 13.sp
                        )
                    }
                }
            }

            // Divider
            Box(Modifier.fillMaxWidth().height(1.dp).background(NeonGreen.copy(alpha = 0.15f)))
        }

        // ── Episodes by season ───────────────────────────────────────────────
        grouped.forEach { (season, episodes) ->
            item {
                // Season header
                val label = if (season == 0) "EPISODIOS" else "TEMPORADA $season"
                Text(
                    label,
                    style = MaterialTheme.typography.labelSmall,
                    fontSize = 9.sp,
                    color = NeonGreen,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                )
            }
            items(episodes, key = { it.id }) { ep ->
                EpisodeRow(ep, thumbnailUrl(ep.thumbnail), onClick = { onPlay(ep.id) })
            }
        }
    }
}

@Composable
private fun EpisodeRow(ep: MediaItem, thumbnailUrl: String?, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Thumbnail
        Box(
            Modifier
                .width(110.dp)
                .aspectRatio(16f / 9f)
                .pixelBorder()
                .background(DarkCard)
        ) {
            if (thumbnailUrl != null) {
                AsyncImage(
                    model = thumbnailUrl,
                    contentDescription = ep.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            }
            // Episode number overlay
            ep.episode?.let { num ->
                Box(
                    Modifier
                        .align(Alignment.BottomStart)
                        .background(DarkBg.copy(alpha = 0.85f))
                        .padding(horizontal = 4.dp, vertical = 2.dp)
                ) {
                    val epLabel = if (ep.season != null) "S%02dE%02d".format(ep.season, num)
                                  else "E%02d".format(num)
                    Text(epLabel, style = MaterialTheme.typography.labelSmall, fontSize = 7.sp, color = NeonGreen)
                }
            }
        }

        // Info
        Column(Modifier.weight(1f)) {
            val displayTitle = ep.episode_title?.takeIf { it.isNotBlank() && it != "Episodio ${ep.episode}" }
                ?: ep.title
            Text(
                displayTitle,
                style = MaterialTheme.typography.labelSmall,
                fontSize = 9.sp,
                color = NeonGreen,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            ep.duration?.let {
                Spacer(Modifier.height(4.dp))
                Text(formatDuration(it), style = MaterialTheme.typography.labelSmall, fontSize = 8.sp, color = TextSecondary)
            }
        }
    }

    Box(Modifier.fillMaxWidth().padding(horizontal = 12.dp).height(1.dp).background(TextSecondary.copy(alpha = 0.1f)))
}

private fun formatDuration(seconds: Int): String {
    val h = seconds / 3600
    val m = (seconds % 3600) / 60
    val s = seconds % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, s) else "%d:%02d".format(m, s)
}

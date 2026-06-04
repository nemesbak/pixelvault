package com.pixelvault.app.ui.screens

import androidx.annotation.OptIn
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.pixelvault.app.ui.theme.*
import com.pixelvault.app.ui.util.formatDuration
import com.pixelvault.app.viewmodel.AppViewModel
import kotlinx.coroutines.delay

@OptIn(UnstableApi::class)
@Composable
fun PlayerScreen(mediaId: String, viewModel: AppViewModel, onBack: () -> Unit) {
    val state by viewModel.state.collectAsState()
    val mediaItem = state.media.find { it.id == mediaId }
    val context = LocalContext.current

    var controlsVisible by remember { mutableStateOf(true) }
    var isPlaying by remember { mutableStateOf(true) }
    var currentPos by remember { mutableStateOf(0L) }
    var duration by remember { mutableStateOf(0L) }

    val exoPlayer = remember {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(viewModel.streamUrl(mediaId)))
            prepare()
            playWhenReady = true
        }
    }

    // Hide controls after 3 seconds of inactivity
    LaunchedEffect(controlsVisible, isPlaying) {
        if (controlsVisible && isPlaying) {
            delay(3_000)
            controlsVisible = false
        }
    }

    // Poll position + save progress every 10s
    LaunchedEffect(exoPlayer) {
        while (true) {
            delay(1_000)
            currentPos = exoPlayer.currentPosition
            duration = exoPlayer.duration.coerceAtLeast(0)
            isPlaying = exoPlayer.isPlaying
        }
    }
    LaunchedEffect(exoPlayer) {
        while (true) {
            delay(10_000)
            val posSec = (exoPlayer.currentPosition / 1000).toInt()
            val durSec = (exoPlayer.duration / 1000).coerceAtLeast(0).toInt()
            if (posSec > 5) viewModel.saveProgress(mediaId, posSec, durSec)
        }
    }

    DisposableEffect(Unit) {
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_ENDED) {
                    val durSec = (exoPlayer.duration / 1000).toInt()
                    viewModel.saveProgress(mediaId, durSec, durSec)
                }
            }
        }
        exoPlayer.addListener(listener)
        onDispose {
            exoPlayer.removeListener(listener)
            val posSec = (exoPlayer.currentPosition / 1000).toInt()
            val durSec = (exoPlayer.duration / 1000).coerceAtLeast(0).toInt()
            if (posSec > 5) viewModel.saveProgress(mediaId, posSec, durSec)
            exoPlayer.release()
        }
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black)
            .clickable { controlsVisible = !controlsVisible }
    ) {
        // Video surface
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    player = exoPlayer
                    useController = false
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        // Pixel-art overlay controls
        AnimatedVisibility(
            visible = controlsVisible,
            enter = fadeIn(),
            exit = fadeOut()
        ) {
            Box(Modifier.fillMaxSize()) {
                // Top bar
                Row(
                    Modifier
                        .fillMaxWidth()
                        .background(DarkBg.copy(alpha = 0.75f))
                        .padding(horizontal = 12.dp, vertical = 10.dp)
                        .align(Alignment.TopCenter),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, null, tint = NeonGreen)
                    }
                    Text(
                        mediaItem?.title ?: "PLAYING",
                        style = MaterialTheme.typography.bodyLarge,
                        color = NeonGreen,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f).padding(start = 4.dp)
                    )
                }

                // Bottom controls
                Column(
                    Modifier
                        .fillMaxWidth()
                        .background(DarkBg.copy(alpha = 0.75f))
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                        .align(Alignment.BottomCenter)
                ) {
                    // Seek bar
                    val progress = if (duration > 0) currentPos.toFloat() / duration else 0f
                    Slider(
                        value = progress,
                        onValueChange = { frac ->
                            exoPlayer.seekTo((frac * duration).toLong())
                        },
                        colors = SliderDefaults.colors(
                            thumbColor = NeonGreen,
                            activeTrackColor = NeonGreen,
                            inactiveTrackColor = TextSecondary
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(
                        Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            formatDuration((currentPos / 1000).toInt()),
                            style = MaterialTheme.typography.labelSmall,
                            color = NeonGreen
                        )
                        Spacer(Modifier.weight(1f))

                        // Rewind 10s
                        IconButton(onClick = { exoPlayer.seekTo((exoPlayer.currentPosition - 10_000).coerceAtLeast(0)) }) {
                            Icon(Icons.Default.Replay10, null, tint = NeonGreen)
                        }

                        // Play/Pause
                        IconButton(onClick = {
                            if (exoPlayer.isPlaying) exoPlayer.pause() else exoPlayer.play()
                            controlsVisible = true
                        }) {
                            Icon(
                                if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                                null,
                                tint = NeonGreen,
                                modifier = Modifier.size(36.dp)
                            )
                        }

                        // Forward 10s
                        IconButton(onClick = { exoPlayer.seekTo(exoPlayer.currentPosition + 10_000) }) {
                            Icon(Icons.Default.Forward10, null, tint = NeonGreen)
                        }

                        Spacer(Modifier.weight(1f))
                        Text(
                            formatDuration((duration / 1000).toInt()),
                            style = MaterialTheme.typography.labelSmall,
                            color = TextSecondary
                        )
                    }
                }
            }
        }
    }
}

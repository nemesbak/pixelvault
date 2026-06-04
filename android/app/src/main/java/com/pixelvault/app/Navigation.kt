package com.pixelvault.app

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.pixelvault.app.ui.screens.*
import com.pixelvault.app.viewmodel.AppViewModel

@Composable
fun PixelVaultNav(viewModel: AppViewModel) {
    val state by viewModel.state.collectAsState()
    val navController = rememberNavController()

    if (!state.isReady) return

    val start = if (state.token != null) "library" else "connect"

    NavHost(
        navController = navController,
        startDestination = start,
        modifier = Modifier.fillMaxSize()
    ) {
        composable("connect") {
            Box(Modifier.fillMaxSize()) {
                ConnectScreen(
                    onScanQr = { navController.navigate("qrscan") },
                    onEnterCode = { navController.navigate("codeentry") }
                )
            }
        }

        composable("qrscan") {
            Box(Modifier.fillMaxSize()) {
                QrScanScreen(
                    viewModel = viewModel,
                    onPaired = {
                        navController.navigate("library") {
                            popUpTo("connect") { inclusive = true }
                        }
                    },
                    onBack = { navController.popBackStack() }
                )
            }
        }

        composable("codeentry") {
            Box(Modifier.fillMaxSize()) {
                PairCodeScreen(
                    viewModel = viewModel,
                    onPaired = {
                        navController.navigate("library") {
                            popUpTo("connect") { inclusive = true }
                        }
                    },
                    onBack = { navController.popBackStack() }
                )
            }
        }

        composable("library") {
            Box(Modifier.fillMaxSize()) {
                LibraryScreen(
                    viewModel = viewModel,
                    onShowClick = { show ->
                        if (show.type == "movie" || show.item_count <= 1) {
                            // Película o show con un solo item → cargar detalle y reproducir
                            viewModel.loadShowDetail(show.id)
                            navController.navigate("show/${show.id}")
                        } else {
                            navController.navigate("show/${show.id}")
                        }
                    },
                    onLogout = {
                        viewModel.logout()
                        navController.navigate("connect") {
                            popUpTo("library") { inclusive = true }
                        }
                    }
                )
            }
        }

        composable(
            "show/{showId}",
            arguments = listOf(navArgument("showId") { type = NavType.StringType })
        ) { back ->
            val showId = back.arguments?.getString("showId") ?: return@composable
            Box(Modifier.fillMaxSize()) {
                ShowDetailScreen(
                    showId = showId,
                    viewModel = viewModel,
                    onPlay = { mediaId -> navController.navigate("player/$mediaId") },
                    onBack = { navController.popBackStack() }
                )
            }
        }

        composable(
            "player/{mediaId}",
            arguments = listOf(navArgument("mediaId") { type = NavType.StringType })
        ) { back ->
            val mediaId = back.arguments?.getString("mediaId") ?: return@composable
            Box(Modifier.fillMaxSize()) {
                PlayerScreen(
                    mediaId = mediaId,
                    viewModel = viewModel,
                    onBack = { navController.popBackStack() }
                )
            }
        }
    }
}

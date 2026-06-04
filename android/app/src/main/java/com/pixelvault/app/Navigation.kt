package com.pixelvault.app

import androidx.compose.runtime.*
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

    val start = when {
        state.serverUrl.isBlank() -> "setup"
        state.token == null -> "login"
        else -> "library"
    }

    NavHost(navController = navController, startDestination = start) {

        composable("setup") {
            SetupScreen(viewModel = viewModel, onConnected = {
                navController.navigate("login") { popUpTo("setup") { inclusive = true } }
            })
        }

        composable("login") {
            LoginScreen(
                viewModel = viewModel,
                onLoggedIn = {
                    navController.navigate("library") { popUpTo("login") { inclusive = true } }
                },
                onPair = { navController.navigate("pair") }
            )
        }

        composable("pair") {
            PairScreen(
                viewModel = viewModel,
                onPaired = {
                    navController.navigate("library") { popUpTo("login") { inclusive = true } }
                },
                onBack = { navController.popBackStack() }
            )
        }

        composable("library") {
            LibraryScreen(
                viewModel = viewModel,
                onPlay = { id -> navController.navigate("player/$id") },
                onLogout = {
                    viewModel.logout()
                    navController.navigate("login") { popUpTo("library") { inclusive = true } }
                }
            )
        }

        composable(
            "player/{mediaId}",
            arguments = listOf(navArgument("mediaId") { type = NavType.StringType })
        ) { back ->
            val mediaId = back.arguments?.getString("mediaId") ?: return@composable
            PlayerScreen(
                mediaId = mediaId,
                viewModel = viewModel,
                onBack = { navController.popBackStack() }
            )
        }
    }
}

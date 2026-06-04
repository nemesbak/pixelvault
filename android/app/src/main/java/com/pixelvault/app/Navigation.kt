package com.pixelvault.app

import androidx.compose.runtime.*
import androidx.navigation.compose.*
import androidx.navigation.NavType
import androidx.navigation.navArgument
import com.pixelvault.app.ui.screens.*
import com.pixelvault.app.viewmodel.AppViewModel

@Composable
fun PixelVaultNav(viewModel: AppViewModel) {
    val state by viewModel.state.collectAsState()
    val navController = rememberNavController()

    if (!state.isReady) return

    val start = if (state.token != null) "library" else "connect"

    NavHost(navController = navController, startDestination = start) {

        composable("connect") {
            ConnectScreen(
                onScanQr = { navController.navigate("qrscan") },
                onEnterCode = { navController.navigate("codeentry") },
                onLoginManual = { navController.navigate("login") }
            )
        }

        composable("qrscan") {
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

        composable("codeentry") {
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

        composable("login") {
            LoginScreen(
                viewModel = viewModel,
                onLoggedIn = {
                    navController.navigate("library") {
                        popUpTo("connect") { inclusive = true }
                    }
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
                    navController.navigate("connect") {
                        popUpTo("library") { inclusive = true }
                    }
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

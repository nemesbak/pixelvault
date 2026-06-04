package com.pixelvault.app.data

import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String,
    val username: String,
    val is_admin: Boolean = false
)

@Serializable
data class AuthResponse(
    val token: String,
    val user: User,
    val serverUrl: String? = null
)

@Serializable
data class MediaItem(
    val id: String,
    val title: String,
    val duration: Int? = null,
    val thumbnail: String? = null,
    val overview: String? = null,
    val type: String? = "movie",
    val show_id: String? = null,
    val season: Int? = null,
    val episode: Int? = null,
    val episode_title: String? = null
)

@Serializable
data class MediaListResponse(
    val items: List<MediaItem>,
    val total: Int,
    val page: Int,
    val limit: Int
)

@Serializable
data class WatchProgress(
    val position: Int = 0,
    val completed: Boolean = false
)

@Serializable
data class PairResponse(
    val code: String,
    val qr: String,
    val expiresAt: String? = null
)

@Serializable
data class LoginRequest(val username: String, val password: String)

@Serializable
data class ProgressRequest(
    val userId: String,
    val mediaId: String,
    val position: Int,
    val completed: Boolean
)

@Serializable
data class CodeRequest(val code: String)

@Serializable
data class Show(
    val id: String,
    val title: String,
    val type: String,
    val poster: String? = null,
    val overview: String? = null,
    val first_air_date: String? = null,
    val vote_average: String? = null,
    val item_count: Int = 0
)

@Serializable
data class ShowDetail(
    val id: String,
    val title: String,
    val type: String,
    val poster: String? = null,
    val backdrop: String? = null,
    val overview: String? = null,
    val first_air_date: String? = null,
    val vote_average: String? = null,
    val episodes: List<MediaItem> = emptyList()
)

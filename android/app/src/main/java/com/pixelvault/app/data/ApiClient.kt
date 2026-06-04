package com.pixelvault.app.data

import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.android.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.plugins.logging.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json

class ApiClient(private val baseUrl: String, private val token: String? = null) {

    private val http = HttpClient(Android) {
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true; isLenient = true; coerceInputValues = true })
        }
        install(Logging) { level = LogLevel.NONE }
        engine { connectTimeout = 8_000; socketTimeout = 15_000 }
    }

    private fun HttpRequestBuilder.auth() {
        token?.let { header(HttpHeaders.Authorization, "Bearer $it") }
    }

    suspend fun health(): Result<Unit> = runCatching {
        http.get("$baseUrl/api/health")
        Unit
    }

    suspend fun login(username: String, password: String): AuthResponse =
        http.post("$baseUrl/api/users/login") {
            contentType(ContentType.Application.Json)
            setBody(LoginRequest(username, password))
        }.body()

    suspend fun register(username: String, password: String): AuthResponse =
        http.post("$baseUrl/api/users/register") {
            contentType(ContentType.Application.Json)
            setBody(LoginRequest(username, password))
        }.body()

    suspend fun getMedia(page: Int = 1, search: String? = null): MediaListResponse =
        http.get("$baseUrl/api/media") {
            auth()
            parameter("page", page)
            parameter("limit", 50)
            search?.let { parameter("search", it) }
        }.body()

    suspend fun getProgress(userId: String, mediaId: String): WatchProgress =
        runCatching {
            http.get("$baseUrl/api/media/progress/$userId/$mediaId") { auth() }.body<WatchProgress>()
        }.getOrDefault(WatchProgress())

    suspend fun saveProgress(userId: String, mediaId: String, position: Int, completed: Boolean) {
        runCatching {
            http.post("$baseUrl/api/media/progress") {
                auth()
                contentType(ContentType.Application.Json)
                setBody(ProgressRequest(userId, mediaId, position, completed))
            }
        }
    }

    suspend fun getShows(type: String? = null, search: String? = null): List<Show> =
        http.get("$baseUrl/api/shows") {
            auth()
            type?.let { parameter("type", it) }
            search?.let { parameter("search", it) }
        }.body()

    suspend fun getShow(id: String): ShowDetail =
        http.get("$baseUrl/api/shows/$id") { auth() }.body()

    suspend fun generatePairCode(): PairResponse =
        http.post("$baseUrl/api/pair/generate") { auth() }.body()

    suspend fun redeemPairCode(code: String): AuthResponse =
        http.post("$baseUrl/api/pair/redeem") {
            contentType(ContentType.Application.Json)
            setBody(CodeRequest(code))
        }.body()

    fun streamUrl(mediaId: String, token: String? = this.token): String {
        val t = token ?: this.token
        return if (t != null) "$baseUrl/api/stream/$mediaId?token=$t"
        else "$baseUrl/api/stream/$mediaId"
    }

    fun thumbnailUrl(path: String?): String? {
        if (path.isNullOrBlank()) return null
        if (path.startsWith("http")) return path
        val clean = path.trimStart('/')
        return "$baseUrl/thumbnails/$clean"
    }

    fun close() = http.close()
}

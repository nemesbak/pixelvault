package com.pixelvault.app.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.pixelvault.app.data.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class AppState(
    val serverUrl: String   = "",
    val token: String?      = null,
    val userId: String?     = null,
    val username: String?   = null,
    val media: List<MediaItem> = emptyList(),
    val isLoading: Boolean  = false,
    val error: String?      = null,
    val isReady: Boolean    = false  // true once prefs loaded
)

class AppViewModel(app: Application) : AndroidViewModel(app) {

    private val prefs = Prefs(app.applicationContext)
    private val _state = MutableStateFlow(AppState())
    val state: StateFlow<AppState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            combine(prefs.serverUrl, prefs.token, prefs.userId, prefs.username) {
                url, tok, uid, uname -> AppState(
                    serverUrl = url ?: "",
                    token     = tok,
                    userId    = uid,
                    username  = uname,
                    isReady   = true
                )
            }.collect { loaded -> _state.value = loaded }
        }
    }

    private fun api() = ApiClient(_state.value.serverUrl, _state.value.token)

    fun verifyServer(url: String, onResult: (Boolean, String?) -> Unit) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            val result = ApiClient(url.trimEnd('/')).health()
            _state.value = _state.value.copy(isLoading = false)
            if (result.isSuccess) {
                prefs.saveServerUrl(url)
                _state.value = _state.value.copy(serverUrl = url.trimEnd('/'))
                onResult(true, null)
            } else {
                onResult(false, result.exceptionOrNull()?.message ?: "Cannot reach server")
            }
        }
    }

    fun login(username: String, password: String, onResult: (Boolean, String?) -> Unit) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            runCatching { api().login(username, password) }
                .onSuccess { applyAuth(it); onResult(true, null) }
                .onFailure { _state.value = _state.value.copy(isLoading = false, error = it.message); onResult(false, it.message) }
        }
    }

    fun register(username: String, password: String, onResult: (Boolean, String?) -> Unit) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            runCatching { api().register(username, password) }
                .onSuccess { applyAuth(it); onResult(true, null) }
                .onFailure { _state.value = _state.value.copy(isLoading = false, error = it.message); onResult(false, it.message) }
        }
    }

    fun redeemCode(code: String, onResult: (Boolean, String?) -> Unit) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            runCatching { api().redeemPairCode(code.trim().replace("-", "")) }
                .onSuccess { applyAuth(it); onResult(true, null) }
                .onFailure { _state.value = _state.value.copy(isLoading = false, error = it.message); onResult(false, it.message) }
        }
    }

    fun loadMedia(search: String? = null) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            runCatching { api().getMedia(search = search?.ifBlank { null }) }
                .onSuccess { _state.value = _state.value.copy(media = it.items, isLoading = false) }
                .onFailure { _state.value = _state.value.copy(isLoading = false, error = it.message) }
        }
    }

    fun saveProgress(mediaId: String, positionSec: Int, duration: Int) {
        val uid = _state.value.userId ?: return
        val completed = duration > 0 && positionSec >= duration * 0.9
        viewModelScope.launch {
            api().saveProgress(uid, mediaId, positionSec, completed)
        }
    }

    fun streamUrl(mediaId: String) = api().streamUrl(mediaId)

    fun thumbnailUrl(path: String?) = api().thumbnailUrl(path)

    fun logout() {
        viewModelScope.launch {
            prefs.clear()
            _state.value = AppState(isReady = true)
        }
    }

    fun clearError() { _state.value = _state.value.copy(error = null) }

    private suspend fun applyAuth(res: AuthResponse) {
        prefs.saveSession(_state.value.serverUrl, res.token, res.user.id, res.user.username)
        _state.value = _state.value.copy(
            token = res.token, userId = res.user.id,
            username = res.user.username, isLoading = false
        )
    }
}

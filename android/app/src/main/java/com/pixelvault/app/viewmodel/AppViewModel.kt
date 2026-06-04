package com.pixelvault.app.viewmodel

import android.app.Application
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.pixelvault.app.data.*
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

data class AppState(
    val serverUrl: String   = "",
    val token: String?      = null,
    val userId: String?     = null,
    val username: String?   = null,
    val media: List<MediaItem> = emptyList(),
    val shows: List<Show>   = emptyList(),
    val showDetail: ShowDetail? = null,
    val isLoading: Boolean  = false,
    val error: String?      = null,
    val isReady: Boolean    = false
)

class AppViewModel(app: Application) : AndroidViewModel(app) {

    private val prefs = Prefs(app.applicationContext)
    private val nsdManager = app.getSystemService(NsdManager::class.java)

    private val _state = MutableStateFlow(AppState())
    val state: StateFlow<AppState> = _state.asStateFlow()

    private val _isDiscovering = MutableStateFlow(false)
    val isDiscovering: StateFlow<Boolean> = _isDiscovering.asStateFlow()

    private val _discoveredUrl = MutableStateFlow<String?>(null)
    val discoveredUrl: StateFlow<String?> = _discoveredUrl.asStateFlow()

    private var discoveryListener: NsdManager.DiscoveryListener? = null
    private var discoveryTimeoutJob: Job? = null

    init {
        viewModelScope.launch {
            combine(prefs.serverUrl, prefs.token, prefs.userId, prefs.username) { url, tok, uid, uname ->
                AppState(serverUrl = url ?: "", token = tok, userId = uid, username = uname, isReady = true)
            }.collect { _state.value = it }
        }
    }

    // ── Server URL ────────────────────────────────────────────────────────────

    fun setServerUrl(url: String) {
        _state.value = _state.value.copy(serverUrl = url.trimEnd('/'))
        viewModelScope.launch { prefs.saveServerUrl(url) }
    }

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

    // ── mDNS / NSD Discovery ─────────────────────────────────────────────────

    fun startServerDiscovery() {
        if (discoveryListener != null) return
        _isDiscovering.value = true
        _discoveredUrl.value = null

        val listener = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(serviceType: String) {}
            override fun onDiscoveryStopped(serviceType: String) { _isDiscovering.value = false }
            override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
                _isDiscovering.value = false
            }
            override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {}
            override fun onServiceLost(service: NsdServiceInfo) {}
            override fun onServiceFound(service: NsdServiceInfo) {
                nsdManager.resolveService(service, object : NsdManager.ResolveListener {
                    override fun onResolveFailed(service: NsdServiceInfo, errorCode: Int) {}
                    override fun onServiceResolved(service: NsdServiceInfo) {
                        val ip = service.host?.hostAddress ?: return
                        val url = "http://$ip:${service.port}"
                        _discoveredUrl.value = url
                        viewModelScope.launch { prefs.saveServerUrl(url) }
                        _state.value = _state.value.copy(serverUrl = url)
                        discoveryTimeoutJob?.cancel()
                    }
                })
            }
        }

        try {
            nsdManager.discoverServices("_pixelvault._tcp", NsdManager.PROTOCOL_DNS_SD, listener)
            discoveryListener = listener
        } catch (e: Exception) {
            _isDiscovering.value = false
        }

        discoveryTimeoutJob = viewModelScope.launch {
            delay(12_000)
            stopServerDiscovery()
            // Si mDNS no encontró nada, probar gateway del emulador Android (host machine)
            if (_discoveredUrl.value == null && _state.value.serverUrl.isBlank()) {
                probeAndSetUrl("http://10.0.2.2:3000")
            }
        }
    }

    fun probeServer(url: String, onResult: (Boolean) -> Unit = {}) {
        viewModelScope.launch {
            val clean = url.trimEnd('/')
                .let { if (it.startsWith("http")) it else "http://$it" }
            val ok = ApiClient(clean).health().isSuccess
            if (ok) {
                _discoveredUrl.value = clean
                _state.value = _state.value.copy(serverUrl = clean)
                prefs.saveServerUrl(clean)
            }
            onResult(ok)
        }
    }

    private fun probeAndSetUrl(url: String) {
        probeServer(url)
    }

    fun stopServerDiscovery() {
        discoveryTimeoutJob?.cancel()
        discoveryListener?.let {
            try { nsdManager.stopServiceDiscovery(it) } catch (_: Exception) {}
            discoveryListener = null
        }
        _isDiscovering.value = false
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

    fun login(username: String, password: String, onResult: (Boolean, String?) -> Unit) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            runCatching { api().login(username, password) }
                .onSuccess { applyAuth(it); onResult(true, null) }
                .onFailure { _state.value = _state.value.copy(isLoading = false); onResult(false, it.message) }
        }
    }

    fun register(username: String, password: String, onResult: (Boolean, String?) -> Unit) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            runCatching { api().register(username, password) }
                .onSuccess { applyAuth(it); onResult(true, null) }
                .onFailure { _state.value = _state.value.copy(isLoading = false); onResult(false, it.message) }
        }
    }

    fun redeemCode(code: String, onResult: (Boolean, String?) -> Unit) {
        val url = _discoveredUrl.value ?: _state.value.serverUrl
        if (url.isBlank()) { onResult(false, "Server not found yet. Wait for discovery."); return }
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            runCatching { ApiClient(url).redeemPairCode(code.trim()) }
                .onSuccess { stopServerDiscovery(); applyAuth(it); onResult(true, null) }
                .onFailure { _state.value = _state.value.copy(isLoading = false); onResult(false, it.message) }
        }
    }

    fun redeemFederationQr(payload: String, onResult: (Boolean, String?) -> Unit) {
        // payload is base64url JSON: { id, name, ip, port, token, code }
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            runCatching {
                val json = org.json.JSONObject(String(android.util.Base64.decode(
                    payload.replace('-', '+').replace('_', '/'), android.util.Base64.URL_SAFE
                )))
                val url = "http://${json.getString("ip")}:${json.getInt("port")}"
                val code = json.getString("code")
                setServerUrl(url)
                ApiClient(url).redeemPairCode(code)
            }
                .onSuccess { applyAuth(it); onResult(true, null) }
                .onFailure { _state.value = _state.value.copy(isLoading = false); onResult(false, it.message) }
        }
    }

    // ── Media ─────────────────────────────────────────────────────────────────

    fun loadMedia(search: String? = null) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            runCatching { api().getMedia(search = search?.ifBlank { null }) }
                .onSuccess { _state.value = _state.value.copy(media = it.items, isLoading = false) }
                .onFailure { _state.value = _state.value.copy(isLoading = false, error = it.message) }
        }
    }

    fun loadShows(type: String? = null, search: String? = null) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            runCatching { api().getShows(type = type, search = search?.ifBlank { null }) }
                .onSuccess { _state.value = _state.value.copy(shows = it, isLoading = false) }
                .onFailure { _state.value = _state.value.copy(isLoading = false, error = it.message) }
        }
    }

    fun loadShowDetail(showId: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null, showDetail = null)
            runCatching { api().getShow(showId) }
                .onSuccess { _state.value = _state.value.copy(showDetail = it, isLoading = false) }
                .onFailure { _state.value = _state.value.copy(isLoading = false, error = it.message) }
        }
    }

    fun clearShowDetail() {
        _state.update { it.copy(showDetail = null) }
    }

    fun saveProgress(mediaId: String, positionSec: Int, duration: Int) {
        val uid = _state.value.userId ?: return
        val completed = duration > 0 && positionSec >= duration * 0.9
        viewModelScope.launch { api().saveProgress(uid, mediaId, positionSec, completed) }
    }

    fun streamUrl(mediaId: String) = api().streamUrl(mediaId)
    fun thumbnailUrl(path: String?) = api().thumbnailUrl(path)

    fun logout() {
        viewModelScope.launch { prefs.clear(); _state.value = AppState(isReady = true) }
    }

    fun clearError() { _state.value = _state.value.copy(error = null) }

    private fun api() = ApiClient(_state.value.serverUrl, _state.value.token)

    private suspend fun applyAuth(res: AuthResponse) {
        // If the server returned a serverUrl (from redeem response), prefer it over the discovered one
        // as long as it's a real LAN address (not localhost/server Docker alias)
        val internalHosts = setOf("localhost", "127.0.0.1", "server", "0.0.0.0")
        val resolvedUrl = res.serverUrl
            ?.takeIf { url -> internalHosts.none { url.contains(it) } }
            ?: _state.value.serverUrl
        prefs.saveSession(resolvedUrl, res.token, res.user.id, res.user.username)
        _state.value = _state.value.copy(
            serverUrl = resolvedUrl,
            token = res.token, userId = res.user.id, username = res.user.username, isLoading = false
        )
    }
}

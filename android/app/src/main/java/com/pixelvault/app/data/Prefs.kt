package com.pixelvault.app.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "pixelvault")

private object Keys {
    val SERVER_URL = stringPreferencesKey("server_url")
    val TOKEN      = stringPreferencesKey("token")
    val USER_ID    = stringPreferencesKey("user_id")
    val USERNAME   = stringPreferencesKey("username")
}

class Prefs(private val ctx: Context) {
    val serverUrl: Flow<String?> = ctx.dataStore.data.map { it[Keys.SERVER_URL] }
    val token:     Flow<String?> = ctx.dataStore.data.map { it[Keys.TOKEN] }
    val userId:    Flow<String?> = ctx.dataStore.data.map { it[Keys.USER_ID] }
    val username:  Flow<String?> = ctx.dataStore.data.map { it[Keys.USERNAME] }

    suspend fun saveSession(serverUrl: String, token: String, userId: String, username: String) {
        ctx.dataStore.edit {
            it[Keys.SERVER_URL] = serverUrl.trimEnd('/')
            it[Keys.TOKEN]      = token
            it[Keys.USER_ID]    = userId
            it[Keys.USERNAME]   = username
        }
    }

    suspend fun saveServerUrl(url: String) {
        ctx.dataStore.edit { it[Keys.SERVER_URL] = url.trimEnd('/') }
    }

    suspend fun clear() {
        ctx.dataStore.edit { it.clear() }
    }
}

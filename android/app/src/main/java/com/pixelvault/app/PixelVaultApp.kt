package com.pixelvault.app

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory

class PixelVaultApp : Application(), ImageLoaderFactory {
    override fun newImageLoader(): ImageLoader =
        ImageLoader.Builder(this)
            .networkObserverEnabled(false) // load from local server regardless of internet state
            .crossfade(true)
            .build()
}

# Kotlinx Serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class kotlinx.serialization.json.** { kotlinx.serialization.KSerializer serializer(...); }
-keep,includedescriptorclasses class com.pixelvault.app.**$$serializer { *; }
-keepclassmembers class com.pixelvault.app.** { *** Companion; }
-keepclasseswithmembers class com.pixelvault.app.** { kotlinx.serialization.KSerializer serializer(...); }

# Ktor
-keep class io.ktor.** { *; }
-dontwarn io.ktor.**

# ML Kit
-keep class com.google.mlkit.** { *; }

# Media3
-keep class androidx.media3.** { *; }
-dontwarn androidx.media3.**

# slf4j — pulled in transitively; no Android impl needed
-dontwarn org.slf4j.**

# OkHttp / Okio (Ktor engine pulls these in)
-dontwarn okhttp3.**
-dontwarn okio.**

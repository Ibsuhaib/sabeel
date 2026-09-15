# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ---------------------------------------------------------------------------
# Sabeel — rules for a Capacitor app with minify enabled.
#
# A Capacitor plugin is found by reflection from a name in a JS bridge call, so
# the shrinker cannot see that anything uses it and will happily delete the lot.
# The symptom is not a build error: the app installs, runs, and silently has no
# notifications. Keep the bridge and every plugin class intact.
# ---------------------------------------------------------------------------
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public *;
}

# Cordova plugins bridged through Capacitor are found the same way.
-keep class org.apache.cordova.** { *; }

# WebView JavaScript interfaces are called by name from JS.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep the line numbers so a stack trace from the field is readable, while
# still renaming the source file itself.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

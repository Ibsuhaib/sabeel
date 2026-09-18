package app.sabeel.quran;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import androidx.core.content.ContextCompat;

import java.util.List;

/**
 * Where the phone is, asked of Android directly.
 *
 * The app used to rely on the WebView's own navigator.geolocation. That reported
 * a permission grant and then failed to produce a fix — which is a known weakness
 * of WebView geolocation, and leaves nothing to diagnose with, because the web
 * API cannot say whether the device's Location switch is even on.
 *
 * Capacitor publishes a Geolocation plugin, and it was the obvious answer until
 * its build.gradle turned out to pull in com.google.android.gms:play-services-
 * location. This app's whole claim is that it carries no Google code and sends
 * nothing anywhere, and a prayer app that refuses to work on a de-Googled phone
 * fails exactly the people most likely to be running one. So this uses
 * LocationManager, which is part of Android itself and present on every device.
 *
 * Three things the web API cannot do and this can: say whether location services
 * are switched on at all, open the settings page that switches them on, and read
 * the last known fix — which is instant, and on a phone that has had a fix in the
 * last few minutes is as good as a new one for working out prayer times.
 */
@CapacitorPlugin(
    name = "SabeelLocation",
    permissions = {
        @Permission(
            alias = "location",
            // Both are requested so the dialog offers the Precise/Approximate
            // choice. Which one comes back is checked with hasLocationPermission
            // rather than through this alias, for the reason documented there.
            strings = { Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION }
        )
    }
)
public class LocationPlugin extends Plugin {

    /** Whether the device's Location switch is on. Nothing works while it is off. */
    @PluginMethod
    public void isEnabled(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("enabled", locationEnabled());
        call.resolve(ret);
    }

    /**
     * Open Android's location settings.
     *
     * Without Google Play Services there is no in-app "Turn on location?" dialog
     * to show — that is a Play Services feature. This is the next best thing: it
     * lands on the exact screen with the switch, rather than telling someone to
     * go and find it.
     */
    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    /**
     * Whether we may ask for a position at all.
     *
     * Deliberately not getPermissionState("location"). Capacitor evaluates an
     * alias holding several permissions as all-or-nothing — its own comment in
     * Bridge.getPermissionStates says "multiple permissions with the same alias
     * must all be true, otherwise all false" — and from Android 12 the system
     * dialog offers Approximate, which grants COARSE and denies FINE.
     *
     * Someone who chose Approximate had therefore granted location and been told
     * they had refused it. Coarse is entirely good enough here: prayer times and
     * the qibla move by nothing across the couple of kilometres it is accurate
     * to, and it is the setting a cautious person is most likely to pick.
     */
    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    @PluginMethod
    public void getPosition(PluginCall call) {
        if (!hasLocationPermission()) {
            requestPermissionForAlias("location", call, "permissionCallback");
            return;
        }
        resolvePosition(call);
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        if (!hasLocationPermission()) {
            call.reject("Location permission was refused.", "denied");
            return;
        }
        resolvePosition(call);
    }

    private LocationManager manager() {
        return (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
    }

    private boolean locationEnabled() {
        LocationManager lm = manager();
        if (lm == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) return lm.isLocationEnabled();
        return lm.isProviderEnabled(LocationManager.GPS_PROVIDER)
            || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
    }

    private void resolvePosition(PluginCall call) {
        LocationManager lm = manager();
        if (lm == null) { call.reject("This device has no location service.", "unsupported"); return; }
        if (!locationEnabled()) { call.reject("Location is switched off on this phone.", "servicesOff"); return; }

        // A fix from a few minutes ago is worth taking straight away. Prayer times
        // and the qibla shift by nothing over the distance a phone travels while
        // someone opens an app, and waiting for a fresh satellite fix indoors can
        // take half a minute or never finish at all.
        long maxAge = call.getLong("maximumAge", 300000L);
        Location best = null;
        try {
            List<String> providers = lm.getProviders(true);
            for (String p : providers) {
                Location l = lm.getLastKnownLocation(p);
                if (l == null) continue;
                if (System.currentTimeMillis() - l.getTime() > maxAge) continue;
                if (best == null || l.getAccuracy() < best.getAccuracy()) best = l;
            }
        } catch (SecurityException e) {
            call.reject("Location permission was refused.", "denied");
            return;
        }
        if (best != null) { call.resolve(toJS(best)); return; }

        requestSingleFix(call, lm);
    }

    /**
     * Ask every enabled provider at once and take whichever answers first.
     *
     * Asking only GPS is what makes an app sit on "getting your location" indoors:
     * the satellites are not reachable through a roof, while the network provider
     * would have answered immediately from wifi and cell towers. Neither is
     * reliably the faster one, so both are asked and the first wins.
     */
    private void requestSingleFix(PluginCall call, LocationManager lm) {
        final long timeout = call.getLong("timeout", 15000L);
        final boolean[] done = { false };
        final Handler handler = new Handler(Looper.getMainLooper());

        LocationListener listener = new LocationListener() {
            @Override
            public void onLocationChanged(Location location) {
                synchronized (done) {
                    if (done[0]) return;
                    done[0] = true;
                }
                try { lm.removeUpdates(this); } catch (Exception ignored) {}
                call.resolve(toJS(location));
            }

            // Required on older Android; without them some OEM builds throw.
            @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
            @Override public void onProviderEnabled(String provider) {}
            @Override public void onProviderDisabled(String provider) {}
        };

        // The timeout is armed BEFORE anything that can throw.
        //
        // It used to be registered after the loop below, and getProviders(true)
        // can return a provider that requestLocationUpdates then refuses —
        // "fused" on some devices throws IllegalArgumentException. Only
        // SecurityException was caught, so the exception escaped the lambda, the
        // timeout was never reached, and the call settled neither way: the app
        // sat on "Getting your location…" for ever. A promise that never settles
        // is worse than any error, because nothing downstream can recover from it.
        handler.postDelayed(() -> {
            synchronized (done) {
                if (done[0]) return;
                done[0] = true;
            }
            try { lm.removeUpdates(listener); } catch (Exception ignored) {}
            call.reject("Could not get a fix in time.", "timeout");
        }, timeout);

        handler.post(() -> {
            int asked = 0;
            SecurityException refused = null;
            for (String p : lm.getProviders(true)) {
                if (LocationManager.PASSIVE_PROVIDER.equals(p)) continue;
                try {
                    lm.requestLocationUpdates(p, 0, 0, listener, Looper.getMainLooper());
                    asked++;
                } catch (SecurityException e) {
                    refused = e;
                } catch (Throwable t) {
                    // One provider refusing is not the end of the attempt; the
                    // others may still answer. Only all of them failing is.
                    Logger.warn("Sabeel", "provider " + p + " refused updates: " + t.getMessage());
                }
            }
            if (asked > 0) return;   // the timeout above is now the only way out

            synchronized (done) {
                if (done[0]) return;
                done[0] = true;
            }
            if (refused != null) call.reject("Location permission was refused.", "denied");
            else call.reject("No location provider is available.", "unavailable");
        });
    }

    private JSObject toJS(Location l) {
        JSObject o = new JSObject();
        o.put("latitude", l.getLatitude());
        o.put("longitude", l.getLongitude());
        // Written as a statement rather than a ternary against null: JSObject has
        // overloads for both double and Object, and which one a `cond ? double :
        // null` expression selects is not worth having to reason about.
        if (l.hasAccuracy()) o.put("accuracy", (double) l.getAccuracy());
        o.put("time", l.getTime());
        return o;
    }
}

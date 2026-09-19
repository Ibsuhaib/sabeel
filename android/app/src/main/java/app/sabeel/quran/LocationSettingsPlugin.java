package app.sabeel.quran;

import android.content.Context;
import android.content.Intent;
import android.location.LocationManager;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Two questions the web cannot answer, and nothing else.
 *
 * This deliberately does NOT fetch a position. An earlier version of this file
 * did, and putting it in front of navigator.geolocation broke location three
 * times over — the WebView's geolocation had been working all along, and every
 * attempt to improve on it removed something that worked.
 *
 * So the position path is untouched and this sits beside it. It answers only:
 *
 *   isEnabled()  is the device's Location switch on? The web API cannot tell
 *                you, which matters because Android reports the switch being
 *                off as a plain timeout — indistinguishable from a phone that
 *                simply cannot see the sky. The app was therefore advising
 *                people to stand near a window when the fix was one toggle.
 *
 *   open()       show the settings page with that switch on it. There is no
 *                in-app "Turn on location?" dialog without Google Play Services,
 *                and this app carries none; landing on the right screen is the
 *                next best thing, and better than describing where a
 *                manufacturer happens to have put it.
 *
 * Neither can fail in a way that stops a position being fetched, because
 * neither is involved in fetching one.
 */
@CapacitorPlugin(name = "LocationSettings")
public class LocationSettingsPlugin extends Plugin {

    @PluginMethod
    public void isEnabled(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("enabled", locationEnabled());
        call.resolve(ret);
    }

    @PluginMethod
    public void open(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open the location settings.", e);
        }
    }

    private boolean locationEnabled() {
        LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        if (lm == null) return false;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) return lm.isLocationEnabled();
            return lm.isProviderEnabled(LocationManager.GPS_PROVIDER)
                || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
        } catch (Exception e) {
            // Nothing here is worth failing over: not knowing is the same as the
            // web, which is where this started.
            return true;
        }
    }
}

package app.sabeel.quran;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Before super.onCreate, which is where the bridge is built from
        // bridgeBuilder — after that the plugin would not be found.
        //
        // This one only reads the Location switch and opens its settings page.
        // Nothing here fetches a position; navigator.geolocation still does that,
        // untouched, because it was working and three attempts to improve on it
        // were three regressions.
        registerPlugin(LocationSettingsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

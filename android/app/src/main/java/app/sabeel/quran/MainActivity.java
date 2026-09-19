package app.sabeel.quran;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Before super.onCreate, which is where the bridge is built from
        // bridgeBuilder — after that the plugin would not be found.
        //
        // Both read state and open settings screens. Neither fetches anything
        // or schedules anything: a position still comes from
        // navigator.geolocation and an alarm still from the notifications
        // plugin, untouched, because putting native code in front of the
        // location path broke it three times over.
        registerPlugin(LocationSettingsPlugin.class);
        registerPlugin(AlarmReliabilityPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

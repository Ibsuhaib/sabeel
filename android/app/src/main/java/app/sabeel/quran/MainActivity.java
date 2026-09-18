package app.sabeel.quran;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Registered before super.onCreate, which is when the bridge is built —
        // after that the plugin would not be found and the app would silently
        // fall back to the WebView's geolocation, which is the thing being
        // replaced.
        registerPlugin(LocationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

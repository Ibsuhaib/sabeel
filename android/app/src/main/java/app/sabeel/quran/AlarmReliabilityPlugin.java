package app.sabeel.quran;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The three things that stop a prayer notification arriving, on any phone.
 *
 * A prayer app is only as good as its worst device. Scheduling an alarm
 * correctly is the easy part; what actually decides whether someone is called to
 * Fajr is a set of switches outside the app, each of which silently discards the
 * alarm and none of which an app may set for itself:
 *
 *   1. Notifications for the app. Denied, nothing is shown at all.
 *   2. Exact alarms, from Android 12. Denied, the alarm is not exact any more —
 *      Android batches it with whatever else it is delivering, which on a
 *      sleeping phone can mean minutes late or not until the screen wakes.
 *   3. Battery optimisation. In its default state Android is free to defer the
 *      app's alarms in Doze.
 *
 * And on top of those, the manufacturers: Xiaomi, Oppo, Vivo, Huawei and others
 * ship their own "autostart" list, not part of Android, which kills background
 * apps outright unless they are on it. There is no API for it — only an activity
 * that can be opened by name, and the names differ per brand.
 *
 * So this reads each state honestly and hands back an intent for the one screen
 * that fixes it. Reading needs no permission at all; opening a settings screen
 * needs none either. Nothing here asks for a permission the Play Store would
 * question, which matters for an app that intends to be published.
 */
@CapacitorPlugin(name = "AlarmReliability")
public class AlarmReliabilityPlugin extends Plugin {

    @PluginMethod
    public void status(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("manufacturer", Build.MANUFACTURER == null ? "" : Build.MANUFACTURER);
        ret.put("sdk", Build.VERSION.SDK_INT);
        ret.put("batteryUnrestricted", ignoringBatteryOptimisations());
        ret.put("autostartScreen", autostartIntent() != null);
        call.resolve(ret);
    }

    /**
     * Whether Android has been told to leave this app's alarms alone in Doze.
     *
     * Reading this needs no permission. Asking for it directly would — and that
     * permission is one Google Play asks apps to justify, so the settings screen
     * is opened instead and the person taps the switch themselves. One tap more,
     * and no risk to a submission.
     */
    private boolean ignoringBatteryOptimisations() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        if (pm == null) return true;
        try {
            return pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        } catch (Exception e) {
            return true;   // not knowing must not be reported as a fault
        }
    }

    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        // The app's own page, where the battery entry lives, rather than the
        // global list of every installed app.
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if (!start(intent)) {
            Intent list = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
            list.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (!start(list)) { call.reject("Could not open the battery settings."); return; }
        }
        call.resolve();
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        Intent intent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if (!start(intent)) { call.reject("Could not open the notification settings."); return; }
        call.resolve();
    }

    @PluginMethod
    public void openAutostartSettings(PluginCall call) {
        Intent intent = autostartIntent();
        if (intent == null) { call.reject("This phone has no separate autostart list."); return; }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if (!start(intent)) { call.reject("Could not open the autostart list."); return; }
        call.resolve();
    }

    /**
     * The manufacturer's own background-app list, where one exists.
     *
     * These are activities, not a documented API, and they move between versions
     * — so every candidate is tested against the package manager and the first
     * that actually resolves is used. A phone with none of them simply has none;
     * that is not a fault and is reported as such rather than guessed at.
     */
    private Intent autostartIntent() {
        String[][] candidates = {
            { "com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity" },
            { "com.letv.android.letvsafe", "com.letv.android.letvsafe.AutobootManageActivity" },
            { "com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity" },
            { "com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity" },
            { "com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity" },
            { "com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity" },
            { "com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity" },
            { "com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity" },
            { "com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager" },
            { "com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity" },
            { "com.asus.mobilemanager", "com.asus.mobilemanager.autostart.AutoStartActivity" },
            { "com.transsion.phonemaster", "com.cyin.himgr.autostart.AutoStartActivity" }
        };
        for (String[] c : candidates) {
            Intent intent = new Intent();
            intent.setComponent(new ComponentName(c[0], c[1]));
            if (intent.resolveActivity(getContext().getPackageManager()) != null) return intent;
        }
        return null;
    }

    private boolean start(Intent intent) {
        try {
            if (intent.resolveActivity(getContext().getPackageManager()) == null) return false;
            getContext().startActivity(intent);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}

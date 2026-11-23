package ir.vodda.vodda;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;

import androidx.core.app.ActivityCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int RC_MEDIA_PERMISSIONS = 7001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // «اصلا مجوز نخواه» — مجوز دوربین/میکروفون فقط یک‌بار، در اجرای اول اپ،
        // پیش از هر جلسه گرفته می‌شود؛ پس پاپ‌آپ هرگز وسط جلسه باز نمی‌شود.
        // WebView هم پس از آن، درخواست‌های رسانهٔ getUserMedia را خودکار
        // می‌بخشد (BridgeWebChromeClient کاپسیتور وقتی مجوز سطح OS موجود است
        // درخواست WebView را بی‌صدا grant می‌کند) — جلسه با یک لمس آغاز می‌شود.
        requestMediaPermissionsOnce();
    }

    private void requestMediaPermissionsOnce() {
        String[] mediaPermissions = new String[] {
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO
        };

        boolean anyMissing = false;
        for (String permission : mediaPermissions) {
            if (ActivityCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                anyMissing = true;
                break;
            }
        }

        if (anyMissing) {
            ActivityCompat.requestPermissions(this, mediaPermissions, RC_MEDIA_PERMISSIONS);
        }
    }
}

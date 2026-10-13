<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use Illuminate\Http\Request;

class PushNotificationController extends Controller
{
    /**
     * Return the VAPID public key so the frontend can subscribe.
     */
    public function vapidPublicKey()
    {
        $key = config('services.vapid.public_key');
        if (!$key) {
            return response()->json(['error' => 'VAPID not configured'], 500);
        }
        return response()->json(['publicKey' => $key]);
    }

    /**
     * Subscribe (save push subscription).
     */
    public function subscribe(Request $request)
    {
        $data = $request->validate([
            'endpoint' => 'required|url|max:500',
            'keys.p256dh' => 'required|string',
            'keys.auth' => 'required|string',
        ]);

        PushSubscription::updateOrCreate(
            ['endpoint' => $data['endpoint']],
            [
                'user_id' => $request->user()?->id,
                'p256dh' => $data['keys']['p256dh'],
                'auth' => $data['keys']['auth'],
                'user_agent' => $request->userAgent(),
            ]
        );

        return response()->json(['message' => 'Subscribed']);
    }

    /**
     * Unsubscribe (remove push subscription).
     */
    public function unsubscribe(Request $request)
    {
        $data = $request->validate([
            'endpoint' => 'required|url',
        ]);

        PushSubscription::where('endpoint', $data['endpoint'])->delete();

        return response()->json(['message' => 'Unsubscribed']);
    }
}

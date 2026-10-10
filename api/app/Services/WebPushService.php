<?php

namespace App\Services;

use App\Models\PushSubscription;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WebPushService
{
    /**
     * Send a push notification to all subscribers.
     *
     * @param string $title
     * @param string $body
     * @param string|null $icon
     * @param string|null $url   Click action URL
     * @param string|null $badge
     * @param string|null $image
     * @param string|null $tag   Collapse tag (prevents duplicate notifications)
     * @return array  ['sent' => int, 'failed' => int, 'removed' => int]
     */
    public static function broadcast(
        string $title,
        string $body,
        ?string $icon = null,
        ?string $url = null,
        ?string $badge = null,
        ?string $image = null,
        ?string $tag = null
    ): array {
        $payload = json_encode([
            'title' => $title,
            'body' => $body,
            'icon' => $icon ?: '/pwa-192.png',
            'badge' => $badge ?: '/pwa-192.png',
            'url' => $url ?: '/',
            'image' => $image,
            'tag' => $tag,
            'timestamp' => now()->timestamp * 1000,
        ]);

        $subscriptions = PushSubscription::all();
        $sent = 0;
        $failed = 0;
        $removed = 0;

        foreach ($subscriptions as $sub) {
            $result = self::sendToSubscription($sub, $payload);
            if ($result === true) {
                $sent++;
            } elseif ($result === 'gone') {
                $sub->delete();
                $removed++;
            } else {
                $failed++;
            }
        }

        Log::info("WebPush broadcast", compact('sent', 'failed', 'removed', 'title'));

        return compact('sent', 'failed', 'removed');
    }

    /**
     * Send payload to a single subscription using the Web Push protocol.
     *
     * Uses raw HTTP POST with VAPID JWT auth.
     * Returns true on success, 'gone' if subscription expired, false on error.
     */
    private static function sendToSubscription(PushSubscription $sub, string $payload): bool|string
    {
        try {
            $vapidPublic = config('services.vapid.public_key');
            $vapidPrivate = config('services.vapid.private_key');
            $vapidSubject = config('services.vapid.subject', config('app.url'));

            if (!$vapidPublic || !$vapidPrivate) {
                Log::warning('VAPID keys not configured');
                return false;
            }

            $endpoint = $sub->endpoint;
            $parsedUrl = parse_url($endpoint);
            $audience = $parsedUrl['scheme'] . '://' . $parsedUrl['host'];

            // Create VAPID JWT token
            $header = self::base64url(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
            $claims = self::base64url(json_encode([
                'aud' => $audience,
                'exp' => time() + 43200,
                'sub' => $vapidSubject,
            ]));

            $signingInput = $header . '.' . $claims;

            // Sign with ES256 (ECDSA P-256 + SHA-256)
            $privateKeyPem = self::vapidPrivateKeyToPem($vapidPrivate);
            $privateKey = openssl_pkey_get_private($privateKeyPem);
            if (!$privateKey) {
                Log::error('Invalid VAPID private key');
                return false;
            }

            openssl_sign($signingInput, $derSignature, $privateKey, OPENSSL_ALGO_SHA256);
            $joseSignature = self::derToJose($derSignature);
            $jwt = $signingInput . '.' . self::base64url($joseSignature);

            // Encrypt payload using Web Push encryption (aes128gcm)
            $encrypted = self::encrypt($payload, $sub->p256dh, $sub->auth);
            if (!$encrypted) {
                return false;
            }

            $vapidPublicUncompressed = self::base64urlDecode($vapidPublic);

            $response = Http::withHeaders([
                'TTL' => '86400',
                'Content-Encoding' => 'aes128gcm',
                'Content-Type' => 'application/octet-stream',
                'Authorization' => 'vapid t=' . $jwt . ', k=' . $vapidPublic,
            ])->withBody($encrypted, 'application/octet-stream')
              ->timeout(15)
              ->post($endpoint);

            $status = $response->status();

            if ($status >= 200 && $status < 300) {
                return true;
            }

            if ($status === 404 || $status === 410) {
                return 'gone';
            }

            Log::warning("WebPush failed", ['status' => $status, 'endpoint' => substr($endpoint, 0, 80)]);
            return false;

        } catch (\Throwable $e) {
            Log::error("WebPush exception", ['msg' => $e->getMessage(), 'endpoint' => substr($sub->endpoint, 0, 80)]);
            return false;
        }
    }

    /**
     * Encrypt payload for Web Push (aes128gcm / RFC 8291).
     */
    private static function encrypt(string $payload, string $clientPublicB64, string $authSecretB64): ?string
    {
        $clientPublicKey = self::base64urlDecode($clientPublicB64);
        $authSecret = self::base64urlDecode($authSecretB64);

        // Generate local ECDH key pair
        $localKey = openssl_pkey_new([
            'curve_name' => 'prime256v1',
            'private_key_type' => OPENSSL_KEYTYPE_EC,
        ]);
        if (!$localKey) return null;

        $localDetails = openssl_pkey_get_details($localKey);
        $localPublicKey = chr(4) . str_pad($localDetails['ec']['x'], 32, chr(0), STR_PAD_LEFT)
                                  . str_pad($localDetails['ec']['y'], 32, chr(0), STR_PAD_LEFT);

        // Derive shared secret via ECDH
        $sharedSecret = self::ecdhDerive($localKey, $clientPublicKey);
        if (!$sharedSecret) return null;

        // HKDF for auth info
        $ikm = self::hkdf($authSecret, $sharedSecret, "WebPush: info\x00" . $clientPublicKey . $localPublicKey, 32);

        // Salt
        $salt = random_bytes(16);

        // HKDF for Content-Encoding key and nonce
        $prk = hash_hmac('sha256', $ikm, $salt, true);
        $cekInfo = "Content-Encoding: aes128gcm\x00\x01";
        $nonce_info = "Content-Encoding: nonce\x00\x01";

        $cek = substr(hash_hmac('sha256', $cekInfo, $prk, true), 0, 16);
        $nonce = substr(hash_hmac('sha256', $nonce_info, $prk, true), 0, 12);

        // Pad payload with delimiter
        $padded = $payload . chr(2);

        // Encrypt with AES-128-GCM
        $tag = '';
        $encrypted = openssl_encrypt($padded, 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag, '', 16);
        if ($encrypted === false) return null;

        // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
        $rs = pack('N', 4096);
        $idlen = chr(65);
        $header = $salt . $rs . $idlen . $localPublicKey;

        return $header . $encrypted . $tag;
    }

    /**
     * ECDH key agreement.
     */
    private static function ecdhDerive($localPrivateKey, string $peerPublicKeyBin): ?string
    {
        // Create a PEM from the raw peer public key
        $peerPem = self::rawPublicKeyToPem($peerPublicKeyBin);
        $peerKey = openssl_pkey_get_public($peerPem);
        if (!$peerKey) return null;

        // Signature is openssl_pkey_derive($public_key, $private_key, $key_length):
        // peer PUBLIC key first, our PRIVATE key second. key_length 0 = native
        // length (32 bytes for P-256). Swapping them raised "Supplied key param
        // is a public key" and made every push fail.
        $shared = openssl_pkey_derive($peerKey, $localPrivateKey, 0);
        return $shared ?: null;
    }

    /**
     * HKDF extract + expand (SHA-256, single block).
     */
    private static function hkdf(string $salt, string $ikm, string $info, int $length): string
    {
        $prk = hash_hmac('sha256', $ikm, $salt, true);
        return substr(hash_hmac('sha256', $info . chr(1), $prk, true), 0, $length);
    }

    /**
     * Convert raw EC public key to PEM format.
     */
    private static function rawPublicKeyToPem(string $rawKey): string
    {
        // EC P-256 header: 30 59 30 13 06 07 2a 86 48 ce 3d 02 01 06 08 2a 86 48 ce 3d 03 01 07 03 42 00
        $header = hex2bin('3059301306072a8648ce3d020106082a8648ce3d030107034200');
        $der = $header . $rawKey;
        $pem = "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
        return $pem;
    }

    /**
     * Convert VAPID private key (base64url, 32 bytes) to PEM.
     */
    private static function vapidPrivateKeyToPem(string $b64Private): string
    {
        $privateRaw = self::base64urlDecode($b64Private);

        // Build SEC1 EC private key DER
        // SEQUENCE { version=1, privateKey, [0] namedCurve P-256, [1] publicKey }
        // We build a minimal PKCS#8 structure
        $oid = hex2bin('06082a8648ce3d030107'); // OID for P-256
        $ecOid = hex2bin('06072a8648ce3d0201');  // OID for EC

        // Build SEC1 key: SEQUENCE { INTEGER 1, OCTET STRING privateKey, [0] OID }
        $sec1 = chr(0x02) . chr(0x01) . chr(0x01) // version = 1
              . chr(0x04) . chr(strlen($privateRaw)) . $privateRaw // privateKey
              . chr(0xa0) . chr(strlen($oid)) . $oid; // [0] curve OID
        $sec1 = chr(0x30) . self::asn1Length(strlen($sec1)) . $sec1;

        // Wrap in PKCS#8: SEQUENCE { SEQUENCE { ecOID, curveOID }, OCTET STRING sec1key }
        $algoSeq = chr(0x30) . self::asn1Length(strlen($ecOid) + strlen($oid)) . $ecOid . $oid;
        $octetKey = chr(0x04) . self::asn1Length(strlen($sec1)) . $sec1;
        $pkcs8 = chr(0x02) . chr(0x01) . chr(0x00) . $algoSeq . $octetKey; // version = 0
        $pkcs8 = chr(0x30) . self::asn1Length(strlen($pkcs8)) . $pkcs8;

        return "-----BEGIN PRIVATE KEY-----\n" . chunk_split(base64_encode($pkcs8), 64, "\n") . "-----END PRIVATE KEY-----\n";
    }

    private static function asn1Length(int $length): string
    {
        if ($length < 128) return chr($length);
        if ($length < 256) return chr(0x81) . chr($length);
        return chr(0x82) . pack('n', $length);
    }

    /**
     * Convert DER ECDSA signature to JOSE (r || s, each 32 bytes).
     */
    private static function derToJose(string $der): string
    {
        $pos = 2; // skip SEQUENCE tag + length
        // Read r
        $rLen = ord($der[$pos + 1]);
        $r = substr($der, $pos + 2, $rLen);
        $pos += 2 + $rLen;
        // Read s
        $sLen = ord($der[$pos + 1]);
        $s = substr($der, $pos + 2, $sLen);

        // Pad/trim to 32 bytes
        $r = str_pad(ltrim($r, chr(0)), 32, chr(0), STR_PAD_LEFT);
        $s = str_pad(ltrim($s, chr(0)), 32, chr(0), STR_PAD_LEFT);

        return $r . $s;
    }

    private static function base64url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64urlDecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
    }
}

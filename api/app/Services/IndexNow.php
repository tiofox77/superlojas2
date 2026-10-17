<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * IndexNow (Bing, Yandex, Seznam, Naver…): tells search engines that a public URL changed.
 *
 * Fire-and-forget: URLs are collected during the request and sent in ONE call after the
 * response has gone to the client (app()->terminating). Each URL is sent at most once every
 * 10 minutes, failures are ignored, and nothing is sent outside superloja.vip (local/dev).
 *
 * The key is public by design: it is served at https://superloja.vip/{KEY}.txt.
 */
class IndexNow
{
    public const KEY = '567739758c3df92119c0f1490e0d557b';
    public const HOST = 'superloja.vip';

    private static array $urls = [];
    private static bool $registered = false;

    public static function queue(string $path): void
    {
        try {
            if (!self::isProduction()) return;
            $url = 'https://' . self::HOST . '/' . ltrim($path, '/');
            if (!Cache::add('indexnow:' . md5($url), 1, 600)) return;
            self::$urls[$url] = true;
            if (!self::$registered) {
                self::$registered = true;
                app()->terminating(static fn () => self::flush());
            }
        } catch (\Throwable $e) {
            // never break the request that changed the product/store
        }
    }

    public static function flush(): void
    {
        $urls = array_keys(self::$urls);
        self::$urls = [];
        if ($urls) self::submit($urls);
    }

    /** @return int|null HTTP status from api.indexnow.org (200/202 = accepted) */
    public static function submit(array $urls): ?int
    {
        try {
            return Http::timeout(4)->connectTimeout(2)->acceptJson()
                ->post('https://api.indexnow.org/indexnow', [
                    'host' => self::HOST,
                    'key' => self::KEY,
                    'keyLocation' => 'https://' . self::HOST . '/' . self::KEY . '.txt',
                    'urlList' => array_values(array_slice($urls, 0, 10000)),
                ])->status();
        } catch (\Throwable $e) {
            return null;
        }
    }

    private static function isProduction(): bool
    {
        $host = app()->runningInConsole()
            ? (string) parse_url((string) config('app.url'), PHP_URL_HOST)
            : (string) request()->getHost();
        return $host === self::HOST || str_ends_with($host, '.' . self::HOST);
    }
}

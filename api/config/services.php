<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'vapid' => [
        'public_key' => env('VAPID_PUBLIC_KEY'),
        'private_key' => env('VAPID_PRIVATE_KEY'),
        'subject' => env('VAPID_SUBJECT', env('APP_URL', 'https://superloja.vip')),
    ],

    // AliExpress Open Platform (dropshipping / affiliate).
    // Register an app at https://openservice.aliexpress.com to get key/secret.
    'aliexpress' => [
        'app_key' => env('ALIEXPRESS_APP_KEY'),
        'app_secret' => env('ALIEXPRESS_APP_SECRET'),
        'access_token' => env('ALIEXPRESS_ACCESS_TOKEN'), // OAuth session token (for DS order APIs)
        'gateway' => env('ALIEXPRESS_GATEWAY', 'https://api-sg.aliexpress.com/sync'),
        'ship_to' => env('ALIEXPRESS_SHIP_TO', 'AO'),      // Angola
        'currency' => env('ALIEXPRESS_CURRENCY', 'USD'),
        'language' => env('ALIEXPRESS_LANGUAGE', 'pt'),
        // Best-effort HTML scraping fallback when the official API is not configured.
        'scrape_enabled' => env('ALIEXPRESS_SCRAPE_ENABLED', true),
        'scrape_user_agent' => env('ALIEXPRESS_SCRAPE_UA', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'),
    ],

    // Generic AI provider (OpenAI-compatible chat/completions).
    // Works with "aisa one" or any compatible endpoint — set base_url + key + model.
    'ai' => [
        'base_url' => env('AI_BASE_URL'),      // e.g. https://api.aisaone.xyz/v1
        'api_key' => env('AI_API_KEY'),
        'model' => env('AI_MODEL', 'gpt-4o-mini'),
        'timeout' => (int) env('AI_TIMEOUT', 30),
    ],

];

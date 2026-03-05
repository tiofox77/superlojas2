<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

/**
 * Fallback: serve storage files through Laravel when the web server
 * can't resolve the public/storage symlink (common on cPanel).
 * Apache/Nginx normally serves these directly, but if the symlink
 * is missing or misconfigured, the request falls through to Laravel.
 */
Route::get('/storage/{path}', function (string $path) {
    $disk = Storage::disk('public');

    if (!$disk->exists($path)) {
        abort(404);
    }

    $fullPath = $disk->path($path);
    $mime = mime_content_type($fullPath) ?: 'application/octet-stream';

    return response()->file($fullPath, [
        'Content-Type' => $mime,
        'Cache-Control' => 'public, max-age=31536000',
    ]);
})->where('path', '.*');

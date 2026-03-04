<?php

namespace App\Helpers;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SeoFileName
{
    /**
     * Generate an SEO-friendly filename and store the file.
     *
     * Pattern: {slug}-{suffix}-superloja.{ext}
     * Example: iphone-15-pro-max-1-superloja.jpg
     *
     * @param UploadedFile $file
     * @param string       $folder   e.g. "stores/6/products"
     * @param string       $slug     main identifier (product slug, store slug, user name, etc.)
     * @param string       $suffix   extra context (e.g. "logo", "banner", "1", "2")
     * @param string       $disk     storage disk
     * @return string                relative path inside the disk (without /storage/ prefix)
     */
    public static function store(UploadedFile $file, string $folder, string $slug, string $suffix = '', string $disk = 'public'): string
    {
        $ext = strtolower($file->getClientOriginalExtension() ?: ($file->guessExtension() ?: 'jpg'));
        $base = Str::slug($slug, '-');

        if ($suffix !== '') {
            $base .= '-' . Str::slug($suffix, '-');
        }

        $name = $base . '-superloja.' . $ext;

        // Ensure directory exists physically
        $storage = Storage::disk($disk);
        if (!$storage->exists($folder)) {
            $storage->makeDirectory($folder);
        }

        // Avoid overwriting: if file exists, append a short unique suffix
        $storagePath = $folder . '/' . $name;
        if ($storage->exists($storagePath)) {
            $name = $base . '-' . substr(uniqid(), -5) . '-superloja.' . $ext;
        }

        $result = $file->storeAs($folder, $name, $disk);

        if ($result === false) {
            throw new \RuntimeException("Falha ao guardar ficheiro em {$folder}/{$name}. Verifique permissoes do directorio storage.");
        }

        return $result;
    }

    /**
     * Convenience: store and return the public /storage/ prefixed path.
     * Also ensures the storage:link symlink exists.
     */
    public static function storePublic(UploadedFile $file, string $folder, string $slug, string $suffix = ''): string
    {
        static::ensureStorageLink();
        return '/storage/' . static::store($file, $folder, $slug, $suffix, 'public');
    }

    /**
     * Ensure the public storage symlink exists.
     * On cPanel/shared hosts, the symlink may be missing after deploys.
     */
    private static function ensureStorageLink(): void
    {
        $publicPath = public_path('storage');
        $storagePath = storage_path('app/public');

        if (!is_link($publicPath) && !is_dir($publicPath)) {
            try {
                // Try symlink first
                if (@symlink($storagePath, $publicPath)) {
                    return;
                }
                // Fallback: run artisan command
                \Illuminate\Support\Facades\Artisan::call('storage:link');
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Could not create storage link: ' . $e->getMessage());
            }
        }
    }
}

<?php

namespace App\Helpers;

use Illuminate\Http\UploadedFile;
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

        // Avoid overwriting: if file exists, append a short unique suffix
        $storagePath = $folder . '/' . $name;
        if (\Illuminate\Support\Facades\Storage::disk($disk)->exists($storagePath)) {
            $name = $base . '-' . substr(uniqid(), -5) . '-superloja.' . $ext;
        }

        return $file->storeAs($folder, $name, $disk);
    }

    /**
     * Convenience: store and return the public /storage/ prefixed path.
     */
    public static function storePublic(UploadedFile $file, string $folder, string $slug, string $suffix = ''): string
    {
        return '/storage/' . static::store($file, $folder, $slug, $suffix, 'public');
    }
}

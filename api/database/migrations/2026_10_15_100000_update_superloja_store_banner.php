<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * New cover for the SuperLoja Angola store (3:1, 1800×600 — marketing/banners/superloja-capa-2026-10.jpg).
 * The image is uploaded to storage by FTP; this only points the store at it, and only while the store
 * still has the old cover (an upload made from the store panel in the meantime is left alone).
 */
return new class extends Migration
{
    private const OLD = '/storage/stores/6/banners/superloja-banner-1777112911-superloja.png';
    private const NEW = '/storage/stores/6/banners/superloja-banner-20261015-superloja.jpg';

    public function up(): void
    {
        if (!Storage::disk('public')->exists(str_replace('/storage/', '', self::NEW))) return;
        DB::table('stores')->where('id', 6)->where('slug', 'superloja')->where('banner', self::OLD)
            ->update(['banner' => self::NEW, 'updated_at' => now()]);
    }

    public function down(): void
    {
        if (!Storage::disk('public')->exists(str_replace('/storage/', '', self::OLD))) return;
        DB::table('stores')->where('id', 6)->where('slug', 'superloja')->where('banner', self::NEW)
            ->update(['banner' => self::OLD, 'updated_at' => now()]);
    }
};

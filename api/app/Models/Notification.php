<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    protected $fillable = [
        'target', 'store_id', 'user_id', 'type',
        'title', 'body', 'icon', 'color', 'link',
        'data', 'is_read', 'read_at',
    ];

    protected $casts = [
        'data' => 'array',
        'is_read' => 'boolean',
        'read_at' => 'datetime',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ─── Factory helpers ─────────────────────────────────────

    /**
     * Create an admin notification.
     */
    public static function notifyAdmin(string $type, string $title, string $body, string $icon = 'bell', string $color = 'blue', ?string $link = null, ?array $data = null): self
    {
        return static::create([
            'target' => 'admin',
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'icon' => $icon,
            'color' => $color,
            'link' => $link,
            'data' => $data,
        ]);
    }

    /**
     * Create a store notification.
     */
    public static function notifyStore(int $storeId, string $type, string $title, string $body, string $icon = 'bell', string $color = 'blue', ?string $link = null, ?array $data = null): self
    {
        return static::create([
            'target' => 'store',
            'store_id' => $storeId,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'icon' => $icon,
            'color' => $color,
            'link' => $link,
            'data' => $data,
        ]);
    }
}

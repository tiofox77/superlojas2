<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PageView extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'session_id', 'visitor_hash', 'path', 'store_slug',
        'referrer', 'referrer_domain', 'country', 'province', 'city',
        'device', 'browser', 'os', 'ip_hash', 'user_id',
        'is_unique_today', 'created_at',
    ];

    protected $casts = [
        'is_unique_today' => 'boolean',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

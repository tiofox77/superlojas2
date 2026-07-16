<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImportJob extends Model
{
    protected $fillable = [
        'store_id', 'url', 'status', 'attempts', 'result', 'error',
        'product_id', 'created_by', 'claimed_at', 'completed_at',
    ];

    protected $casts = [
        'result' => 'array',
        'attempts' => 'integer',
        'claimed_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}

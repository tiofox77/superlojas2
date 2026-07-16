<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierOrder extends Model
{
    protected $fillable = [
        'supplier', 'order_id', 'store_id',
        'ae_order_id', 'status', 'tracking_number', 'carrier',
        'cost', 'cost_currency', 'sale_total', 'sale_currency',
        'raw', 'notes', 'placed_at', 'last_synced_at',
    ];

    protected $casts = [
        'cost' => 'decimal:2',
        'sale_total' => 'decimal:2',
        'raw' => 'array',
        'placed_at' => 'datetime',
        'last_synced_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Estimated margin (sale - cost). Only meaningful once both are set and
     * in comparable currency; here we expose the raw difference for display.
     */
    public function getMarginAttribute(): ?float
    {
        if ($this->sale_total === null || $this->cost === null) {
            return null;
        }
        return (float) $this->sale_total - (float) $this->cost;
    }
}

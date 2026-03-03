<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosSale extends Model
{
    protected $fillable = [
        'store_id',
        'user_id',
        'sale_number',
        'items',
        'subtotal',
        'discount',
        'tax',
        'total',
        'payment_method',
        'amount_received',
        'change_amount',
        'customer_name',
        'customer_phone',
        'notes',
        'currency',
        'status',
        'offline_id',
    ];

    protected $casts = [
        'items' => 'array',
        'subtotal' => 'decimal:2',
        'discount' => 'decimal:2',
        'tax' => 'decimal:2',
        'total' => 'decimal:2',
        'amount_received' => 'decimal:2',
        'change_amount' => 'decimal:2',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Generate next sale number for a store
     */
    public static function nextNumber(Store $store): string
    {
        $last = static::where('store_id', $store->id)
            ->orderByDesc('id')
            ->value('sale_number');

        $seq = 1;
        if ($last && preg_match('/(\d+)$/', $last, $m)) {
            $seq = (int) $m[1] + 1;
        }

        $prefix = strtoupper(substr($store->slug, 0, 6));
        return "POS-{$prefix}-" . str_pad($seq, 5, '0', STR_PAD_LEFT);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'order_number', 'store_id', 'user_id',
        'customer_name', 'customer_email', 'customer_phone',
        'customer_address', 'customer_province', 'customer_notes',
        'payment_method', 'payment_receipt', 'status',
        'subtotal', 'delivery_fee', 'total', 'currency',
        'confirmed_at', 'shipped_at', 'delivered_at', 'cancelled_at',
        'cancel_reason', 'admin_notes',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'delivery_fee' => 'decimal:2',
        'total' => 'decimal:2',
        'confirmed_at' => 'datetime',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public static function generateOrderNumber(): string
    {
        $prefix = 'SL';
        $date = now()->format('ymd');
        $random = strtoupper(substr(uniqid(), -4));
        return "{$prefix}{$date}-{$random}";
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'Pendente',
            'confirmed' => 'Confirmado',
            'processing' => 'Em Preparacao',
            'shipped' => 'Enviado',
            'delivered' => 'Entregue',
            'cancelled' => 'Cancelado',
            default => $this->status,
        };
    }
}

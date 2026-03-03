<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subscription extends Model
{
    protected $fillable = [
        'store_id',
        'plan_id',
        'status',
        'starts_at',
        'expires_at',
        'cancelled_at',
        'auto_renew',
        'payment_method',
        'payment_reference',
        'payment_proof',
        'amount_paid',
        'currency',
        'paid_at',
        'notes',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'expires_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'paid_at' => 'datetime',
        'auto_renew' => 'boolean',
        'amount_paid' => 'decimal:2',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    // ─── Helpers ──────────────────────────────────────────────────

    public function isActive(): bool
    {
        return $this->status === 'active' && ($this->expires_at === null || $this->expires_at->isFuture());
    }

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function daysRemaining(): int
    {
        if (!$this->expires_at || $this->expires_at->isPast()) return 0;
        return (int) now()->diffInDays($this->expires_at, false);
    }

    /**
     * Calculate expires_at based on plan billing cycle from a given start date
     */
    public static function calcExpiry(Plan $plan, $from = null): ?\Carbon\Carbon
    {
        $from = $from ? \Carbon\Carbon::parse($from) : now();

        if ($plan->is_free) return null; // free never expires

        return match ($plan->billing_cycle) {
            'monthly' => $from->copy()->addMonth(),
            'yearly' => $from->copy()->addYear(),
            'one_time' => null, // one-time never expires
            default => $from->copy()->addMonth(),
        };
    }
}

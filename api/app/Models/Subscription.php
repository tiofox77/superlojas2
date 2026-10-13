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
     * Propagate plan + subscription to ALL other stores owned by same user.
     */
    public static function syncPlanToUserStores(Store $sourceStore, Plan $plan, self $activeSub): void
    {
        if (!$sourceStore->user_id) return;

        $otherStores = Store::where('user_id', $sourceStore->user_id)
            ->where('id', '!=', $sourceStore->id)
            ->get();

        foreach ($otherStores as $otherStore) {
            // Cancel any active sub on this store
            self::where('store_id', $otherStore->id)
                ->where('status', 'active')
                ->update(['status' => 'cancelled', 'cancelled_at' => now()]);

            // Create matching subscription
            self::create([
                'store_id' => $otherStore->id,
                'plan_id' => $plan->id,
                'status' => 'active',
                'starts_at' => $activeSub->starts_at,
                'expires_at' => $activeSub->expires_at,
                'auto_renew' => $activeSub->auto_renew,
                'payment_method' => $activeSub->payment_method,
                'amount_paid' => 0,
                'currency' => 'AOA',
                'paid_at' => now(),
                'notes' => 'Sincronizado da loja: ' . $sourceStore->name,
            ]);

            // Sync store plan
            $otherStore->update([
                'plan_id' => $plan->id,
                'plan_expires_at' => $activeSub->expires_at,
            ]);
        }
    }

    /**
     * Calculate expires_at based on plan billing cycle from a given start date.
     * If $durationMonths is provided (1,3,6,12...), it overrides the plan's billing cycle.
     */
    public static function calcExpiry(Plan $plan, $from = null, ?int $durationMonths = null): ?\Carbon\Carbon
    {
        $from = $from ? \Carbon\Carbon::parse($from) : now();

        if ($plan->is_free) return null; // free never expires

        // Manual override (admin chose 1/3/6/12 months explicitly)
        if ($durationMonths !== null && $durationMonths > 0) {
            return $from->copy()->addMonths($durationMonths);
        }

        return match ($plan->billing_cycle) {
            'monthly' => $from->copy()->addMonth(),
            'yearly' => $from->copy()->addYear(),
            'one_time' => null, // one-time never expires
            default => $from->copy()->addMonth(),
        };
    }
}

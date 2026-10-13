<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'phone',
        'avatar',
        'store_id',
        'is_active',
        'addresses',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'store_id' => 'integer',
            'is_active' => 'boolean',
            'addresses' => 'array',
        ];
    }

    // ─── Helpers ──────────────────────────────────────────────

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isStoreOwner(): bool
    {
        return $this->role === 'store_owner';
    }

    public function isCustomer(): bool
    {
        return $this->role === 'customer';
    }

    // ─── Relations ────────────────────────────────────────────

    /**
     * All stores owned by this user.
     */
    public function stores(): HasMany
    {
        return $this->hasMany(Store::class);
    }

    /**
     * Legacy: returns the "default" store (store_id) for backward compat.
     * Falls back to first owned store if store_id is null.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Check if user owns a given store.
     */
    public function ownsStore(int $storeId): bool
    {
        return $this->stores()->where('id', $storeId)->exists();
    }

    public function followedStores(): BelongsToMany
    {
        return $this->belongsToMany(Store::class, 'store_follows')->withTimestamps();
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Store extends Model
{
    protected static function booted(): void
    {
        // Every store needs at least one category, otherwise the seller cannot create the first
        // product (the product's category is required). QA 17-Out.
        static::created(fn (Store $store) => $store->ensureCategory());

        // IndexNow (Bing/Yandex): ping the public store page when something visible changes.
        static::saved(function (Store $store) {
            if ($store->slug && ($store->wasRecentlyCreated
                || $store->wasChanged(['name', 'slug', 'description', 'logo', 'banner', 'status', 'province', 'city']))) {
                \App\Services\IndexNow::queue('/lojas/' . $store->slug);
            }
        });
    }

    /**
     * Make sure the store has at least one category (category_store pivot): first from the legacy
     * `categories` JSON (names chosen at registration), otherwise the generic "Outros" category.
     * Only ever adds; never removes a category the store already has.
     */
    public function ensureCategory(): void
    {
        try {
            if ($this->storeCategories()->exists()) return;
            $names = array_values(array_filter((array) ($this->categories ?? []), 'is_string'));
            $ids = $names
                ? Category::whereIn('name', $names)
                    ->orWhereIn('slug', array_map(fn ($n) => \Illuminate\Support\Str::slug($n), $names))
                    ->pluck('id')->all()
                : [];
            if (!$ids) $ids = [Category::defaultForStores()->id];
            $this->storeCategories()->syncWithoutDetaching($ids);
            $this->unsetRelation('storeCategories');
        } catch (\Throwable $e) {
            report($e); // never block store creation
        }
    }

    protected $fillable = [
        'user_id',
        'name',
        'slug',
        'description',
        'logo',
        'banner',
        'province',
        'city',
        'municipality',
        'address',
        'whatsapp',
        'email',
        'phone',
        'whatsapp_message',
        'whatsapp_orders_enabled',
        'business_hours',
        'meta_title',
        'meta_description',
        'meta_keywords',
        'return_policy',
        'shipping_policy',
        'terms',
        'announcement',
        'announcement_active',
        'show_stock',
        'delivery_zones',
        'min_order_value',
        'rating',
        'review_count',
        'status',
        'is_official',
        'is_featured',
        'plan_id',
        'plan_expires_at',
        'api_enabled',
        'api_key',
        'api_secret',
        'api_permissions',
        'api_rate_limit',
        'api_last_used_at',
        'fb_enabled',
        'fb_access_token',
        'fb_catalog_id',
        'fb_business_id',
        'fb_currency',
        'fb_feed_key',
        'fb_last_synced_at',
        'fb_pixel_id',
        'categories',
        'categories_changed_at',
        'socials',
        'payment_methods',
    ];

    protected $casts = [
        'categories' => 'array',
        'socials' => 'array',
        'payment_methods' => 'array',
        'business_hours' => 'array',
        'delivery_zones' => 'array',
        'whatsapp_orders_enabled' => 'boolean',
        'announcement_active' => 'boolean',
        'show_stock' => 'boolean',
        'is_official' => 'boolean',
        'is_featured' => 'boolean',
        'min_order_value' => 'decimal:2',
        'rating' => 'decimal:1',
        'plan_expires_at' => 'datetime',
        'api_enabled' => 'boolean',
        'api_permissions' => 'array',
        'api_rate_limit' => 'integer',
        'fb_enabled' => 'boolean',
        'fb_last_synced_at' => 'datetime',
        'api_last_used_at' => 'datetime',
        'categories_changed_at' => 'datetime',
    ];

    protected $hidden = [
        'api_key',
        'api_secret',
        'fb_access_token',
    ];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function heroSlides(): HasMany
    {
        return $this->hasMany(HeroSlide::class, 'store_slug', 'slug');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function storeCategories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'category_store')->withTimestamps();
    }

    public function subscriptions(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Subscription::class)->orderByDesc('created_at');
    }

    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'store_follows')->withTimestamps();
    }

    public function activeSubscription(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Subscription::class)->where('status', 'active')->latestOfMany();
    }

    /**
     * Accessor: return logo only if the physical file exists on disk.
     * Prevents broken images when DB has a path but file was never
     * uploaded to this server (e.g. created on localhost, missing on cPanel).
     */
    public function getLogoAttribute($value): string
    {
        if (!$value || !str_starts_with($value, '/storage/')) return $value ?? '';
        $diskPath = str_replace('/storage/', '', $value);
        return Storage::disk('public')->exists($diskPath) ? $value : '';
    }

    /**
     * Accessor: return banner only if the physical file exists on disk.
     */
    public function getBannerAttribute($value): string
    {
        if (!$value || !str_starts_with($value, '/storage/')) return $value ?? '';
        $diskPath = str_replace('/storage/', '', $value);
        return Storage::disk('public')->exists($diskPath) ? $value : '';
    }
}

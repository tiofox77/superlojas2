<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Store extends Model
{
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
        'api_last_used_at' => 'datetime',
        'categories_changed_at' => 'datetime',
    ];

    protected $hidden = [
        'api_key',
        'api_secret',
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

    public function activeSubscription(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Subscription::class)->where('status', 'active')->latestOfMany();
    }
}

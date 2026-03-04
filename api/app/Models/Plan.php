<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'price',
        'billing_cycle',
        'description',
        'features',
        'max_products',
        'max_images_per_product',
        'max_hero_slides',
        'max_categories',
        'priority_support',
        'featured_badge',
        'analytics',
        'custom_domain',
        'has_api',
        'has_pos',
        'is_free',
        'is_active',
        'is_recommended',
        'sort_order',
    ];

    protected $casts = [
        'features' => 'array',
        'price' => 'decimal:2',
        'max_products' => 'integer',
        'max_images_per_product' => 'integer',
        'max_hero_slides' => 'integer',
        'max_categories' => 'integer',
        'priority_support' => 'boolean',
        'featured_badge' => 'boolean',
        'analytics' => 'boolean',
        'custom_domain' => 'boolean',
        'has_api' => 'boolean',
        'has_pos' => 'boolean',
        'is_free' => 'boolean',
        'is_active' => 'boolean',
        'is_recommended' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function stores(): HasMany
    {
        return $this->hasMany(Store::class);
    }
}

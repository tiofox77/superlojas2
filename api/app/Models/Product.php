<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    protected static function booted(): void
    {
        // IndexNow (Bing/Yandex): ping the public product page when something visible changes.
        static::saved(function (Product $product) {
            if ($product->slug && ($product->wasRecentlyCreated
                || $product->wasChanged(['name', 'slug', 'price', 'original_price', 'stock', 'description', 'images', 'is_active']))) {
                \App\Services\IndexNow::queue('/produto/' . $product->slug);
            }
        });
    }

    protected $fillable = [
        'name',
        'slug',
        'price',
        'original_price',
        'currency',
        'images',
        'store_id',
        'category_id',
        'subcategory_id',
        'category',
        'badge',
        'rating',
        'review_count',
        'stock',
        'description',
        'variants',
        'flash_sale_start',
        'flash_sale_end',
        'is_featured',
        'featured_status',
        'is_active',
        'ae_product_id',
        'ae_source_url',
        'ae_cost',
        'ae_currency',
        'ae_last_synced_at',
    ];

    protected $casts = [
        'images' => 'array',
        'variants' => 'array',
        'price' => 'decimal:2',
        'original_price' => 'decimal:2',
        'rating' => 'decimal:1',
        'stock' => 'integer',
        'review_count' => 'integer',
        'flash_sale_start' => 'datetime',
        'flash_sale_end' => 'datetime',
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
        'ae_cost' => 'decimal:2',
        'ae_last_synced_at' => 'datetime',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function categoryRelation(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function subcategory(): BelongsTo
    {
        return $this->belongsTo(Subcategory::class);
    }
}

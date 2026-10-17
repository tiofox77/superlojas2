<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'icon',
        'product_count',
        'is_adult',
    ];

    protected $casts = [
        'is_adult' => 'boolean',
    ];

    /** Generic category given to stores that have none yet (see Store::ensureCategory). */
    public static function defaultForStores(): self
    {
        return static::firstOrCreate(['slug' => 'outros'], ['name' => 'Outros', 'icon' => '📦']);
    }

    public function subcategories(): HasMany
    {
        return $this->hasMany(Subcategory::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function stores(): BelongsToMany
    {
        return $this->belongsToMany(Store::class, 'category_store')->withTimestamps();
    }
}

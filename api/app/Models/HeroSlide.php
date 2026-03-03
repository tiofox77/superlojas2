<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HeroSlide extends Model
{
    protected $fillable = [
        'title',
        'subtitle',
        'cta',
        'cta_link',
        'bg_color',
        'image',
        'store_slug',
        'sort_order',
    ];
}

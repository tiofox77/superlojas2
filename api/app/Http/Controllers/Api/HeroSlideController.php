<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HeroSlide;

class HeroSlideController extends Controller
{
    public function index()
    {
        return response()->json(
            HeroSlide::whereNull('store_slug')
                ->orderBy('sort_order')
                ->get()
        );
    }

    public function byStore(string $slug)
    {
        return response()->json(
            HeroSlide::where('store_slug', $slug)
                ->orderBy('sort_order')
                ->get()
        );
    }
}

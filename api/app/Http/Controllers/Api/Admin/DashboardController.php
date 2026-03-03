<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\HeroSlide;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;

class DashboardController extends Controller
{
    public function index()
    {
        return response()->json([
            'stats' => [
                'total_users' => User::count(),
                'total_stores' => Store::count(),
                'total_products' => Product::count(),
                'total_categories' => Category::count(),
                'pending_stores' => Store::where('status', 'pending')->count(),
                'approved_stores' => Store::where('status', 'approved')->count(),
                'rejected_stores' => Store::where('status', 'rejected')->count(),
                'total_hero_slides' => HeroSlide::count(),
                'store_owners' => User::where('role', 'store_owner')->count(),
                'customers' => User::where('role', 'customer')->count(),
            ],
            'recent_stores' => Store::latest()->take(5)->get(),
            'recent_products' => Product::with('store')->latest()->take(5)->get(),
            'recent_users' => User::latest()->take(5)->get(['id', 'name', 'email', 'role', 'is_active', 'created_at']),
        ]);
    }
}

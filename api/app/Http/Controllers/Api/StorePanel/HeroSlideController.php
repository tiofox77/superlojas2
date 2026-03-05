<?php

namespace App\Http\Controllers\Api\StorePanel;

use App\Helpers\SeoFileName;
use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\HeroSlide;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class HeroSlideController extends Controller
{
    private function getStore(Request $request, string $slug): Store
    {
        $store = Store::where('slug', $slug)->firstOrFail();
        $user = $request->user();
        if ($user->role !== 'super_admin' && !($user->role === 'store_owner' && $user->store_id === $store->id)) {
            abort(403, 'Sem permissao.');
        }
        return $store;
    }

    public function index(Request $request, string $slug)
    {
        $this->getStore($request, $slug);
        return response()->json(
            HeroSlide::where('store_slug', $slug)->orderBy('sort_order')->get()
        );
    }

    public function store(Request $request, string $slug)
    {
        $store = $this->getStore($request, $slug);
        $store->load('plan');
        $plan = $store->plan;

        // Enforce max_hero_slides (0 = unlimited, super_admin bypasses)
        if ($plan && $request->user()->role !== 'super_admin') {
            $maxSlides = $plan->max_hero_slides;
            if ($maxSlides > 0) {
                $currentCount = \App\Models\HeroSlide::where('store_slug', $slug)->count();
                if ($currentCount >= $maxSlides) {
                    return response()->json([
                        'message' => "O seu plano ({$plan->name}) permite no maximo {$maxSlides} slide(s). Faca upgrade para adicionar mais.",
                        'limit' => $maxSlides,
                        'current' => $currentCount,
                    ], 422);
                }
            }
        }

        $request->validate([
            'title' => 'required|string|max:255',
            'subtitle' => 'nullable|string|max:500',
            'cta' => 'nullable|string|max:100',
            'cta_link' => 'nullable|string|max:255',
            'bg_color' => 'nullable|string|max:255',
            'image' => 'nullable|file|image|max:6144',
        ]);

        $data = $request->except(['image']);
        $data['store_slug'] = $slug;
        $data['subtitle'] = $data['subtitle'] ?? '';
        $data['cta'] = $data['cta'] ?? '';
        $data['cta_link'] = $data['cta_link'] ?? '';
        $data['bg_color'] = $data['bg_color'] ?? '';

        $store = $this->getStore($request, $slug);
        if ($request->hasFile('image')) {
            $data['image'] = SeoFileName::storePublic($request->file('image'), "stores/{$store->id}/slides", $store->slug, 'slide');
        }

        $heroSlide = HeroSlide::create($data);
        return response()->json($heroSlide, 201);
    }

    public function update(Request $request, string $slug, HeroSlide $heroSlide)
    {
        $this->getStore($request, $slug);
        if ($heroSlide->store_slug !== $slug) abort(403);

        $request->validate([
            'title' => 'sometimes|string|max:255',
            'subtitle' => 'sometimes|string|max:500',
            'cta' => 'sometimes|string|max:100',
            'cta_link' => 'sometimes|string|max:255',
            'bg_color' => 'sometimes|string|max:255',
            'image' => 'sometimes|file|image|max:6144',
        ]);

        $data = $request->except(['image']);

        if ($request->hasFile('image')) {
            if ($heroSlide->image && str_starts_with($heroSlide->image, '/storage/')) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $heroSlide->image));
            }
            $storeModel = $this->getStore($request, $slug);
            $data['image'] = SeoFileName::storePublic($request->file('image'), "stores/{$storeModel->id}/slides", $storeModel->slug, 'slide');
        }

        $heroSlide->update($data);
        return response()->json($heroSlide->fresh());
    }

    public function destroy(Request $request, string $slug, HeroSlide $heroSlide)
    {
        $this->getStore($request, $slug);
        if ($heroSlide->store_slug !== $slug) abort(403);

        if ($heroSlide->image && str_starts_with($heroSlide->image, '/storage/')) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $heroSlide->image));
        }

        $heroSlide->delete();
        return response()->json(['message' => 'Slide eliminado.']);
    }
}

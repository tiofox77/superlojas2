<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\HeroSlide;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class HeroSlideController extends Controller
{
    public function index(Request $request)
    {
        $query = HeroSlide::query();

        if ($request->has('store_slug')) {
            $query->where('store_slug', $request->store_slug);
        } elseif ($request->boolean('global_only')) {
            $query->whereNull('store_slug');
        }

        return response()->json($query->orderBy('store_slug')->orderBy('sort_order')->get());
    }

    public function show(HeroSlide $heroSlide)
    {
        return response()->json($heroSlide);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'subtitle' => 'nullable|string|max:500',
            'cta' => 'nullable|string|max:100',
            'cta_link' => 'nullable|string|max:255',
            'bg_color' => 'nullable|string|max:255',
            'image' => 'nullable|file|image|max:4096',
            'store_slug' => 'nullable|string|exists:stores,slug',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $data = $request->except(['image']);

        if (isset($data['store_slug']) && $data['store_slug'] === '') {
            $data['store_slug'] = null;
        }

        // Determinar pasta de upload
        $folder = 'slides/global';
        if (!empty($data['store_slug'])) {
            $store = Store::where('slug', $data['store_slug'])->first();
            if ($store) $folder = "stores/{$store->id}/slides";
        }

        if ($request->hasFile('image')) {
            $data['image'] = '/storage/' . $request->file('image')->store($folder, 'public');
        }

        $heroSlide = HeroSlide::create($data);

        return response()->json($heroSlide, 201);
    }

    public function update(Request $request, HeroSlide $heroSlide)
    {
        $request->validate([
            'title' => 'sometimes|string|max:255',
            'subtitle' => 'sometimes|string|max:500',
            'cta' => 'sometimes|string|max:100',
            'cta_link' => 'sometimes|string|max:255',
            'bg_color' => 'sometimes|string|max:255',
            'image' => 'sometimes|file|image|max:4096',
            'store_slug' => 'sometimes|nullable|string|exists:stores,slug',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $data = $request->except(['image']);

        if (isset($data['store_slug']) && $data['store_slug'] === '') {
            $data['store_slug'] = null;
        }

        if ($request->hasFile('image')) {
            if ($heroSlide->image && str_starts_with($heroSlide->image, '/storage/')) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $heroSlide->image));
            }
            $folder = 'slides/global';
            $storeSlug = $data['store_slug'] ?? $heroSlide->store_slug;
            if ($storeSlug) {
                $store = Store::where('slug', $storeSlug)->first();
                if ($store) $folder = "stores/{$store->id}/slides";
            }
            $data['image'] = '/storage/' . $request->file('image')->store($folder, 'public');
        }

        $heroSlide->update($data);

        return response()->json($heroSlide->fresh());
    }

    public function destroy(HeroSlide $heroSlide)
    {
        if ($heroSlide->image && str_starts_with($heroSlide->image, '/storage/')) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $heroSlide->image));
        }

        $heroSlide->delete();

        return response()->json(['message' => 'Slide eliminado com sucesso.']);
    }

    public function reorder(Request $request)
    {
        $request->validate([
            'slides' => 'required|array|min:1',
            'slides.*.id' => 'required|exists:hero_slides,id',
            'slides.*.sort_order' => 'required|integer|min:0',
        ]);

        foreach ($request->slides as $item) {
            HeroSlide::where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
        }

        return response()->json(['message' => 'Ordem actualizada com sucesso.']);
    }
}

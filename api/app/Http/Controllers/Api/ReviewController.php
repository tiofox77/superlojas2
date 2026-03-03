<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    /**
     * List reviews for a product or store.
     */
    public function index(Request $request)
    {
        $request->validate([
            'type' => 'required|in:product,store',
            'id' => 'required|integer',
        ]);

        $reviews = Review::where('type', $request->type)
            ->where('reviewable_id', $request->id)
            ->where('is_approved', true)
            ->orderByDesc('created_at')
            ->paginate($request->get('per_page', 20));

        // Also return rating distribution
        $distribution = Review::where('type', $request->type)
            ->where('reviewable_id', $request->id)
            ->where('is_approved', true)
            ->selectRaw('rating, COUNT(*) as count')
            ->groupBy('rating')
            ->pluck('count', 'rating')
            ->toArray();

        $stats = Review::where('type', $request->type)
            ->where('reviewable_id', $request->id)
            ->where('is_approved', true)
            ->selectRaw('ROUND(AVG(rating), 1) as avg_rating, COUNT(*) as total')
            ->first();

        return response()->json([
            'reviews' => $reviews,
            'distribution' => $distribution,
            'average_rating' => (float) ($stats->avg_rating ?? 0),
            'total_reviews' => (int) ($stats->total ?? 0),
        ]);
    }

    /**
     * Store a new review (authenticated users).
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => 'required|in:product,store',
            'reviewable_id' => 'required|integer',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|min:3|max:2000',
        ]);

        // Validate that the entity exists
        if ($data['type'] === 'product') {
            Product::findOrFail($data['reviewable_id']);
        } else {
            Store::findOrFail($data['reviewable_id']);
        }

        $user = $request->user();

        // Check if user already reviewed this item
        $existing = Review::where('type', $data['type'])
            ->where('reviewable_id', $data['reviewable_id'])
            ->where('user_id', $user->id)
            ->first();

        if ($existing) {
            // Update existing review
            $existing->update([
                'rating' => $data['rating'],
                'comment' => $data['comment'],
                'author_name' => $user->name,
            ]);
            $review = $existing;
            $message = 'Avaliacao actualizada com sucesso.';
        } else {
            $review = Review::create([
                'type' => $data['type'],
                'reviewable_id' => $data['reviewable_id'],
                'user_id' => $user->id,
                'author_name' => $user->name,
                'rating' => $data['rating'],
                'comment' => $data['comment'],
            ]);
            $message = 'Avaliacao enviada com sucesso.';
        }

        // Recalculate average
        Review::recalculate($data['type'], $data['reviewable_id']);

        return response()->json([
            'message' => $message,
            'review' => $review,
        ], $existing ? 200 : 201);
    }

    /**
     * Delete own review.
     */
    public function destroy(Request $request, Review $review)
    {
        $user = $request->user();
        if ($review->user_id !== $user->id && $user->role !== 'super_admin') {
            abort(403, 'Nao pode eliminar esta avaliacao.');
        }

        $type = $review->type;
        $reviewableId = $review->reviewable_id;
        $review->delete();

        Review::recalculate($type, $reviewableId);

        return response()->json(['message' => 'Avaliacao eliminada.']);
    }

    /**
     * Check if user already reviewed an item.
     */
    public function userReview(Request $request)
    {
        $request->validate([
            'type' => 'required|in:product,store',
            'id' => 'required|integer',
        ]);

        $user = $request->user();
        $review = Review::where('type', $request->type)
            ->where('reviewable_id', $request->id)
            ->where('user_id', $user->id)
            ->first();

        return response()->json(['review' => $review]);
    }
}

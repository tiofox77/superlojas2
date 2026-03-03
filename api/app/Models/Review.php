<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    protected $fillable = [
        'type', 'reviewable_id', 'user_id',
        'author_name', 'rating', 'comment', 'is_approved',
    ];

    protected $casts = [
        'rating' => 'integer',
        'is_approved' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the reviewable entity (product or store).
     */
    public function reviewable()
    {
        return $this->type === 'product'
            ? $this->belongsTo(Product::class, 'reviewable_id')
            : $this->belongsTo(Store::class, 'reviewable_id');
    }

    /**
     * Recalculate and update the average rating on the parent entity.
     */
    public static function recalculate(string $type, int $reviewableId): void
    {
        $stats = static::where('type', $type)
            ->where('reviewable_id', $reviewableId)
            ->where('is_approved', true)
            ->selectRaw('ROUND(AVG(rating), 1) as avg_rating, COUNT(*) as total')
            ->first();

        $model = $type === 'product'
            ? Product::find($reviewableId)
            : Store::find($reviewableId);

        if ($model) {
            $model->update([
                'rating' => $stats->avg_rating ?? 0,
                'review_count' => $stats->total ?? 0,
            ]);
        }
    }
}

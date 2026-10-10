<?php

namespace App\Models;

use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;

/**
 * Sanctum token model that throttles the per-request "last_used_at" write.
 *
 * Sanctum updates last_used_at on EVERY authenticated request. Parallel
 * requests carrying the same token then queue on a single row lock; in
 * production this showed up as "max_statement_time exceeded" on
 * `UPDATE personal_access_tokens ... WHERE id = ?` and fed "Too many
 * connections". Here the write is skipped when nothing else changed and the
 * stored value is still fresh (< 5 minutes).
 */
class PersonalAccessToken extends SanctumPersonalAccessToken
{
    protected const LAST_USED_RESOLUTION_SECONDS = 300;

    protected static function booted(): void
    {
        static::saving(function (self $token) {
            if (!$token->exists) {
                return true; // creating a token — always save
            }

            $dirty = array_keys($token->getDirty());
            $onlyTouchesLastUsed = empty(array_diff($dirty, ['last_used_at', 'updated_at']));
            if (!$onlyTouchesLastUsed) {
                return true;
            }

            $previous = $token->getOriginal('last_used_at');
            if ($previous && now()->diffInSeconds($previous, true) < self::LAST_USED_RESOLUTION_SECONDS) {
                return false; // still fresh — skip this write
            }

            return true;
        });
    }
}

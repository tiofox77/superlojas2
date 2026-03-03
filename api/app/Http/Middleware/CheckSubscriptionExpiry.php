<?php

namespace App\Http\Middleware;

use App\Models\Plan;
use App\Models\Subscription;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class CheckSubscriptionExpiry
{
    /**
     * Run the subscription expiry check automatically, at most once per hour,
     * without requiring a cron job. Triggered on any API request.
     */
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        // Only check once per hour (cache lock)
        if (!Cache::has('subscription_expiry_checked')) {
            try {
                $this->processExpired();
            } catch (\Throwable $e) {
                Log::error('CheckSubscriptionExpiry middleware error: ' . $e->getMessage());
            }

            // Set flag for 1 hour
            Cache::put('subscription_expiry_checked', true, now()->addHour());
        }

        return $response;
    }

    protected function processExpired(): void
    {
        $expired = Subscription::where('status', 'active')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->with(['store', 'plan'])
            ->get();

        if ($expired->isEmpty()) {
            return;
        }

        $freePlan = Plan::where('is_free', true)->first();

        foreach ($expired as $sub) {
            $sub->update(['status' => 'expired']);

            if ($sub->auto_renew) {
                // Create a PENDING renewal — user must pay again
                Subscription::create([
                    'store_id'   => $sub->store_id,
                    'plan_id'    => $sub->plan_id,
                    'status'     => 'pending',
                    'auto_renew' => true,
                    'amount_paid' => $sub->plan->price,
                    'currency'   => 'AOA',
                    'notes'      => 'Renovacao automatica — aguarda pagamento',
                ]);
            }

            // Downgrade store to free (whether auto_renew or not, must pay first)
            if ($freePlan && $sub->store) {
                $sub->store->update([
                    'plan_id'         => $freePlan->id,
                    'plan_expires_at' => null,
                ]);
            }
        }

        Log::info("CheckSubscriptionExpiry: {$expired->count()} subscricoes processadas.");
    }
}

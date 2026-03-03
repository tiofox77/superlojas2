<?php

namespace App\Console\Commands;

use App\Models\Plan;
use App\Models\Subscription;
use Illuminate\Console\Command;

class ExpireSubscriptions extends Command
{
    protected $signature = 'subscriptions:expire';
    protected $description = 'Expire overdue subscriptions and downgrade stores to the free plan';

    public function handle(): int
    {
        $freePlan = Plan::where('is_free', true)->first();

        if (!$freePlan) {
            $this->error('No free plan found. Cannot downgrade stores.');
            return 1;
        }

        // Find active subscriptions that have expired
        $expired = Subscription::where('status', 'active')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->with(['store', 'plan'])
            ->get();

        $renewed = 0;
        $downgraded = 0;

        foreach ($expired as $sub) {
            if ($sub->auto_renew) {
                // Auto-renew: create new subscription (pending payment)
                $newExpiry = Subscription::calcExpiry($sub->plan);

                Subscription::create([
                    'store_id' => $sub->store_id,
                    'plan_id' => $sub->plan_id,
                    'status' => 'pending',
                    'starts_at' => null,
                    'expires_at' => null,
                    'auto_renew' => true,
                    'payment_method' => $sub->payment_method,
                    'amount_paid' => $sub->plan->price,
                    'currency' => 'AOA',
                    'notes' => 'Renovacao automatica — aguardando pagamento',
                ]);

                $sub->update(['status' => 'expired']);

                // Downgrade store until payment confirmed
                $sub->store->update([
                    'plan_id' => $freePlan->id,
                    'plan_expires_at' => null,
                ]);

                $renewed++;
            } else {
                // No auto-renew: expire and downgrade
                $sub->update(['status' => 'expired']);

                $sub->store->update([
                    'plan_id' => $freePlan->id,
                    'plan_expires_at' => null,
                ]);

                $downgraded++;
            }
        }

        $this->info("Processed {$expired->count()} expired subscriptions: {$renewed} pending renewal, {$downgraded} downgraded.");

        return 0;
    }
}

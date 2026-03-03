<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use App\Services\MailService;
use Illuminate\Console\Command;

class SendSubscriptionReminders extends Command
{
    protected $signature = 'subscriptions:remind {--days=7 : Days before expiry to send reminder} {--expire : Also mark expired subscriptions}';
    protected $description = 'Send reminder emails for subscriptions expiring soon and optionally mark expired ones';

    public function handle()
    {
        $days = (int) $this->option('days');
        $mail = new MailService();
        $sent = 0;
        $expired = 0;

        // ─── Reminders for expiring soon ───
        $expiring = Subscription::with(['store.user', 'plan'])
            ->where('status', 'active')
            ->where('expires_at', '<=', now()->addDays($days))
            ->where('expires_at', '>', now())
            ->get();

        foreach ($expiring as $sub) {
            $owner = $sub->store?->user;
            if (!$owner) continue;

            $daysLeft = (int) now()->diffInDays($sub->expires_at, false);
            if ($daysLeft < 0) $daysLeft = 0;

            try {
                $mail->sendSubscriptionReminder(
                    $owner->email,
                    $owner->name,
                    $sub->store->name,
                    $sub->plan->name,
                    $sub->expires_at->format('d/m/Y'),
                    $daysLeft
                );
                $sent++;
            } catch (\Throwable $e) {
                $this->warn("Failed to send to {$owner->email}: {$e->getMessage()}");
            }
        }

        $this->info("Sent {$sent} reminder emails for subscriptions expiring in {$days} days.");

        // ─── Mark expired subscriptions ───
        if ($this->option('expire')) {
            $nowExpired = Subscription::with(['store.user', 'plan'])
                ->where('status', 'active')
                ->where('expires_at', '<=', now())
                ->get();

            foreach ($nowExpired as $sub) {
                $sub->update(['status' => 'expired']);

                // Downgrade to free plan
                $freePlan = \App\Models\Plan::where('is_free', true)->first();
                if ($freePlan && $sub->store) {
                    $sub->store->update([
                        'plan_id' => $freePlan->id,
                        'plan_expires_at' => null,
                    ]);
                }

                // Send expired email
                $owner = $sub->store?->user;
                if ($owner) {
                    try {
                        $mail->sendSubscriptionExpired(
                            $owner->email,
                            $owner->name,
                            $sub->store->name,
                            $sub->plan->name
                        );
                        $expired++;
                    } catch (\Throwable $e) {}
                }
            }

            $this->info("Marked {$nowExpired->count()} subscriptions as expired, sent {$expired} expiry emails.");
        }

        return Command::SUCCESS;
    }
}

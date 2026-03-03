<?php

namespace App\Console\Commands;

use App\Models\Plan;
use App\Models\Subscription;
use Illuminate\Console\Command;

class CheckSubscriptionExpiry extends Command
{
    protected $signature = 'subscription:check-expiry';
    protected $description = 'Check for expired subscriptions and handle auto-renew or downgrade';

    public function handle(): int
    {
        $expired = Subscription::where('status', 'active')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->with(['store', 'plan'])
            ->get();

        if ($expired->isEmpty()) {
            $this->info('Nenhuma subscricao expirada encontrada.');
            return 0;
        }

        $freePlan = Plan::where('is_free', true)->first();
        $renewed = 0;
        $downgraded = 0;

        foreach ($expired as $sub) {
            $sub->update(['status' => 'expired']);

            if ($sub->auto_renew) {
                // Auto-renew ON: create a new PENDING subscription (user must pay again)
                Subscription::create([
                    'store_id'       => $sub->store_id,
                    'plan_id'        => $sub->plan_id,
                    'status'         => 'pending',
                    'auto_renew'     => true,
                    'amount_paid'    => $sub->plan->price,
                    'currency'       => 'AOA',
                    'notes'          => 'Renovacao automatica — aguarda pagamento',
                ]);

                // Downgrade store to free while waiting for payment
                if ($freePlan) {
                    $sub->store->update([
                        'plan_id'         => $freePlan->id,
                        'plan_expires_at' => null,
                    ]);
                }

                $renewed++;
                $this->line("  ↻ Loja \"{$sub->store->name}\" — pedido de renovacao pendente criado");
            } else {
                // Auto-renew OFF: just downgrade to free
                if ($freePlan) {
                    $sub->store->update([
                        'plan_id'         => $freePlan->id,
                        'plan_expires_at' => null,
                    ]);
                }

                $downgraded++;
                $this->line("  ↓ Loja \"{$sub->store->name}\" — downgrade para plano gratuito");
            }
        }

        $this->info("Processadas {$expired->count()} subscricoes: {$renewed} renovacoes pendentes, {$downgraded} downgrades.");
        return 0;
    }
}

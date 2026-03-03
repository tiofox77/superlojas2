<?php

namespace Database\Seeders;

use App\Models\Store;
use Illuminate\Database\Seeder;

class StorePaymentMethodsSeeder extends Seeder
{
    public function run(): void
    {
        $payments = [
            'TechZone Angola' => [
                [
                    'type' => 'multicaixa_express',
                    'label' => 'Multicaixa Express',
                    'account' => '+244 923 456 789',
                    'details' => 'Enviar comprovante apos pagamento',
                    'is_active' => true,
                ],
                [
                    'type' => 'transfer',
                    'label' => 'Transferencia Bancaria',
                    'account' => 'AO06 0006 0000 3456 7890 1234 5',
                    'details' => 'Banco BAI — Titular: TechZone Angola Lda',
                    'is_active' => true,
                ],
            ],
            'Moda Kwanza' => [
                [
                    'type' => 'multicaixa_express',
                    'label' => 'Multicaixa Express',
                    'account' => '+244 912 345 678',
                    'details' => 'Confirmar por WhatsApp apos pagamento',
                    'is_active' => true,
                ],
                [
                    'type' => 'transfer',
                    'label' => 'Transferencia Bancaria',
                    'account' => 'AO06 0040 0000 7890 1234 5678 9',
                    'details' => 'Banco BFA — Titular: Moda Kwanza, S.A.',
                    'is_active' => true,
                ],
                [
                    'type' => 'cash_delivery',
                    'label' => 'Pagamento na Entrega',
                    'account' => '',
                    'details' => 'Apenas para Luanda. Pagar ao entregador.',
                    'is_active' => true,
                ],
            ],
            'Casa Bela' => [
                [
                    'type' => 'multicaixa_express',
                    'label' => 'Multicaixa Express',
                    'account' => '+244 934 567 890',
                    'details' => 'Enviar comprovante por WhatsApp',
                    'is_active' => true,
                ],
                [
                    'type' => 'transfer',
                    'label' => 'Transferencia Bancaria',
                    'account' => 'AO06 0055 0000 1234 5678 9012 3',
                    'details' => 'Banco BIC — Titular: Casa Bela Comercio Geral',
                    'is_active' => true,
                ],
                [
                    'type' => 'cash_delivery',
                    'label' => 'Pagamento na Entrega',
                    'account' => '',
                    'details' => 'Disponivel em Luanda e Benguela',
                    'is_active' => true,
                ],
            ],
            'SportMax' => [
                [
                    'type' => 'multicaixa_express',
                    'label' => 'Multicaixa Express',
                    'account' => '+244 945 678 901',
                    'details' => '',
                    'is_active' => true,
                ],
                [
                    'type' => 'transfer',
                    'label' => 'Transferencia Bancaria',
                    'account' => 'AO06 0021 0000 5678 9012 3456 7',
                    'details' => 'Banco Atlantico — Titular: SportMax Angola Lda',
                    'is_active' => true,
                ],
            ],
        ];

        foreach ($payments as $storeName => $methods) {
            $store = Store::where('name', $storeName)->first();
            if ($store) {
                $store->update(['payment_methods' => $methods]);
                $this->command->info("✓ {$storeName} — " . count($methods) . " metodos de pagamento");
            } else {
                $this->command->warn("✗ Loja '{$storeName}' nao encontrada");
            }
        }
    }
}

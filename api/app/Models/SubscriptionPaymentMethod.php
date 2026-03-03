<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubscriptionPaymentMethod extends Model
{
    protected $fillable = [
        'name',
        'type',
        'bank_name',
        'iban',
        'account_number',
        'account_holder',
        'phone_number',
        'instructions',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];
}

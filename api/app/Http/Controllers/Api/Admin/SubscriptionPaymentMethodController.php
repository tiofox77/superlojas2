<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPaymentMethod;
use Illuminate\Http\Request;

class SubscriptionPaymentMethodController extends Controller
{
    public function index()
    {
        return response()->json(
            SubscriptionPaymentMethod::orderBy('sort_order')->orderBy('name')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:50',
            'bank_name' => 'nullable|string|max:255',
            'iban' => 'nullable|string|max:50',
            'account_number' => 'nullable|string|max:50',
            'account_holder' => 'nullable|string|max:255',
            'phone_number' => 'nullable|string|max:30',
            'instructions' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $method = SubscriptionPaymentMethod::create($data);

        return response()->json($method, 201);
    }

    public function update(Request $request, SubscriptionPaymentMethod $method)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|string|max:50',
            'bank_name' => 'nullable|string|max:255',
            'iban' => 'nullable|string|max:50',
            'account_number' => 'nullable|string|max:50',
            'account_holder' => 'nullable|string|max:255',
            'phone_number' => 'nullable|string|max:30',
            'instructions' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $method->update($data);

        return response()->json($method->fresh());
    }

    public function destroy(SubscriptionPaymentMethod $method)
    {
        $method->delete();
        return response()->json(['message' => 'Metodo de pagamento eliminado.']);
    }
}

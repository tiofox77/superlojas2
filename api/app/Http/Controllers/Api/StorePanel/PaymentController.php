<?php

namespace App\Http\Controllers\Api\StorePanel;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    private function getStore(string $slug)
    {
        return Store::where('slug', $slug)->firstOrFail();
    }

    public function index(string $slug)
    {
        $store = $this->getStore($slug);
        return response()->json($store->payment_methods ?? []);
    }

    public function update(Request $request, string $slug)
    {
        $request->validate([
            'payment_methods' => 'required|array',
            'payment_methods.*.type' => 'required|string',
            'payment_methods.*.label' => 'required|string|max:100',
            'payment_methods.*.details' => 'nullable|string|max:500',
            'payment_methods.*.account' => 'nullable|string|max:200',
            'payment_methods.*.is_active' => 'required|boolean',
        ]);

        $store = $this->getStore($slug);
        $store->payment_methods = $request->payment_methods;
        $store->save();

        return response()->json([
            'message' => 'Metodos de pagamento actualizados com sucesso.',
            'payment_methods' => $store->payment_methods,
        ]);
    }
}

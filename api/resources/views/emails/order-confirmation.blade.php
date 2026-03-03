@extends('emails.layout')

@section('content')
<h2>Pedido Confirmado! 🛒</h2>

<p>Ola <strong>{{ $customerName }}</strong>,</p>

<p>O seu pedido foi registado com sucesso! Aqui estao os detalhes:</p>

<div class="alert alert-success">
  ✅ Pedido <strong>#{{ $orderNumber }}</strong> — {{ $storeName }}
</div>

<div class="info-box">
  <table>
    <tr><td>Numero:</td><td><strong>{{ $orderNumber }}</strong></td></tr>
    <tr><td>Loja:</td><td>{{ $storeName }}</td></tr>
    <tr><td>Estado:</td><td>Pendente</td></tr>
    <tr><td>Pagamento:</td><td>{{ $paymentMethod }}</td></tr>
  </table>
</div>

<h3>Itens do Pedido</h3>
<table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0">
  <tr style="border-bottom:2px solid #e5e7eb">
    <td style="padding:8px 0;font-weight:600;color:#374151">Produto</td>
    <td style="padding:8px 0;font-weight:600;color:#374151;text-align:center">Qtd</td>
    <td style="padding:8px 0;font-weight:600;color:#374151;text-align:right">Total</td>
  </tr>
  @foreach($items as $item)
  <tr style="border-bottom:1px solid #f3f4f6">
    <td style="padding:8px 0;color:#374151">{{ $item['product_name'] }}</td>
    <td style="padding:8px 0;color:#6b7280;text-align:center">x{{ $item['quantity'] }}</td>
    <td style="padding:8px 0;color:#374151;text-align:right;font-weight:500">{{ number_format($item['total'], 0, ',', '.') }} Kz</td>
  </tr>
  @endforeach
  <tr style="border-top:2px solid #e5e7eb">
    <td colspan="2" style="padding:6px 0;color:#6b7280;font-size:12px">Subtotal</td>
    <td style="padding:6px 0;text-align:right;color:#374151">{{ number_format($subtotal, 0, ',', '.') }} Kz</td>
  </tr>
  <tr>
    <td colspan="2" style="padding:4px 0;color:#6b7280;font-size:12px">Entrega</td>
    <td style="padding:4px 0;text-align:right;color:#374151">{{ number_format($deliveryFee, 0, ',', '.') }} Kz</td>
  </tr>
  <tr>
    <td colspan="2" style="padding:8px 0;font-weight:700;color:#111827;font-size:15px">Total</td>
    <td style="padding:8px 0;text-align:right;font-weight:700;color:#f97316;font-size:15px">{{ number_format($total, 0, ',', '.') }} Kz</td>
  </tr>
</table>

<div class="info-box">
  <h3>Dados de Entrega</h3>
  <table>
    <tr><td>Nome:</td><td>{{ $customerName }}</td></tr>
    <tr><td>Telefone:</td><td>{{ $customerPhone }}</td></tr>
    <tr><td>Endereco:</td><td>{{ $customerAddress }}, {{ $customerProvince }}</td></tr>
    @if($customerNotes)
    <tr><td>Notas:</td><td>{{ $customerNotes }}</td></tr>
    @endif
  </table>
</div>

<hr class="divider">

<p class="muted">Ira receber notificacoes quando o estado do seu pedido mudar. A loja entrara em contacto para confirmar a entrega.</p>
@endsection

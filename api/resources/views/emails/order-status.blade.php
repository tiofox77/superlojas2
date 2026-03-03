@extends('emails.layout')

@section('content')
<h2>Actualizacao do Pedido #{{ $orderNumber }}</h2>

<p>Ola <strong>{{ $customerName }}</strong>,</p>

<p>O estado do seu pedido <strong>#{{ $orderNumber }}</strong> foi actualizado.</p>

@if($status === 'confirmed')
<div class="alert alert-success">
  ✅ O seu pedido foi <strong>confirmado</strong> pela loja <strong>{{ $storeName }}</strong>!
</div>
@elseif($status === 'processing')
<div class="alert alert-info">
  📦 O seu pedido esta a ser <strong>preparado</strong> pela loja <strong>{{ $storeName }}</strong>.
</div>
@elseif($status === 'shipped')
<div class="alert alert-info">
  🚚 O seu pedido foi <strong>enviado</strong>! Esteja atento ao seu telefone para a entrega.
</div>
@elseif($status === 'delivered')
<div class="alert alert-success">
  🎉 O seu pedido foi <strong>entregue</strong> com sucesso! Obrigado pela sua compra.
</div>
@elseif($status === 'cancelled')
<div class="alert alert-danger">
  ❌ O seu pedido foi <strong>cancelado</strong>.
  @if(!empty($cancelReason))
  <br><strong>Motivo:</strong> {{ $cancelReason }}
  @endif
</div>
@endif

<div class="info-box">
  <table>
    <tr><td>Pedido:</td><td><strong>#{{ $orderNumber }}</strong></td></tr>
    <tr><td>Loja:</td><td>{{ $storeName }}</td></tr>
    <tr><td>Estado anterior:</td><td>{{ $previousStatus }}</td></tr>
    <tr><td>Novo estado:</td><td><strong>{{ $statusLabel }}</strong></td></tr>
    <tr><td>Total:</td><td>{{ number_format($total, 0, ',', '.') }} Kz</td></tr>
  </table>
</div>

<hr class="divider">

<p class="muted">Se tiver alguma duvida, contacte a loja directamente ou o nosso suporte.</p>
@endsection

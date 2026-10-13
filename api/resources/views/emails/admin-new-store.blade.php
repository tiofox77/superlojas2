@extends('emails.layout')

@section('content')
<h2>Nova Loja Registada 🏪</h2>

<p>Uma nova loja foi registada no {{ $siteName }}.</p>

<div class="info-box">
  <table>
    <tr><td><strong>Loja:</strong></td><td>{{ $storeName }}</td></tr>
    <tr><td><strong>Proprietario:</strong></td><td>{{ $ownerName }}</td></tr>
    <tr><td><strong>Email:</strong></td><td>{{ $ownerEmail }}</td></tr>
    <tr><td><strong>Provincia:</strong></td><td>{{ $province }}</td></tr>
    <tr><td><strong>Categoria:</strong></td><td>{{ $category }}</td></tr>
    <tr><td><strong>WhatsApp:</strong></td><td>{{ $whatsapp }}</td></tr>
    <tr><td><strong>Estado:</strong></td><td>{{ $status }}</td></tr>
    <tr><td><strong>Data:</strong></td><td>{{ $registeredAt }}</td></tr>
  </table>
</div>

<p class="muted">Total de lojas na plataforma: <strong>{{ $totalStores }}</strong></p>

<div style="text-align:center;margin:24px 0">
  <a href="{{ $adminUrl }}" class="btn">Ver Lojas</a>
</div>
@endsection

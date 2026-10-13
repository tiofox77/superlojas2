@extends('emails.layout')

@section('content')
<h2>Novo Utilizador Registado 👤</h2>

<p>Um novo utilizador acabou de se registar no {{ $siteName }}.</p>

<div class="info-box">
  <table>
    <tr><td><strong>Nome:</strong></td><td>{{ $userName }}</td></tr>
    <tr><td><strong>Email:</strong></td><td>{{ $userEmail }}</td></tr>
    @if(!empty($userPhone))
    <tr><td><strong>Telefone:</strong></td><td>{{ $userPhone }}</td></tr>
    @endif
    <tr><td><strong>Data:</strong></td><td>{{ $registeredAt }}</td></tr>
  </table>
</div>

<p class="muted">Total de utilizadores registados: <strong>{{ $totalUsers }}</strong></p>

<div style="text-align:center;margin:24px 0">
  <a href="{{ $adminUrl }}" class="btn">Ver Utilizadores</a>
</div>
@endsection

@extends('emails.layout')

@section('content')
<h2>Subscricao Expira em Breve ⚠️</h2>

<p>Ola <strong>{{ $userName }}</strong>,</p>

<p>A subscricao do plano <strong>{{ $planName }}</strong> da sua loja <strong>"{{ $storeName }}"</strong> expira em <strong>{{ $daysLeft }} dia{{ $daysLeft > 1 ? 's' : '' }}</strong>.</p>

<div class="alert alert-warning">
  ⏳ Data de expiracao: <strong>{{ $expiresAt }}</strong>
</div>

<div class="info-box">
  <table>
    <tr><td>Loja:</td><td>{{ $storeName }}</td></tr>
    <tr><td>Plano actual:</td><td>{{ $planName }}</td></tr>
    <tr><td>Expira em:</td><td>{{ $expiresAt }}</td></tr>
    <tr><td>Dias restantes:</td><td>{{ $daysLeft }}</td></tr>
  </table>
</div>

<p>Renove agora para nao perder acesso as funcionalidades premium da sua loja.</p>

<p style="text-align:center;margin:24px 0">
  <a href="{{ config('app.url') }}" class="btn">Renovar Agora</a>
</p>

<hr class="divider">

<p class="muted">Se ja efectuou o pagamento, ignore este email. A activacao pode demorar ate 24h.</p>
@endsection

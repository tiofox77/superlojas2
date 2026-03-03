@extends('emails.layout')

@section('content')
<h2>Subscricao Activada! 🚀</h2>

<p>Ola <strong>{{ $userName }}</strong>,</p>

<p>A subscricao da sua loja <strong>"{{ $storeName }}"</strong> foi activada com sucesso!</p>

<div class="alert alert-success">
  ✅ O plano <strong>{{ $planName }}</strong> esta agora activo.
</div>

<div class="info-box">
  <table>
    <tr><td>Loja:</td><td>{{ $storeName }}</td></tr>
    <tr><td>Plano:</td><td>{{ $planName }}</td></tr>
    <tr><td>Valido ate:</td><td>{{ $expiresAt }}</td></tr>
  </table>
</div>

<p>Aproveite todos os recursos do seu plano para fazer crescer o seu negocio!</p>

<hr class="divider">

<p class="muted">A sua subscricao sera renovada automaticamente. Pode gerir a sua subscricao no painel da loja.</p>
@endsection

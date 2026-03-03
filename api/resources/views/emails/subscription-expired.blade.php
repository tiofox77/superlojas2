@extends('emails.layout')

@section('content')
<h2>Subscricao Expirada ⏰</h2>

<p>Ola <strong>{{ $userName }}</strong>,</p>

<p>A subscricao do plano <strong>{{ $planName }}</strong> da sua loja <strong>"{{ $storeName }}"</strong> expirou.</p>

<div class="alert alert-danger">
  ❌ A sua loja foi revertida para o plano gratuito. Algumas funcionalidades podem estar limitadas.
</div>

<div class="info-box">
  <h3>O que acontece agora:</h3>
  <ul style="color:#374151;font-size:13px;padding-left:20px;margin:8px 0 0">
    <li>A sua loja continua visivel, mas com funcionalidades limitadas</li>
    <li>Os produtos existentes permanecem publicados</li>
    <li>Podera ter limites no numero de novos produtos</li>
    <li>Renove a subscricao para recuperar todas as funcionalidades</li>
  </ul>
</div>

<p style="text-align:center;margin:24px 0">
  <a href="{{ config('app.url') }}" class="btn btn-secondary">Renovar Subscricao</a>
</p>

<hr class="divider">

<p class="muted">Nao perca clientes — renove agora e continue a crescer!</p>
@endsection

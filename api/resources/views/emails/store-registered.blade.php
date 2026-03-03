@extends('emails.layout')

@section('content')
<h2>Loja Registada com Sucesso! 🏪</h2>

<p>Ola <strong>{{ $userName }}</strong>,</p>

<p>A sua loja <strong>"{{ $storeName }}"</strong> foi registada com sucesso no {{ $siteName }}!</p>

<div class="alert alert-info">
  📋 A sua loja esta agora <strong>em analise</strong>. A nossa equipa ira verificar os dados e aprovar a sua loja o mais brevemente possivel.
</div>

<div class="info-box">
  <table>
    <tr><td>Loja:</td><td>{{ $storeName }}</td></tr>
    <tr><td>Estado:</td><td>Em analise (pendente)</td></tr>
    <tr><td>Prazo estimado:</td><td>24 a 48 horas</td></tr>
  </table>
</div>

<p>Enquanto aguarda a aprovacao, pode preparar os seus produtos e imagens para comecar a vender assim que a loja for activada.</p>

<hr class="divider">

<p class="muted">Sera notificado por email assim que a sua loja for aprovada. Obrigado pela paciencia!</p>
@endsection

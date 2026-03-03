@extends('emails.layout')

@section('content')
<h2>A Sua Loja Foi Suspensa</h2>

<p>Ola <strong>{{ $userName }}</strong>,</p>

<p>Lamentamos informar que a sua loja <strong>"{{ $storeName }}"</strong> foi <span style="color:#dc2626;font-weight:bold">suspensa/banida</span> da plataforma SuperLojas.</p>

<div class="alert alert-danger">
  <strong>Motivo da suspensao:</strong><br>
  {{ $reason }}
</div>

<div class="info-box">
  <h3>O que isto significa:</h3>
  <ul style="color:#374151;font-size:13px;padding-left:20px;margin:8px 0 0">
    <li>A sua loja ja nao esta visivel para os clientes</li>
    <li>Nao podera receber novos pedidos</li>
    <li>Os produtos da loja foram desactivados</li>
    <li>O acesso ao painel da loja esta restrito</li>
  </ul>
</div>

<div class="info-box" style="margin-top:16px">
  <h3>O que pode fazer:</h3>
  <ul style="color:#374151;font-size:13px;padding-left:20px;margin:8px 0 0">
    <li>Reveja o motivo da suspensao indicado acima</li>
    <li>Corrija a situacao que levou a suspensao</li>
    <li>Contacte a nossa equipa de suporte para recorrer da decisao</li>
  </ul>
</div>

<p style="text-align:center;margin-top:24px">
  <a href="mailto:carlos@softecangola.net" class="btn" style="background:#dc2626">Contactar Suporte</a>
</p>

<hr class="divider">

<p class="muted">Se acha que isto foi um erro, entre em contacto connosco o mais rapidamente possivel para que possamos analisar o seu caso.</p>
@endsection

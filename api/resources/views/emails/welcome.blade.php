@extends('emails.layout')

@section('content')
<h2>Bem-vindo ao {{ $siteName }}! 🎉</h2>

<p>Ola <strong>{{ $userName }}</strong>,</p>

<p>A sua conta foi criada com sucesso! Estamos muito felizes por te-lo connosco.</p>

<div class="info-box">
  <p style="margin:0;font-size:13px;color:#374151;">Com a sua conta pode:</p>
  <ul style="color:#374151;font-size:13px;padding-left:20px;margin:8px 0 0">
    <li>Explorar centenas de produtos de lojas angolanas</li>
    <li>Guardar os seus produtos favoritos</li>
    <li>Fazer compras de forma rapida e segura</li>
    <li>Acompanhar o estado das suas encomendas</li>
  </ul>
</div>

<p style="text-align:center;margin-top:24px">
  <a href="{{ config('app.url') }}" class="btn">Comecar a Explorar</a>
</p>

<hr class="divider">

<p class="muted">Tem alguma duvida? Responda a este email ou visite a nossa pagina de contacto.</p>
@endsection

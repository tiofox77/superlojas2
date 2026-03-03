@extends('emails.layout')

@section('content')
<h2>Loja Aprovada! 🎉</h2>

<p>Ola <strong>{{ $userName }}</strong>,</p>

<p>Temos otimas noticias! A sua loja <strong>"{{ $storeName }}"</strong> foi <span style="color:#16a34a;font-weight:700">aprovada</span> e ja esta activa no {{ $siteName }}.</p>

<div class="alert alert-success">
  ✅ A sua loja esta pronta para receber clientes! Adicione os seus produtos e comece a vender.
</div>

@if(!empty($storeUrl))
<p style="text-align:center;margin:24px 0">
  <a href="{{ $storeUrl }}" class="btn">Ir para o Painel da Loja</a>
</p>
@endif

<div class="info-box">
  <h3>Proximos passos:</h3>
  <ol style="color:#374151;font-size:13px;padding-left:20px;margin:8px 0 0">
    <li>Adicione os seus produtos com fotos e descricoes</li>
    <li>Configure os metodos de pagamento</li>
    <li>Personalize o banner e as cores da loja</li>
    <li>Partilhe a sua loja nas redes sociais</li>
  </ol>
</div>

<hr class="divider">

<p class="muted">Precisa de ajuda? Contacte-nos a qualquer momento.</p>
@endsection

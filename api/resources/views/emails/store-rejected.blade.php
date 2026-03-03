@extends('emails.layout')

@section('content')
<h2>Registo de Loja Nao Aprovado</h2>

<p>Ola <strong>{{ $userName }}</strong>,</p>

<p>Lamentamos informar que o registo da sua loja <strong>"{{ $storeName }}"</strong> nao foi aprovado nesta fase.</p>

@if(!empty($reason))
<div class="alert alert-danger">
  <strong>Motivo:</strong> {{ $reason }}
</div>
@else
<div class="alert alert-warning">
  A sua loja nao cumpriu os requisitos necessarios para aprovacao. Isto pode dever-se a informacoes incompletas ou que necessitam de correcao.
</div>
@endif

<div class="info-box">
  <h3>O que pode fazer:</h3>
  <ul style="color:#374151;font-size:13px;padding-left:20px;margin:8px 0 0">
    <li>Verifique se todas as informacoes estao correctas</li>
    <li>Certifique-se de que o logo da loja e de boa qualidade</li>
    <li>Revise a descricao da loja para ser mais detalhada</li>
    <li>Tente registar a loja novamente com os dados corrigidos</li>
  </ul>
</div>

<p style="text-align:center;margin-top:24px">
  <a href="{{ config('app.url') }}/cadastro-loja" class="btn">Tentar Novamente</a>
</p>

<hr class="divider">

<p class="muted">Se acha que isto foi um erro, contacte a nossa equipa de suporte.</p>
@endsection

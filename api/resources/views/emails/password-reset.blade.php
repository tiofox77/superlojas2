@extends('emails.layout')

@section('content')
<h2>Recuperar Palavra-passe 🔐</h2>

<p>Ola <strong>{{ $userName }}</strong>,</p>

<p>Recebemos um pedido para redefinir a palavra-passe da sua conta no {{ $siteName }}.</p>

<p style="text-align:center;margin:24px 0">
  <a href="{{ $resetUrl }}" class="btn">Redefinir Palavra-passe</a>
</p>

<div class="alert alert-warning">
  ⚠️ Este link expira em <strong>60 minutos</strong>. Se nao solicitou esta alteracao, ignore este email.
</div>

<hr class="divider">

<p class="muted">Se o botao nao funcionar, copie e cole este link no seu navegador:</p>
<p class="muted" style="word-break:break-all;">{{ $resetUrl }}</p>
@endsection

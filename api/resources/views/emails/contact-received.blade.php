@extends('emails.layout')

@section('content')
<h2>Nova Mensagem de Contacto 📩</h2>

<p>Foi recebida uma nova mensagem atraves do formulario de contacto do {{ $siteName }}.</p>

<div class="info-box">
  <table>
    <tr><td>Nome:</td><td>{{ $contactName }}</td></tr>
    <tr><td>Email:</td><td>{{ $contactEmail }}</td></tr>
    <tr><td>Assunto:</td><td>{{ $contactSubject }}</td></tr>
  </table>
</div>

<div style="background:#f8fafc;border-left:4px solid #f97316;padding:16px;border-radius:0 10px 10px 0;margin:16px 0">
  <p style="margin:0;font-size:13px;color:#374151;white-space:pre-wrap;">{{ $contactMessage }}</p>
</div>

<hr class="divider">

<p class="muted">Responda directamente para <strong>{{ $contactEmail }}</strong></p>
@endsection

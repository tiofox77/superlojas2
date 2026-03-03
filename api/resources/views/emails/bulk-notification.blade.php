@extends('emails.layout')

@section('content')
<h2>{{ $emailSubject }}</h2>

<p>Ola <strong>{{ $userName }}</strong>,</p>

<div class="info-box">
  {!! nl2br(e($emailBody)) !!}
</div>

<hr class="divider">

<p class="muted">Esta mensagem foi enviada pela equipa {{ $siteName }}.</p>
@endsection

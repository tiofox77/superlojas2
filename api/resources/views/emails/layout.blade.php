<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{ $siteName ?? 'SuperLojas' }}</title>
<style>
  body{margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
  .wrapper{width:100%;background:#f4f4f7;padding:32px 0}
  .container{max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)}
  .header{background:linear-gradient(135deg,#f97316,#ea580c);padding:28px 32px;text-align:center}
  .header img{max-height:40px;margin-bottom:8px}
  .header h1{color:#fff;font-size:18px;font-weight:700;margin:0}
  .body{padding:32px}
  .body p{color:#374151;font-size:14px;line-height:1.7;margin:0 0 16px}
  .body h2{color:#111827;font-size:18px;font-weight:700;margin:0 0 8px}
  .body h3{color:#374151;font-size:15px;font-weight:600;margin:0 0 6px}
  .btn{display:inline-block;background:#f97316;color:#fff!important;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;margin:8px 0}
  .btn-secondary{background:#6366f1}
  .btn-danger{background:#ef4444}
  .info-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:16px 0}
  .info-box td{padding:4px 12px 4px 0;font-size:13px;color:#64748b}
  .info-box td:first-child{font-weight:600;color:#374151}
  .alert{border-radius:10px;padding:14px 16px;margin:16px 0;font-size:13px;font-weight:500}
  .alert-warning{background:#fef3c7;color:#92400e;border:1px solid #fde68a}
  .alert-success{background:#dcfce7;color:#166534;border:1px solid #bbf7d0}
  .alert-danger{background:#fee2e2;color:#991b1b;border:1px solid #fecaca}
  .alert-info{background:#dbeafe;color:#1e40af;border:1px solid #bfdbfe}
  .divider{border:none;border-top:1px solid #e5e7eb;margin:24px 0}
  .footer{padding:20px 32px;text-align:center;background:#f8fafc}
  .footer p{color:#9ca3af;font-size:11px;line-height:1.6;margin:0}
  .footer a{color:#f97316;text-decoration:none}
  .muted{color:#9ca3af;font-size:12px}
</style>
</head>
<body>
<div class="wrapper">
  <div class="container">
    <div class="header">
      @if(!empty($siteLogo))
        <img src="{{ $siteLogo }}" alt="{{ $siteName ?? 'SuperLojas' }}">
      @endif
      <h1>{{ $siteName ?? 'SuperLojas' }}</h1>
    </div>
    <div class="body">
      @yield('content')
    </div>
    <div class="footer">
      <p>&copy; {{ $year ?? date('Y') }} {{ $siteName ?? 'SuperLojas' }}. Todos os direitos reservados.</p>
      <p>Este email foi enviado automaticamente. Nao responda directamente.</p>
    </div>
  </div>
</div>
</body>
</html>

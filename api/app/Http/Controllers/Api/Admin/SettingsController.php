<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Mailer\Transport;
use Symfony\Component\Mailer\Mailer;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\Address;

class SettingsController extends Controller
{
    public function index()
    {
        $settings = Setting::all()->pluck('value', 'key');
        return response()->json($settings);
    }

    public function update(Request $request)
    {
        $request->validate([
            'settings' => 'required|array',
        ]);

        foreach ($request->settings as $key => $value) {
            Setting::set($key, $value);
        }

        return response()->json(['message' => 'Configuracoes guardadas com sucesso.']);
    }

    /**
     * Upload site logo or favicon.
     */
    public function uploadFile(Request $request)
    {
        $request->validate([
            'file' => 'required|file|image|max:2048',
            'type' => 'required|in:site_logo,site_favicon',
        ]);

        $type = $request->type;
        $folder = $type === 'site_favicon' ? 'site/favicon' : 'site/logo';

        // Delete old file
        $old = Setting::get($type);
        if ($old && str_starts_with($old, '/storage/')) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $old));
        }

        $path = '/storage/' . $request->file('file')->store($folder, 'public');
        Setting::set($type, $path);

        return response()->json(['message' => 'Ficheiro carregado com sucesso.', 'url' => $path]);
    }

    /**
     * Build a fresh Symfony Mailer from the saved SMTP settings.
     */
    private function buildSmtpConfig(): array
    {
        $smtpRaw = Setting::get('smtp');
        if (!$smtpRaw) {
            throw new \RuntimeException('SMTP nao configurado. Guarde as configuracoes primeiro.');
        }

        $smtp = json_decode($smtpRaw, true);
        if (!$smtp || empty($smtp['host'])) {
            throw new \RuntimeException('Configuracao SMTP incompleta (host em falta).');
        }

        return $smtp;
    }

    /**
     * Create a Symfony Mailer Transport DSN from config array.
     */
    private function buildTransport(array $smtp): \Symfony\Component\Mailer\Transport\TransportInterface
    {
        $host       = $smtp['host'];
        $port       = (int) ($smtp['port'] ?? 587);
        $username   = $smtp['username'] ?? '';
        $password   = $smtp['password'] ?? '';
        $encryption = $smtp['encryption'] ?? 'tls';
        $timeout    = (int) ($smtp['timeout'] ?? 30);
        $authMode   = $smtp['auth_mode'] ?? '';    // login, plain, cram-md5, ''
        $verifyPeer = ($smtp['verify_peer'] ?? 'true') !== 'false';

        // Build DSN: smtp[s]://user:pass@host:port
        $scheme = match ($encryption) {
            'ssl'  => 'smtps',
            'tls'  => 'smtp',
            'none', '' => 'smtp',
            default => 'smtp',
        };

        $encodedUser = urlencode($username);
        $encodedPass = urlencode($password);

        $dsn = "{$scheme}://{$encodedUser}:{$encodedPass}@{$host}:{$port}";

        $params = [];
        if (!$verifyPeer) {
            $params[] = 'verify_peer=0';
        }
        if ($encryption === 'tls') {
            // STARTTLS on plain smtp
        }
        if ($authMode && $authMode !== 'auto') {
            $params[] = "auth_mode={$authMode}";
        }

        if (!empty($params)) {
            $dsn .= '?' . implode('&', $params);
        }

        $transport = Transport::fromDsn($dsn);

        return $transport;
    }

    /**
     * Send a test email using the saved SMTP configuration.
     */
    public function testEmail(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        try {
            $smtp      = $this->buildSmtpConfig();
            $transport = $this->buildTransport($smtp);
            $mailer    = new Mailer($transport);

            $fromAddress = $smtp['from_address'] ?? 'noreply@superlojas.ao';
            $fromName    = $smtp['from_name'] ?? 'SuperLojas';

            $email = (new Email())
                ->from(new Address($fromAddress, $fromName))
                ->to($request->email)
                ->subject('Teste SMTP — SuperLojas')
                ->text("Este e um email de teste do SuperLojas.\n\nServidor: {$smtp['host']}:{$smtp['port']}\nEncriptacao: {$smtp['encryption']}\n\nSe esta a ler esta mensagem, o SMTP esta a funcionar correctamente!")
                ->html("
                    <div style='font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;'>
                        <h2 style='color:#f97316;margin-bottom:8px;'>SuperLojas — Teste SMTP</h2>
                        <p>Este e um email de teste enviado a partir do painel de administracao.</p>
                        <hr style='border:none;border-top:1px solid #eee;margin:16px 0;'>
                        <table style='font-size:13px;color:#555;'>
                            <tr><td style='padding:4px 12px 4px 0;font-weight:bold;'>Servidor:</td><td>{$smtp['host']}:{$smtp['port']}</td></tr>
                            <tr><td style='padding:4px 12px 4px 0;font-weight:bold;'>Encriptacao:</td><td>{$smtp['encryption']}</td></tr>
                            <tr><td style='padding:4px 12px 4px 0;font-weight:bold;'>Utilizador:</td><td>{$smtp['username']}</td></tr>
                        </table>
                        <hr style='border:none;border-top:1px solid #eee;margin:16px 0;'>
                        <p style='color:#22c55e;font-weight:bold;'>✅ O SMTP esta a funcionar correctamente!</p>
                    </div>
                ");

            $mailer->send($email);

            return response()->json(['message' => 'Email de teste enviado com sucesso para ' . $request->email]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Erro ao enviar email: ' . $e->getMessage(),
                'debug'   => config('app.debug') ? [
                    'exception' => get_class($e),
                    'file'      => $e->getFile() . ':' . $e->getLine(),
                ] : null,
            ], 500);
        }
    }

    /**
     * Test SMTP connection only (without sending).
     */
    public function testConnection(Request $request)
    {
        try {
            $smtp      = $this->buildSmtpConfig();
            $transport = $this->buildTransport($smtp);

            // Force connection to verify credentials
            $transport->start();

            return response()->json([
                'message' => 'Conexao SMTP estabelecida com sucesso.',
                'details' => [
                    'host' => $smtp['host'],
                    'port' => $smtp['port'],
                    'encryption' => $smtp['encryption'],
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Falha na conexao SMTP: ' . $e->getMessage(),
                'debug'   => config('app.debug') ? [
                    'exception' => get_class($e),
                ] : null,
            ], 500);
        }
    }
}

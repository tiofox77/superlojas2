<?php

namespace App\Services;

use App\Models\EmailLog;
use App\Models\Setting;
use Symfony\Component\Mailer\Transport;
use Symfony\Component\Mailer\Mailer;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\Address;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\View;

class MailService
{
    private ?array $smtpConfig = null;
    private ?Mailer $mailer = null;

    /**
     * Load SMTP config from DB settings.
     */
    private function loadConfig(): array
    {
        if ($this->smtpConfig) return $this->smtpConfig;

        $raw = Setting::get('smtp');
        if (!$raw) throw new \RuntimeException('SMTP nao configurado.');

        $config = json_decode($raw, true);
        if (!$config || empty($config['host'])) {
            throw new \RuntimeException('Configuracao SMTP incompleta.');
        }

        $this->smtpConfig = $config;
        return $config;
    }

    /**
     * Build a fresh Symfony Mailer instance.
     */
    private function getMailer(): Mailer
    {
        if ($this->mailer) return $this->mailer;

        $smtp = $this->loadConfig();

        $host       = $smtp['host'];
        $port       = (int) ($smtp['port'] ?? 587);
        $username   = $smtp['username'] ?? '';
        $password   = $smtp['password'] ?? '';
        $encryption = $smtp['encryption'] ?? 'tls';
        $verifyPeer = ($smtp['verify_peer'] ?? 'true') !== 'false';
        $authMode   = $smtp['auth_mode'] ?? '';

        $scheme = match ($encryption) {
            'ssl'  => 'smtps',
            'tls'  => 'smtp',
            'none', '' => 'smtp',
            default => 'smtp',
        };

        $dsn = "{$scheme}://" . urlencode($username) . ":" . urlencode($password) . "@{$host}:{$port}";

        $params = [];
        if (!$verifyPeer) $params[] = 'verify_peer=0';
        if ($authMode && $authMode !== 'auto') $params[] = "auth_mode={$authMode}";
        if (!empty($params)) $dsn .= '?' . implode('&', $params);

        $this->mailer = new Mailer(Transport::fromDsn($dsn));
        return $this->mailer;
    }

    /**
     * Get the from address configured in settings.
     */
    private function getFrom(): Address
    {
        $smtp = $this->loadConfig();
        return new Address(
            $smtp['from_address'] ?? 'noreply@superlojas.ao',
            $smtp['from_name'] ?? 'SuperLojas'
        );
    }

    /**
     * Get site name from settings.
     */
    public function getSiteName(): string
    {
        return Setting::get('site_name', 'SuperLojas') ?: 'SuperLojas';
    }

    /**
     * Get site logo URL from settings.
     */
    public function getSiteLogo(): string
    {
        $logo = Setting::get('site_logo', '');
        if ($logo && !str_starts_with($logo, 'http')) {
            $logo = rtrim(config('app.url', ''), '/') . $logo;
        }
        return $logo;
    }

    /**
     * Send an email using a blade template.
     */
    public function send(string $to, string $subject, string $template, array $data = []): bool
    {
        $start = microtime(true);
        $log = EmailLog::create([
            'to' => $to,
            'subject' => $subject,
            'template' => $template,
            'status' => 'pending',
            'data' => $data,
        ]);

        try {
            $mailer = $this->getMailer();

            // Add common data
            $data['siteName'] = $this->getSiteName();
            $data['siteLogo'] = $this->getSiteLogo();
            $data['year'] = date('Y');

            $html = View::make("emails.{$template}", $data)->render();
            $text = strip_tags(str_replace(['<br>', '<br/>', '<br />', '</p>', '</li>'], "\n", $html));

            $email = (new Email())
                ->from($this->getFrom())
                ->to($to)
                ->subject($subject)
                ->html($html)
                ->text($text);

            $mailer->send($email);

            $log->update([
                'status' => 'sent',
                'duration_ms' => (int) ((microtime(true) - $start) * 1000),
            ]);

            Log::info("Email sent: {$template} -> {$to}");
            return true;
        } catch (\Throwable $e) {
            $log->update([
                'status' => 'failed',
                'error' => $e->getMessage(),
                'duration_ms' => (int) ((microtime(true) - $start) * 1000),
            ]);

            Log::error("Email failed: {$template} -> {$to}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Render an email template to HTML (for preview, no send).
     */
    public function preview(string $template, array $data = []): string
    {
        $data['siteName'] = $this->getSiteName();
        $data['siteLogo'] = $this->getSiteLogo();
        $data['year'] = date('Y');

        return View::make("emails.{$template}", $data)->render();
    }

    /**
     * Get all available template names with sample data for testing.
     */
    public static function getTemplates(): array
    {
        return [
            [
                'key' => 'welcome',
                'label' => 'Boas-vindas (Registo)',
                'description' => 'Enviado quando um novo utilizador se regista',
                'sampleData' => ['userName' => 'Joao Silva'],
                'sampleSubject' => 'Bem-vindo ao {siteName}!',
            ],
            [
                'key' => 'password-reset',
                'label' => 'Recuperar Palavra-passe',
                'description' => 'Enviado quando o utilizador pede para recuperar a password',
                'sampleData' => ['userName' => 'Joao Silva', 'resetUrl' => 'https://superlojas.ao/entrar?reset=abc123'],
                'sampleSubject' => 'Recuperar palavra-passe',
            ],
            [
                'key' => 'store-registered',
                'label' => 'Loja Registada (Pendente)',
                'description' => 'Enviado ao dono quando a loja e registada e fica pendente de aprovacao',
                'sampleData' => ['userName' => 'Maria Santos', 'storeName' => 'Loja da Maria'],
                'sampleSubject' => 'Loja registada — em analise',
            ],
            [
                'key' => 'store-approved',
                'label' => 'Loja Aprovada',
                'description' => 'Enviado ao dono quando o admin aprova a loja',
                'sampleData' => ['userName' => 'Maria Santos', 'storeName' => 'Loja da Maria', 'storeUrl' => 'https://superlojas.ao/loja/loja-da-maria/painel'],
                'sampleSubject' => 'A sua loja foi aprovada!',
            ],
            [
                'key' => 'store-rejected',
                'label' => 'Loja Rejeitada',
                'description' => 'Enviado ao dono quando o admin rejeita a loja',
                'sampleData' => ['userName' => 'Maria Santos', 'storeName' => 'Loja da Maria', 'reason' => 'Informacoes incompletas. Por favor adicione uma descricao mais detalhada.'],
                'sampleSubject' => 'Loja nao aprovada',
            ],
            [
                'key' => 'subscription-activated',
                'label' => 'Subscricao Activada',
                'description' => 'Enviado ao dono quando a subscricao e activada pelo admin',
                'sampleData' => ['userName' => 'Maria Santos', 'storeName' => 'Loja da Maria', 'planName' => 'Profissional', 'expiresAt' => '03/04/2026'],
                'sampleSubject' => 'Subscricao activada — Profissional',
            ],
            [
                'key' => 'subscription-expired',
                'label' => 'Subscricao Expirada',
                'description' => 'Enviado ao dono quando a subscricao expira',
                'sampleData' => ['userName' => 'Maria Santos', 'storeName' => 'Loja da Maria', 'planName' => 'Profissional'],
                'sampleSubject' => 'Subscricao expirada',
            ],
            [
                'key' => 'subscription-reminder',
                'label' => 'Lembrete de Subscricao',
                'description' => 'Enviado dias antes da subscricao expirar',
                'sampleData' => ['userName' => 'Maria Santos', 'storeName' => 'Loja da Maria', 'planName' => 'Profissional', 'expiresAt' => '10/03/2026', 'daysLeft' => 7],
                'sampleSubject' => 'Subscricao expira em 7 dias',
            ],
            [
                'key' => 'contact-received',
                'label' => 'Contacto Recebido',
                'description' => 'Enviado ao admin quando alguem submete o formulario de contacto',
                'sampleData' => ['contactName' => 'Pedro Almeida', 'contactEmail' => 'pedro@email.com', 'contactSubject' => 'Duvida sobre entregas', 'contactMessage' => 'Ola, gostaria de saber se fazem entregas para Benguela. Obrigado.'],
                'sampleSubject' => 'Nova mensagem de contacto',
            ],
            [
                'key' => 'admin-new-user',
                'label' => 'Admin: Novo Utilizador',
                'description' => 'Enviado ao admin quando um novo utilizador se regista',
                'sampleData' => ['userName' => 'Joao Silva', 'userEmail' => 'joao@email.com', 'userPhone' => '+244 923 456 789', 'registeredAt' => '12/03/2026 18:30', 'totalUsers' => 150, 'adminUrl' => 'https://superloja.vip/admin/utilizadores'],
                'sampleSubject' => 'Novo utilizador: Joao Silva',
            ],
            [
                'key' => 'admin-new-store',
                'label' => 'Admin: Nova Loja',
                'description' => 'Enviado ao admin quando uma nova loja e registada',
                'sampleData' => ['storeName' => 'Loja da Maria', 'ownerName' => 'Maria Santos', 'ownerEmail' => 'maria@email.com', 'province' => 'Luanda', 'category' => 'Moda', 'whatsapp' => '+244 923 456 789', 'status' => 'Pendente', 'registeredAt' => '12/03/2026 18:30', 'totalStores' => 50, 'adminUrl' => 'https://superloja.vip/admin/lojas'],
                'sampleSubject' => 'Nova loja: Loja da Maria',
            ],
        ];
    }

    /**
     * Send email to multiple recipients.
     */
    public function sendBulk(array $recipients, string $subject, string $template, array $data = []): int
    {
        $sent = 0;
        foreach ($recipients as $to) {
            if ($this->send($to, $subject, $template, $data)) $sent++;
        }
        return $sent;
    }

    /**
     * Get admin email from settings (fallback to super_admin user).
     */
    public function getAdminEmail(): string
    {
        $email = Setting::get('contact_email');
        if ($email) return $email;

        $admin = \App\Models\User::where('role', 'super_admin')->first();
        return $admin?->email ?? 'carlos@softecangola.net';
    }

    // ─── Convenience methods ────────────────────────────────────

    public function sendWelcome(string $email, string $name): bool
    {
        return $this->send($email, "Bem-vindo ao {$this->getSiteName()}!", 'welcome', [
            'userName' => $name,
        ]);
    }

    public function sendPasswordReset(string $email, string $name, string $resetUrl): bool
    {
        return $this->send($email, "Recuperar palavra-passe — {$this->getSiteName()}", 'password-reset', [
            'userName' => $name,
            'resetUrl' => $resetUrl,
        ]);
    }

    public function sendStoreRegistered(string $email, string $ownerName, string $storeName, bool $autoApproved): bool
    {
        $template = $autoApproved ? 'store-approved' : 'store-registered';
        $subject  = $autoApproved
            ? "A sua loja \"{$storeName}\" foi aprovada!"
            : "Loja \"{$storeName}\" registada — em analise";

        return $this->send($email, $subject, $template, [
            'userName'  => $ownerName,
            'storeName' => $storeName,
        ]);
    }

    public function sendStoreApproved(string $email, string $ownerName, string $storeName, string $storeUrl): bool
    {
        return $this->send($email, "A sua loja \"{$storeName}\" foi aprovada!", 'store-approved', [
            'userName'  => $ownerName,
            'storeName' => $storeName,
            'storeUrl'  => $storeUrl,
        ]);
    }

    public function sendStoreRejected(string $email, string $ownerName, string $storeName, string $reason = ''): bool
    {
        return $this->send($email, "Loja \"{$storeName}\" — registo nao aprovado", 'store-rejected', [
            'userName'  => $ownerName,
            'storeName' => $storeName,
            'reason'    => $reason,
        ]);
    }

    public function sendStoreBanned(string $email, string $ownerName, string $storeName, string $reason): bool
    {
        return $this->send($email, "Loja \"{$storeName}\" — suspensa da plataforma", 'store-banned', [
            'userName'  => $ownerName,
            'storeName' => $storeName,
            'reason'    => $reason,
        ]);
    }

    public function sendSubscriptionActivated(string $email, string $ownerName, string $storeName, string $planName, string $expiresAt): bool
    {
        return $this->send($email, "Subscricao activada — {$planName}", 'subscription-activated', [
            'userName'  => $ownerName,
            'storeName' => $storeName,
            'planName'  => $planName,
            'expiresAt' => $expiresAt,
        ]);
    }

    public function sendSubscriptionExpired(string $email, string $ownerName, string $storeName, string $planName): bool
    {
        return $this->send($email, "Subscricao expirada — {$storeName}", 'subscription-expired', [
            'userName'  => $ownerName,
            'storeName' => $storeName,
            'planName'  => $planName,
        ]);
    }

    public function sendSubscriptionReminder(string $email, string $ownerName, string $storeName, string $planName, string $expiresAt, int $daysLeft): bool
    {
        return $this->send($email, "Subscricao expira em {$daysLeft} dias — {$storeName}", 'subscription-reminder', [
            'userName'  => $ownerName,
            'storeName' => $storeName,
            'planName'  => $planName,
            'expiresAt' => $expiresAt,
            'daysLeft'  => $daysLeft,
        ]);
    }

    public function sendContactReceived(string $email, string $name, string $contactEmail, string $subject, string $messageText): bool
    {
        return $this->send($email, "Nova mensagem de contacto: {$subject}", 'contact-received', [
            'contactName'  => $name,
            'contactEmail' => $contactEmail,
            'contactSubject' => $subject,
            'contactMessage' => $messageText,
        ]);
    }

    public function sendOrderConfirmation(string $email, string $customerName, $order): bool
    {
        $items = $order->items->map(fn($i) => [
            'product_name' => $i->product_name,
            'quantity' => $i->quantity,
            'price' => $i->price,
            'total' => $i->total,
        ])->toArray();

        return $this->send($email, "Pedido #{$order->order_number} confirmado!", 'order-confirmation', [
            'customerName'     => $customerName,
            'orderNumber'      => $order->order_number,
            'storeName'        => $order->store->name ?? 'Loja',
            'paymentMethod'    => $order->payment_method,
            'items'            => $items,
            'subtotal'         => $order->subtotal,
            'deliveryFee'      => $order->delivery_fee,
            'total'            => $order->total,
            'customerPhone'    => $order->customer_phone,
            'customerAddress'  => $order->customer_address,
            'customerProvince' => $order->customer_province,
            'customerNotes'    => $order->customer_notes,
        ]);
    }

    /**
     * Notify admin about new user registration.
     */
    public function sendAdminNewUser(string $userName, string $userEmail, ?string $userPhone = null): bool
    {
        $adminEmail = $this->getAdminEmail();
        $totalUsers = \App\Models\User::count();
        $appUrl = rtrim(config('app.url', 'https://superloja.vip'), '/');

        return $this->send($adminEmail, "Novo utilizador: {$userName}", 'admin-new-user', [
            'userName'     => $userName,
            'userEmail'    => $userEmail,
            'userPhone'    => $userPhone ?? '',
            'registeredAt' => now()->format('d/m/Y H:i'),
            'totalUsers'   => $totalUsers,
            'adminUrl'     => $appUrl . '/admin/utilizadores',
        ]);
    }

    /**
     * Notify admin about new store registration.
     */
    public function sendAdminNewStore(string $storeName, string $ownerName, string $ownerEmail, string $province, string $category, string $whatsapp, bool $autoApproved): bool
    {
        $adminEmail = $this->getAdminEmail();
        $totalStores = \App\Models\Store::count();
        $appUrl = rtrim(config('app.url', 'https://superloja.vip'), '/');

        return $this->send($adminEmail, "Nova loja: {$storeName}", 'admin-new-store', [
            'storeName'    => $storeName,
            'ownerName'    => $ownerName,
            'ownerEmail'   => $ownerEmail,
            'province'     => $province,
            'category'     => $category,
            'whatsapp'     => $whatsapp,
            'status'       => $autoApproved ? 'Aprovada automaticamente' : 'Pendente de aprovacao',
            'registeredAt' => now()->format('d/m/Y H:i'),
            'totalStores'  => $totalStores,
            'adminUrl'     => $appUrl . '/admin/lojas',
        ]);
    }

    public function sendOrderStatusUpdate(string $email, string $customerName, $order, string $previousStatus, string $cancelReason = ''): bool
    {
        $statusLabels = [
            'pending' => 'Pendente', 'confirmed' => 'Confirmado', 'processing' => 'Em Preparacao',
            'shipped' => 'Enviado', 'delivered' => 'Entregue', 'cancelled' => 'Cancelado',
        ];

        $currentLabel = $statusLabels[$order->status] ?? $order->status;
        $prevLabel = $statusLabels[$previousStatus] ?? $previousStatus;

        return $this->send($email, "Pedido #{$order->order_number} — {$currentLabel}", 'order-status', [
            'customerName'   => $customerName,
            'orderNumber'    => $order->order_number,
            'storeName'      => $order->store->name ?? 'Loja',
            'status'         => $order->status,
            'statusLabel'    => $statusLabels[$order->status] ?? $order->status,
            'previousStatus' => $statusLabels[$previousStatus] ?? $previousStatus,
            'total'          => $order->total,
            'cancelReason'   => $cancelReason,
        ]);
    }
}

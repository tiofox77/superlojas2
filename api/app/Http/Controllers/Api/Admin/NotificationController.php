<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\User;
use App\Services\MailService;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Unread count for badge.
     */
    public function unreadCount()
    {
        return response()->json([
            'count' => Notification::where('target', 'admin')->where('is_read', false)->count(),
        ]);
    }

    /**
     * List notifications with pagination.
     */
    public function index(Request $request)
    {
        $query = Notification::where('target', 'admin')
            ->orderByDesc('created_at');

        if ($request->has('unread_only') && $request->unread_only === 'true') {
            $query->where('is_read', false);
        }
        if ($request->has('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        return response()->json(
            $query->paginate($request->get('per_page', 30))
        );
    }

    /**
     * Mark one as read.
     */
    public function markRead(Notification $notification)
    {
        if ($notification->target !== 'admin') abort(403);
        $notification->update(['is_read' => true, 'read_at' => now()]);
        return response()->json(['message' => 'Marcada como lida']);
    }

    /**
     * Mark all admin notifications as read.
     */
    public function markAllRead()
    {
        Notification::where('target', 'admin')
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);

        return response()->json(['message' => 'Todas marcadas como lidas']);
    }

    /**
     * Delete old read notifications.
     */
    public function cleanup()
    {
        $deleted = Notification::where('target', 'admin')
            ->where('is_read', true)
            ->where('created_at', '<', now()->subDays(30))
            ->delete();

        return response()->json(['message' => "Removidas {$deleted} notificacoes antigas"]);
    }

    /**
     * Send bulk notification (email/sms) to users.
     */
    public function send(Request $request)
    {
        $data = $request->validate([
            'audience' => 'required|in:all,customers,store_owners,specific',
            'channel' => 'required|in:email,sms,both',
            'subject' => 'required|string|max:255',
            'message' => 'required|string|max:10000',
            'specific_emails' => 'nullable|array',
            'specific_emails.*' => 'email',
        ]);

        // Build recipients list
        $query = User::query();

        switch ($data['audience']) {
            case 'customers':
                $query->where('role', 'customer');
                break;
            case 'store_owners':
                $query->where('role', 'store_owner');
                break;
            case 'specific':
                $query->whereIn('email', $data['specific_emails'] ?? []);
                break;
            // 'all' — no filter
        }

        $recipients = $query->whereNotNull('email')->pluck('email', 'name')->toArray();

        if (empty($recipients)) {
            return response()->json(['message' => 'Nenhum destinatario encontrado.'], 422);
        }

        $sent = 0;
        $failed = 0;

        if (in_array($data['channel'], ['email', 'both'])) {
            $mail = new MailService();
            foreach ($recipients as $name => $email) {
                try {
                    $success = $mail->send(
                        $email,
                        $data['subject'],
                        'bulk-notification',
                        [
                            'userName' => $name ?: 'Utilizador',
                            'emailSubject' => $data['subject'],
                            'emailBody' => $data['message'],
                        ]
                    );
                    $success ? $sent++ : $failed++;
                } catch (\Throwable $e) {
                    $failed++;
                }
            }
        }

        // SMS placeholder — log for now
        if (in_array($data['channel'], ['sms', 'both'])) {
            // TODO: Integrate SMS provider (e.g. Twilio, Vonage)
            \Log::info("SMS bulk send requested", [
                'subject' => $data['subject'],
                'recipients_count' => count($recipients),
            ]);
        }

        return response()->json([
            'message' => "Notificacao enviada! {$sent} emails enviados" . ($failed > 0 ? ", {$failed} falharam" : "") . ".",
            'sent' => $sent,
            'failed' => $failed,
            'total_recipients' => count($recipients),
        ]);
    }
}

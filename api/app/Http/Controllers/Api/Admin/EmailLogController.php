<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\EmailLog;
use App\Services\MailService;
use Illuminate\Http\Request;

class EmailLogController extends Controller
{
    /**
     * List email logs with filters.
     */
    public function index(Request $request)
    {
        $query = EmailLog::query()->orderByDesc('created_at');

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        if ($request->has('template') && $request->template !== 'all') {
            $query->where('template', $request->template);
        }
        if ($request->has('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('to', 'like', "%{$s}%")
                  ->orWhere('subject', 'like', "%{$s}%");
            });
        }

        return response()->json(
            $query->paginate($request->get('per_page', 25))
        );
    }

    /**
     * Stats overview for email logs.
     */
    public function stats()
    {
        return response()->json([
            'total' => EmailLog::count(),
            'sent' => EmailLog::where('status', 'sent')->count(),
            'failed' => EmailLog::where('status', 'failed')->count(),
            'pending' => EmailLog::where('status', 'pending')->count(),
            'today' => EmailLog::whereDate('created_at', today())->count(),
            'today_sent' => EmailLog::where('status', 'sent')->whereDate('created_at', today())->count(),
            'today_failed' => EmailLog::where('status', 'failed')->whereDate('created_at', today())->count(),
            'avg_duration' => (int) EmailLog::where('status', 'sent')->avg('duration_ms'),
        ]);
    }

    /**
     * Get available templates list for testing UI.
     */
    public function templates()
    {
        return response()->json(MailService::getTemplates());
    }

    /**
     * Preview a template (render HTML without sending).
     */
    public function preview(Request $request)
    {
        $request->validate([
            'template' => 'required|string',
            'data' => 'nullable|array',
        ]);

        try {
            $mail = new MailService();
            $html = $mail->preview($request->template, $request->data ?? []);
            return response()->json(['html' => $html]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Erro ao renderizar template: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Send a test email using a specific template.
     */
    public function sendTest(Request $request)
    {
        $request->validate([
            'template' => 'required|string',
            'email' => 'required|email',
            'subject' => 'required|string',
            'data' => 'nullable|array',
        ]);

        try {
            $mail = new MailService();
            $ok = $mail->send($request->email, $request->subject, $request->template, $request->data ?? []);
            if ($ok) {
                return response()->json(['message' => "Email de teste ({$request->template}) enviado para {$request->email}"]);
            }
            // Get the latest log for this failed send
            $lastLog = EmailLog::where('template', $request->template)
                ->where('to', $request->email)
                ->where('status', 'failed')
                ->latest()
                ->first();
            return response()->json([
                'message' => 'Falha ao enviar email: ' . ($lastLog?->error ?? 'Erro desconhecido'),
            ], 500);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Erro: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Retry a failed email.
     */
    public function retry(EmailLog $emailLog)
    {
        if ($emailLog->status !== 'failed') {
            return response()->json(['message' => 'Apenas emails falhados podem ser reenviados.'], 422);
        }

        try {
            $mail = new MailService();
            $ok = $mail->send($emailLog->to, $emailLog->subject, $emailLog->template, $emailLog->data ?? []);
            return response()->json([
                'message' => $ok ? 'Email reenviado com sucesso.' : 'Falha ao reenviar.',
                'success' => $ok,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Erro: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Delete old logs.
     */
    public function cleanup(Request $request)
    {
        $days = $request->get('days', 30);
        $deleted = EmailLog::where('created_at', '<', now()->subDays($days))->delete();
        return response()->json(['message' => "Eliminados {$deleted} registos com mais de {$days} dias."]);
    }
}

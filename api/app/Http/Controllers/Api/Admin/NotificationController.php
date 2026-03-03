<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Notification;
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
}

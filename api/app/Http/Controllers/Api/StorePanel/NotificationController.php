<?php

namespace App\Http\Controllers\Api\StorePanel;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Store;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    private function getStore(string $slug): Store
    {
        return Store::where('slug', $slug)->firstOrFail();
    }

    /**
     * Unread count for badge.
     */
    public function unreadCount(string $slug)
    {
        $store = $this->getStore($slug);
        return response()->json([
            'count' => Notification::where('target', 'store')
                ->where('store_id', $store->id)
                ->where('is_read', false)
                ->count(),
        ]);
    }

    /**
     * List notifications with pagination.
     */
    public function index(Request $request, string $slug)
    {
        $store = $this->getStore($slug);
        $query = Notification::where('target', 'store')
            ->where('store_id', $store->id)
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
    public function markRead(string $slug, Notification $notification)
    {
        $store = $this->getStore($slug);
        abort_if($notification->store_id !== $store->id, 403);
        $notification->update(['is_read' => true, 'read_at' => now()]);
        return response()->json(['message' => 'Marcada como lida']);
    }

    /**
     * Mark all store notifications as read.
     */
    public function markAllRead(string $slug)
    {
        $store = $this->getStore($slug);
        Notification::where('target', 'store')
            ->where('store_id', $store->id)
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);

        return response()->json(['message' => 'Todas marcadas como lidas']);
    }
}

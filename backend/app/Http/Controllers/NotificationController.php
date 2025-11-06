<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    //
    public function getUserNotifications(Request $request)
    {
        $user = $request->user();
        $notifications = DB::table('notification_history')
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        foreach ($notifications as $i => $notification) {
            $notifications[$i]->message = json_decode($notification->message, true);
        }

        return response()->json($notifications);
    }

    public function markNotificationsAsRead(Request $request)
    {
        $user = $request->user();
        $notifications = $request->input('notifications', []);

        $notificationIds = array_map(function ($n) {
            return $n['id'];
        }, $notifications);

        if (count($notificationIds) > 0) {
            DB::table('notification_history')
                ->where('user_id', $user->id)
                ->whereIn('id', $notificationIds)
                ->update(['is_read' => true]);
        }

        return response()->json(['status' => 'success']);
    }

    /**
     * Get comment notifications for the authenticated user
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getCommentNotifications(Request $request)
    {
        $user = $request->user();

        $notifications = DB::table('notification_history')
            ->where('user_id', $user->id)
            ->where('type', 'comment')
            ->orderBy('created_at', 'desc')
            ->limit(50) // Limitar a las últimas 50 notificaciones
            ->get();

        foreach ($notifications as $i => $notification) {
            $notifications[$i]->message = json_decode($notification->message, true);
        }

        return response()->json([
            'success' => true,
            'notifications' => $notifications,
        ]);
    }

    /**
     * Get unread comment notifications count
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getUnreadCommentCount(Request $request)
    {
        $user = $request->user();

        $count = DB::table('notification_history')
            ->where('user_id', $user->id)
            ->where('type', 'comment')
            ->where('is_read', false)
            ->count();

        return response()->json([
            'success' => true,
            'count' => $count,
        ]);
    }
}

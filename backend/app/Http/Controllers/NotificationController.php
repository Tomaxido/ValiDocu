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
}

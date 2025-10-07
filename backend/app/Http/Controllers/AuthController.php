<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $token = $user->createToken($user->name);

        return [
            'user' => $user,
            'token' => $token->plainTextToken,
        ];
    }

    public function me(Request $request)
    {
        $roles = $request->user()->load('roles');
        $permissions = $request->user()->permissions()->get();
        return [
            'user' => $request->user(),
            'roles' => $roles->roles,
            'permissions' => $permissions,
        ];
    }

    public function logout(Request $request)
    {
        $request->user()->tokens()->delete();
        return [
            'message' => 'Logged out successfully',
        ];
    }

    public function searchUsers(Request $request)
    {
        $query = $request->query('q', '');
        
        if (strlen(trim($query)) < 2) {
            return response()->json([]);
        }
        
        $users = User::where('email', 'ILIKE', '%' . $query . '%')
            ->orWhere('name', 'ILIKE', '%' . $query . '%')
            ->limit(10)
            ->get(['id', 'email', 'name']);
            
        return response()->json($users);
    }
}

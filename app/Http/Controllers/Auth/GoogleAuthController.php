<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\MenuResource;
use App\Http\Resources\PermissionResource;
use App\Http\Resources\UserResource;
use App\Libraries\AppLibrary;
use App\Services\DefaultAccessService;
use App\Services\GoogleIdentityService;
use App\Services\GoogleAccountService;
use App\Services\MenuService;
use App\Services\PermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Smartisan\Settings\Facades\Settings;

class GoogleAuthController extends Controller
{
    public function configuration(GoogleIdentityService $identity): JsonResponse
    {
        return response()->json($identity->challenge())->header('Cache-Control', 'no-store');
    }

    public function login(Request $request, GoogleIdentityService $identity, GoogleAccountService $accounts,
        DefaultAccessService $access, PermissionService $permissions, MenuService $menus): JsonResponse
    {
        $input = $request->validate([
            'credential' => ['required', 'string', 'max:8192'],
            'nonce' => ['required', 'string', 'regex:/\A[a-f0-9]{64}\z/'],
        ]);
        $claims = $identity->verify($input['credential'], $input['nonce']);

        $user = $accounts->resolve($claims);

        Auth::setUser($user);
        $branchId = $user->branch_id ?: Settings::group('site')->get('site_default_branch');
        $access->storeOrUpdate(['branch_id' => $branchId]);
        $role = $user->roles->first();
        $permission = PermissionResource::collection($permissions->permission($role));
        $menu = $menus->menu($role);
        $defaultPermission = AppLibrary::defaultPermission($permission);

        return response()->json([
            'message' => trans('all.message.login_success'),
            'token' => $user->createToken('auth_token')->plainTextToken,
            'branch_id' => (int) $user->branch_id,
            'user' => new UserResource($user),
            'menu' => MenuResource::collection(collect($menu)),
            'permission' => $permission,
            'defaultPermission' => $defaultPermission,
            'defaultMenu' => (object) AppLibrary::defaultMenu($menu, $defaultPermission),
        ], 201);
    }
}

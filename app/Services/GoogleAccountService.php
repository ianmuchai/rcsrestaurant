<?php

namespace App\Services;

use App\Enums\Ask;
use App\Enums\Role;
use App\Enums\Status;
use App\Models\Scopes\BranchScope;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class GoogleAccountService
{
    public function resolve(array $claims): User
    {
        return DB::transaction(function () use ($claims) {
            $user = User::withoutGlobalScope(BranchScope::class)->withTrashed()
                ->where('google_id', $claims['sub'])->lockForUpdate()->first();
            if ($user) {
                if ($user->trashed() || $user->status !== Status::ACTIVE
                    || $user->is_guest !== Ask::NO || !$user->hasRole(Role::CUSTOMER)) {
                    throw ValidationException::withMessages(['credential' => ['This account cannot sign in with Google.']]);
                }
                return $user;
            }

            $email = Str::lower($claims['email']);
            // Matching email alone must never grant access to an existing account.
            if (User::withoutGlobalScope(BranchScope::class)->withTrashed()
                ->whereRaw('LOWER(email) = ?', [$email])->exists()) {
                throw ValidationException::withMessages([
                    'credential' => ['An account already uses this email. Please sign in using your existing method.'],
                ]);
            }

            $name = Str::limit(trim((string) ($claims['name'] ?? '')) ?: 'Customer', 100, '');
            $authoritativeEmail = Str::endsWith($email, '@gmail.com') || !empty($claims['hd']);
            $user = new User([
                'name' => $name,
                'username' => 'google-' . Str::uuid(),
                'email' => $email,
                'password' => Hash::make(Str::random(64)),
                'branch_id' => 0,
                'is_guest' => Ask::NO,
                'status' => Status::ACTIVE,
                'email_verified_at' => $authoritativeEmail ? now() : null,
            ]);
            $user->google_id = $claims['sub'];
            $user->save();
            $user->assignRole(Role::CUSTOMER);
            return $user;
        });
    }
}

<?php

namespace Tests\Feature;

use App\Enums\Status;
use App\Models\User;
use App\Services\GoogleAccountService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class GoogleAccountTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:',
            'cache.default' => 'array', 'permission.cache.store' => 'array']);
        DB::purge('sqlite');
        foreach ([
            '2014_10_12_000000_create_users_table.php',
            '2023_07_19_135307_add_soft_delete_column_to_users_table.php',
            '2026_10_15_000001_add_google_id_to_users_table.php',
            '2022_05_01_142407_create_permission_tables.php',
        ] as $file) {
            (require database_path('migrations/' . $file))->up();
        }
        DB::table('roles')->insert(['id' => 2, 'name' => 'Customer', 'guard_name' => config('auth.defaults.guard')]);
    }

    private function claims(): array
    {
        return ['sub' => 'google-123', 'name' => 'RC Customer', 'email' => 'customer@gmail.com'];
    }

    public function test_new_google_account_is_a_customer_and_returns_by_subject(): void
    {
        $service = app(GoogleAccountService::class);
        $user = $service->resolve($this->claims());
        $this->assertSame('google-123', $user->google_id);
        $this->assertTrue($user->hasRole(2));
        $this->assertNotNull($user->email_verified_at);
        $this->assertSame($user->id, $service->resolve($this->claims())->id);
        $this->assertSame(1, User::count());
    }

    public function test_matching_existing_email_is_never_automatically_linked(): void
    {
        User::create(['name' => 'Existing', 'username' => 'existing', 'email' => 'customer@gmail.com', 'password' => 'hashed-password']);
        $this->expectException(ValidationException::class);
        app(GoogleAccountService::class)->resolve($this->claims());
    }

    public function test_inactive_google_accounts_cannot_sign_in(): void
    {
        $service = app(GoogleAccountService::class);
        $user = $service->resolve($this->claims());
        // User ID 1 is protected by the legacy model, so update the fixture directly.
        DB::table('users')->where('id', $user->id)->update(['status' => Status::INACTIVE]);
        $this->expectException(ValidationException::class);
        $service->resolve($this->claims());
    }

    public function test_google_does_not_mark_third_party_email_as_verified(): void
    {
        $claims = $this->claims();
        $claims['email'] = 'customer@example.com';
        $this->assertNull(app(GoogleAccountService::class)->resolve($claims)->email_verified_at);
    }

    public function test_deleted_google_accounts_cannot_sign_in(): void
    {
        $service = app(GoogleAccountService::class);
        $service->resolve($this->claims())->delete();
        $this->expectException(ValidationException::class);
        $service->resolve($this->claims());
    }

    public function test_google_routes_resolve_and_unconfigured_signup_is_disabled(): void
    {
        $controller = \App\Http\Controllers\Auth\GoogleAuthController::class;
        $routes = app('router')->getRoutes();
        $this->assertSame('api/auth/google/config', $routes->getByAction($controller . '@configuration')->uri());
        $this->assertSame('api/auth/google', $routes->getByAction($controller . '@login')->uri());
        config(['services.google_sign_in.client_id' => '']);
        $response = app()->call([app($controller), 'configuration']);
        $this->assertSame(['enabled' => false], $response->getData(true));
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
    }
}

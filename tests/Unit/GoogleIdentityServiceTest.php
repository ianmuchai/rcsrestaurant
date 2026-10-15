<?php

namespace Tests\Unit;

use App\Services\GoogleIdentityService;
use Google\Client;
use Illuminate\Cache\ArrayStore;
use Illuminate\Cache\Repository;
use Illuminate\Config\Repository as ConfigRepository;
use Illuminate\Container\Container;
use Illuminate\Support\Facades\Facade;
use Illuminate\Validation\ValidationException;
use Mockery;
use PHPUnit\Framework\TestCase;

class GoogleIdentityServiceTest extends TestCase
{
    private Repository $cache;

    protected function setUp(): void
    {
        parent::setUp();
        $container = new Container();
        Container::setInstance($container);
        $container->instance('config', new ConfigRepository(['services' => ['google_sign_in' => ['client_id' => 'rcs-test-client']]]));
        $this->cache = new Repository(new ArrayStore());
        $container->instance('cache', $this->cache);
        $container->instance('validator', new \Illuminate\Validation\Factory(
            new \Illuminate\Translation\Translator(new \Illuminate\Translation\ArrayLoader(), 'en'), $container
        ));
        Facade::setFacadeApplication($container);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        Facade::clearResolvedInstances();
        Facade::setFacadeApplication(null);
        Container::setInstance(null);
        parent::tearDown();
    }

    private function service($claims): GoogleIdentityService
    {
        $client = Mockery::mock(Client::class);
        $client->shouldReceive('setClientId')->with('rcs-test-client');
        $client->shouldReceive('verifyIdToken')->with('signed-token')->andReturn($claims);
        return new GoogleIdentityService($client);
    }

    public function test_verified_credential_is_bound_to_a_single_use_nonce(): void
    {
        $service = $this->service(false);
        $nonce = $service->challenge()['nonce'];
        $service = $this->service(['sub' => 'google-subject', 'email' => 'customer@gmail.com', 'email_verified' => true, 'nonce' => $nonce]);
        $this->assertSame('google-subject', $service->verify('signed-token', $nonce)['sub']);
        $this->expectException(ValidationException::class);
        $service->verify('signed-token', $nonce);
    }

    /** @dataProvider invalidClaims */
    public function test_invalid_or_unverified_credentials_are_rejected($claims): void
    {
        $service = $this->service($claims);
        $nonce = $service->challenge()['nonce'];
        $this->expectException(ValidationException::class);
        $service->verify('signed-token', $nonce);
    }

    public static function invalidClaims(): array
    {
        return [
            'invalid signature' => [false],
            'unverified email' => [['sub' => 'subject', 'email' => 'person@gmail.com', 'email_verified' => false]],
            'wrong nonce' => [['sub' => 'subject', 'email' => 'person@gmail.com', 'email_verified' => true, 'nonce' => 'wrong']],
        ];
    }

    public function test_missing_client_configuration_disables_google_signup(): void
    {
        app('config')->set('services.google_sign_in.client_id', '');
        $service = new GoogleIdentityService(Mockery::mock(Client::class));
        $this->assertSame(['enabled' => false], $service->challenge());
    }

    public function test_expired_challenge_cannot_be_used(): void
    {
        $service = $this->service(false);
        $nonce = $service->challenge()['nonce'];
        $this->cache->forget('google-sign-in:' . $nonce);
        $this->expectException(ValidationException::class);
        $service->verify('signed-token', $nonce);
    }
}

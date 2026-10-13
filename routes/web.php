<?php

use App\Http\Controllers\Frontend\PaymentController;
use App\Http\Controllers\Frontend\RootController;
use App\Http\Controllers\Installer\InstallerController;
use App\Http\PaymentGateways\Gateways\Paytm;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/
use Illuminate\Support\Facades\Artisan;

Route::get('/cronttt', function () {
//     // Define the endpoint URL
// $url = 'https://portal.afrismashtech.co.ke';

// // Set up the query parameters (if any)
// $params = [
   
// ];

// // Build the full URL with query string
// $urlWithQuery = $url . '?' . http_build_query($params);

// // Initialize cURL
// $ch = curl_init();

// // Set cURL options
// curl_setopt($ch, CURLOPT_URL, $urlWithQuery);
// curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
// curl_setopt($ch, CURLOPT_TIMEOUT, 30); // Timeout in seconds

// // Execute cURL request
// $response = curl_exec($ch);

// // Check for cURL errors
// if (curl_errno($ch)) {
//     $error = curl_error($ch);
//     echo "cURL error: $error";
   
// } else {
//     echo "Response: $response";
   
// }

// // Close cURL
// curl_close($ch);

     Artisan::call('storage:link');
//   $response = Http::retry(3, 2000)
//                     ->timeout(30)
//                     ->get('https://portal.afrismashtech.co.ke/send-message', [
//                     ]);
 return 'Investment Creation Happened';
});


Route::prefix('install')->name('installer.')->middleware(['web'])->group(function () {
    Route::get('/', [InstallerController::class, 'index'])->name('index');
    Route::get('/requirement', [InstallerController::class, 'requirement'])->name('requirement');
    Route::get('/permission', [InstallerController::class, 'permission'])->name('permission');
    Route::get('/license', [InstallerController::class, 'license'])->name('license');
    Route::post('/license', [InstallerController::class, 'licenseStore'])->name('licenseStore');
    Route::get('/site', [InstallerController::class, 'site'])->name('site');
    Route::post('/site', [InstallerController::class, 'siteStore'])->name('siteStore');
    Route::get('/database', [InstallerController::class, 'database'])->name('database');
    Route::post('/database', [InstallerController::class, 'databaseStore'])->name('databaseStore');
    Route::get('/final', [InstallerController::class, 'final'])->name('final');
    Route::get('/final-store', [InstallerController::class, 'finalStore'])->name('finalStore');
});


Route::get('/', [RootController::class, 'index'])->middleware(['installed'])->name('home');
Route::prefix('payment')->name('payment.')->middleware(['installed'])->group(function () {
    Route::get('/{order}/pay', [PaymentController::class, 'index'])->name('index');
    Route::post('/{order}/pay', [PaymentController::class, 'payment'])->name('store');
    Route::match(['get', 'post'], '/{paymentGateway:slug}/{order}/success', [PaymentController::class, 'success'])->name('success');
    Route::match(['get', 'post'], '/{paymentGateway:slug}/{order}/fail', [PaymentController::class, 'fail'])->name('fail');
    Route::match(['get', 'post'], '/{paymentGateway:slug}/{order}/cancel', [PaymentController::class, 'cancel'])->name('cancel');
    Route::get('/successful/{order}', [PaymentController::class, 'successful'])->name('successful');
    Route::post('mpesa/callback', [PaymentController::class, 'handleMpesaCallback'])
        ->name('mpesa.callback');
    Route::get('status/{checkoutRequestId}', [PaymentController::class, 'checkPaymentStatus'])
        ->name('api.payment.status');

});

Route::get('/{any}', [RootController::class, 'index'])->middleware(['installed'])->where(['any' => '.*']);

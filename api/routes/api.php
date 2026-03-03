<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\StoreController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\HeroSlideController;
use App\Http\Controllers\Api\ProvinceController;
use App\Http\Controllers\Api\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\Admin\StoreController as AdminStoreController;
use App\Http\Controllers\Api\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Api\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Api\Admin\HeroSlideController as AdminHeroSlideController;
use App\Http\Controllers\Api\Admin\SubcategoryController as AdminSubcategoryController;

// ─── Auth ─────────────────────────────────────────────────────
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::put('/auth/password', [AuthController::class, 'changePassword']);
});

// ─── Public API routes ────────────────────────────────────────
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{slug}', [CategoryController::class, 'show']);

Route::get('/stores', [StoreController::class, 'index']);
Route::get('/stores/featured', [StoreController::class, 'featured']);
Route::get('/stores/{slug}', [StoreController::class, 'show']);

Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/trending', [ProductController::class, 'trending']);
Route::get('/products/flash-sale', [ProductController::class, 'flashSale']);
Route::get('/products/{slug}', [ProductController::class, 'show']);

Route::get('/hero-slides', [HeroSlideController::class, 'index']);
Route::get('/hero-slides/store/{slug}', [HeroSlideController::class, 'byStore']);

Route::get('/provinces', [ProvinceController::class, 'index']);

Route::get('/site-settings', [App\Http\Controllers\Api\SiteSettingsController::class, 'index']);
Route::post('/contact', [App\Http\Controllers\Api\SiteSettingsController::class, 'contact']);

// ─── Reviews (public read) ───────────────────────────────────
Route::get('/reviews', [\App\Http\Controllers\Api\ReviewController::class, 'index']);

// ─── Reviews (authenticated write) ──────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/reviews', [\App\Http\Controllers\Api\ReviewController::class, 'store']);
    Route::delete('/reviews/{review}', [\App\Http\Controllers\Api\ReviewController::class, 'destroy']);
    Route::get('/reviews/mine', [\App\Http\Controllers\Api\ReviewController::class, 'userReview']);
});

// ─── Page Tracking ──────────────────────────────────────────
Route::post('/track', [\App\Http\Controllers\Api\TrackingController::class, 'track']);

// ─── Subdomain resolution ────────────────────────────────────
Route::get('/subdomain/resolve/{slug}', function (string $slug) {
    $store = \App\Models\Store::where('slug', $slug)
        ->where('status', 'active')
        ->with(['plan:id,name,slug,custom_domain', 'products' => function ($q) {
            $q->select('id', 'store_id')->limit(1);
        }])
        ->first();

    if (!$store) {
        return response()->json(['error' => 'Loja nao encontrada'], 404);
    }

    if (!$store->plan || !$store->plan->custom_domain) {
        return response()->json(['error' => 'Plano nao permite subdominio', 'upgrade' => true], 403);
    }

    return response()->json([
        'store' => [
            'id' => $store->id,
            'name' => $store->name,
            'slug' => $store->slug,
            'logo' => $store->logo,
            'banner' => $store->banner,
            'description' => $store->description,
            'province' => $store->province,
            'city' => $store->city,
            'whatsapp' => $store->whatsapp,
            'email' => $store->email,
            'phone' => $store->phone,
            'categories' => $store->categories,
            'socials' => $store->socials,
            'payment_methods' => $store->payment_methods,
            'business_hours' => $store->business_hours,
            'announcement' => $store->announcement,
            'announcement_active' => $store->announcement_active,
            'rating' => $store->rating,
            'review_count' => $store->review_count,
            'is_official' => $store->is_official,
            'plan' => $store->plan->name,
        ],
    ]);
});

// ─── Checkout ────────────────────────────────────────────────
Route::post('/stores/payment-methods', function (\Illuminate\Http\Request $request) {
    $ids = $request->input('store_ids', []);
    $stores = \App\Models\Store::whereIn('id', $ids)->get(['id', 'payment_methods']);
    $result = [];
    foreach ($stores as $s) {
        $result[$s->id] = $s->payment_methods ?? [];
    }
    return response()->json($result);
});

Route::post('/checkout', [App\Http\Controllers\Api\CheckoutController::class, 'process']);
Route::post('/checkout/validate-stock', [App\Http\Controllers\Api\CheckoutController::class, 'validateStock']);

// ─── Store registration (works with or without auth) ─────────
Route::middleware('auth:sanctum')->post('/stores/register', [StoreController::class, 'register']);
Route::post('/stores/register-guest', [StoreController::class, 'register']);

// ─── Client Panel routes ─────────────────────────────────────
use App\Http\Controllers\Api\ClientPanelController;

Route::middleware('auth:sanctum')->prefix('client')->group(function () {
    Route::get('/dashboard', [ClientPanelController::class, 'dashboard']);
    Route::get('/orders', [ClientPanelController::class, 'orders']);
    Route::get('/orders/{order}', [ClientPanelController::class, 'orderShow']);
    Route::get('/profile', [ClientPanelController::class, 'profile']);
    Route::post('/profile', [ClientPanelController::class, 'updateProfile']);
    Route::put('/password', [ClientPanelController::class, 'changePassword']);
    Route::get('/addresses', [ClientPanelController::class, 'addresses']);
    Route::put('/addresses', [ClientPanelController::class, 'saveAddresses']);
});

// ─── Store Owner Panel routes ────────────────────────────────
use App\Http\Controllers\Api\StorePanel\DashboardController as StorePanelDashboard;
use App\Http\Controllers\Api\StorePanel\ProductController as StorePanelProduct;
use App\Http\Controllers\Api\StorePanel\HeroSlideController as StorePanelHeroSlide;
use App\Http\Controllers\Api\StorePanel\SettingsController as StorePanelSettings;
use App\Http\Controllers\Api\StorePanel\PaymentController as StorePanelPayment;

Route::middleware(['auth:sanctum', 'store_approved'])->prefix('store-panel/{slug}')->group(function () {
    Route::get('/dashboard', [StorePanelDashboard::class, 'index']);
    Route::get('/products', [StorePanelProduct::class, 'index']);
    Route::post('/products', [StorePanelProduct::class, 'store']);
    Route::post('/products/{product}', [StorePanelProduct::class, 'update']);
    Route::delete('/products/{product}', [StorePanelProduct::class, 'destroy']);
    Route::get('/slides', [StorePanelHeroSlide::class, 'index']);
    Route::post('/slides', [StorePanelHeroSlide::class, 'store']);
    Route::post('/slides/{heroSlide}', [StorePanelHeroSlide::class, 'update']);
    Route::delete('/slides/{heroSlide}', [StorePanelHeroSlide::class, 'destroy']);
    Route::get('/settings', [StorePanelSettings::class, 'show']);
    Route::post('/settings', [StorePanelSettings::class, 'update']);
    Route::get('/payments', [StorePanelPayment::class, 'index']);
    Route::put('/payments', [StorePanelPayment::class, 'update']);

    // Notifications
    Route::get('/notifications/unread-count', [\App\Http\Controllers\Api\StorePanel\NotificationController::class, 'unreadCount']);
    Route::get('/notifications', [\App\Http\Controllers\Api\StorePanel\NotificationController::class, 'index']);
    Route::put('/notifications/{notification}/read', [\App\Http\Controllers\Api\StorePanel\NotificationController::class, 'markRead']);
    Route::put('/notifications/read-all', [\App\Http\Controllers\Api\StorePanel\NotificationController::class, 'markAllRead']);

    // Orders
    Route::get('/orders', [\App\Http\Controllers\Api\StorePanel\OrderController::class, 'index']);
    Route::get('/orders/stats', [\App\Http\Controllers\Api\StorePanel\OrderController::class, 'stats']);
    Route::get('/orders/{order}', [\App\Http\Controllers\Api\StorePanel\OrderController::class, 'show']);
    Route::put('/orders/{order}/status', [\App\Http\Controllers\Api\StorePanel\OrderController::class, 'updateStatus']);

    // API Settings
    Route::get('/api-settings', [\App\Http\Controllers\Api\StorePanel\ApiSettingsController::class, 'show']);
    Route::post('/api-settings/generate', [\App\Http\Controllers\Api\StorePanel\ApiSettingsController::class, 'generate']);
    Route::put('/api-settings', [\App\Http\Controllers\Api\StorePanel\ApiSettingsController::class, 'update']);
    Route::delete('/api-settings/revoke', [\App\Http\Controllers\Api\StorePanel\ApiSettingsController::class, 'revoke']);

    // Subscription payment methods (public list for upgrade modal)
    Route::get('/subscription-payment-methods', function () {
        return response()->json(
            \App\Models\SubscriptionPaymentMethod::where('is_active', true)->orderBy('sort_order')->get()
        );
    });

    // POS
    Route::get('/pos/check', [\App\Http\Controllers\Api\StorePanel\PosController::class, 'check']);
    Route::get('/pos/products', [\App\Http\Controllers\Api\StorePanel\PosController::class, 'products']);
    Route::post('/pos/sell', [\App\Http\Controllers\Api\StorePanel\PosController::class, 'sell']);
    Route::post('/pos/sync', [\App\Http\Controllers\Api\StorePanel\PosController::class, 'syncOffline']);
    Route::get('/pos/sales', [\App\Http\Controllers\Api\StorePanel\PosController::class, 'sales']);
    Route::get('/pos/stats', [\App\Http\Controllers\Api\StorePanel\PosController::class, 'stats']);
    Route::post('/pos/sales/{sale}/void', [\App\Http\Controllers\Api\StorePanel\PosController::class, 'void']);

    // Subscription
    Route::get('/subscription', [\App\Http\Controllers\Api\StorePanel\SubscriptionController::class, 'current']);
    Route::get('/subscription/plans', [\App\Http\Controllers\Api\StorePanel\SubscriptionController::class, 'plans']);
    Route::get('/subscription/history', [\App\Http\Controllers\Api\StorePanel\SubscriptionController::class, 'history']);
    Route::post('/subscription/upgrade', [\App\Http\Controllers\Api\StorePanel\SubscriptionController::class, 'requestUpgrade']);
    Route::post('/subscription/downgrade', [\App\Http\Controllers\Api\StorePanel\SubscriptionController::class, 'downgrade']);
    Route::post('/subscription/toggle-renew', [\App\Http\Controllers\Api\StorePanel\SubscriptionController::class, 'toggleAutoRenew']);

    // Store Analytics (plan-gated)
    Route::prefix('analytics')->group(function () {
        Route::get('/check', [\App\Http\Controllers\Api\StorePanel\AnalyticsController::class, 'check']);
        Route::get('/dashboard', [\App\Http\Controllers\Api\StorePanel\AnalyticsController::class, 'dashboard']);
        Route::get('/top-pages', [\App\Http\Controllers\Api\StorePanel\AnalyticsController::class, 'topPages']);
        Route::get('/referrers', [\App\Http\Controllers\Api\StorePanel\AnalyticsController::class, 'referrers']);
        Route::get('/geography', [\App\Http\Controllers\Api\StorePanel\AnalyticsController::class, 'geography']);
        Route::get('/technology', [\App\Http\Controllers\Api\StorePanel\AnalyticsController::class, 'technology']);
    });
});

// ─── Store External API (authenticated via API key) ─────────
Route::middleware(\App\Http\Middleware\StoreApiAuth::class)->prefix('store-api/{slug}')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\StoreApiController::class, 'info']);
    Route::get('/products', [\App\Http\Controllers\Api\StoreApiController::class, 'products']);
    Route::get('/products/{productId}', [\App\Http\Controllers\Api\StoreApiController::class, 'productShow']);
    Route::post('/products', [\App\Http\Controllers\Api\StoreApiController::class, 'productStore']);
    Route::put('/products/{productId}', [\App\Http\Controllers\Api\StoreApiController::class, 'productUpdate']);
    Route::delete('/products/{productId}', [\App\Http\Controllers\Api\StoreApiController::class, 'productDestroy']);
    Route::get('/categories', [\App\Http\Controllers\Api\StoreApiController::class, 'categories']);
});

// ─── Super Admin routes ──────────────────────────────────────
use App\Http\Controllers\Api\Admin\SettingsController as AdminSettingsController;

Route::middleware(['auth:sanctum', 'super_admin'])->prefix('admin')->group(function () {

    Route::get('/dashboard', [AdminDashboardController::class, 'index']);

    // Users
    Route::apiResource('users', AdminUserController::class);
    Route::patch('/users/{user}/toggle-active', [AdminUserController::class, 'toggleActive']);

    // Stores
    Route::apiResource('stores', AdminStoreController::class);
    Route::patch('/stores/{store}/approve', [AdminStoreController::class, 'approve']);
    Route::patch('/stores/{store}/reject', [AdminStoreController::class, 'reject']);
    Route::patch('/stores/{store}/ban', [AdminStoreController::class, 'ban']);
    Route::patch('/stores/{store}/toggle-official', [AdminStoreController::class, 'toggleOfficial']);
    Route::patch('/stores/{store}/toggle-featured', [AdminStoreController::class, 'toggleFeatured']);

    // Products
    Route::apiResource('products', AdminProductController::class);
    Route::post('/products/bulk-delete', [AdminProductController::class, 'bulkDelete']);

    // Categories
    Route::apiResource('categories', AdminCategoryController::class);

    // Subcategories
    Route::apiResource('subcategories', AdminSubcategoryController::class)->except(['show']);

    // Hero Slides
    Route::apiResource('hero-slides', AdminHeroSlideController::class);
    Route::post('/hero-slides/reorder', [AdminHeroSlideController::class, 'reorder']);

    // Plans
    Route::apiResource('plans', \App\Http\Controllers\Api\Admin\PlanController::class);
    Route::post('/plans/assign', [\App\Http\Controllers\Api\Admin\PlanController::class, 'assignToStore']);

    // Subscription Payment Methods
    Route::get('/subscription-payment-methods', [\App\Http\Controllers\Api\Admin\SubscriptionPaymentMethodController::class, 'index']);
    Route::post('/subscription-payment-methods', [\App\Http\Controllers\Api\Admin\SubscriptionPaymentMethodController::class, 'store']);
    Route::put('/subscription-payment-methods/{method}', [\App\Http\Controllers\Api\Admin\SubscriptionPaymentMethodController::class, 'update']);
    Route::delete('/subscription-payment-methods/{method}', [\App\Http\Controllers\Api\Admin\SubscriptionPaymentMethodController::class, 'destroy']);

    // Subscription expiry — manual trigger
    Route::post('/subscriptions/check-expiry', function () {
        \Illuminate\Support\Facades\Cache::forget('subscription_expiry_checked');
        \Illuminate\Support\Facades\Artisan::call('subscription:check-expiry');
        $output = \Illuminate\Support\Facades\Artisan::output();
        \Illuminate\Support\Facades\Cache::put('subscription_expiry_last_run', now()->toIso8601String(), now()->addDays(30));
        return response()->json(['message' => trim($output), 'last_run' => now()->toIso8601String()]);
    });
    Route::get('/subscriptions/expiry-status', function () {
        return response()->json([
            'last_run' => \Illuminate\Support\Facades\Cache::get('subscription_expiry_last_run'),
            'next_auto_check' => \Illuminate\Support\Facades\Cache::has('subscription_expiry_checked')
                ? 'Cache activo (proximo check em < 1h)'
                : 'Proximo request API ira verificar',
        ]);
    });

    // Subscriptions
    Route::get('/subscriptions', [\App\Http\Controllers\Api\Admin\SubscriptionController::class, 'index']);
    Route::get('/subscriptions/stats', [\App\Http\Controllers\Api\Admin\SubscriptionController::class, 'stats']);
    Route::post('/subscriptions', [\App\Http\Controllers\Api\Admin\SubscriptionController::class, 'store']);
    Route::get('/subscriptions/{subscription}', [\App\Http\Controllers\Api\Admin\SubscriptionController::class, 'show']);
    Route::post('/subscriptions/{subscription}/activate', [\App\Http\Controllers\Api\Admin\SubscriptionController::class, 'activate']);
    Route::post('/subscriptions/{subscription}/cancel', [\App\Http\Controllers\Api\Admin\SubscriptionController::class, 'cancel']);
    Route::post('/subscriptions/{subscription}/renew', [\App\Http\Controllers\Api\Admin\SubscriptionController::class, 'renew']);

    // Analytics
    Route::prefix('analytics')->group(function () {
        Route::get('/dashboard', [\App\Http\Controllers\Api\Admin\AnalyticsController::class, 'dashboard']);
        Route::get('/top-pages', [\App\Http\Controllers\Api\Admin\AnalyticsController::class, 'topPages']);
        Route::get('/top-stores', [\App\Http\Controllers\Api\Admin\AnalyticsController::class, 'topStores']);
        Route::get('/referrers', [\App\Http\Controllers\Api\Admin\AnalyticsController::class, 'referrers']);
        Route::get('/geography', [\App\Http\Controllers\Api\Admin\AnalyticsController::class, 'geography']);
        Route::get('/technology', [\App\Http\Controllers\Api\Admin\AnalyticsController::class, 'technology']);
        Route::get('/realtime', [\App\Http\Controllers\Api\Admin\AnalyticsController::class, 'realtime']);
        Route::get('/logs', [\App\Http\Controllers\Api\Admin\AnalyticsController::class, 'logs']);
        Route::get('/online-users', [\App\Http\Controllers\Api\Admin\AnalyticsController::class, 'onlineUsers']);
    });

    // Settings
    Route::get('/settings', [AdminSettingsController::class, 'index']);
    Route::put('/settings', [AdminSettingsController::class, 'update']);
    Route::post('/settings/upload', [AdminSettingsController::class, 'uploadFile']);
    Route::post('/settings/test-email', [AdminSettingsController::class, 'testEmail']);
    Route::post('/settings/test-connection', [AdminSettingsController::class, 'testConnection']);

    // Notifications
    Route::get('/notifications/unread-count', [\App\Http\Controllers\Api\Admin\NotificationController::class, 'unreadCount']);
    Route::get('/notifications', [\App\Http\Controllers\Api\Admin\NotificationController::class, 'index']);
    Route::put('/notifications/{notification}/read', [\App\Http\Controllers\Api\Admin\NotificationController::class, 'markRead']);
    Route::put('/notifications/read-all', [\App\Http\Controllers\Api\Admin\NotificationController::class, 'markAllRead']);
    Route::delete('/notifications/cleanup', [\App\Http\Controllers\Api\Admin\NotificationController::class, 'cleanup']);

    // System Updates
    Route::get('/system-update/config', [\App\Http\Controllers\Api\Admin\SystemUpdateController::class, 'config']);
    Route::put('/system-update/config', [\App\Http\Controllers\Api\Admin\SystemUpdateController::class, 'saveConfig']);
    Route::delete('/system-update/token', [\App\Http\Controllers\Api\Admin\SystemUpdateController::class, 'removeToken']);
    Route::get('/system-update/releases', [\App\Http\Controllers\Api\Admin\SystemUpdateController::class, 'releases']);
    Route::get('/system-update/check-latest', [\App\Http\Controllers\Api\Admin\SystemUpdateController::class, 'checkLatest']);
    Route::put('/system-update/set-version', [\App\Http\Controllers\Api\Admin\SystemUpdateController::class, 'setVersion']);
    Route::get('/system-update/repo-info', [\App\Http\Controllers\Api\Admin\SystemUpdateController::class, 'repoInfo']);

    // Email Logs
    Route::get('/email-logs', [\App\Http\Controllers\Api\Admin\EmailLogController::class, 'index']);
    Route::get('/email-logs/stats', [\App\Http\Controllers\Api\Admin\EmailLogController::class, 'stats']);
    Route::get('/email-logs/templates', [\App\Http\Controllers\Api\Admin\EmailLogController::class, 'templates']);
    Route::post('/email-logs/preview', [\App\Http\Controllers\Api\Admin\EmailLogController::class, 'preview']);
    Route::post('/email-logs/send-test', [\App\Http\Controllers\Api\Admin\EmailLogController::class, 'sendTest']);
    Route::post('/email-logs/{emailLog}/retry', [\App\Http\Controllers\Api\Admin\EmailLogController::class, 'retry']);
    Route::delete('/email-logs/cleanup', [\App\Http\Controllers\Api\Admin\EmailLogController::class, 'cleanup']);
});

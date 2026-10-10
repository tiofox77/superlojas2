<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'super_admin' => \App\Http\Middleware\SuperAdmin::class,
            'store_approved' => \App\Http\Middleware\StoreApproved::class,
        ]);

        // Auto-check expired subscriptions on every API request (max once/hour via cache)
        $middleware->api(append: [
            \App\Http\Middleware\CheckSubscriptionExpiry::class,
        ]);

        // There is no server-side login page (the SPA handles /entrar), so
        // guests must not be redirected to route('login'): that route doesn't
        // exist and the lookup itself threw a 500 before any 401 could render.
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API routes always answer in JSON. Without this, an unauthenticated
        // request lacking "Accept: application/json" fell back to redirecting
        // to route('login') — which doesn't exist — and became a 500.
        $exceptions->shouldRenderJsonWhen(
            fn (\Illuminate\Http\Request $request) => $request->is('api/*') || $request->expectsJson()
        );
    })->create();

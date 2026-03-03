<?php

namespace Database\Seeders;

use App\Models\PageView;
use Illuminate\Database\Seeder;

class PageViewSeeder extends Seeder
{
    public function run(): void
    {
        $paths = ['/', '/lojas', '/lojas/techzone-angola', '/categorias', '/ofertas', '/produto/samsung-galaxy', '/lojas/moda-express', '/contacto', '/lojas/casa-bella', '/lojas/angolan-fashion'];
        $devices = ['desktop', 'mobile', 'tablet'];
        $browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
        $oses = ['Windows', 'Android', 'iOS', 'macOS'];
        $countries = ['Angola', 'Angola', 'Angola', 'Brasil', 'Portugal'];
        $referrers = [null, null, null, 'google.com', 'facebook.com', 'instagram.com', 'wa.me'];

        for ($d = 0; $d < 14; $d++) {
            $date = now()->subDays($d);
            $count = rand(8, 25);
            for ($i = 0; $i < $count; $i++) {
                $vid = 'seed-' . $d . '-' . $i;
                $path = $paths[array_rand($paths)];
                $storeSlug = null;
                if (preg_match('#^/lojas/([a-z0-9\-]+)#i', $path, $m)) {
                    $storeSlug = $m[1];
                }
                $ref = $referrers[array_rand($referrers)];

                PageView::create([
                    'session_id'      => substr($vid, 0, 64),
                    'visitor_hash'    => hash('sha256', $vid . $date->format('Y-m-d')),
                    'path'            => $path,
                    'store_slug'      => $storeSlug,
                    'referrer'        => $ref ? "https://{$ref}/some-page" : null,
                    'referrer_domain' => $ref,
                    'country'         => $countries[array_rand($countries)],
                    'device'          => $devices[array_rand($devices)],
                    'browser'         => $browsers[array_rand($browsers)],
                    'os'              => $oses[array_rand($oses)],
                    'ip_hash'         => hash('sha256', 'ip-' . $vid),
                    'user_id'         => ($i === 0 && $d < 3) ? 1 : null,
                    'is_unique_today' => $i < rand(5, 12),
                    'created_at'      => $date->copy()->addMinutes(rand(0, 1400)),
                ]);
            }
        }

        $this->command->info('Seeded ' . PageView::count() . ' page views');
    }
}

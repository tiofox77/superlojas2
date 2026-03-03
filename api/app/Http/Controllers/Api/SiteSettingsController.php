<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\MailService;
use Illuminate\Http\Request;

class SiteSettingsController extends Controller
{
    /**
     * Public endpoint — returns only public-safe site settings.
     */
    public function index()
    {
        $all = Setting::all()->pluck('value', 'key');

        $public = [
            'site_name'        => $all['site_name'] ?? 'SuperLojas',
            'site_description' => $all['site_description'] ?? '',
            'site_logo'        => $all['site_logo'] ?? '',
            'site_favicon'     => $all['site_favicon'] ?? '',
            'contact_email'    => $all['contact_email'] ?? '',
            'contact_phone'    => $all['contact_phone'] ?? '',
            'contact_whatsapp' => $all['contact_whatsapp'] ?? '',
            'contact_address'  => $all['contact_address'] ?? '',
            'contact_city'     => $all['contact_city'] ?? 'Luanda, Angola',
            'contact_hours'    => $this->jsonOrDefault($all['contact_hours'] ?? null, []),
            'social_instagram' => $all['social_instagram'] ?? '',
            'social_facebook'  => $all['social_facebook'] ?? '',
            'social_tiktok'    => $all['social_tiktok'] ?? '',
            'social_youtube'   => $all['social_youtube'] ?? '',
            'social_twitter'   => $all['social_twitter'] ?? '',
            'social_linkedin'  => $all['social_linkedin'] ?? '',
            'social_website'   => $all['social_website'] ?? '',
            'category_themes_enabled' => ($all['category_themes_enabled'] ?? 'true') === 'true',
            'marquee_active'   => ($all['marquee_active'] ?? 'true') === 'true',
            'marquee_messages' => $this->jsonOrDefault($all['marquee_messages'] ?? null, []),
            'marquee_speed'    => $all['marquee_speed'] ?? '30',
            // SEO
            'seo_title'        => $all['seo_title'] ?? '',
            'seo_description'  => $all['seo_description'] ?? '',
            'seo_keywords'     => $all['seo_keywords'] ?? '',
            'seo_og_image'     => $all['seo_og_image'] ?? '',
            'seo_robots'       => $all['seo_robots'] ?? 'index, follow',
            'seo_canonical'    => $all['seo_canonical'] ?? '',
            'seo_ga_id'        => $all['seo_ga_id'] ?? '',
            'seo_gtm_id'      => $all['seo_gtm_id'] ?? '',
            'seo_fb_pixel'    => $all['seo_fb_pixel'] ?? '',
            'seo_head_scripts' => $all['seo_head_scripts'] ?? '',
        ];

        return response()->json($public);
    }

    /**
     * Public contact form submission.
     */
    public function contact(Request $request)
    {
        $request->validate([
            'name'    => 'required|string|max:255',
            'email'   => 'required|email|max:255',
            'subject' => 'nullable|string|max:255',
            'message' => 'required|string|max:5000',
        ]);

        // Send contact email to admin
        try {
            $adminEmail = Setting::get('contact_email') ?: 'carlos@softecangola.net';
            (new MailService())->sendContactReceived(
                $adminEmail,
                $request->name,
                $request->email,
                $request->subject ?? 'Sem assunto',
                $request->message
            );
        } catch (\Throwable $e) {}

        return response()->json(['message' => 'Mensagem enviada com sucesso.']);
    }

    private function jsonOrDefault(?string $value, mixed $default): mixed
    {
        if (!$value) return $default;
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : $default;
    }
}

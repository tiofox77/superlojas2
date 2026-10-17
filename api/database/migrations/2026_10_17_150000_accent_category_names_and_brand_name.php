<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * QA 17-Out: display names without accents and "SuperLojas" instead of "SuperLoja".
 *
 * - Global categories: only the display NAME changes, and only while it is still the old seed
 *   value (matched by slug + exact old name). Slugs (URLs) stay as they are.
 * - products.category (legacy text copy of the category name) follows the new name, but only
 *   for products linked to that category, so category pages and filters keep working.
 * - settings site_name / seo_title: "SuperLojas" -> "SuperLoja" (footer, install popup, titles).
 */
return new class extends Migration
{
    private const NAMES = [
        'electronica'            => ['Electronica', 'Electrónica'],
        'casa-decoracao'         => ['Casa & Decoracao', 'Casa & Decoração'],
        'automoveis-motas'       => ['Automoveis & Motas', 'Automóveis & Motas'],
        'alimentacao-bebidas'    => ['Alimentacao & Bebidas', 'Alimentação & Bebidas'],
        'bebes-criancas'         => ['Bebes & Criancas', 'Bebés & Crianças'],
        'saude-bem-estar'        => ['Saude & Bem-estar', 'Saúde & Bem-estar'],
        'ferramentas-construcao' => ['Ferramentas & Construcao', 'Ferramentas & Construção'],
        'informatica'            => ['Informatica', 'Informática'],
        'musica-instrumentos'    => ['Musica & Instrumentos', 'Música & Instrumentos'],
        'escritorio-material'    => ['Escritorio & Material', 'Escritório & Material'],
        'servicos'               => ['Servicos', 'Serviços'],
        'imoveis'                => ['Imoveis', 'Imóveis'],
    ];

    public function up(): void
    {
        $this->rename(0, 1);
        $this->brand('SuperLojas', 'SuperLoja');
    }

    public function down(): void
    {
        $this->rename(1, 0);
        // brand name is not reverted on purpose (the plural was the bug)
    }

    private function rename(int $from, int $to): void
    {
        if (!Schema::hasTable('categories')) return;
        $hasProducts = Schema::hasTable('products') && Schema::hasColumn('products', 'category') && Schema::hasColumn('products', 'category_id');

        foreach (self::NAMES as $slug => $names) {
            $cat = DB::table('categories')->where('slug', $slug)->where('name', $names[$from])->first();
            if (!$cat) continue;
            DB::table('categories')->where('id', $cat->id)->update(['name' => $names[$to], 'updated_at' => now()]);
            if ($hasProducts) {
                DB::table('products')->where('category_id', $cat->id)->where('category', $names[$from])
                    ->update(['category' => $names[$to]]);
            }
        }
    }

    private function brand(string $old, string $new): void
    {
        if (!Schema::hasTable('settings')) return;
        DB::table('settings')->where('key', 'site_name')->where('value', $old)->update(['value' => $new, 'updated_at' => now()]);
        foreach (['seo_title', 'pwa_name', 'pwa_short_name'] as $key) {
            $row = DB::table('settings')->where('key', $key)->first();
            if ($row && is_string($row->value) && str_contains($row->value, $old)) {
                DB::table('settings')->where('id', $row->id)->update(['value' => str_replace($old, $new, $row->value), 'updated_at' => now()]);
            }
        }
    }
};

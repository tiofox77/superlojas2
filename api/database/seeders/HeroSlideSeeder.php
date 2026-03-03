<?php

namespace Database\Seeders;

use App\Models\HeroSlide;
use Illuminate\Database\Seeder;

class HeroSlideSeeder extends Seeder
{
    public function run(): void
    {
        $slides = [
            // Global slides (store_slug = null)
            ['title' => 'Descubra as Melhores Lojas de Angola', 'subtitle' => 'Milhares de produtos, dezenas de lojas, tudo num só lugar.', 'cta' => 'Explorar Lojas', 'cta_link' => '/lojas', 'bg_color' => 'from-primary to-warning', 'store_slug' => null, 'sort_order' => 1],
            ['title' => 'Promoções de Verão — Até 40% OFF', 'subtitle' => 'Electrónica, moda e muito mais com preços imperdíveis.', 'cta' => 'Ver Ofertas', 'cta_link' => '/categorias', 'bg_color' => 'from-destructive to-primary', 'store_slug' => null, 'sort_order' => 2],
            ['title' => 'Venda na SuperLojas', 'subtitle' => 'Abra sua loja online gratuitamente e alcance milhares de clientes.', 'cta' => 'Começar a Vender', 'cta_link' => '/cadastro-loja', 'bg_color' => 'from-success to-accent-foreground', 'store_slug' => null, 'sort_order' => 3],

            // TechZone Angola
            ['title' => 'Novos iPhones Chegaram!', 'subtitle' => 'iPhone 15 Pro Max com até 13% de desconto.', 'cta' => 'Ver Ofertas', 'cta_link' => '/produto/iphone-15-pro-max', 'bg_color' => 'from-[hsl(220,20%,15%)] to-[hsl(220,20%,25%)]', 'store_slug' => 'techzone-angola', 'sort_order' => 1],
            ['title' => 'MacBook Air M3 — Poder Silencioso', 'subtitle' => 'O laptop mais fino com o chip mais potente.', 'cta' => 'Comprar Agora', 'cta_link' => '/produto/macbook-air-m3', 'bg_color' => 'from-primary to-[hsl(38,92%,50%)]', 'store_slug' => 'techzone-angola', 'sort_order' => 2],
            ['title' => 'Acessórios com Desconto', 'subtitle' => 'AirPods, carregadores e mais. Tudo original.', 'cta' => 'Explorar', 'cta_link' => '/lojas/techzone-angola', 'bg_color' => 'from-[hsl(200,80%,40%)] to-[hsl(220,60%,50%)]', 'store_slug' => 'techzone-angola', 'sort_order' => 3],

            // Moda Kwanza
            ['title' => 'Nova Colecção Ankara 2026', 'subtitle' => 'Peças exclusivas com estampas africanas modernas.', 'cta' => 'Ver Colecção', 'cta_link' => '/produto/vestido-ankara-premium', 'bg_color' => 'from-[hsl(330,80%,45%)] to-[hsl(350,70%,55%)]', 'store_slug' => 'moda-kwanza', 'sort_order' => 1],
            ['title' => 'Bolsas Artesanais — 20% OFF', 'subtitle' => 'Feitas à mão com materiais premium.', 'cta' => 'Comprar', 'cta_link' => '/produto/bolsa-mao-artesanal', 'bg_color' => 'from-[hsl(30,60%,40%)] to-[hsl(40,70%,50%)]', 'store_slug' => 'moda-kwanza', 'sort_order' => 2],

            // Casa Bela
            ['title' => 'Renove Sua Casa', 'subtitle' => 'Sofás, mesas e decoração com até 18% de desconto.', 'cta' => 'Ver Móveis', 'cta_link' => '/produto/sofa-3-lugares-moderno', 'bg_color' => 'from-[hsl(150,60%,30%)] to-[hsl(160,50%,45%)]', 'store_slug' => 'casa-bela', 'sort_order' => 1],
            ['title' => 'Artesanato Angolano', 'subtitle' => 'Tapetes e candeeiros feitos à mão.', 'cta' => 'Descobrir', 'cta_link' => '/lojas/casa-bela', 'bg_color' => 'from-[hsl(25,70%,45%)] to-[hsl(35,80%,55%)]', 'store_slug' => 'casa-bela', 'sort_order' => 2],

            // SportMax
            ['title' => 'Equipa-te para o Verão', 'subtitle' => 'Ténis, fitness e desporto ao melhor preço.', 'cta' => 'Ver Produtos', 'cta_link' => '/produto/tenis-nike-air-max-90', 'bg_color' => 'from-[hsl(220,70%,45%)] to-[hsl(240,60%,55%)]', 'store_slug' => 'sportmax', 'sort_order' => 1],
            ['title' => 'Halteres com 20% OFF', 'subtitle' => 'Treina em casa com equipamento profissional.', 'cta' => 'Comprar', 'cta_link' => '/produto/halteres-ajustaveis-20kg', 'bg_color' => 'from-[hsl(0,70%,45%)] to-[hsl(20,80%,50%)]', 'store_slug' => 'sportmax', 'sort_order' => 2],
        ];

        foreach ($slides as $slide) {
            HeroSlide::create($slide);
        }
    }
}

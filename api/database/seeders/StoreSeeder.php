<?php

namespace Database\Seeders;

use App\Models\Store;
use Illuminate\Database\Seeder;

class StoreSeeder extends Seeder
{
    public function run(): void
    {
        $stores = [
            [
                'name' => 'TechZone Angola',
                'slug' => 'techzone-angola',
                'description' => 'A melhor loja de electrónica em Luanda. Telemóveis, laptops, acessórios e muito mais. Garantia oficial e assistência técnica.',
                'logo' => 'https://ui-avatars.com/api/?name=TZ&background=F97316&color=fff&size=128&bold=true',
                'banner' => 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1200&h=400&fit=crop',
                'province' => 'Luanda',
                'city' => 'Talatona',
                'whatsapp' => '+244923456789',
                'rating' => 4.8,
                'review_count' => 234,
                'status' => 'approved',
                'categories' => ['Electrónica', 'Acessórios', 'Computadores', 'Telemóveis'],
                'socials' => ['instagram' => 'techzone_ao', 'facebook' => 'techzoneangola', 'tiktok' => 'techzone_ao', 'website' => 'https://techzone.ao'],
            ],
            [
                'name' => 'Moda Kwanza',
                'slug' => 'moda-kwanza',
                'description' => 'Roupas africanas modernas e acessórios de moda feitos em Angola. Peças exclusivas com estampas tradicionais.',
                'logo' => 'https://ui-avatars.com/api/?name=MK&background=EC4899&color=fff&size=128&bold=true',
                'banner' => 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop',
                'province' => 'Luanda',
                'city' => 'Viana',
                'whatsapp' => '+244912345678',
                'rating' => 4.6,
                'review_count' => 189,
                'status' => 'approved',
                'categories' => ['Moda', 'Acessórios', 'Calçado', 'Beleza'],
                'socials' => ['instagram' => 'modakwanza', 'facebook' => 'modakwanza', 'website' => 'https://modakwanza.ao'],
            ],
            [
                'name' => 'Casa Bela',
                'slug' => 'casa-bela',
                'description' => 'Decoração, móveis e tudo para sua casa com estilo angolano. Entregas em todo o país.',
                'logo' => 'https://ui-avatars.com/api/?name=CB&background=10B981&color=fff&size=128&bold=true',
                'banner' => 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=400&fit=crop',
                'province' => 'Benguela',
                'city' => 'Lobito',
                'whatsapp' => '+244934567890',
                'rating' => 4.5,
                'review_count' => 156,
                'status' => 'approved',
                'categories' => ['Casa & Jardim', 'Decoração', 'Móveis', 'Iluminação'],
                'socials' => ['instagram' => 'casabela_ao', 'facebook' => 'casabelaangola'],
            ],
            [
                'name' => 'SportMax',
                'slug' => 'sportmax',
                'description' => 'Equipamento desportivo e roupa fitness para todos os níveis. Marcas originais com os melhores preços.',
                'logo' => 'https://ui-avatars.com/api/?name=SM&background=3B82F6&color=fff&size=128&bold=true',
                'banner' => 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200&h=400&fit=crop',
                'province' => 'Huíla',
                'city' => 'Lubango',
                'whatsapp' => '+244945678901',
                'rating' => 4.7,
                'review_count' => 98,
                'status' => 'approved',
                'categories' => ['Desporto', 'Fitness', 'Calçado Desportivo', 'Equipamento'],
                'socials' => ['instagram' => 'sportmax_ao', 'tiktok' => 'sportmax_ao', 'website' => 'https://sportmax.ao'],
            ],
        ];

        foreach ($stores as $store) {
            Store::create($store);
        }
    }
}

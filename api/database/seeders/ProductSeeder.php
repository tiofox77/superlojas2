<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Store;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $stores = Store::all()->keyBy('slug');

        $products = [
            [
                'name' => 'iPhone 15 Pro Max 256GB', 'slug' => 'iphone-15-pro-max',
                'price' => 450000, 'original_price' => 520000, 'currency' => 'Kz',
                'images' => [
                    'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=400&h=400&fit=crop',
                ],
                'store_slug' => 'techzone-angola', 'category' => 'Electrónica',
                'badge' => 'Promo', 'rating' => 4.9, 'review_count' => 45, 'stock' => 12,
                'description' => 'O iPhone mais avançado com chip A17 Pro e câmara de 48MP. Design em titânio, ecrã Super Retina XDR de 6.7 polegadas, sistema de câmaras pro com zoom óptico 5x. Bateria de longa duração e USB-C.',
                'variants' => [['type' => 'Cor', 'options' => ['Titânio Natural', 'Titânio Azul', 'Titânio Preto']]],
            ],
            [
                'name' => 'Vestido Ankara Premium', 'slug' => 'vestido-ankara-premium',
                'price' => 15000, 'original_price' => null, 'currency' => 'Kz',
                'images' => ['https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=400&h=400&fit=crop'],
                'store_slug' => 'moda-kwanza', 'category' => 'Moda',
                'badge' => 'Novo', 'rating' => 4.7, 'review_count' => 23, 'stock' => 30,
                'description' => 'Vestido com estampas africanas tradicionais, corte moderno.',
                'variants' => [
                    ['type' => 'Tamanho', 'options' => ['S', 'M', 'L', 'XL']],
                    ['type' => 'Cor', 'options' => ['Vermelho', 'Azul', 'Verde']],
                ],
            ],
            [
                'name' => 'Sofá 3 Lugares Moderno', 'slug' => 'sofa-3-lugares-moderno',
                'price' => 180000, 'original_price' => 220000, 'currency' => 'Kz',
                'images' => [
                    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=400&fit=crop',
                ],
                'store_slug' => 'casa-bela', 'category' => 'Casa & Jardim',
                'badge' => 'Promo', 'rating' => 4.4, 'review_count' => 18, 'stock' => 5,
                'description' => 'Sofá confortável com design contemporâneo, tecido premium. Estrutura em madeira maciça com espuma de alta densidade para máximo conforto.',
                'variants' => [['type' => 'Cor', 'options' => ['Cinza', 'Bege', 'Azul Marinho']]],
            ],
            [
                'name' => 'Ténis Nike Air Max 90', 'slug' => 'tenis-nike-air-max-90',
                'price' => 35000, 'original_price' => null, 'currency' => 'Kz',
                'images' => ['https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=400&h=400&fit=crop'],
                'store_slug' => 'sportmax', 'category' => 'Desporto',
                'badge' => null, 'rating' => 4.8, 'review_count' => 67, 'stock' => 20,
                'description' => 'Clássico reinventado com conforto Air Max.',
                'variants' => [
                    ['type' => 'Tamanho', 'options' => ['40', '41', '42', '43', '44']],
                    ['type' => 'Cor', 'options' => ['Branco', 'Preto']],
                ],
            ],
            [
                'name' => 'Samsung Galaxy S24 Ultra', 'slug' => 'samsung-galaxy-s24-ultra',
                'price' => 380000, 'original_price' => 420000, 'currency' => 'Kz',
                'images' => [
                    'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=400&h=400&fit=crop',
                ],
                'store_slug' => 'techzone-angola', 'category' => 'Electrónica',
                'badge' => 'Promo', 'rating' => 4.8, 'review_count' => 34, 'stock' => 8,
                'description' => 'Galaxy AI integrado, câmara de 200MP e S Pen incluída. Ecrã Dynamic AMOLED 2X de 6.8 polegadas, processador Snapdragon 8 Gen 3.',
                'variants' => [['type' => 'Cor', 'options' => ['Violeta', 'Cinza', 'Creme']]],
            ],
            [
                'name' => 'Conjunto Fitness Feminino', 'slug' => 'conjunto-fitness-feminino',
                'price' => 12000, 'original_price' => null, 'currency' => 'Kz',
                'images' => ['https://images.unsplash.com/photo-1518459031867-a89b944bffe4?w=400&h=400&fit=crop'],
                'store_slug' => 'sportmax', 'category' => 'Desporto',
                'badge' => 'Novo', 'rating' => 4.5, 'review_count' => 12, 'stock' => 45,
                'description' => 'Legging + top desportivo, tecido respirável.',
                'variants' => [
                    ['type' => 'Tamanho', 'options' => ['S', 'M', 'L']],
                    ['type' => 'Cor', 'options' => ['Preto', 'Rosa', 'Azul']],
                ],
            ],
            [
                'name' => 'Creme Facial Hidratante', 'slug' => 'creme-facial-hidratante',
                'price' => 5500, 'original_price' => null, 'currency' => 'Kz',
                'images' => ['https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop'],
                'store_slug' => 'moda-kwanza', 'category' => 'Beleza',
                'badge' => null, 'rating' => 4.3, 'review_count' => 56, 'stock' => 100,
                'description' => 'Hidratação profunda com ingredientes naturais africanos.',
                'variants' => [],
            ],
            [
                'name' => 'Mesa de Jantar 6 Lugares', 'slug' => 'mesa-jantar-6-lugares',
                'price' => 95000, 'original_price' => null, 'currency' => 'Kz',
                'images' => ['https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400&h=400&fit=crop'],
                'store_slug' => 'casa-bela', 'category' => 'Casa & Jardim',
                'badge' => 'Novo', 'rating' => 4.6, 'review_count' => 9, 'stock' => 3,
                'description' => 'Mesa em madeira maciça com acabamento natural.',
                'variants' => [['type' => 'Cor', 'options' => ['Natural', 'Nogueira']]],
            ],
            [
                'name' => 'MacBook Air M3 15"', 'slug' => 'macbook-air-m3',
                'price' => 680000, 'original_price' => 750000, 'currency' => 'Kz',
                'images' => ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop'],
                'store_slug' => 'techzone-angola', 'category' => 'Computadores',
                'badge' => 'Promo', 'rating' => 4.9, 'review_count' => 18, 'stock' => 6,
                'description' => 'Chip M3, ecrã Liquid Retina de 15 polegadas, bateria de longa duração.',
                'variants' => [['type' => 'Cor', 'options' => ['Prateado', 'Meia-noite', 'Estelar']]],
            ],
            [
                'name' => 'AirPods Pro 2ª Geração', 'slug' => 'airpods-pro-2',
                'price' => 95000, 'original_price' => null, 'currency' => 'Kz',
                'images' => ['https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=400&h=400&fit=crop'],
                'store_slug' => 'techzone-angola', 'category' => 'Acessórios',
                'badge' => 'Novo', 'rating' => 4.7, 'review_count' => 62, 'stock' => 25,
                'description' => 'Cancelamento de ruído activo, som espacial personalizado.',
                'variants' => [],
            ],
            [
                'name' => 'Carregador Rápido USB-C 65W', 'slug' => 'carregador-usb-c-65w',
                'price' => 8500, 'original_price' => null, 'currency' => 'Kz',
                'images' => ['https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&h=400&fit=crop'],
                'store_slug' => 'techzone-angola', 'category' => 'Acessórios',
                'badge' => null, 'rating' => 4.4, 'review_count' => 89, 'stock' => 50,
                'description' => 'Carregamento rápido GaN para telemóveis e laptops.',
                'variants' => [],
            ],
            [
                'name' => 'Saia Capulana Moderna', 'slug' => 'saia-capulana-moderna',
                'price' => 8500, 'original_price' => null, 'currency' => 'Kz',
                'images' => ['https://images.unsplash.com/photo-1583496661160-fb5886a0aeae?w=400&h=400&fit=crop'],
                'store_slug' => 'moda-kwanza', 'category' => 'Moda',
                'badge' => 'Novo', 'rating' => 4.5, 'review_count' => 31, 'stock' => 40,
                'description' => 'Saia em capulana com corte contemporâneo, feita à mão.',
                'variants' => [
                    ['type' => 'Tamanho', 'options' => ['S', 'M', 'L']],
                    ['type' => 'Cor', 'options' => ['Multicolor', 'Azul', 'Amarelo']],
                ],
            ],
            [
                'name' => 'Bolsa de Mão Artesanal', 'slug' => 'bolsa-mao-artesanal',
                'price' => 12000, 'original_price' => 15000, 'currency' => 'Kz',
                'images' => ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop'],
                'store_slug' => 'moda-kwanza', 'category' => 'Acessórios',
                'badge' => 'Promo', 'rating' => 4.6, 'review_count' => 19, 'stock' => 15,
                'description' => 'Bolsa artesanal em tecido africano com alça ajustável.',
                'variants' => [['type' => 'Cor', 'options' => ['Castanho', 'Preto', 'Colorido']]],
            ],
            [
                'name' => 'Sandálias de Couro', 'slug' => 'sandalias-couro',
                'price' => 9500, 'original_price' => null, 'currency' => 'Kz',
                'images' => ['https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400&h=400&fit=crop'],
                'store_slug' => 'moda-kwanza', 'category' => 'Calçado',
                'badge' => null, 'rating' => 4.3, 'review_count' => 27, 'stock' => 35,
                'description' => 'Sandálias em couro genuíno, conforto o dia todo.',
                'variants' => [['type' => 'Tamanho', 'options' => ['36', '37', '38', '39', '40']]],
            ],
            [
                'name' => 'Candeeiro de Mesa Design', 'slug' => 'candeeiro-mesa-design',
                'price' => 22000, 'original_price' => null, 'currency' => 'Kz',
                'images' => ['https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=400&h=400&fit=crop'],
                'store_slug' => 'casa-bela', 'category' => 'Iluminação',
                'badge' => 'Novo', 'rating' => 4.5, 'review_count' => 14, 'stock' => 20,
                'description' => 'Candeeiro moderno com base em madeira e cúpula em tecido.',
                'variants' => [['type' => 'Cor', 'options' => ['Branco', 'Cinza', 'Natural']]],
            ],
            [
                'name' => 'Tapete Artesanal 2x3m', 'slug' => 'tapete-artesanal-2x3',
                'price' => 45000, 'original_price' => 55000, 'currency' => 'Kz',
                'images' => ['https://images.unsplash.com/photo-1600166898405-da9535204843?w=400&h=400&fit=crop'],
                'store_slug' => 'casa-bela', 'category' => 'Decoração',
                'badge' => 'Promo', 'rating' => 4.7, 'review_count' => 8, 'stock' => 7,
                'description' => 'Tapete tecido à mão com padrões geométricos africanos.',
                'variants' => [['type' => 'Cor', 'options' => ['Bege/Preto', 'Terracota', 'Azul/Branco']]],
            ],
            [
                'name' => 'Bola de Futebol Profissional', 'slug' => 'bola-futebol-profissional',
                'price' => 15000, 'original_price' => null, 'currency' => 'Kz',
                'images' => ['https://images.unsplash.com/photo-1614632537197-38a17061c2bd?w=400&h=400&fit=crop'],
                'store_slug' => 'sportmax', 'category' => 'Equipamento',
                'badge' => null, 'rating' => 4.6, 'review_count' => 43, 'stock' => 30,
                'description' => 'Bola oficial tamanho 5, material PU premium.',
                'variants' => [['type' => 'Cor', 'options' => ['Branco/Preto', 'Amarelo/Azul']]],
            ],
            [
                'name' => 'Halteres Ajustáveis 20kg', 'slug' => 'halteres-ajustaveis-20kg',
                'price' => 28000, 'original_price' => 35000, 'currency' => 'Kz',
                'images' => ['https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?w=400&h=400&fit=crop'],
                'store_slug' => 'sportmax', 'category' => 'Fitness',
                'badge' => 'Promo', 'rating' => 4.8, 'review_count' => 22, 'stock' => 10,
                'description' => 'Par de halteres ajustáveis de 2kg a 20kg, revestimento emborrachado.',
                'variants' => [],
            ],
        ];

        foreach ($products as $product) {
            $storeSlug = $product['store_slug'];
            unset($product['store_slug']);
            $product['store_id'] = $stores[$storeSlug]->id;
            Product::create($product);
        }
    }
}

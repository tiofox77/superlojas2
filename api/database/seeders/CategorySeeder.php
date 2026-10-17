<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Electrónica', 'slug' => 'electronica', 'icon' => '📱'],
            ['name' => 'Moda Feminina', 'slug' => 'moda-feminina', 'icon' => '👗'],
            ['name' => 'Moda Masculina', 'slug' => 'moda-masculina', 'icon' => '�'],
            ['name' => 'Casa & Decoração', 'slug' => 'casa-decoracao', 'icon' => '🏠'],
            ['name' => 'Automóveis & Motas', 'slug' => 'automoveis-motas', 'icon' => '🚗'],
            ['name' => 'Beleza & Cuidados', 'slug' => 'beleza-cuidados', 'icon' => '💄'],
            ['name' => 'Desporto & Lazer', 'slug' => 'desporto-lazer', 'icon' => '⚽'],
            ['name' => 'Alimentação & Bebidas', 'slug' => 'alimentacao-bebidas', 'icon' => '�'],
            ['name' => 'Livros & Papelaria', 'slug' => 'livros-papelaria', 'icon' => '📚'],
            ['name' => 'Bebés & Crianças', 'slug' => 'bebes-criancas', 'icon' => '🍼'],
            ['name' => 'Saúde & Bem-estar', 'slug' => 'saude-bem-estar', 'icon' => '�'],
            ['name' => 'Ferramentas & Construção', 'slug' => 'ferramentas-construcao', 'icon' => '🔧'],
            ['name' => 'Informática', 'slug' => 'informatica', 'icon' => '💻'],
            ['name' => 'Jogos & Consolas', 'slug' => 'jogos-consolas', 'icon' => '🎮'],
            ['name' => 'Animais', 'slug' => 'animais', 'icon' => '🐶'],
            ['name' => 'Música & Instrumentos', 'slug' => 'musica-instrumentos', 'icon' => '🎵'],
            ['name' => 'Escritório & Material', 'slug' => 'escritorio-material', 'icon' => '�️'],
            ['name' => 'Serviços', 'slug' => 'servicos', 'icon' => '🛠️'],
            ['name' => 'Imóveis', 'slug' => 'imoveis', 'icon' => '🏡'],
            ['name' => 'Agricultura', 'slug' => 'agricultura', 'icon' => '🌽'],
        ];

        foreach ($categories as $category) {
            Category::updateOrCreate(['slug' => $category['slug']], $category);
        }
    }
}

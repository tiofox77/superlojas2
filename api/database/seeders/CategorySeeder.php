<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Electronica', 'slug' => 'electronica', 'icon' => '📱'],
            ['name' => 'Moda Feminina', 'slug' => 'moda-feminina', 'icon' => '👗'],
            ['name' => 'Moda Masculina', 'slug' => 'moda-masculina', 'icon' => '�'],
            ['name' => 'Casa & Decoracao', 'slug' => 'casa-decoracao', 'icon' => '🏠'],
            ['name' => 'Automoveis & Motas', 'slug' => 'automoveis-motas', 'icon' => '🚗'],
            ['name' => 'Beleza & Cuidados', 'slug' => 'beleza-cuidados', 'icon' => '💄'],
            ['name' => 'Desporto & Lazer', 'slug' => 'desporto-lazer', 'icon' => '⚽'],
            ['name' => 'Alimentacao & Bebidas', 'slug' => 'alimentacao-bebidas', 'icon' => '�'],
            ['name' => 'Livros & Papelaria', 'slug' => 'livros-papelaria', 'icon' => '📚'],
            ['name' => 'Bebes & Criancas', 'slug' => 'bebes-criancas', 'icon' => '🍼'],
            ['name' => 'Saude & Bem-estar', 'slug' => 'saude-bem-estar', 'icon' => '�'],
            ['name' => 'Ferramentas & Construcao', 'slug' => 'ferramentas-construcao', 'icon' => '🔧'],
            ['name' => 'Informatica', 'slug' => 'informatica', 'icon' => '💻'],
            ['name' => 'Jogos & Consolas', 'slug' => 'jogos-consolas', 'icon' => '🎮'],
            ['name' => 'Animais', 'slug' => 'animais', 'icon' => '🐶'],
            ['name' => 'Musica & Instrumentos', 'slug' => 'musica-instrumentos', 'icon' => '🎵'],
            ['name' => 'Escritorio & Material', 'slug' => 'escritorio-material', 'icon' => '�️'],
            ['name' => 'Servicos', 'slug' => 'servicos', 'icon' => '🛠️'],
            ['name' => 'Imoveis', 'slug' => 'imoveis', 'icon' => '🏡'],
            ['name' => 'Agricultura', 'slug' => 'agricultura', 'icon' => '🌽'],
        ];

        foreach ($categories as $category) {
            Category::updateOrCreate(['slug' => $category['slug']], $category);
        }
    }
}

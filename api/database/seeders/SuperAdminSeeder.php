<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@superlojas.ao'],
            [
                'name' => 'Super Admin',
                'password' => 'admin123',
                'role' => 'super_admin',
                'phone' => '+244900000000',
                'is_active' => true,
            ]
        );
    }
}

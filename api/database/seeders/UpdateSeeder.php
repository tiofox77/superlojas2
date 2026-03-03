<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Safe seeder for system updates.
 * Only runs idempotent seeders that use updateOrCreate.
 * Called automatically during system update installs.
 */
class UpdateSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            PlanSeeder::class,
            CategorySeeder::class,
            SubcategorySeeder::class,
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

class ProvinceController extends Controller
{
    private static array $data = [
        'Bengo' => ['Ambriz', 'Dande', 'Dembos', 'Bula Atumba', 'Nambuangongo', 'Pango Aluquém', 'Icolo e Bengo', 'Quiçama'],
        'Benguela' => ['Benguela', 'Baía Farta', 'Balombo', 'Bocoio', 'Caimbambo', 'Catumbela', 'Chongoroi', 'Cubal', 'Ganda', 'Lobito'],
        'Bié' => ['Kuito', 'Andulo', 'Camacupa', 'Catabola', 'Chinguar', 'Chitembo', 'Cunhinga', 'Cuemba', 'Nharea'],
        'Cabinda' => ['Cabinda', 'Belize', 'Buco-Zau', 'Cacongo'],
        'Cuando Cubango' => ['Menongue', 'Calai', 'Cuangar', 'Cuchi', 'Cuito Cuanavale', 'Dirico', 'Mavinga', 'Nancova', 'Rivungo'],
        'Cunene' => ['Ondjiva', 'Cahama', 'Cuanhama', 'Curoca', 'Cuvelai', 'Namacunde', 'Ombadja'],
        'Huambo' => ['Huambo', 'Bailundo', 'Cachiungo', 'Caála', 'Ecunha', 'Londuimbali', 'Longonjo', 'Mungo', 'Tchicala-Tcholoanga', 'Tchindjenje', 'Ucuma'],
        'Huíla' => ['Lubango', 'Caconda', 'Cacula', 'Caluquembe', 'Chibia', 'Chicomba', 'Chipindo', 'Cuvango', 'Gambos', 'Humpata', 'Jamba', 'Matala', 'Quilengues', 'Quipungo'],
        'Kwanza Norte' => ['Ndalatando', 'Ambaca', 'Banga', 'Bolongongo', 'Cambambe', 'Cazengo', 'Golungo Alto', 'Gonguembo', 'Lucala', 'Quiculungo', 'Samba Caju'],
        'Kwanza Sul' => ['Sumbe', 'Amboim', 'Cassongue', 'Cela', 'Conda', 'Ebo', 'Libolo', 'Mussende', 'Porto Amboim', 'Quibala', 'Quilenda', 'Seles'],
        'Luanda' => ['Luanda', 'Belas', 'Cacuaco', 'Cazenga', 'Ícolo e Bengo', 'Quiçama', 'Talatona', 'Viana', 'Kilamba Kiaxi', 'Maianga', 'Rangel', 'Samba', 'Sambizanga'],
        'Lunda Norte' => ['Dundo', 'Cambulo', 'Capenda-Camulemba', 'Caungula', 'Chitato', 'Cuango', 'Cuílo', 'Lubalo', 'Lucapa', 'Xá-Muteba'],
        'Lunda Sul' => ['Saurimo', 'Cacolo', 'Dala', 'Muconda', 'Muriege'],
        'Malanje' => ['Malanje', 'Cacuso', 'Calandula', 'Cambundi-Catembo', 'Cangandala', 'Cuaba Nzoji', 'Cunda-Dia-Baze', 'Luquembo', 'Marimba', 'Massango', 'Mucari', 'Quela', 'Quirima'],
        'Moxico' => ['Luena', 'Alto Zambeze', 'Bundas', 'Camanongue', 'Léua', 'Luau', 'Luchazes', 'Lumeje', 'Moxico'],
        'Namibe' => ['Moçâmedes', 'Bibala', 'Camucuio', 'Tômbwa', 'Vilas do Bispo'],
        'Uíge' => ['Uíge', 'Ambuíla', 'Bembe', 'Buengas', 'Bungo', 'Damba', 'Maquela do Zombo', 'Mucaba', 'Negage', 'Puri', 'Quimbele', 'Quitexe', 'Sanza Pombo', 'Songo', 'Zombo'],
        'Zaire' => ['Mbanza Kongo', 'Cuimba', 'Nóqui', 'Nzeto', 'Soyo', 'Tomboco'],
    ];

    public function index()
    {
        return response()->json(
            collect(self::$data)->map(function ($municipalities, $province) {
                return ['name' => $province, 'municipalities' => $municipalities];
            })->values()
        );
    }
}

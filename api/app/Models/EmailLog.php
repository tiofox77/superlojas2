<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailLog extends Model
{
    protected $fillable = [
        'to', 'subject', 'template', 'status', 'error', 'data', 'duration_ms',
    ];

    protected $casts = [
        'data' => 'array',
    ];
}

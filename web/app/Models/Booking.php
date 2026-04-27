<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Booking extends Model
{
    protected $fillable = [
        'learner_id',
        'teacher_profile_id',
        'slot_date',
        'slot_start',
        'slot_end',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'slot_date' => 'date:Y-m-d',
        ];
    }

    public function learner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'learner_id');
    }

    public function teacherProfile(): BelongsTo
    {
        return $this->belongsTo(TeacherProfile::class);
    }

    public function session(): HasOne
    {
        return $this->hasOne(Session::class);
    }
}

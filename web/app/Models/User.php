<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'mobile',
        'name',
        'active_role',
    ];

    protected $hidden = [
        'remember_token',
    ];

    public function roles(): HasMany
    {
        return $this->hasMany(UserRole::class);
    }

    public function teacherProfile(): HasOne
    {
        return $this->hasOne(TeacherProfile::class);
    }

    public function wallet(): HasOne
    {
        return $this->hasOne(Wallet::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function bookingsAsLearner(): HasMany
    {
        return $this->hasMany(Booking::class, 'learner_id');
    }

    public function withdrawRequests(): HasMany
    {
        return $this->hasMany(WithdrawRequest::class);
    }

    public function roleNames(): array
    {
        return $this->roles()->pluck('role')->all();
    }

    public function hasRole(string $role): bool
    {
        return $this->roles()->where('role', $role)->exists();
    }

    public function ensureRole(string $role): void
    {
        $this->roles()->firstOrCreate(['role' => $role]);

        if (! $this->active_role || ! $this->hasRole($this->active_role)) {
            $this->forceFill(['active_role' => $role])->save();
        }
    }

    public function syncActiveRole(): void
    {
        $roles = $this->roleNames();

        if ($roles === []) {
            $this->roles()->firstOrCreate(['role' => 'learner']);
            $roles = ['learner'];
        }

        if (! in_array($this->active_role, $roles, true)) {
            $this->forceFill(['active_role' => $roles[0]])->save();
        }
    }
}

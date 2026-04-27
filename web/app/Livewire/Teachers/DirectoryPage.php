<?php

namespace App\Livewire\Teachers;

use App\Services\VoddaPlatformService;
use Illuminate\Contracts\View\View;
use Livewire\Component;

class DirectoryPage extends Component
{
    public string $query = '';

    public string $specialty = '';

    public string $level = '';

    public function mount(): void
    {
        $this->query = (string) request()->query('query', '');
        $this->specialty = (string) request()->query('specialty', '');
        $this->level = (string) request()->query('level', '');
    }

    public function render(): View
    {
        $teachers = app(VoddaPlatformService::class)->listTeachers([
            'query' => $this->query,
            'specialty' => $this->specialty,
            'level' => $this->level,
        ]);

        return view('livewire.teachers.directory-page', [
            'teachers' => $teachers,
        ])->layout('layouts.app', [
            'title' => 'لیست اساتید',
        ]);
    }
}

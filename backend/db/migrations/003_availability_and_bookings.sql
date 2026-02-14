-- Availability slots and bookings
CREATE TABLE IF NOT EXISTS availability_slots (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    teacher_profile_id BIGINT UNSIGNED NOT NULL,
    day_of_week TINYINT UNSIGNED NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_profile_id) REFERENCES teacher_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    learner_id BIGINT UNSIGNED NOT NULL,
    teacher_profile_id BIGINT UNSIGNED NOT NULL,
    slot_date DATE NOT NULL,
    slot_start TIME NOT NULL,
    slot_end TIME NOT NULL,
    status ENUM('pending', 'accepted', 'rejected', 'cancelled', 'completed') NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (learner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_profile_id) REFERENCES teacher_profiles(id) ON DELETE CASCADE
);

-- Teacher profiles
CREATE TABLE IF NOT EXISTS teacher_profiles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    specialty VARCHAR(100) NOT NULL,
    level ENUM('beginner', 'intermediate', 'advanced') NOT NULL,
    bio TEXT,
    price_per_30min DECIMAL(12,0) UNSIGNED NOT NULL DEFAULT 0,
    verification_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teacher_media (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    teacher_profile_id BIGINT UNSIGNED NOT NULL,
    media_type ENUM('photo', 'audio') NOT NULL,
    url VARCHAR(512) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_profile_id) REFERENCES teacher_profiles(id) ON DELETE CASCADE
);

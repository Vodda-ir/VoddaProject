-- Ratings
CREATE TABLE IF NOT EXISTS ratings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL,
    learner_id BIGINT UNSIGNED NOT NULL,
    teacher_profile_id BIGINT UNSIGNED NOT NULL,
    score TINYINT UNSIGNED NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (learner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_profile_id) REFERENCES teacher_profiles(id) ON DELETE CASCADE
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- OTP requests
CREATE TABLE IF NOT EXISTS otp_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    mobile VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_otp_mobile (mobile),
    INDEX idx_otp_expires (expires_at)
);

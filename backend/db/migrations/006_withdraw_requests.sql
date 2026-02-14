-- Withdraw requests
CREATE TABLE IF NOT EXISTS withdraw_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(15,0) UNSIGNED NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'paid') NOT NULL DEFAULT 'pending',
    bank_info JSON,
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

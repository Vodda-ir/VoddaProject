-- Additional indexes for performance
CREATE INDEX idx_bookings_learner ON bookings(learner_id);
CREATE INDEX idx_bookings_teacher ON bookings(teacher_profile_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_slot ON bookings(slot_date, slot_start);
CREATE INDEX idx_ratings_teacher ON ratings(teacher_profile_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);

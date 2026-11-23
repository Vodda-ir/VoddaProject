SET NAMES utf8mb4;
DELETE FROM reviews WHERE session_id >= 200;
DELETE FROM sessions WHERE learner_id = 2 AND id >= 200;
INSERT INTO sessions (id, learner_id, teacher_id, service_id, title, scheduled_at, duration, price, status, note, reject_note, rated, created_at, updated_at) VALUES
(200, 2, 5, 0, 'جلسه تلاوت و روخوانی قرآن کریم · ۶۰ دقیقه', DATE_SUB(NOW(), INTERVAL 3 DAY), 60, 360000, 'done', '', '', 1, DATE_SUB(NOW(), INTERVAL 6 DAY), NOW()),
(201, 2, 18, 0, 'جلسه آموزش تجوید و اصلاح لهجه قرآن کریم · ۴۵ دقیقه', DATE_SUB(NOW(), INTERVAL 9 DAY), 45, 270000, 'done', '', '', 1, DATE_SUB(NOW(), INTERVAL 12 DAY), NOW()),
(202, 2, 14, 0, 'جلسه تلاوت و روخوانی قرآن کریم · ۳۰ دقیقه', DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 1 DAY), INTERVAL 8 HOUR), 30, 130000, 'confirmed', 'برای تثبیت روخوانی، لطفاً همین ساعت را تایید کنید.', '', 0, DATE_SUB(NOW(), INTERVAL 1 DAY), NOW()),
(203, 2, 31, 0, 'جلسه تلاوت و روخوانی قرآن کریم · ۶۰ دقیقه', DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 3 DAY), INTERVAL 11 HOUR), 60, 260000, 'pending', 'سلام، برای جلسه هفتگی رزرو کردم. ممنون.', '', 0, DATE_SUB(NOW(), INTERVAL 5 HOUR), NOW());
UPDATE sessions s JOIN services sv ON sv.teacher_id = s.teacher_id AND sv.duration = s.duration AND sv.active = 1 SET s.service_id = sv.id WHERE s.id BETWEEN 200 AND 203;
INSERT INTO reviews (id, session_id, teacher_id, learner_id, rating, `text`, created_at) VALUES
(200, 200, 5, 2, 5, 'واقعاً جلسه پرمحوری بود؛ تصحیح لحظه‌ای لهجه عالی بود.', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(201, 201, 18, 2, 5, 'استاد دلسوز و دقیقی هستند. تجویدم خیلی بهتر شد.', DATE_SUB(NOW(), INTERVAL 8 DAY));
INSERT INTO transactions (user_id, type, title, amount, ref_id, created_at) VALUES
(2, 'session', 'پرداخت هزینه جلسه تلاوت و روخوانی', 360000, 200, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(2, 'session', 'پرداخت هزینه جلسه تجوید و اصلاح لهجه', 270000, 201, DATE_SUB(NOW(), INTERVAL 9 DAY));

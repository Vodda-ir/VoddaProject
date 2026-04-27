package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"
)

var ErrForbidden = errors.New("forbidden")
var ErrNotFound = errors.New("not found")
var ErrConflict = errors.New("conflict")
var ErrInsufficientBalance = errors.New("insufficient balance")
var ErrInvalidInput = errors.New("invalid input")

// AppService contains non-auth MVP business logic.
type AppService struct {
	db                *sql.DB
	commissionPercent int64
}

func NewAppService(db *sql.DB, commissionPercent int64) *AppService {
	if commissionPercent < 0 {
		commissionPercent = 0
	}
	if commissionPercent > 100 {
		commissionPercent = 100
	}
	return &AppService{db: db, commissionPercent: commissionPercent}
}

type TeacherProfileUpsertRequest struct {
	Specialty     string `json:"specialty" binding:"required"`
	Level         string `json:"level" binding:"required"`
	Bio           string `json:"bio"`
	PricePer30min int64  `json:"price_per_30min" binding:"required"`
}

type TeacherSummary struct {
	ID                 int64   `json:"id"`
	UserID             int64   `json:"user_id"`
	Name               string  `json:"name"`
	Specialty          string  `json:"specialty"`
	Level              string  `json:"level"`
	Bio                string  `json:"bio"`
	PricePer30min      int64   `json:"price_per_30min"`
	VerificationStatus string  `json:"verification_status"`
	AverageRating      float64 `json:"average_rating"`
}

type TeacherListFilter struct {
	Query        string
	Specialty    string
	Level        string
	OnlyApproved bool
}

type BookingCreateRequest struct {
	TeacherProfileID int64  `json:"teacher_profile_id" binding:"required"`
	SlotDate         string `json:"slot_date" binding:"required"`
	SlotStart        string `json:"slot_start" binding:"required"`
	SlotEnd          string `json:"slot_end" binding:"required"`
	Notes            string `json:"notes"`
}

type BookingActionRequest struct {
	Reason string `json:"reason"`
}

type BookingSummary struct {
	ID               int64  `json:"id"`
	LearnerID        int64  `json:"learner_id"`
	LearnerName      string `json:"learner_name"`
	TeacherProfileID int64  `json:"teacher_profile_id"`
	TeacherName      string `json:"teacher_name"`
	SlotDate         string `json:"slot_date"`
	SlotStart        string `json:"slot_start"`
	SlotEnd          string `json:"slot_end"`
	Status           string `json:"status"`
	Notes            string `json:"notes"`
	CreatedAt        string `json:"created_at"`
}

type SessionTokenResponse struct {
	SessionID int64  `json:"session_id"`
	RoomName  string `json:"room_name"`
	Token     string `json:"token"`
	Provider  string `json:"provider"`
}

type TopupInitiateRequest struct {
	Amount int64 `json:"amount" binding:"required"`
}

type TopupInitiateResponse struct {
	ReferenceID string `json:"reference_id"`
	Amount      int64  `json:"amount"`
	PaymentURL  string `json:"payment_url"`
	Status      string `json:"status"`
}

type TopupVerifyRequest struct {
	ReferenceID string `json:"reference_id" binding:"required"`
	Amount      int64  `json:"amount" binding:"required"`
}

type TopupVerifyResponse struct {
	ReferenceID string `json:"reference_id"`
	Status      string `json:"status"`
	Balance     int64  `json:"balance"`
	AlreadyDone bool   `json:"already_done"`
}

type WalletTransactionItem struct {
	ID          int64  `json:"id"`
	Amount      int64  `json:"amount"`
	Type        string `json:"type"`
	ReferenceID string `json:"reference_id"`
	Description string `json:"description"`
	CreatedAt   string `json:"created_at"`
}

type WalletTransactionsResponse struct {
	WalletID     int64                   `json:"wallet_id"`
	Balance      int64                   `json:"balance"`
	Transactions []WalletTransactionItem `json:"transactions"`
}

type WithdrawRequestCreate struct {
	Amount   int64           `json:"amount" binding:"required"`
	BankInfo json.RawMessage `json:"bank_info"`
}

type WithdrawRequestProcess struct {
	Action string `json:"action" binding:"required"`
}

type WithdrawRequestItem struct {
	ID          int64  `json:"id"`
	UserID      int64  `json:"user_id"`
	UserName    string `json:"user_name"`
	UserMobile  string `json:"user_mobile"`
	Amount      int64  `json:"amount"`
	Status      string `json:"status"`
	BankInfo    string `json:"bank_info"`
	ProcessedAt string `json:"processed_at,omitempty"`
	CreatedAt   string `json:"created_at"`
}

type RatingCreateRequest struct {
	BookingID int64  `json:"booking_id" binding:"required"`
	Score     int64  `json:"score" binding:"required"`
	Comment   string `json:"comment"`
}

type RatingItem struct {
	ID               int64  `json:"id"`
	BookingID        int64  `json:"booking_id"`
	LearnerID        int64  `json:"learner_id"`
	TeacherProfileID int64  `json:"teacher_profile_id"`
	Score            int64  `json:"score"`
	Comment          string `json:"comment"`
	CreatedAt        string `json:"created_at"`
}

type NotificationItem struct {
	ID        int64  `json:"id"`
	Title     string `json:"title"`
	Body      string `json:"body"`
	ReadAt    string `json:"read_at,omitempty"`
	CreatedAt string `json:"created_at"`
}

func (s *AppService) UpsertTeacherProfile(userID int64, req TeacherProfileUpsertRequest) (*TeacherSummary, error) {
	specialty := strings.TrimSpace(req.Specialty)
	level := strings.TrimSpace(req.Level)
	bio := strings.TrimSpace(req.Bio)
	if specialty == "" || !isTeacherLevel(level) || req.PricePer30min <= 0 {
		return nil, ErrInvalidInput
	}

	if _, err := s.db.Exec(`
		INSERT INTO teacher_profiles (user_id, specialty, level, bio, price_per30min, verification_status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, 'pending', NOW(), NOW())
		ON DUPLICATE KEY UPDATE
			specialty = VALUES(specialty),
			level = VALUES(level),
			bio = VALUES(bio),
			price_per30min = VALUES(price_per30min),
			verification_status = 'pending',
			updated_at = NOW()
	`, userID, specialty, level, bio, req.PricePer30min); err != nil {
		return nil, err
	}
	if _, err := s.db.Exec("INSERT IGNORE INTO user_roles (user_id, role) VALUES (?, 'teacher')", userID); err != nil {
		return nil, err
	}
	teacher, err := s.getTeacherByUserID(userID)
	if err != nil {
		return nil, err
	}
	return teacher, nil
}

func (s *AppService) ListTeachers(filter TeacherListFilter) ([]TeacherSummary, error) {
	where := []string{"tp.deleted_at IS NULL"}
	args := make([]interface{}, 0)
	if filter.OnlyApproved {
		where = append(where, "tp.verification_status = 'approved'")
	}
	if q := strings.TrimSpace(filter.Query); q != "" {
		where = append(where, "(u.name LIKE ? OR tp.specialty LIKE ?)")
		pattern := "%" + q + "%"
		args = append(args, pattern, pattern)
	}
	if specialty := strings.TrimSpace(filter.Specialty); specialty != "" {
		where = append(where, "tp.specialty = ?")
		args = append(args, specialty)
	}
	if level := strings.TrimSpace(filter.Level); level != "" {
		where = append(where, "tp.level = ?")
		args = append(args, level)
	}

	query := `
		SELECT
			tp.id,
			tp.user_id,
			u.name,
			tp.specialty,
			tp.level,
			tp.bio,
			tp.price_per30min,
			tp.verification_status,
			COALESCE(AVG(r.score), 0)
		FROM teacher_profiles tp
		JOIN users u ON u.id = tp.user_id
		LEFT JOIN ratings r ON r.teacher_profile_id = tp.id
		WHERE ` + strings.Join(where, " AND ") + `
		GROUP BY tp.id, tp.user_id, u.name, tp.specialty, tp.level, tp.bio, tp.price_per30min, tp.verification_status
		ORDER BY tp.created_at DESC
	`

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]TeacherSummary, 0)
	for rows.Next() {
		var it TeacherSummary
		if err := rows.Scan(
			&it.ID,
			&it.UserID,
			&it.Name,
			&it.Specialty,
			&it.Level,
			&it.Bio,
			&it.PricePer30min,
			&it.VerificationStatus,
			&it.AverageRating,
		); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, nil
}

func (s *AppService) GetTeacherByID(id int64) (*TeacherSummary, error) {
	var it TeacherSummary
	err := s.db.QueryRow(`
		SELECT
			tp.id,
			tp.user_id,
			u.name,
			tp.specialty,
			tp.level,
			tp.bio,
			tp.price_per30min,
			tp.verification_status,
			COALESCE(AVG(r.score), 0)
		FROM teacher_profiles tp
		JOIN users u ON u.id = tp.user_id
		LEFT JOIN ratings r ON r.teacher_profile_id = tp.id
		WHERE tp.id = ? AND tp.deleted_at IS NULL
		GROUP BY tp.id, tp.user_id, u.name, tp.specialty, tp.level, tp.bio, tp.price_per30min, tp.verification_status
	`, id).Scan(
		&it.ID,
		&it.UserID,
		&it.Name,
		&it.Specialty,
		&it.Level,
		&it.Bio,
		&it.PricePer30min,
		&it.VerificationStatus,
		&it.AverageRating,
	)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &it, nil
}

func (s *AppService) GetPendingTeachers() ([]TeacherSummary, error) {
	return s.ListTeachers(TeacherListFilter{OnlyApproved: false, Query: "", Specialty: "", Level: ""})
}

func (s *AppService) ListAdminPendingTeachers() ([]TeacherSummary, error) {
	rows, err := s.db.Query(`
		SELECT
			tp.id,
			tp.user_id,
			u.name,
			tp.specialty,
			tp.level,
			tp.bio,
			tp.price_per30min,
			tp.verification_status,
			COALESCE(AVG(r.score), 0)
		FROM teacher_profiles tp
		JOIN users u ON u.id = tp.user_id
		LEFT JOIN ratings r ON r.teacher_profile_id = tp.id
		WHERE tp.deleted_at IS NULL AND tp.verification_status = 'pending'
		GROUP BY tp.id, tp.user_id, u.name, tp.specialty, tp.level, tp.bio, tp.price_per30min, tp.verification_status
		ORDER BY tp.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]TeacherSummary, 0)
	for rows.Next() {
		var it TeacherSummary
		if err := rows.Scan(
			&it.ID,
			&it.UserID,
			&it.Name,
			&it.Specialty,
			&it.Level,
			&it.Bio,
			&it.PricePer30min,
			&it.VerificationStatus,
			&it.AverageRating,
		); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, nil
}

func (s *AppService) UpdateTeacherVerification(teacherProfileID int64, status string) (*TeacherSummary, error) {
	if status != "approved" && status != "rejected" {
		return nil, ErrInvalidInput
	}
	res, err := s.db.Exec("UPDATE teacher_profiles SET verification_status = ?, updated_at = NOW() WHERE id = ?", status, teacherProfileID)
	if err != nil {
		return nil, err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return nil, ErrNotFound
	}

	teacher, err := s.GetTeacherByID(teacherProfileID)
	if err != nil {
		return nil, err
	}
	if status == "approved" {
		if _, err := s.db.Exec("INSERT IGNORE INTO user_roles (user_id, role) VALUES (?, 'teacher')", teacher.UserID); err != nil {
			return nil, err
		}
	}
	_ = s.createNotification(teacher.UserID, "وضعیت پروفایل استاد", fmt.Sprintf("وضعیت پروفایل شما: %s", status))
	return teacher, nil
}

func (s *AppService) CreateBooking(learnerID int64, req BookingCreateRequest) (*BookingSummary, error) {
	if req.TeacherProfileID <= 0 || req.SlotDate == "" || req.SlotStart == "" || req.SlotEnd == "" {
		return nil, ErrInvalidInput
	}
	if !isValidTimeRange(req.SlotStart, req.SlotEnd) {
		return nil, ErrInvalidInput
	}

	var teacherUserID int64
	var verification string
	err := s.db.QueryRow("SELECT user_id, verification_status FROM teacher_profiles WHERE id = ? AND deleted_at IS NULL", req.TeacherProfileID).Scan(&teacherUserID, &verification)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if verification != "approved" {
		return nil, ErrConflict
	}

	var exists int64
	if err := s.db.QueryRow(`
		SELECT COUNT(1)
		FROM bookings
		WHERE teacher_profile_id = ?
		  AND slot_date = ?
		  AND slot_start = ?
		  AND status IN ('pending', 'accepted')
	`, req.TeacherProfileID, req.SlotDate, req.SlotStart).Scan(&exists); err != nil {
		return nil, err
	}
	if exists > 0 {
		return nil, ErrConflict
	}

	res, err := s.db.Exec(`
		INSERT INTO bookings (learner_id, teacher_profile_id, slot_date, slot_start, slot_end, status, notes, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())
	`, learnerID, req.TeacherProfileID, req.SlotDate, req.SlotStart, req.SlotEnd, strings.TrimSpace(req.Notes))
	if err != nil {
		return nil, err
	}
	bookingID, _ := res.LastInsertId()
	_ = s.createNotification(teacherUserID, "درخواست جلسه جدید", "درخواست جدیدی برای جلسه دریافت کردید")
	return s.getBookingByID(bookingID)
}

func (s *AppService) AcceptBooking(teacherUserID, bookingID int64) (*BookingSummary, error) {
	ctx := context.Background()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	booking, err := s.getBookingForUpdateTx(tx, bookingID)
	if err != nil {
		return nil, err
	}
	if booking.TeacherUserID != teacherUserID {
		return nil, ErrForbidden
	}
	if booking.Status != "pending" {
		return nil, ErrConflict
	}

	var conflictCount int64
	if err := tx.QueryRow(`
		SELECT COUNT(1)
		FROM bookings
		WHERE teacher_profile_id = ?
		  AND slot_date = ?
		  AND slot_start = ?
		  AND status = 'accepted'
		  AND id <> ?
	`, booking.TeacherProfileID, booking.SlotDate, booking.SlotStart, bookingID).Scan(&conflictCount); err != nil {
		return nil, err
	}
	if conflictCount > 0 {
		return nil, ErrConflict
	}

	if _, err := tx.Exec("UPDATE bookings SET status = 'accepted', updated_at = NOW() WHERE id = ?", bookingID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`
		INSERT INTO sessions (booking_id, status, created_at, updated_at)
		VALUES (?, 'scheduled', NOW(), NOW())
		ON DUPLICATE KEY UPDATE updated_at = NOW()
	`, bookingID); err != nil {
		return nil, err
	}
	if err := s.createNotificationTx(tx, booking.LearnerID, "وضعیت رزرو", "رزرو شما توسط استاد پذیرفته شد"); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.getBookingByID(bookingID)
}

func (s *AppService) RejectBooking(teacherUserID, bookingID int64, reason string) (*BookingSummary, error) {
	ctx := context.Background()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	booking, err := s.getBookingForUpdateTx(tx, bookingID)
	if err != nil {
		return nil, err
	}
	if booking.TeacherUserID != teacherUserID {
		return nil, ErrForbidden
	}
	if booking.Status != "pending" {
		return nil, ErrConflict
	}

	note := strings.TrimSpace(reason)
	if note == "" {
		note = booking.Notes
	}
	if _, err := tx.Exec("UPDATE bookings SET status = 'rejected', notes = ?, updated_at = NOW() WHERE id = ?", note, bookingID); err != nil {
		return nil, err
	}
	if err := s.createNotificationTx(tx, booking.LearnerID, "وضعیت رزرو", "رزرو شما توسط استاد رد شد"); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.getBookingByID(bookingID)
}

func (s *AppService) ListLearnerBookings(userID int64) ([]BookingSummary, error) {
	return s.listBookings(`b.learner_id = ?`, userID)
}

func (s *AppService) ListTeacherBookings(userID int64) ([]BookingSummary, error) {
	return s.listBookings(`tp.user_id = ?`, userID)
}

func (s *AppService) GenerateSessionToken(userID, sessionID int64) (*SessionTokenResponse, error) {
	var bookingID, learnerID, teacherUserID int64
	err := s.db.QueryRow(`
		SELECT s.booking_id, b.learner_id, tp.user_id
		FROM sessions s
		JOIN bookings b ON b.id = s.booking_id
		JOIN teacher_profiles tp ON tp.id = b.teacher_profile_id
		WHERE s.id = ?
	`, sessionID).Scan(&bookingID, &learnerID, &teacherUserID)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if userID != learnerID && userID != teacherUserID {
		return nil, ErrForbidden
	}
	roomName := fmt.Sprintf("booking-%d", bookingID)
	token := fmt.Sprintf("stub-%d-%d-%d", sessionID, userID, time.Now().Unix())
	return &SessionTokenResponse{
		SessionID: sessionID,
		RoomName:  roomName,
		Token:     token,
		Provider:  "stub",
	}, nil
}

func (s *AppService) EndSession(userID, sessionID int64) (*BookingSummary, error) {
	ctx := context.Background()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var bookingID, learnerID, teacherUserID, teacherProfileID int64
	var slotStart, slotEnd, sessionStatus, bookingStatus string
	var pricePer30min int64
	err = tx.QueryRow(`
		SELECT s.booking_id, b.learner_id, tp.user_id, b.teacher_profile_id,
		       b.slot_start, b.slot_end, s.status, b.status, tp.price_per30min
		FROM sessions s
		JOIN bookings b ON b.id = s.booking_id
		JOIN teacher_profiles tp ON tp.id = b.teacher_profile_id
		WHERE s.id = ?
		FOR UPDATE
	`, sessionID).Scan(&bookingID, &learnerID, &teacherUserID, &teacherProfileID, &slotStart, &slotEnd, &sessionStatus, &bookingStatus, &pricePer30min)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if userID != learnerID && userID != teacherUserID {
		return nil, ErrForbidden
	}

	if sessionStatus != "ended" {
		if _, err := tx.Exec("UPDATE sessions SET status = 'ended', ended_at = NOW(), updated_at = NOW() WHERE id = ?", sessionID); err != nil {
			return nil, err
		}
	}

	if bookingStatus != "completed" {
		if err := s.settleBookingTx(tx, bookingID, learnerID, teacherUserID, slotStart, slotEnd, pricePer30min); err != nil {
			return nil, err
		}
		if _, err := tx.Exec("UPDATE bookings SET status = 'completed', updated_at = NOW() WHERE id = ?", bookingID); err != nil {
			return nil, err
		}
		if err := s.createNotificationTx(tx, learnerID, "پایان جلسه", "جلسه شما پایان یافت و تسویه انجام شد"); err != nil {
			return nil, err
		}
		if err := s.createNotificationTx(tx, teacherUserID, "پایان جلسه", "جلسه پایان یافت و درآمد شما ثبت شد"); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.getBookingByID(bookingID)
}

func (s *AppService) TopupInitiate(userID int64, req TopupInitiateRequest) (*TopupInitiateResponse, error) {
	if req.Amount <= 0 {
		return nil, ErrInvalidInput
	}
	reference := fmt.Sprintf("topup_%d_%d", userID, time.Now().UnixNano())
	return &TopupInitiateResponse{
		ReferenceID: reference,
		Amount:      req.Amount,
		PaymentURL:  fmt.Sprintf("https://payment.stub/vodda/%s", reference),
		Status:      "initiated",
	}, nil
}

func (s *AppService) TopupVerify(userID int64, req TopupVerifyRequest) (*TopupVerifyResponse, error) {
	if strings.TrimSpace(req.ReferenceID) == "" || req.Amount <= 0 {
		return nil, ErrInvalidInput
	}

	tx, err := s.db.BeginTx(context.Background(), nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	walletID, balance, err := s.getOrCreateWalletTx(tx, userID)
	if err != nil {
		return nil, err
	}

	var existingID int64
	err = tx.QueryRow("SELECT id FROM transactions WHERE wallet_id = ? AND type = 'topup' AND reference_id = ? LIMIT 1", walletID, req.ReferenceID).Scan(&existingID)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	if err == nil {
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return &TopupVerifyResponse{
			ReferenceID: req.ReferenceID,
			Status:      "verified",
			Balance:     balance,
			AlreadyDone: true,
		}, nil
	}

	newBalance := balance + req.Amount
	if _, err := tx.Exec("UPDATE wallets SET balance = ?, updated_at = NOW() WHERE id = ?", newBalance, walletID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`
		INSERT INTO transactions (wallet_id, amount, type, reference_id, description, created_at)
		VALUES (?, ?, 'topup', ?, 'verified', NOW())
	`, walletID, req.Amount, req.ReferenceID); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &TopupVerifyResponse{
		ReferenceID: req.ReferenceID,
		Status:      "verified",
		Balance:     newBalance,
		AlreadyDone: false,
	}, nil
}

func (s *AppService) WalletTransactions(userID int64) (*WalletTransactionsResponse, error) {
	tx, err := s.db.BeginTx(context.Background(), nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	walletID, balance, err := s.getOrCreateWalletTx(tx, userID)
	if err != nil {
		return nil, err
	}

	rows, err := tx.Query(`
		SELECT id, amount, type, COALESCE(reference_id, ''), COALESCE(description, ''), created_at
		FROM transactions
		WHERE wallet_id = ?
		ORDER BY id DESC
		LIMIT 100
	`, walletID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]WalletTransactionItem, 0)
	for rows.Next() {
		var it WalletTransactionItem
		var createdAt time.Time
		if err := rows.Scan(&it.ID, &it.Amount, &it.Type, &it.ReferenceID, &it.Description, &createdAt); err != nil {
			return nil, err
		}
		it.CreatedAt = createdAt.Format(time.RFC3339)
		items = append(items, it)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return &WalletTransactionsResponse{
		WalletID:     walletID,
		Balance:      balance,
		Transactions: items,
	}, nil
}

func (s *AppService) CreateWithdrawRequest(userID int64, req WithdrawRequestCreate) (*WithdrawRequestItem, error) {
	if req.Amount <= 0 {
		return nil, ErrInvalidInput
	}
	bankInfo := strings.TrimSpace(string(req.BankInfo))
	if bankInfo == "" {
		bankInfo = "{}"
	}

	tx, err := s.db.BeginTx(context.Background(), nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	_, balance, err := s.getOrCreateWalletTx(tx, userID)
	if err != nil {
		return nil, err
	}
	if balance < req.Amount {
		return nil, ErrInsufficientBalance
	}

	res, err := tx.Exec(`
		INSERT INTO withdraw_requests (user_id, amount, status, bank_info, created_at, updated_at)
		VALUES (?, ?, 'pending', ?, NOW(), NOW())
	`, userID, req.Amount, bankInfo)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.getWithdrawRequestByID(id)
}

func (s *AppService) ListWithdrawRequests(status string) ([]WithdrawRequestItem, error) {
	query := `
		SELECT wr.id, wr.user_id, COALESCE(u.name, ''), COALESCE(u.mobile, ''), wr.amount, wr.status, COALESCE(wr.bank_info, ''), wr.processed_at, wr.created_at
		FROM withdraw_requests wr
		JOIN users u ON u.id = wr.user_id
	`
	args := make([]interface{}, 0)
	if strings.TrimSpace(status) != "" {
		query += " WHERE wr.status = ?"
		args = append(args, status)
	}
	query += " ORDER BY wr.id DESC"

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]WithdrawRequestItem, 0)
	for rows.Next() {
		var it WithdrawRequestItem
		var processedAt sql.NullTime
		var createdAt time.Time
		if err := rows.Scan(&it.ID, &it.UserID, &it.UserName, &it.UserMobile, &it.Amount, &it.Status, &it.BankInfo, &processedAt, &createdAt); err != nil {
			return nil, err
		}
		if processedAt.Valid {
			it.ProcessedAt = processedAt.Time.Format(time.RFC3339)
		}
		it.CreatedAt = createdAt.Format(time.RFC3339)
		items = append(items, it)
	}
	return items, nil
}

func (s *AppService) ProcessWithdrawRequest(withdrawID int64, req WithdrawRequestProcess) (*WithdrawRequestItem, error) {
	action := strings.TrimSpace(strings.ToLower(req.Action))
	if action != "approved" && action != "rejected" && action != "paid" {
		return nil, ErrInvalidInput
	}

	tx, err := s.db.BeginTx(context.Background(), nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var userID, amount int64
	var status string
	err = tx.QueryRow("SELECT user_id, amount, status FROM withdraw_requests WHERE id = ? FOR UPDATE", withdrawID).Scan(&userID, &amount, &status)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	if status == "rejected" || status == "paid" {
		return nil, ErrConflict
	}

	nextStatus := action
	if action == "approved" {
		nextStatus = "approved"
	}
	if action == "rejected" {
		nextStatus = "rejected"
	}
	if action == "paid" {
		walletID, balance, err := s.getOrCreateWalletTx(tx, userID)
		if err != nil {
			return nil, err
		}
		if balance < amount {
			return nil, ErrInsufficientBalance
		}
		newBalance := balance - amount
		if _, err := tx.Exec("UPDATE wallets SET balance = ?, updated_at = NOW() WHERE id = ?", newBalance, walletID); err != nil {
			return nil, err
		}
		ref := fmt.Sprintf("withdraw:%d", withdrawID)
		if _, err := tx.Exec(`
			INSERT INTO transactions (wallet_id, amount, type, reference_id, description, created_at)
			VALUES (?, ?, 'payout', ?, 'withdraw request paid', NOW())
		`, walletID, -amount, ref); err != nil {
			return nil, err
		}
		nextStatus = "paid"
	}

	if _, err := tx.Exec("UPDATE withdraw_requests SET status = ?, processed_at = NOW(), updated_at = NOW() WHERE id = ?", nextStatus, withdrawID); err != nil {
		return nil, err
	}

	if err := s.createNotificationTx(tx, userID, "وضعیت برداشت", fmt.Sprintf("وضعیت درخواست برداشت شما: %s", nextStatus)); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return s.getWithdrawRequestByID(withdrawID)
}

func (s *AppService) CreateRating(learnerID int64, req RatingCreateRequest) (*RatingItem, error) {
	if req.BookingID <= 0 || req.Score < 1 || req.Score > 5 {
		return nil, ErrInvalidInput
	}

	var bookingLearnerID, teacherProfileID int64
	var status string
	err := s.db.QueryRow("SELECT learner_id, teacher_profile_id, status FROM bookings WHERE id = ?", req.BookingID).Scan(&bookingLearnerID, &teacherProfileID, &status)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if bookingLearnerID != learnerID {
		return nil, ErrForbidden
	}
	if status != "completed" {
		return nil, ErrConflict
	}

	var existing int64
	if err := s.db.QueryRow("SELECT COUNT(1) FROM ratings WHERE booking_id = ?", req.BookingID).Scan(&existing); err != nil {
		return nil, err
	}
	if existing > 0 {
		return nil, ErrConflict
	}

	res, err := s.db.Exec(`
		INSERT INTO ratings (booking_id, learner_id, teacher_profile_id, score, comment, created_at)
		VALUES (?, ?, ?, ?, ?, NOW())
	`, req.BookingID, learnerID, teacherProfileID, req.Score, strings.TrimSpace(req.Comment))
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()

	var teacherUserID int64
	_ = s.db.QueryRow("SELECT user_id FROM teacher_profiles WHERE id = ?", teacherProfileID).Scan(&teacherUserID)
	if teacherUserID > 0 {
		_ = s.createNotification(teacherUserID, "امتیاز جدید", "برای یکی از جلسات شما امتیاز ثبت شد")
	}

	return s.getRatingByID(id)
}

func (s *AppService) ListNotifications(userID int64) ([]NotificationItem, error) {
	rows, err := s.db.Query(`
		SELECT id, title, COALESCE(body, ''), read_at, created_at
		FROM notifications
		WHERE user_id = ?
		ORDER BY id DESC
		LIMIT 100
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]NotificationItem, 0)
	for rows.Next() {
		var it NotificationItem
		var readAt sql.NullTime
		var createdAt time.Time
		if err := rows.Scan(&it.ID, &it.Title, &it.Body, &readAt, &createdAt); err != nil {
			return nil, err
		}
		if readAt.Valid {
			it.ReadAt = readAt.Time.Format(time.RFC3339)
		}
		it.CreatedAt = createdAt.Format(time.RFC3339)
		items = append(items, it)
	}
	return items, nil
}

func (s *AppService) MarkNotificationRead(userID, notificationID int64) error {
	res, err := s.db.Exec("UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ?", notificationID, userID)
	if err != nil {
		return err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *AppService) getTeacherByUserID(userID int64) (*TeacherSummary, error) {
	var id int64
	err := s.db.QueryRow("SELECT id FROM teacher_profiles WHERE user_id = ? AND deleted_at IS NULL", userID).Scan(&id)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return s.GetTeacherByID(id)
}

func (s *AppService) listBookings(where string, arg interface{}) ([]BookingSummary, error) {
	query := `
		SELECT
			b.id,
			b.learner_id,
			COALESCE(lu.name, ''),
			b.teacher_profile_id,
			COALESCE(tu.name, ''),
			CAST(b.slot_date AS CHAR),
			CAST(b.slot_start AS CHAR),
			CAST(b.slot_end AS CHAR),
			b.status,
			COALESCE(b.notes, ''),
			b.created_at
		FROM bookings b
		JOIN users lu ON lu.id = b.learner_id
		JOIN teacher_profiles tp ON tp.id = b.teacher_profile_id
		JOIN users tu ON tu.id = tp.user_id
		WHERE ` + where + `
		ORDER BY b.id DESC
	`
	rows, err := s.db.Query(query, arg)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]BookingSummary, 0)
	for rows.Next() {
		var it BookingSummary
		var createdAt time.Time
		if err := rows.Scan(
			&it.ID,
			&it.LearnerID,
			&it.LearnerName,
			&it.TeacherProfileID,
			&it.TeacherName,
			&it.SlotDate,
			&it.SlotStart,
			&it.SlotEnd,
			&it.Status,
			&it.Notes,
			&createdAt,
		); err != nil {
			return nil, err
		}
		it.CreatedAt = createdAt.Format(time.RFC3339)
		items = append(items, it)
	}
	return items, nil
}

func (s *AppService) getBookingByID(bookingID int64) (*BookingSummary, error) {
	items, err := s.listBookings("b.id = ?", bookingID)
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, ErrNotFound
	}
	return &items[0], nil
}

type bookingForUpdate struct {
	ID               int64
	LearnerID        int64
	TeacherProfileID int64
	TeacherUserID    int64
	SlotDate         string
	SlotStart        string
	Status           string
	Notes            string
}

func (s *AppService) getBookingForUpdateTx(tx *sql.Tx, bookingID int64) (*bookingForUpdate, error) {
	var b bookingForUpdate
	err := tx.QueryRow(`
		SELECT b.id, b.learner_id, b.teacher_profile_id, tp.user_id, CAST(b.slot_date AS CHAR), CAST(b.slot_start AS CHAR), b.status, COALESCE(b.notes, '')
		FROM bookings b
		JOIN teacher_profiles tp ON tp.id = b.teacher_profile_id
		WHERE b.id = ?
		FOR UPDATE
	`, bookingID).Scan(&b.ID, &b.LearnerID, &b.TeacherProfileID, &b.TeacherUserID, &b.SlotDate, &b.SlotStart, &b.Status, &b.Notes)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &b, nil
}

func (s *AppService) settleBookingTx(tx *sql.Tx, bookingID, learnerID, teacherUserID int64, slotStart, slotEnd string, pricePer30min int64) error {
	if pricePer30min <= 0 {
		return nil
	}
	chargeRef := fmt.Sprintf("booking:%d:charge", bookingID)

	learnerWalletID, learnerBalance, err := s.getOrCreateWalletTx(tx, learnerID)
	if err != nil {
		return err
	}
	teacherWalletID, teacherBalance, err := s.getOrCreateWalletTx(tx, teacherUserID)
	if err != nil {
		return err
	}

	var existing int64
	err = tx.QueryRow("SELECT COUNT(1) FROM transactions WHERE wallet_id = ? AND reference_id = ?", learnerWalletID, chargeRef).Scan(&existing)
	if err != nil {
		return err
	}
	if existing > 0 {
		return nil
	}

	durationMinutes := diffMinutes(slotStart, slotEnd)
	if durationMinutes <= 0 {
		durationMinutes = 30
	}
	units := int64(math.Ceil(float64(durationMinutes) / 30.0))
	amount := pricePer30min * units
	if amount <= 0 {
		return nil
	}
	if learnerBalance < amount {
		return ErrInsufficientBalance
	}
	commission := amount * s.commissionPercent / 100
	teacherNet := amount - commission
	if teacherNet < 0 {
		teacherNet = 0
	}

	newLearnerBalance := learnerBalance - amount
	if _, err := tx.Exec("UPDATE wallets SET balance = ?, updated_at = NOW() WHERE id = ?", newLearnerBalance, learnerWalletID); err != nil {
		return err
	}
	if _, err := tx.Exec(`
		INSERT INTO transactions (wallet_id, amount, type, reference_id, description, created_at)
		VALUES (?, ?, 'charge', ?, 'session charge', NOW())
	`, learnerWalletID, -amount, chargeRef); err != nil {
		return err
	}

	newTeacherBalance := teacherBalance + amount
	if _, err := tx.Exec("UPDATE wallets SET balance = ?, updated_at = NOW() WHERE id = ?", newTeacherBalance, teacherWalletID); err != nil {
		return err
	}
	if _, err := tx.Exec(`
		INSERT INTO transactions (wallet_id, amount, type, reference_id, description, created_at)
		VALUES (?, ?, 'payout', ?, 'session income', NOW())
	`, teacherWalletID, amount, fmt.Sprintf("booking:%d:payout", bookingID)); err != nil {
		return err
	}

	if commission > 0 {
		newTeacherBalance = newTeacherBalance - commission
		if _, err := tx.Exec("UPDATE wallets SET balance = ?, updated_at = NOW() WHERE id = ?", newTeacherBalance, teacherWalletID); err != nil {
			return err
		}
		if _, err := tx.Exec(`
			INSERT INTO transactions (wallet_id, amount, type, reference_id, description, created_at)
			VALUES (?, ?, 'commission', ?, 'platform commission', NOW())
		`, teacherWalletID, -commission, fmt.Sprintf("booking:%d:commission", bookingID)); err != nil {
			return err
		}
	}

	return nil
}

func (s *AppService) getOrCreateWalletTx(tx *sql.Tx, userID int64) (walletID int64, balance int64, err error) {
	if _, err := tx.Exec(`
		INSERT IGNORE INTO wallets (user_id, balance, created_at, updated_at)
		VALUES (?, 0, NOW(), NOW())
	`, userID); err != nil {
		return 0, 0, err
	}
	err = tx.QueryRow("SELECT id, balance FROM wallets WHERE user_id = ? FOR UPDATE", userID).Scan(&walletID, &balance)
	if err != nil {
		return 0, 0, err
	}
	return walletID, balance, nil
}

func (s *AppService) createNotification(userID int64, title, body string) error {
	_, err := s.db.Exec(`
		INSERT INTO notifications (user_id, title, body, created_at)
		VALUES (?, ?, ?, NOW())
	`, userID, title, body)
	return err
}

func (s *AppService) createNotificationTx(tx *sql.Tx, userID int64, title, body string) error {
	_, err := tx.Exec(`
		INSERT INTO notifications (user_id, title, body, created_at)
		VALUES (?, ?, ?, NOW())
	`, userID, title, body)
	return err
}

func (s *AppService) getWithdrawRequestByID(id int64) (*WithdrawRequestItem, error) {
	var it WithdrawRequestItem
	var processedAt sql.NullTime
	var createdAt time.Time
	err := s.db.QueryRow(`
		SELECT wr.id, wr.user_id, COALESCE(u.name, ''), COALESCE(u.mobile, ''), wr.amount, wr.status, COALESCE(wr.bank_info, ''), wr.processed_at, wr.created_at
		FROM withdraw_requests wr
		JOIN users u ON u.id = wr.user_id
		WHERE wr.id = ?
	`, id).Scan(&it.ID, &it.UserID, &it.UserName, &it.UserMobile, &it.Amount, &it.Status, &it.BankInfo, &processedAt, &createdAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if processedAt.Valid {
		it.ProcessedAt = processedAt.Time.Format(time.RFC3339)
	}
	it.CreatedAt = createdAt.Format(time.RFC3339)
	return &it, nil
}

func (s *AppService) getRatingByID(id int64) (*RatingItem, error) {
	var it RatingItem
	var createdAt time.Time
	err := s.db.QueryRow(`
		SELECT id, booking_id, learner_id, teacher_profile_id, score, COALESCE(comment, ''), created_at
		FROM ratings
		WHERE id = ?
	`, id).Scan(&it.ID, &it.BookingID, &it.LearnerID, &it.TeacherProfileID, &it.Score, &it.Comment, &createdAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	it.CreatedAt = createdAt.Format(time.RFC3339)
	return &it, nil
}

func isTeacherLevel(level string) bool {
	return level == "beginner" || level == "intermediate" || level == "advanced"
}

func isValidTimeRange(start, end string) bool {
	return diffMinutes(start, end) > 0
}

func diffMinutes(start, end string) int64 {
	parse := func(v string) (time.Time, error) {
		if len(v) == 5 {
			v += ":00"
		}
		return time.Parse("15:04:05", v)
	}
	ts, err := parse(start)
	if err != nil {
		return 0
	}
	te, err := parse(end)
	if err != nil {
		return 0
	}
	if !te.After(ts) {
		return 0
	}
	return int64(te.Sub(ts).Minutes())
}

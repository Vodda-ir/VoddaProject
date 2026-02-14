package auth

import "database/sql"

type Repository interface {
	CreateOTP(mobile, code string, expiresAt sql.NullTime) error
	VerifyOTP(mobile, code string) (bool, error)
	CreateUserIfNotExists(mobile, name string) (int64, error)
	GetUserRoles(userID int64) ([]string, error)
}

type repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) CreateOTP(mobile, code string, expiresAt sql.NullTime) error {
	_, err := r.db.Exec(
		"INSERT INTO otp_requests (mobile, code, expires_at) VALUES (?, ?, ?)",
		mobile, code, expiresAt,
	)
	return err
}

func (r *repository) VerifyOTP(mobile, code string) (bool, error) {
	var id int64
	err := r.db.QueryRow(
		"SELECT id FROM otp_requests WHERE mobile = ? AND code = ? AND verified_at IS NULL AND expires_at > NOW()",
		mobile, code,
	).Scan(&id)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	_, err = r.db.Exec("UPDATE otp_requests SET verified_at = NOW() WHERE id = ?", id)
	return err == nil, err
}

func (r *repository) CreateUserIfNotExists(mobile, name string) (int64, error) {
	res, err := r.db.Exec("INSERT IGNORE INTO users (mobile, name) VALUES (?, ?)", mobile, name)
	if err != nil {
		return 0, err
	}
	id, _ := res.LastInsertId()
	if id > 0 {
		_, _ = r.db.Exec("INSERT IGNORE INTO user_roles (user_id, role) VALUES (?, 'learner')", id)
		return id, nil
	}
	var uid int64
	err = r.db.QueryRow("SELECT id FROM users WHERE mobile = ?", mobile).Scan(&uid)
	return uid, err
}

func (r *repository) GetUserRoles(userID int64) ([]string, error) {
	rows, err := r.db.Query("SELECT role FROM user_roles WHERE user_id = ?", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var roles []string
	for rows.Next() {
		var r string
		if err := rows.Scan(&r); err != nil {
			return nil, err
		}
		roles = append(roles, r)
	}
	if len(roles) == 0 {
		roles = []string{"learner"}
	}
	return roles, nil
}

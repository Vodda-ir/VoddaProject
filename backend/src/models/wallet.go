package models

import "time"

type Wallet struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement"`
	UserID    uint64    `gorm:"uniqueIndex;not null"`
	Balance   uint64    `gorm:"not null;default:0"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
	UpdatedAt time.Time `gorm:"autoUpdateTime"`
}

func (Wallet) TableName() string {
	return "wallets"
}

type Transaction struct {
	ID          uint64    `gorm:"primaryKey;autoIncrement"`
	WalletID    uint64    `gorm:"not null"`
	Amount      int64     `gorm:"not null"`
	Type        string    `gorm:"type:enum('topup','charge','commission','payout','refund','adjustment');not null"`
	ReferenceID string    `gorm:"size:100"`
	Description string    `gorm:"type:text"`
	CreatedAt   time.Time `gorm:"autoCreateTime"`
}

func (Transaction) TableName() string {
	return "transactions"
}

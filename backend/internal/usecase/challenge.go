package usecase

import (
	"context"
	"errors"
	"math"
	"sort"
	"time"

	"vodda/backend/internal/domain"
)

// ChallengeUsecase سامانهٔ چالش‌های قرآنی وُدّا:
//   - فقط مدیر ادمین چالش می‌سازد (با توضیحات اجباری؛ با مقطع صوتی استاد یا فقط توضیح)
//   - رسیدن شمار شرکت‌کنندگان به ظرفیت، چالش را خودکار آغاز می‌کند
//   - شرکت در چالش و کسب رتبه، امتیاز اینستاقرآن می‌دهد
//   - امتیازدهی سه‌منبعی مستقل: رأی مخاطبان، رأی اساتید داور، نظر مدیریت ادمین
//   - رتبه‌های ۱ تا ۵ اعلام و برای همهٔ شرکت‌کنندگان کارنامه ساخته می‌شود
type ChallengeUsecase struct {
	challenges domain.ChallengeRepository
	points     domain.PointRepository
	users      domain.UserRepository
	notifs     domain.NotificationRepository
	now        func() time.Time // قابل تزریق برای تست
}

// NewChallengeUsecase اتصال کابل‌های سامانهٔ چالش.
func NewChallengeUsecase(
	challenges domain.ChallengeRepository,
	points domain.PointRepository,
	users domain.UserRepository,
	notifs domain.NotificationRepository,
) *ChallengeUsecase {
	return &ChallengeUsecase{
		challenges: challenges,
		points:     points,
		users:      users,
		notifs:     notifs,
		now:        time.Now,
	}
}

// WithClock زمان را تزریق می‌کند (تست‌ها).
func (uc *ChallengeUsecase) WithClock(now func() time.Time) *ChallengeUsecase {
	uc.now = now
	return uc
}

// ── ورودی‌ها ──

// ChallengeInput ساخت/ویرایش چالش توسط مدیر ادمین.
type ChallengeInput struct {
	Title            string
	Description      string
	Mode             domain.ChallengeMode
	AudioURL         string
	AudioTeacherName string
	Capacity         int
	DurationHours    int
	VotingHours      int
	WeightAudience   int
	WeightJudges     int
	WeightAdmin      int
}

const (
	defaultDurationHours = 72
	defaultVotingHours   = 48
	minCapacity          = 2
	maxCapacity          = 500
	minDurationHours     = 1
	maxDurationHours     = 24 * 30
	minVotingHours       = 1
	maxVotingHours       = 24 * 14
)

// normalize مقادیر پیش‌فرض و سقف‌های منطقی را اعمال می‌کند.
func (in *ChallengeInput) normalize() error {
	in.Title = trimSpace(in.Title)
	in.Description = trimSpace(in.Description)
	in.AudioTeacherName = trimSpace(in.AudioTeacherName)
	in.AudioURL = trimSpace(in.AudioURL)
	if in.Title == "" || in.Description == "" {
		return domain.ErrValidation
	}
	if in.Mode != domain.ChallengeModeAudio && in.Mode != domain.ChallengeModeDescription {
		in.Mode = domain.ChallengeModeDescription
	}
	if in.Mode == domain.ChallengeModeAudio && in.AudioURL == "" {
		return domain.ErrValidation // مقطع صوتی برای حالت صوتی الزامی است
	}
	if in.Mode == domain.ChallengeModeDescription {
		in.AudioURL = ""
	}
	if in.Capacity < minCapacity || in.Capacity > maxCapacity {
		return domain.ErrValidation
	}
	if in.DurationHours == 0 {
		in.DurationHours = defaultDurationHours
	}
	if in.VotingHours == 0 {
		in.VotingHours = defaultVotingHours
	}
	if in.DurationHours < minDurationHours || in.DurationHours > maxDurationHours ||
		in.VotingHours < minVotingHours || in.VotingHours > maxVotingHours {
		return domain.ErrValidation
	}
	// وزن‌ها سه منبع مستقل امتیازدهی‌اند؛ مجموع باید ۱۰۰ باشد. ۰ همه = پیش‌فرض ۴۰/۴۰/۲۰.
	total := in.WeightAudience + in.WeightJudges + in.WeightAdmin
	if total == 0 {
		in.WeightAudience, in.WeightJudges, in.WeightAdmin = 40, 40, 20
	} else if total != 100 || in.WeightAudience < 0 || in.WeightJudges < 0 || in.WeightAdmin < 0 {
		return domain.ErrValidation
	}
	return nil
}

// ── دسترسی مدیر ادمین ──

// Create چالش تازهٔ مدیر را در وضعیت ثبت‌نام می‌سازد.
func (uc *ChallengeUsecase) Create(ctx context.Context, adminID uint, in ChallengeInput) (*domain.Challenge, error) {
	if err := in.normalize(); err != nil {
		return nil, err
	}
	ch := &domain.Challenge{
		Title:            in.Title,
		Description:      in.Description,
		Mode:             in.Mode,
		AudioURL:         in.AudioURL,
		AudioTeacherName: in.AudioTeacherName,
		Capacity:         in.Capacity,
		DurationHours:    in.DurationHours,
		VotingHours:      in.VotingHours,
		WeightAudience:   in.WeightAudience,
		WeightJudges:     in.WeightJudges,
		WeightAdmin:      in.WeightAdmin,
		Status:           domain.ChallengeRegistration,
		CreatedBy:        adminID,
	}
	if err := uc.challenges.Create(ctx, ch); err != nil {
		return nil, err
	}
	return ch, nil
}

// Update ویرایش چالش — فقط در مرحلهٔ ثبت‌نام.
func (uc *ChallengeUsecase) Update(ctx context.Context, id uint, in ChallengeInput) (*domain.Challenge, error) {
	if err := in.normalize(); err != nil {
		return nil, err
	}
	ch, err := uc.challenges.ByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if ch.Status != domain.ChallengeRegistration {
		return nil, domain.ErrChallengePhase
	}
	ch.Title = in.Title
	ch.Description = in.Description
	ch.Mode = in.Mode
	ch.AudioURL = in.AudioURL
	ch.AudioTeacherName = in.AudioTeacherName
	ch.Capacity = in.Capacity
	ch.DurationHours = in.DurationHours
	ch.VotingHours = in.VotingHours
	ch.WeightAudience = in.WeightAudience
	ch.WeightJudges = in.WeightJudges
	ch.WeightAdmin = in.WeightAdmin
	if err := uc.challenges.Update(ctx, ch); err != nil {
		return nil, err
	}
	return ch, nil
}

// Delete حذف چالش — فقط در ثبت‌نام و بدون هیچ شرکت‌کننده.
func (uc *ChallengeUsecase) Delete(ctx context.Context, id uint) error {
	ch, err := uc.challenges.ByID(ctx, id)
	if err != nil {
		return err
	}
	if ch.Status != domain.ChallengeRegistration {
		return domain.ErrChallengePhase
	}
	count, err := uc.challenges.ParticipantCount(ctx, id)
	if err != nil {
		return err
	}
	if count > 0 {
		return domain.ErrConflict
	}
	return uc.challenges.Delete(ctx, id)
}

// Start آغاز دستوری چالش پیش از تکمیل ظرفیت (اختیار مدیر).
func (uc *ChallengeUsecase) Start(ctx context.Context, id uint) (*domain.Challenge, error) {
	ch, err := uc.challenges.ByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if ch.Status != domain.ChallengeRegistration {
		return nil, domain.ErrChallengePhase
	}
	now := uc.now()
	deadline := now.Add(time.Duration(ch.DurationHours) * time.Hour)
	ch.Status = domain.ChallengeActive
	ch.StartedAt = &now
	ch.SubmissionDeadline = &deadline
	if err := uc.challenges.ApplyStatusUpdate(ctx, ch, map[string]any{
		"started_at":          now,
		"submission_deadline": deadline,
	}); err != nil {
		return nil, err
	}
	uc.notifyParticipants(ctx, id, "چالش آغاز شد",
		"چالش «"+ch.Title+"» آغاز شد؛ مهلت ارسال اثر تا پایان "+faHourCount(ch.DurationHours)+" آینده است.")
	return ch, nil
}

// ToJudging ورود دستوری به مرحلهٔ داوری (پایان مهلت ارسال اثر زودتر از موعد).
func (uc *ChallengeUsecase) ToJudging(ctx context.Context, id uint) (*domain.Challenge, error) {
	ch, err := uc.challenges.ByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if ch.Status != domain.ChallengeActive {
		return nil, domain.ErrChallengePhase
	}
	now := uc.now()
	voting := now.Add(time.Duration(ch.VotingHours) * time.Hour)
	ch.Status = domain.ChallengeJudging
	ch.VotingDeadline = &voting
	if err := uc.challenges.ApplyStatusUpdate(ctx, ch, map[string]any{
		"voting_deadline": voting,
	}); err != nil {
		return nil, err
	}
	uc.notifyParticipants(ctx, id, "رأی‌گیری چالش آغاز شد",
		"در چالش «"+ch.Title+"» می‌توانید به اثرهای دیگران رأی بدهید.")
	return ch, nil
}

// SetAdminScore ثبت نظر مستقیم مدیریت ادمین برای یک اثر (۰ تا ۱۰۰).
func (uc *ChallengeUsecase) SetAdminScore(ctx context.Context, challengeID, participantID uint, score int) (*domain.ChallengeParticipant, error) {
	if score < 0 || score > 100 {
		return nil, domain.ErrValidation
	}
	ch, err := uc.challenges.ByID(ctx, challengeID)
	if err != nil {
		return nil, err
	}
	if ch.Status == domain.ChallengeRegistration || ch.Status == domain.ChallengeCanceled || ch.Status == domain.ChallengeFinished {
		return nil, domain.ErrChallengePhase
	}
	p, err := uc.challenges.ParticipantByID(ctx, challengeID, participantID)
	if err != nil {
		return nil, err
	}
	p.AdminScore = score
	if err := uc.challenges.UpdateParticipant(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

// publishResult محاسبهٔ کامل نتیجه: امتیاز سه‌منبعی، رتبه‌بندی و پاداش امتیاز.
func (uc *ChallengeUsecase) publishResult(ctx context.Context, ch *domain.Challenge, now time.Time) ([]domain.ChallengeParticipant, error) {
	participants, err := uc.challenges.Participants(ctx, ch.ID)
	if err != nil {
		return nil, err
	}
	counts, err := uc.challenges.VoteCounts(ctx, ch.ID)
	if err != nil {
		return nil, err
	}
	voteOf := make(map[uint]domain.ChallengeVoteCount, len(counts))
	maxAudience, maxJudge := 0, 0
	for _, c := range counts {
		voteOf[c.ParticipantID] = c
		if c.Audience > maxAudience {
			maxAudience = c.Audience
		}
		if c.Judge > maxJudge {
			maxJudge = c.Judge
		}
	}

	type scoredRow struct {
		p     *domain.ChallengeParticipant
		final float64
	}
	rows := make([]scoredRow, 0, len(participants))
	for i := range participants {
		p := &participants[i]
		votes := voteOf[p.ID]
		p.AudienceVotes = votes.Audience
		p.JudgeVotes = votes.Judge
		// امتیاز مخاطبان و داوران نرمال‌شده روی ۱۰۰ نسبت به بیشترین رأی.
		audience := 0.0
		if maxAudience > 0 {
			audience = 100.0 * float64(votes.Audience) / float64(maxAudience)
		}
		judge := 0.0
		if maxJudge > 0 {
			judge = 100.0 * float64(votes.Judge) / float64(maxJudge)
		}
		p.AudienceScore = round1(audience)
		p.JudgeScore = round1(judge)
		p.FinalScore = round1(
			(audience*float64(ch.WeightAudience) +
				judge*float64(ch.WeightJudges) +
				float64(p.AdminScore)*float64(ch.WeightAdmin)) / 100.0,
		)
		rows = append(rows, scoredRow{p: p, final: p.FinalScore})
	}

	// رتبه‌بندی رقابتی: امتیاز برابر = رتبهٔ برابر؛ بعد از آن پرش رتبه.
	sort.SliceStable(rows, func(i, j int) bool {
		if rows[i].final != rows[j].final {
			return rows[i].final > rows[j].final
		}
		return rows[i].p.ID < rows[j].p.ID
	})
	rank := uint(0)
	prevScore := math.MaxFloat64
	for i, row := range rows {
		if row.final != prevScore {
			rank = uint(i + 1)
			prevScore = row.final
		}
		row.p.Rank = rank
		bonus := domain.RankBonusPoints(rank)
		row.p.PointsBonus = bonus
		if err := uc.challenges.UpdateParticipant(ctx, row.p); err != nil {
			return nil, err
		}
		if bonus > 0 {
			if _, err := uc.points.Grant(ctx, row.p.UserID, bonus, domain.PointReasonChallengeRank, ch.ID); err != nil {
				return nil, err
			}
		}
	}

	ch.Status = domain.ChallengeFinished
	ch.PublishedAt = &now
	if err := uc.challenges.ApplyStatusUpdate(ctx, ch, map[string]any{
		"published_at": now,
	}); err != nil {
		return nil, err
	}

	for _, row := range rows {
		body := "کارنامهٔ چالش «" + ch.Title + "» آماده شد؛ رتبهٔ شما: " + faRank(row.p.Rank) + " با امتیاز نهایی " + faNumber1(row.p.FinalScore) + " از ۱۰۰."
		if row.p.PointsBonus > 0 {
			body += " پاداش " + intFa(row.p.PointsBonus) + " امتیاز اینستاقرآن به حساب شما اضافه شد."
		}
		_ = uc.notifs.Create(ctx, &domain.Notification{
			UserID: row.p.UserID, Title: "نتیجهٔ چالش اعلام شد", Body: body,
		})
	}
	return participants, nil
}

// Publish اعلام رسمی نتایج (اقدام مدیر) — از مرحلهٔ داوری.
func (uc *ChallengeUsecase) Publish(ctx context.Context, id uint) (*domain.Challenge, error) {
	ch, err := uc.challenges.ByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if ch.Status != domain.ChallengeJudging {
		return nil, domain.ErrChallengePhase
	}
	if _, err := uc.publishResult(ctx, ch, uc.now()); err != nil {
		return nil, err
	}
	return ch, nil
}

// AdminDetail خوراک کامل مدیریتی: چالش + همهٔ شرکت‌کنندگان با اثر و رأی‌ها.
func (uc *ChallengeUsecase) AdminDetail(ctx context.Context, id uint) (*AdminChallengeDetail, error) {
	ch, err := uc.advance(ctx, id)
	if err != nil {
		return nil, err
	}
	participants, err := uc.challenges.Participants(ctx, id)
	if err != nil {
		return nil, err
	}
	counts, err := uc.challenges.VoteCounts(ctx, id)
	if err != nil {
		return nil, err
	}
	voteOf := make(map[uint]domain.ChallengeVoteCount, len(counts))
	for _, c := range counts {
		voteOf[c.ParticipantID] = c
	}
	detail := &AdminChallengeDetail{Challenge: *ch}
	for i := range participants {
		p := &participants[i]
		row := AdminParticipantRow{
			ChallengeParticipant: *p,
			AudienceVotes:        voteOf[p.ID].Audience,
			JudgeVotes:           voteOf[p.ID].Judge,
		}
		if p.User != nil {
			row.Name = p.User.Name
			row.Mobile = p.User.Mobile
			row.AvatarURL = p.User.AvatarURL
		}
		detail.Participants = append(detail.Participants, row)
	}
	return detail, nil
}

// AdminList فهرست چالش‌ها برای پنل مدیریت (همهٔ وضعیت‌ها).
func (uc *ChallengeUsecase) AdminList(ctx context.Context) ([]AdminChallengeListItem, error) {
	challenges, _, err := uc.challenges.List(ctx, domain.ChallengeFilter{All: true, Limit: 100})
	if err != nil {
		return nil, err
	}
	items := make([]AdminChallengeListItem, 0, len(challenges))
	for i := range challenges {
		ch := &challenges[i]
		count, err := uc.challenges.ParticipantCount(ctx, ch.ID)
		if err != nil {
			return nil, err
		}
		items = append(items, AdminChallengeListItem{Challenge: *ch, ParticipantCount: count})
	}
	return items, nil
}

// AdminStats خلاصهٔ شمار چالش‌ها برای داشبورد مدیریت.
func (uc *ChallengeUsecase) AdminStats(ctx context.Context) (map[string]int64, error) {
	counts, err := uc.challenges.CountByStatus(ctx)
	if err != nil {
		return nil, err
	}
	return map[string]int64{
		"total":        counts[domain.ChallengeRegistration] + counts[domain.ChallengeActive] + counts[domain.ChallengeJudging] + counts[domain.ChallengeFinished],
		"registration": counts[domain.ChallengeRegistration],
		"active":       counts[domain.ChallengeActive],
		"judging":      counts[domain.ChallengeJudging],
		"finished":     counts[domain.ChallengeFinished],
	}, nil
}

// ── سمت کاربر ──

// advance گذرهای خودکار چرخهٔ عمر: پایان مهلت ارسال اثر → مرحلهٔ داوری.
func (uc *ChallengeUsecase) advance(ctx context.Context, id uint) (*domain.Challenge, error) {
	ch, err := uc.challenges.ByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if ch.Status == domain.ChallengeActive && ch.SubmissionDeadline != nil && uc.now().After(*ch.SubmissionDeadline) {
		now := uc.now()
		voting := now.Add(time.Duration(ch.VotingHours) * time.Hour)
		ch.Status = domain.ChallengeJudging
		ch.VotingDeadline = &voting
		if err := uc.challenges.ApplyStatusUpdate(ctx, ch, map[string]any{
			"voting_deadline": voting,
		}); err != nil {
			return nil, err
		}
		uc.notifyParticipants(ctx, id, "رأی‌گیری چالش آغاز شد",
			"در چالش «"+ch.Title+"» می‌توانید به اثرهای دیگران رأی بدهید.")
	}
	return ch, nil
}

// ChallengeListItem آیتم فهرست عمومی چالش.
type ChallengeListItem struct {
	domain.Challenge
	ParticipantCount int64 `json:"participants_count"`
	Joined           bool  `json:"joined"`
}

// PublicList فهرست چالش‌های قابل نمایش با وضعیت عضویت کاربر جاری.
func (uc *ChallengeUsecase) PublicList(ctx context.Context, userID uint) ([]ChallengeListItem, error) {
	challenges, _, err := uc.challenges.List(ctx, domain.ChallengeFilter{Limit: 100})
	if err != nil {
		return nil, err
	}
	items := make([]ChallengeListItem, 0, len(challenges))
	for i := range challenges {
		ch := &challenges[i]
		count, err := uc.challenges.ParticipantCount(ctx, ch.ID)
		if err != nil {
			return nil, err
		}
		joined := false
		if userID > 0 {
			if _, perr := uc.challenges.ParticipantForUser(ctx, ch.ID, userID); perr == nil {
				joined = true
			}
		}
		items = append(items, ChallengeListItem{Challenge: *ch, ParticipantCount: count, Joined: joined})
	}
	return items, nil
}

// SubmissionView اثر یک شرکت‌کننده برای نمایش در رأی‌گیری.
type SubmissionView struct {
	ParticipantID uint   `json:"participant_id"`
	UserID        uint   `json:"user_id"`
	Name          string `json:"name"`
	AvatarURL     string `json:"avatar_url"`
	Text          string `json:"text"`
	AudioURL      string `json:"audio_url"`
	AudienceVotes int    `json:"audience_votes"`
	JudgeVotes    int    `json:"judge_votes"`
	MyVote        bool   `json:"my_vote"`
	Rank          uint   `json:"rank,omitempty"`
}

// ChallengeDetail خوراک صفحهٔ جزئیات چالش برای کاربر.
type ChallengeDetail struct {
	Challenge        domain.Challenge             `json:"challenge"`
	ParticipantCount int64                        `json:"participants_count"`
	Joined           bool                         `json:"joined"`
	MyParticipant    *domain.ChallengeParticipant `json:"my_participant,omitempty"`
	Submissions      []SubmissionView             `json:"submissions,omitempty"`
}

// PublicDetail جزئیات چالش؛ از مرحلهٔ داوری اثرها با شمار رأی‌ها نمایش داده می‌شود.
func (uc *ChallengeUsecase) PublicDetail(ctx context.Context, challengeID, userID uint) (*ChallengeDetail, error) {
	ch, err := uc.advance(ctx, challengeID)
	if err != nil {
		return nil, err
	}
	count, err := uc.challenges.ParticipantCount(ctx, challengeID)
	if err != nil {
		return nil, err
	}
	detail := &ChallengeDetail{Challenge: *ch, ParticipantCount: count}
	if userID > 0 {
		if p, perr := uc.challenges.ParticipantForUser(ctx, challengeID, userID); perr == nil {
			detail.Joined = true
			detail.MyParticipant = p
		}
	}
	if ch.Status == domain.ChallengeJudging || ch.Status == domain.ChallengeFinished {
		participants, err := uc.challenges.Participants(ctx, challengeID)
		if err != nil {
			return nil, err
		}
		counts, err := uc.challenges.VoteCounts(ctx, challengeID)
		if err != nil {
			return nil, err
		}
		voteOf := make(map[uint]domain.ChallengeVoteCount, len(counts))
		for _, c := range counts {
			voteOf[c.ParticipantID] = c
		}
		var myVotes map[uint]bool
		if userID > 0 {
			myVotes = make(map[uint]bool)
			ids, err := uc.challenges.MyVotes(ctx, challengeID, userID)
			if err == nil {
				for _, id := range ids {
					myVotes[id] = true
				}
			}
		}
		for i := range participants {
			p := &participants[i]
			view := SubmissionView{
				ParticipantID: p.ID,
				UserID:        p.UserID,
				Text:          p.SubmissionText,
				AudioURL:      p.SubmissionAudioURL,
				AudienceVotes: voteOf[p.ID].Audience,
				JudgeVotes:    voteOf[p.ID].Judge,
				Rank:          p.Rank,
			}
			if p.User != nil {
				view.Name = p.User.Name
				view.AvatarURL = p.User.AvatarURL
			}
			if myVotes != nil {
				view.MyVote = myVotes[p.ID]
			}
			detail.Submissions = append(detail.Submissions, view)
		}
	}
	return detail, nil
}

// Join ثبت‌نام در چالش؛ رسیدن به ظرفیت چالش را خودکار آغاز می‌کند و
// امتیاز مشارکت اینستاقرآن به کاربر داده می‌شود.
func (uc *ChallengeUsecase) Join(ctx context.Context, challengeID, userID uint) (*domain.ChallengeParticipant, bool, error) {
	ch, participant, started, err := uc.challenges.JoinChallenge(ctx, challengeID, userID, uc.now())
	if err != nil {
		return nil, false, err
	}
	if _, perr := uc.points.Grant(ctx, userID, domain.PointsChallengeJoin, domain.PointReasonChallengeJoin, challengeID); perr != nil {
		return nil, started, perr
	}
	// امتیاز مشارکت را روی سطر شرکت‌کننده هم ثبت می‌کنیم (کارنامهٔ پایدار).
	if p, perr := uc.challenges.ParticipantForUser(ctx, challengeID, userID); perr == nil {
		p.PointsJoin = domain.PointsChallengeJoin
		_ = uc.challenges.UpdateParticipant(ctx, p)
	}
	if started {
		uc.notifyParticipants(ctx, challengeID, "چالش با تکمیل ظرفیت آغاز شد",
			"چالش «"+ch.Title+"» با رسیدن به ظرفیت آغاز شد؛ مهلت ارسال اثر تا پایان "+faHourCount(ch.DurationHours)+" آینده است.")
	}
	return participant, started, nil
}

// Submit ارسال اثر (متن و/یا صوت) در مرحلهٔ اجرا و پیش از مهلت.
func (uc *ChallengeUsecase) Submit(ctx context.Context, challengeID, userID uint, text, audioURL string) (*domain.ChallengeParticipant, error) {
	text = trimSpace(text)
	audioURL = trimSpace(audioURL)
	if text == "" && audioURL == "" {
		return nil, domain.ErrChallengeNoSubmission
	}
	ch, err := uc.advance(ctx, challengeID)
	if err != nil {
		return nil, err
	}
	if ch.Status != domain.ChallengeActive {
		return nil, domain.ErrChallengePhase
	}
	if ch.SubmissionDeadline != nil && uc.now().After(*ch.SubmissionDeadline) {
		return nil, domain.ErrChallengeDeadline
	}
	p, err := uc.challenges.ParticipantForUser(ctx, challengeID, userID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, domain.ErrChallengeNotParticipant
		}
		return nil, err
	}
	now := uc.now()
	p.SubmissionText = text
	p.SubmissionAudioURL = audioURL
	p.SubmittedAt = &now
	p.Status = domain.ChallengeSubmitted
	if err := uc.challenges.UpdateParticipant(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

// Vote ثبت رأی در مرحلهٔ داوری. اساتید (role=teacher) به‌عنوان داور ثبت می‌شوند.
func (uc *ChallengeUsecase) Vote(ctx context.Context, challengeID, participantID, voterID uint, isJudge bool) error {
	ch, err := uc.advance(ctx, challengeID)
	if err != nil {
		return err
	}
	if ch.Status != domain.ChallengeJudging {
		return domain.ErrChallengePhase
	}
	if ch.VotingDeadline != nil && uc.now().After(*ch.VotingDeadline) {
		return domain.ErrChallengeDeadline
	}
	p, err := uc.challenges.ParticipantByID(ctx, challengeID, participantID)
	if err != nil {
		return err
	}
	if p.UserID == voterID {
		return domain.ErrChallengeSelfVote
	}
	return uc.challenges.AddVote(ctx, &domain.ChallengeVote{
		ChallengeID:   challengeID,
		ParticipantID: participantID,
		VoterID:       voterID,
		IsJudge:       isJudge,
	})
}

// RankRow یک سطر جدول نتایج و کارنامه.
type RankRow struct {
	Rank          uint    `json:"rank"`
	ParticipantID uint    `json:"participant_id"`
	UserID        uint    `json:"user_id"`
	Name          string  `json:"name"`
	AvatarURL     string  `json:"avatar_url"`
	AudienceVotes int     `json:"audience_votes"`
	JudgeVotes    int     `json:"judge_votes"`
	AdminScore    int     `json:"admin_score"`
	AudienceScore float64 `json:"audience_score"`
	JudgeScore    float64 `json:"judge_score"`
	FinalScore    float64 `json:"final_score"`
	PointsBonus   int     `json:"points_bonus"`
	IsMe          bool    `json:"is_me,omitempty"`
}

// ChallengeResults نتایج اعلام‌شده: رتبه‌بندی کامل + کارنامهٔ کاربر جاری.
type ChallengeResults struct {
	Challenge domain.Challenge `json:"challenge"`
	Ranking   []RankRow        `json:"ranking"`
	Me        *RankRow         `json:"me,omitempty"`
	Points    *PointSnapshot   `json:"points,omitempty"`
}

// PointSnapshot موجودی و آخرین تغییرات امتیاز اینستاقرآن کاربر.
type PointSnapshot struct {
	Balance int                  `json:"balance"`
	Ledger  []domain.PointLedger `json:"ledger"`
}

// Results کارنامهٔ نهایی — برای همهٔ شرکت‌کنندگان رتبهٔ خودشان نمایش داده می‌شود.
func (uc *ChallengeUsecase) Results(ctx context.Context, challengeID, userID uint) (*ChallengeResults, error) {
	ch, err := uc.challenges.ByID(ctx, challengeID)
	if err != nil {
		return nil, err
	}
	if ch.Status != domain.ChallengeFinished {
		return nil, domain.ErrChallengePhase
	}
	participants, err := uc.challenges.Participants(ctx, challengeID)
	if err != nil {
		return nil, err
	}
	sort.SliceStable(participants, func(i, j int) bool {
		if participants[i].Rank != participants[j].Rank {
			return participants[i].Rank < participants[j].Rank
		}
		return participants[i].ID < participants[j].ID
	})
	results := &ChallengeResults{Challenge: *ch}
	for i := range participants {
		p := &participants[i]
		row := RankRow{
			Rank:          p.Rank,
			ParticipantID: p.ID,
			UserID:        p.UserID,
			AudienceVotes: p.AudienceVotes,
			JudgeVotes:    p.JudgeVotes,
			AdminScore:    p.AdminScore,
			AudienceScore: p.AudienceScore,
			JudgeScore:    p.JudgeScore,
			FinalScore:    p.FinalScore,
			PointsBonus:   p.PointsBonus,
		}
		if p.User != nil {
			row.Name = p.User.Name
			row.AvatarURL = p.User.AvatarURL
		}
		if userID > 0 && p.UserID == userID {
			row.IsMe = true
			me := row
			results.Me = &me
		}
		results.Ranking = append(results.Ranking, row)
	}
	if userID > 0 {
		balance, _ := uc.points.Balance(ctx, userID)
		ledger, _ := uc.points.Ledger(ctx, userID, 20, 0)
		results.Points = &PointSnapshot{Balance: balance, Ledger: ledger}
	}
	return results, nil
}

// MyPoints امتیاز اینستاقرآن کاربر جاری.
func (uc *ChallengeUsecase) MyPoints(ctx context.Context, userID uint) (*PointSnapshot, error) {
	balance, err := uc.points.Balance(ctx, userID)
	if err != nil {
		return nil, err
	}
	ledger, err := uc.points.Ledger(ctx, userID, 50, 0)
	if err != nil {
		return nil, err
	}
	return &PointSnapshot{Balance: balance, Ledger: ledger}, nil
}

// notifyParticipants اعلان به همهٔ شرکت‌کنندگان چالش.
func (uc *ChallengeUsecase) notifyParticipants(ctx context.Context, challengeID uint, title, body string) {
	if uc.notifs == nil {
		return
	}
	participants, err := uc.challenges.Participants(ctx, challengeID)
	if err != nil {
		return
	}
	for _, p := range participants {
		_ = uc.notifs.Create(ctx, &domain.Notification{UserID: p.UserID, Title: title, Body: body})
	}
}

// ── ابزارهای کوچک قالب‌بندی فارسی ──

func round1(v float64) float64 {
	return math.Round(v*10) / 10
}

func trimSpace(s string) string {
	start, end := 0, len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\n' || s[end-1] == '\r') {
		end--
	}
	return s[start:end]
}

func intFa(v int) string {
	digits := []byte("۰۱۲۳۴۵۶۷۸۹")
	out := make([]byte, 0, 12)
	n := v
	if n == 0 {
		return "۰"
	}
	negative := n < 0
	if negative {
		n = -n
	}
	buf := [20]byte{}
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = digits[n%10]
		n /= 10
	}
	if negative {
		i--
		buf[i] = '-'
	}
	out = append(out, buf[i:]...)
	return string(out)
}

func faNumber1(v float64) string {
	whole := int(v)
	frac := int(math.Round((v - float64(whole)) * 10))
	if frac >= 10 {
		whole++
		frac = 0
	}
	if frac == 0 {
		return intFa(whole)
	}
	return intFa(whole) + "." + intFa(frac)
}

func faHourCount(hours int) string {
	if hours%24 == 0 && hours >= 24 {
		days := hours / 24
		return intFa(days) + " روز"
	}
	return intFa(hours) + " ساعت"
}

func faRank(rank uint) string {
	switch rank {
	case 1:
		return "اول"
	case 2:
		return "دوم"
	case 3:
		return "سوم"
	case 4:
		return "چهارم"
	case 5:
		return "پنجم"
	}
	return "رتبهٔ " + intFa(int(rank))
}

// ── خوراک‌های مدیریتی ──

// AdminChallengeListItem آیتم فهرست مدیریتی چالش.
type AdminChallengeListItem struct {
	domain.Challenge
	ParticipantCount int64 `json:"participants_count"`
}

// AdminParticipantRow سطر شرکت‌کننده در پنل مدیریت (همراه شمار رأی‌های زنده).
type AdminParticipantRow struct {
	domain.ChallengeParticipant
	AudienceVotes int    `json:"audience_votes"`
	JudgeVotes    int    `json:"judge_votes"`
	Name          string `json:"name"`
	Mobile        string `json:"mobile"`
	AvatarURL     string `json:"avatar_url"`
}

// AdminChallengeDetail خوراک کامل پنل مدیریت.
type AdminChallengeDetail struct {
	domain.Challenge
	Participants []AdminParticipantRow `json:"participants"`
}

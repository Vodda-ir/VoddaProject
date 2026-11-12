// Types for the فراخوان اساتید (teacher dispatch) feature.

export type OfficialService = {
  id: number;
  category: string;
  title: string;
  description: string;
  icon: string;
  sort_order?: number;
  active?: boolean;
};

export type DispatchCallStatus = "searching" | "matched" | "canceled" | "expired";

export type DispatchCall = {
  id: number;
  learner_id: number;
  official_service_id: number;
  topic_title: string;
  topic_icon: string;
  note: string;
  flexible: boolean;
  scheduled_at?: string | null;
  status: DispatchCallStatus;
  matched_teacher_id?: number | null;
  session_id?: number | null;
  expires_at: string;
  offer_count?: number;
  created_at: string;
};

export type DispatchCandidate = {
  offer_id: number;
  responded_at: string;
  service_id: number;
  duration: number;
  price: number;
  teacher_id: number;
  name: string;
  avatar_url: string;
  tag: string;
  field: string;
  city: string;
  level: string;
  tier: string;
  female: boolean;
  rating: number;
  reviews: number;
  sessions: number;
  bio: string;
};

export type DispatchCallView = {
  call: DispatchCall | null;
  candidates: DispatchCandidate[];
  topic_teachable?: boolean;
};

export type DispatchOfferStatus = "waiting" | "chosen" | "released" | "declined";

export type DispatchOffer = {
  id: number;
  call_id: number;
  teacher_id: number;
  status: DispatchOfferStatus;
  service_id: number;
  service_duration: number;
  service_price: number;
  responded_at: string;
  call?: DispatchCall;
};

export type TeacherInboxCall = {
  call: DispatchCall;
  offer_id?: number;
  accepted?: boolean;
  my_offer?: DispatchOffer;
  has_active_booking?: boolean;
};

export type TeacherInbox = {
  calls: TeacherInboxCall[];
  offers: DispatchOffer[];
};

export type ChooseOfferResult = {
  session?: {
    id: number;
    status: string;
    price?: number;
    scheduled_at?: string;
  };
  /** توکن بانک برای پست فرم به OnlinePG از مرورگر کاربر (مانند منافسه). */
  token?: string;
  res_num?: string;
  paid_via_wallet?: boolean;
};

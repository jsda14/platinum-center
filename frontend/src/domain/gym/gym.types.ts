export interface DaySchedule {
  open: string;
  close: string;
  active: boolean;
}

export interface GymSchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface NextOpenInfo {
  day: string;
  time: string;
  time_12h: string;
  text: string;
}

export interface GymStatus {
  is_open: boolean;
  opens_at: string | null;
  closes_at: string | null;
  minutes_to_close: number | null;
  message: string | null;
  next_open?: NextOpenInfo | null;
  next_open_message?: string | null;
}

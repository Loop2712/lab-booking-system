export type CalendarGridEvent = {
  id?: string;
  title: string;
  time: string;
  meta: string;
  badge?: string;
  badgeClassName?: string;
};

export type CalendarGridDay = {
  key: string;
  title: string;
  subtitle?: string;
  events: CalendarGridEvent[];
};

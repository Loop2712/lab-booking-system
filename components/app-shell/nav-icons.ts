import type { IconKey } from "./nav";
import type { Icon } from "@tabler/icons-react";
import {
  IconCalendar,
  IconCircleCheck,
  IconDashboard,
  IconKey as IconKeyOutline,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";

export const navIconMap: Record<IconKey, Icon> = {
  dashboard: IconDashboard,
  key: IconKeyOutline,
  calendar: IconCalendar,
  users: IconUsers,
  settings: IconSettings,
  approve: IconCircleCheck,
};

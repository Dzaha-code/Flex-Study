import { ReminderWindow } from "@/features/reminder/reminder-window";

/**
 * The desktop app's floating reminder window loads this page. `AppBoundary`
 * renders it bare — no database, no shell, no intro — see `isBareRoute`.
 */
export default function ReminderPage() {
  return <ReminderWindow />;
}

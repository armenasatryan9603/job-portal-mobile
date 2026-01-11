/**
 * Format a timestamp as a relative time string (e.g., "5 minutes ago", "2 hours ago")
 * Falls back to formatted date for older timestamps
 *
 * @param dateString - ISO date string or date string
 * @param t - Translation function from useTranslation hook
 * @param options - Optional configuration
 * @returns Formatted time string
 */
export const formatTimestamp = (
  dateString: string,
  t: (key: string) => string,
  options?: {
    /**
     * Maximum days to show relative time before switching to formatted date
     * Default: 7 days
     */
    maxRelativeDays?: number;
    /**
     * Whether to include space before translation keys (e.g., "5 minutesAgo" vs "5 minutes ago")
     * Default: false (no space, matches chat format)
     */
    includeSpace?: boolean;
  }
): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
  const diffInHours = diffInMinutes / 60;
  const diffInDays = diffInHours / 24;
  const maxRelativeDays = options?.maxRelativeDays ?? 7;
  const includeSpace = options?.includeSpace ?? false;
  const space = includeSpace ? " " : "";

  if (diffInMinutes < 1) {
    return t("now");
  } else if (diffInMinutes < 60) {
    return `${Math.floor(diffInMinutes)}${space}${t("minutesAgo")}`;
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}${space}${t("hoursAgo")}`;
  } else if (diffInDays < maxRelativeDays) {
    return `${Math.floor(diffInDays)}${space}${t("daysAgo")}`;
  } else {
    // For older dates, show formatted date
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
};

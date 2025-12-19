import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * CalendarNotificationService
 *
 * Manages scheduled local notifications for calendar events.
 * Sends daily reminders at 8 PM about accepted jobs scheduled for today and tomorrow.
 */

interface ScheduledJob {
  orderId: number;
  orderTitle: string;
  scheduledDate: string;
  proposalId: number;
}

class CalendarNotificationService {
  private static instance: CalendarNotificationService;
  private readonly STORAGE_KEY = "scheduled_notifications";
  private readonly NOTIFICATION_HOUR = 20; // 8 PM
  private readonly NOTIFICATION_MINUTE = 0;

  static getInstance(): CalendarNotificationService {
    if (!CalendarNotificationService.instance) {
      CalendarNotificationService.instance = new CalendarNotificationService();
    }
    return CalendarNotificationService.instance;
  }

  /**
   * Initialize the service and configure notification behavior
   */
  async initialize(): Promise<void> {
    try {
      console.log("🔧 Initializing CalendarNotificationService...");

      // Configure how notifications are displayed when app is in foreground
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          // Show calendar notifications even in foreground
          if (notification.request.content.data?.type === "calendar_reminder") {
            return {
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: true,
              shouldShowBanner: true,
              shouldShowList: true,
            };
          }
          return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          };
        },
      });

      console.log("✅ CalendarNotificationService initialized");
    } catch (error) {
      console.error(
        "❌ Error initializing CalendarNotificationService:",
        error
      );
    }
  }

  /**
   * Schedule notifications for all accepted jobs with scheduled dates
   * @param acceptedJobs Array of jobs with accepted status and scheduled dates
   */
  async scheduleJobNotifications(acceptedJobs: ScheduledJob[]): Promise<void> {
    try {
      console.log(
        `📅 Scheduling notifications for ${acceptedJobs.length} jobs`
      );

      // Cancel all existing calendar notifications first
      await this.cancelAllCalendarNotifications();

      const now = new Date();
      const notificationIds: string[] = [];

      for (const job of acceptedJobs) {
        const scheduledDate = new Date(job.scheduledDate);

        // Normalize dates for comparison (remove time component)
        const normalizedScheduledDate = new Date(scheduledDate);
        normalizedScheduledDate.setHours(0, 0, 0, 0);

        const normalizedNow = new Date(now);
        normalizedNow.setHours(0, 0, 0, 0);

        // Skip past dates
        if (normalizedScheduledDate < normalizedNow) {
          console.log(`⏭️ Skipping past date: ${job.scheduledDate}`);
          continue;
        }

        // Schedule notification for 8 PM the day before
        const dayBeforeNotificationTime = new Date(normalizedScheduledDate);
        dayBeforeNotificationTime.setDate(
          dayBeforeNotificationTime.getDate() - 1
        );
        dayBeforeNotificationTime.setHours(
          this.NOTIFICATION_HOUR,
          this.NOTIFICATION_MINUTE,
          0,
          0
        );

        // Schedule notification for 8 PM on the same day
        const sameDayNotificationTime = new Date(normalizedScheduledDate);
        sameDayNotificationTime.setHours(
          this.NOTIFICATION_HOUR,
          this.NOTIFICATION_MINUTE,
          0,
          0
        );

        // Only schedule if notification time is in the future
        if (dayBeforeNotificationTime > now) {
          const id = await this.scheduleNotification(
            job,
            dayBeforeNotificationTime,
            "tomorrow"
          );
          if (id) notificationIds.push(id);
        }

        if (sameDayNotificationTime > now) {
          const id = await this.scheduleNotification(
            job,
            sameDayNotificationTime,
            "today"
          );
          if (id) notificationIds.push(id);
        }
      }

      // Store notification IDs for later cancellation
      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(notificationIds)
      );

      console.log(
        `✅ Scheduled ${notificationIds.length} calendar notifications`
      );
    } catch (error) {
      console.error("❌ Error scheduling job notifications:", error);
    }
  }

  /**
   * Schedule a single notification
   */
  private async scheduleNotification(
    job: ScheduledJob,
    triggerTime: Date,
    timeLabel: "today" | "tomorrow"
  ): Promise<string | null> {
    try {
      const formattedDate = new Date(job.scheduledDate).toLocaleDateString(
        "en-US",
        {
          month: "long",
          day: "numeric",
          year: "numeric",
        }
      );

      // Use simple English titles - translations would require passing context
      // which isn't available in a background task
      const title =
        timeLabel === "today"
          ? "📅 Job Scheduled Today"
          : "📅 Job Scheduled Tomorrow";

      const body = `${job.orderTitle} - ${formattedDate}`;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            type: "calendar_reminder",
            orderId: job.orderId,
            proposalId: job.proposalId,
            scheduledDate: job.scheduledDate,
            timeLabel,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerTime,
        },
      });

      console.log(
        `✅ Scheduled notification for ${
          job.orderTitle
        } at ${triggerTime.toLocaleString()}`
      );

      return notificationId;
    } catch (error) {
      console.error("❌ Error scheduling single notification:", error);
      return null;
    }
  }

  /**
   * Cancel all calendar notifications
   */
  async cancelAllCalendarNotifications(): Promise<void> {
    try {
      // Get stored notification IDs
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const notificationIds: string[] = JSON.parse(stored);

        // Cancel each notification
        for (const id of notificationIds) {
          await Notifications.cancelScheduledNotificationAsync(id);
        }

        console.log(
          `🗑️ Cancelled ${notificationIds.length} calendar notifications`
        );
      }

      // Clear storage
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error("❌ Error cancelling calendar notifications:", error);
    }
  }

  /**
   * Get all scheduled calendar notifications (for debugging)
   */
  async getScheduledNotifications(): Promise<
    Notifications.NotificationRequest[]
  > {
    try {
      const allScheduled =
        await Notifications.getAllScheduledNotificationsAsync();

      // Filter for calendar notifications only
      const calendarNotifications = allScheduled.filter(
        (notification) =>
          notification.content.data?.type === "calendar_reminder"
      );

      console.log(
        `📋 Found ${calendarNotifications.length} scheduled calendar notifications`
      );

      return calendarNotifications;
    } catch (error) {
      console.error("❌ Error getting scheduled notifications:", error);
      return [];
    }
  }

  /**
   * Request notification permissions if not already granted
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.warn("⚠️ Notification permissions not granted");
        return false;
      }

      console.log("✅ Notification permissions granted");
      return true;
    } catch (error) {
      console.error("❌ Error requesting notification permissions:", error);
      return false;
    }
  }

  /**
   * Handle notification response (when user taps notification)
   */
  handleNotificationResponse(
    response: Notifications.NotificationResponse,
    navigationCallback: (orderId: number) => void
  ): void {
    const data = response.notification.request.content.data;

    if (data?.type === "calendar_reminder" && data?.orderId) {
      console.log(
        `📱 User tapped calendar notification for order ${data.orderId}`
      );
      navigationCallback(Number(data.orderId));
    }
  }
}

export default CalendarNotificationService;

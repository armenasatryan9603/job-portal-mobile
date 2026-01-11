import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiService } from "./api";

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
   * Initialize the service
   * Note: Notification handler is set in NotificationService to prevent conflicts
   */
  async initialize(): Promise<void> {
    try {
      // Notification handler is managed by NotificationService to prevent conflicts
    } catch (error) {
      console.error("Error initializing CalendarNotificationService:", error);
    }
  }

  /**
   * Schedule notifications for all accepted jobs with scheduled dates
   * @param acceptedJobs Array of jobs with accepted status and scheduled dates
   */
  async scheduleJobNotifications(acceptedJobs: ScheduledJob[]): Promise<void> {
    try {
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
    } catch (error) {
      console.error("Error scheduling job notifications:", error);
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

      return notificationId;
    } catch (error) {
      console.error("Error scheduling single notification:", error);
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
      }

      // Clear storage
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error("Error cancelling calendar notifications:", error);
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

      return calendarNotifications;
    } catch (error) {
      console.error("Error getting scheduled notifications:", error);
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
        console.warn("Notification permissions not granted");
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error requesting notification permissions:", error);
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
      navigationCallback(Number(data.orderId));
    }
  }

  /**
   * Automatically fetch and schedule all calendar notifications for the current user
   * This should be called when the app opens or user logs in
   */
  async scheduleAllNotificationsForUser(userId: number): Promise<void> {
    try {
      // Fetch user proposals
      const userProposalsResponse = await apiService.getProposalsByUser(userId);
      const userProposals = userProposalsResponse?.proposals || [];

      // Fetch user's orders (to get proposals received on their orders)
      const myOrdersResponse = await apiService.getMyOrders();
      const myOrders = myOrdersResponse?.orders || [];

      // Collect all proposals with accepted status and scheduled dates
      const scheduledJobs: ScheduledJob[] = [];

      // Process user submitted proposals
      userProposals.forEach((proposal: any) => {
        if (
          proposal.status === "accepted" &&
          proposal.Order?.availableDates &&
          Array.isArray(proposal.Order.availableDates)
        ) {
          proposal.Order.availableDates.forEach((dateStr: string) => {
            scheduledJobs.push({
              orderId: proposal.Order.id,
              orderTitle:
                proposal.Order.title || `Order #${proposal.Order.id}`,
              scheduledDate: dateStr,
              proposalId: proposal.id,
            });
          });
        }
      });

      // Process proposals received on user's orders
      myOrders.forEach((order: any) => {
        if (order.Proposals && Array.isArray(order.Proposals)) {
          order.Proposals.forEach((proposal: any) => {
            if (
              proposal.userId !== userId &&
              proposal.status === "accepted" &&
              order.availableDates &&
              Array.isArray(order.availableDates)
            ) {
              order.availableDates.forEach((dateStr: string) => {
                scheduledJobs.push({
                  orderId: order.id,
                  orderTitle: order.title || `Order #${order.id}`,
                  scheduledDate: dateStr,
                  proposalId: proposal.id,
                });
              });
            }
          });
        }
      });

      // Schedule all notifications
      if (scheduledJobs.length > 0) {
        await this.scheduleJobNotifications(scheduledJobs);
      }
    } catch (error) {
      console.error("Error scheduling calendar notifications for user:", error);
    }
  }
}

export default CalendarNotificationService;

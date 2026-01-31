import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Footer, FooterButton } from "@/components/Footer";
import { Order, OrderChangeHistory, apiService } from "@/categories/api";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { Spacing, ThemeColors, Typography } from "@/constants/styles";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import AnalyticsService from "@/categories/AnalyticsService";
import { ApplyButton } from "@/components/ApplyButton";
import { ApplyModal } from "@/components/ApplyModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckInModal } from "@/components/CheckInModal";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { Header } from "@/components/Header";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Image } from "expo-image";
import { Layout } from "@/components/Layout";
import { MapViewComponent } from "@/components/MapView";
import { OrderDetailSkeleton } from "@/components/OrderDetailSkeleton";
import { PriceCurrency } from "@/components/PriceCurrency";
import { SkillDescriptionModal } from "@/components/SkillDescriptionModal";
import { chatService } from "@/categories/chatService";
import { getFrontendUrl } from "@/config/api";
import { parseLocationCoordinates } from "@/utils/locationParsing";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useApplyToOrder } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useModal } from "@/contexts/ModalContext";
import { useTranslation } from "@/contexts/TranslationContext";

// Helper function to get localized service name
const getLocalizedCategoryName = (
  category?: {
    nameEn?: string;
    nameRu?: string;
    nameHy?: string;
  },
  language: string = "en"
): string => {
  if (!category) return "";

  switch (language) {
    case "ru":
      return category.nameRu || "";
    case "hy":
      return category.nameHy || "";
    case "en":
    default:
      return category.nameEn || "";
  }
};

export default function EditOrderScreen() {
  useAnalytics("OrderDetail");
  const { id, myJobs, preview } = useLocalSearchParams();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { user, isLoading: userLoading } = useAuth();
  const { showLoginModal } = useModal();
  const isMyJobs = myJobs === "true";

  // Helper function to get localized title/description
  const getLocalizedText = (
    field: "title" | "description",
    language: string,
    order: Order | null
  ): string => {
    if (!order) return "";
    const fieldKey = field === "title" ? "title" : "description";
    const langKey = language === "en" ? "En" : language === "ru" ? "Ru" : "Hy";
    const multilingualKey = `${fieldKey}${langKey}` as
      | "titleEn"
      | "titleRu"
      | "titleHy"
      | "descriptionEn"
      | "descriptionRu"
      | "descriptionHy";

    // Try multilingual field first
    if (order[multilingualKey]) {
      return order[multilingualKey]!;
    }

    // Fallback to original field
    return order[fieldKey] || "";
  };


  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [pendingApply, setPendingApply] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Track applied orders (fetched from backend)
  const [appliedOrders, setAppliedOrders] = useState<Set<number>>(new Set());

  // Feedback dialog state
  const [feedbackDialogVisible, setFeedbackDialogVisible] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Avatar image error state
  const [avatarImageError, setAvatarImageError] = useState(false);

  // Change history state
  const [changeHistory, setChangeHistory] = useState<OrderChangeHistory[]>([]);
  const [changeHistoryLoading, setChangeHistoryLoading] = useState(false);

  // Map modal state
  const [showMapModal, setShowMapModal] = useState(false);

  // Skill description modal state
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null);
  const [showSkillModal, setShowSkillModal] = useState(false);

  // Apply modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);

  // Check-in modal state (for permanent orders)
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);

  // Bookings state (for permanent orders)
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [updatingBookingStatus, setUpdatingBookingStatus] = useState<number | null>(null);

  // Review modal state (for permanent orders)
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);

  // Apply to order mutation
  const applyToOrderMutation = useApplyToOrder();
  const queryClient = useQueryClient();

  // Helper function to check if user has applied to an order
  const hasAppliedToOrder = (orderId: number): boolean => {
    return appliedOrders.has(orderId);
  };

  // Fetch user's applied orders from backend
  const loadAppliedOrders = async () => {
    if (!user?.id) {
      return;
    }

    try {
      const proposals = await apiService.getProposalsByUser(user.id);
      const appliedOrderIds = new Set<number>(
        proposals.proposals.map((proposal: any) => proposal.orderId)
      );
      setAppliedOrders(appliedOrderIds);
    } catch (error) {
      console.error("Error loading applied orders:", error);
    }
  };

  // Load order data
  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        setAvatarImageError(false); // Reset avatar error when loading new order
        // Get order data (works for both authenticated and non-authenticated users)
        const orderData = await apiService.getOrderById(parseInt(id as string));
        setOrder(orderData);

        // Check if current user is the owner - if so, redirect to create.tsx for editing
        // Unless preview mode is enabled (preview=true in URL params)
        if (user?.id === orderData.clientId && preview !== "true") {
          router.replace(`/orders/create?orderId=${id}`);
          return;
        }

        // Load change history if user is authenticated
        if (user?.id) {
          loadChangeHistory(parseInt(id as string));
        }

        // Load bookings if this is a permanent order and user is the owner
        if (orderData.orderType === "permanent" && user?.id === orderData.clientId) {
          loadBookings(parseInt(id as string));
        }
      } catch (error) {
        console.error("Error loading order:", error);
        Alert.alert(t("error"), t("failedToLoadOrder"));
        router.back();
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadOrder();
      loadAppliedOrders();
    }
  }, [id, user]);

  // Load change history
  const loadChangeHistory = async (orderId: number) => {
    if (!user?.id) return;

    try {
      setChangeHistoryLoading(true);
      const history = await apiService.getOrderChangeHistory(orderId);
      setChangeHistory(history);
    } catch (error) {
      console.error("Error loading change history:", error);
      // Don't show error to user - change history is optional
    } finally {
      setChangeHistoryLoading(false);
    }
  };

  // Load bookings for the order
  const loadBookings = async (orderId: number) => {
    try {
      setBookingsLoading(true);
      const orderBookings = await apiService.getOrderBookings(orderId);
      setBookings(orderBookings);
    } catch (error) {
      console.error("Error loading bookings:", error);
    } finally {
      setBookingsLoading(false);
    }
  };

  // Handle booking approval/rejection
  const handleBookingStatusUpdate = async (bookingId: number, status: "confirmed" | "cancelled") => {
    if (!order) return;

    setUpdatingBookingStatus(bookingId);
    try {
      await apiService.updateBookingStatus(bookingId, status);
      // Reload bookings
      await loadBookings(order.id);
      Alert.alert(
        t("success"),
        status === "confirmed"
          ? t("bookingApproved") || "Booking approved successfully"
          : t("bookingRejected") || "Booking rejected"
      );
    } catch (error: any) {
      console.error("Error updating booking status:", error);
      Alert.alert(
        t("error"),
        error?.message || t("failedToUpdateBooking") || "Failed to update booking"
      );
    } finally {
      setUpdatingBookingStatus(null);
    }
  };

  // Fetch reviews for permanent orders
  const orderId = parseInt(id as string);
  const isPermanentOrder = order?.orderType === "permanent";
  const { data: reviewsData, refetch: refetchReviews } = useQuery({
    queryKey: ["order-reviews", orderId],
    queryFn: () => chatService.getReviewsByOrder(orderId),
    enabled: !!orderId && isPermanentOrder,
  });

  const reviews = reviewsData?.reviews || order?.Reviews || [];
  const userReview = reviews?.find((r: any) => r.reviewerId === user?.id);
  const hasReviewed = !!userReview;

  // Reload applied orders when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadAppliedOrders();
      }
    }, [user?.id])
  );

  const handleStartChat = async () => {
    // Check if user is authenticated
    if (!user?.id) {
      showLoginModal();
      return;
    }

    try {
      const conversation = await chatService.createOrderConversation(
        parseInt(id as string)
      );
      router.push(`/chat/${conversation.id}`);
    } catch (error) {
      console.error("Failed to start chat:", error);
      Alert.alert(t("error"), t("failedToStartChat"));
    }
  };

  const handleApplyToOrder = () => {
    // Check if user is authenticated
    if (!user?.id) {
      setPendingApply(true);
      showLoginModal();
      return;
    }

    // Ensure we have a valid order
    if (!order) {
      Alert.alert(t("error"), t("orderNotFound"));
      return;
    }

    // Track apply to order
    AnalyticsService.getInstance().logEvent("apply_to_order_clicked", {
      order_id: order.id.toString(),
    });

    // Show apply modal
    setShowApplyModal(true);
  };

  const handleSubmitApplication = async (
    message: string,
    questionAnswers?: Array<{ questionId: number; answer: string }>,
    peerIds?: number[],
    teamId?: number
  ) => {
    if (!order) return;

    setApplyLoading(true);

    try {
      // Use TanStack Query mutation
      const result = await applyToOrderMutation.mutateAsync({
        orderId: order.id,
        message: message,
        questionAnswers: questionAnswers,
        peerIds: peerIds,
        teamId: teamId,
      });

      // Track proposal submission
      const proposalId = result?.id || result?.proposalId || "unknown";
      await AnalyticsService.getInstance().logProposalSubmitted(
        order.id.toString(),
        proposalId.toString()
      );

      // Add order to applied orders set
      setAppliedOrders((prev) => new Set(prev).add(order.id));

      // Create a chat conversation with the client (include peers if group application)
      // The proposal message will be automatically sent as the first message by the backend
      try {
        const conversation = await chatService.createOrderConversation(
          order.id,
          typeof proposalId === "number" ? proposalId : undefined
        );

        Alert.alert(t("success"), t("applicationSubmittedSuccessfully"), [
          {
            text: t("ok"),
            onPress: () => {
              // Navigate to the chat
              router.push(`/chat/${conversation.id}`);
            },
          },
        ]);
      } catch (chatError) {
        // Still show success for the application, but mention chat creation failed
        Alert.alert(
          t("success"),
          t("applicationSubmittedSuccessfully") + " (Chat creation failed)"
        );
      }

      // Close the modal
      setShowApplyModal(false);
    } catch (error: any) {
      // Handle specific error cases
      if (error.message?.includes("Insufficient credit balance")) {
        Alert.alert(t("insufficientCredits"), t("needMoreCredits"));
      } else if (error.message?.includes("already has a proposal")) {
        Alert.alert(t("error"), "You have already applied to this order");
      } else {
        Alert.alert(t("error"), t("failedToSubmitApplication"));
      }
    } finally {
      setApplyLoading(false);
    }
  };

  const handleCloseApplyModal = () => {
    setShowApplyModal(false);
  };

  // Check-in handlers for permanent orders
  const handleCheckIn = () => {
    // Check if user is authenticated
    if (!user?.id) {
      setPendingApply(true);
      showLoginModal();
      return;
    }

    // Ensure we have a valid order
    if (!order) {
      Alert.alert(t("error"), t("orderNotFound"));
      return;
    }

    // Check if this is actually a permanent order
    if ((order as any).orderType !== "permanent") {
      Alert.alert(t("error"), "This is not a permanent order");
      return;
    }

    // Track check-in button clicked
    AnalyticsService.getInstance().logEvent("check_in_clicked", {
      order_id: order.id.toString(),
    });

    // Show check-in modal
    setShowCheckInModal(true);
  };

  const handleSubmitCheckIn = async (
    selectedSlots: Array<{ date: string; startTime: string; endTime: string; marketMemberId?: number; message?: string }>
  ) => {
    if (!order) return;

    setCheckInLoading(true);

    try {
      const result = await apiService.checkInToOrder(order.id, selectedSlots);

      // Handle partial success (some bookings succeeded, some failed)
      if (result.errors && result.errors.length > 0) {
        console.warn("Some bookings failed:", result.errors);
        
        // Check if any errors are market conflict errors
        const marketConflictErrors = result.errors.filter((err: any) =>
          err.error?.includes("another order from the same service") ||
          err.error?.includes("same service")
        );

        if (marketConflictErrors.length > 0) {
          // Show market conflict alert
          const conflictMessage = marketConflictErrors.length === 1
            ? marketConflictErrors[0].error
            : `${marketConflictErrors.length} ${t("slotsSelected")} ${t("conflictWithMarketOrder")}`;
          
          Alert.alert(
            t("bookingConflict"),
            conflictMessage,
            [{ text: t("ok") }]
          );
          setCheckInLoading(false);
          return;
        } else if (result.bookings && result.bookings.length > 0) {
          // Some succeeded, some failed (non-market conflicts)
          const errorMessages = result.errors.map((err: any) => err.error).join("\n");
          Alert.alert(
            t("partialSuccess"),
            `${t("someBookingsSucceeded")}.\n${t("someBookingsFailed")}:\n${errorMessages}`
          );
          setCheckInLoading(false);
          return;
        }
      }

      // Track successful check-in
      AnalyticsService.getInstance().logEvent("check_in_success", {
        order_id: order.id.toString(),
        slots_count: selectedSlots.length.toString(),
      });

      // Check if approval is required
      const requiresApproval = (order as any).checkinRequiresApproval;
      const successMessage = requiresApproval
        ? t("checkInRequestSubmitted") || "Your booking request has been submitted and is pending approval."
        : t("checkInSuccess") || "Check-in successful!";

      Alert.alert(t("success"), successMessage, [
        {
          text: t("ok"),
          onPress: () => {
            setShowCheckInModal(false);
            router.back();
          },
        },
      ]);
    } catch (error: any) {
      console.error("Error checking in:", error);
      
      // Check if error is a market conflict
      const errorMessage = error?.message || error?.toString() || "";
      if (
        errorMessage.includes("another order from the same service") ||
        errorMessage.includes("same service")
      ) {
        Alert.alert(
          t("bookingConflict"),
          errorMessage || t("marketBookingConflict")
        );
      } else {
        Alert.alert(t("error"), error.message || t("failedToCheckIn"));
      }
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCloseCheckInModal = () => {
    setShowCheckInModal(false);
  };

  // Review handlers for permanent orders
  const handleOpenReviewModal = () => {
    if (userReview) {
      // Editing existing review
      setReviewRating(userReview.rating);
      setReviewComment(userReview.comment || "");
      setEditingReviewId(userReview.id);
    } else {
      // Creating new review
      setReviewRating(0);
      setReviewComment("");
      setEditingReviewId(null);
    }
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (reviewRating === 0) {
      Alert.alert(t("error"), t("pleaseSelectRating"));
      return;
    }

    if (!order) return;

    try {
      if (editingReviewId) {
        // Update existing review
        await chatService.updateOrderReview(editingReviewId, {
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
        });
      } else {
        // Create new review
        if (!user?.id) {
          Alert.alert(t("error"), t("pleaseLogin"));
          return;
        }
        await chatService.createOrderReview({
          orderId: order.id,
          reviewerId: user.id,
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["order-reviews", order.id] });
      // Reload order to refresh Reviews
      const orderData = await apiService.getOrderById(order.id);
      setOrder(orderData);
      refetchReviews();
      setShowReviewModal(false);
      setReviewRating(0);
      setReviewComment("");
      setEditingReviewId(null);
    } catch (error: any) {
      console.error("Error submitting review:", error);
      Alert.alert(t("error"), error.message || t("failedToSubmitReview"));
    }
  };

  const handleFeedbackSubmit = async (
    rating: number,
    feedback: string,
    reasonIds?: number[]
  ) => {
    setFeedbackLoading(true);
    try {
      // Submit feedback for the canceled proposal
      // When specialist cancels, backend will automatically set specialistId
      await chatService.submitFeedback({
        orderId: order?.id || 0,
        specialistId: undefined,
        rating,
        comment: feedback,
        feedbackType: "canceled",
        reasonIds,
      });

      // Track feedback submitted
      AnalyticsService.getInstance().logEvent("order_feedback_submitted", {
        order_id: order?.id.toString() || "unknown",
        rating,
        feedback_type: "canceled",
      });

      Alert.alert(t("success"), t("feedbackSubmitted"));
      setFeedbackDialogVisible(false);

      // Navigate back to My Jobs after feedback submission
      router.back();
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      Alert.alert(t("error"), t("failedToSubmitFeedback"));
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleFeedbackClose = () => {
    setFeedbackDialogVisible(false);
    // Navigate back to My Jobs even if user cancels feedback
    router.back();
  };

  const handleCancelProposal = () => {
    Alert.alert(t("cancelProposal"), t("areYouSureCancelProposal"), [
      {
        text: t("cancel"),
        style: "cancel",
      },
      {
        text: t("yes"),
        style: "destructive",
        onPress: async () => {
          try {
            // Get the proposal ID from the order's proposals
            const userProposal = order?.Proposals?.find(
              (proposal: any) => proposal.userId === user?.id
            );

            if (!userProposal) {
              Alert.alert(t("error"), t("proposalNotFound"));
              return;
            }

            await apiService.cancelProposal(userProposal.id);

            // Track proposal cancelled
            AnalyticsService.getInstance().logEvent("proposal_cancelled", {
              order_id: order?.id.toString() || "unknown",
              proposal_id: userProposal.id.toString(),
            });

            // Show feedback dialog after successful cancellation
            setFeedbackDialogVisible(true);
          } catch (err) {
            console.error("Error canceling proposal:", err);
            Alert.alert(t("error"), t("failedToCancelProposal"));
          }
        },
      },
    ]);
  };

  // Generate shareable order link
  const generateOrderLink = (): string => {
    const orderId = order?.id;
    if (!orderId) return "";

    // Get frontend URL from config (set via EXPO_PUBLIC_FRONTEND_URL env variable)
    const frontendUrl = getFrontendUrl();
    
    // Generate web URL that works across devices
    // This will open in browser or redirect to app if deep linking is configured
    const webUrl = `${frontendUrl}/orders/${orderId}`;
    
    // Return web URL as primary (works on all devices)
    return webUrl;
  };

  // Share order link
  const handleShareOrderLink = async () => {
    if (!order) return;

    try {
      const orderLink = generateOrderLink();
      const orderTitle = getLocalizedText("title", language, order);

      const shareMessage = `${t(
        "shareOrderMessage"
      )}: ${orderTitle}\n\n${orderLink}`;

      const result = await Share.share({
        message: shareMessage,
        title: t("shareOrder"),
        url: orderLink, // Add URL for better sharing support (iOS)
      });

      if (result.action === Share.sharedAction) {
        // Track order shared
        AnalyticsService.getInstance().logEvent("order_shared", {
          order_id: order?.id.toString() || "unknown",
          share_type: "link",
        });
        // User shared successfully
        if (result.activityType) {
          // Shared with activity type of result.activityType
          console.log("Shared with activity type:", result.activityType);
        }
      } else if (result.action === Share.dismissedAction) {
        // User dismissed the share sheet
        console.log("Share dismissed");
      }
    } catch (error: any) {
      console.error("Error sharing order link:", error);
      Alert.alert(t("error"), t("failedToShareOrder"));
    }
  };

  // Social sharing with order details
  const handleSocialShare = async () => {
    if (!order) return;

    try {
      const orderTitle = getLocalizedText("title", language, order);
      const orderDescription = getLocalizedText("description", language, order);
      const orderLink = generateOrderLink();

      // Format the share message with order details
      let shareMessage = `${t("shareOrderMessage")}\n\n`;
      shareMessage += `📋 ${orderTitle}\n\n`;

      if (orderDescription) {
        // Truncate description if too long
        const maxDescriptionLength = 200;
        const truncatedDescription =
          orderDescription.length > maxDescriptionLength
            ? orderDescription.substring(0, maxDescriptionLength) + "..."
            : orderDescription;
        shareMessage += `${truncatedDescription}\n\n`;
      }

      if (order.budget) {
        shareMessage += `💰 ${t(
          "budget"
        )}: $${order.budget.toLocaleString()}\n`;
      }

      if (order.location) {
        shareMessage += `📍 ${t("location")}: ${order.location}\n`;
      }

      shareMessage += `\n${orderLink}`;

      const result = await Share.share({
        message: shareMessage,
        title: t("shareOrder"),
        url: orderLink, // Add URL for better sharing support (iOS)
      });

      if (result.action === Share.sharedAction) {
        // Track order shared with details
        AnalyticsService.getInstance().logEvent("order_shared", {
          order_id: order?.id.toString() || "unknown",
          share_type: "details",
        });
        console.log("Order shared successfully");
      }
    } catch (error: any) {
      console.error("Error sharing order:", error);
      Alert.alert(t("error"), t("failedToShareOrder"));
    }
  };

  // Show share options menu
  const handleShare = () => {
    if (!order) return;

    Alert.alert(
      t("shareOrder"),
      t("chooseShareOption"),
      [
        {
          text: t("shareOrderLink"),
          onPress: handleShareOrderLink,
        },
        {
          text: `${t("shareOrder")} ${t("details")}`,
          onPress: handleSocialShare,
        },
        {
          text: t("cancel"),
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  // Handle automatic Apply after login
  useEffect(() => {
    // If user just logged in and we have a pending apply, proceed with it
    if (user?.id && pendingApply && order && !userLoading) {
      setPendingApply(false);
      // Small delay to ensure the page has fully rendered after login
      const timer = setTimeout(() => {
        setShowApplyModal(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [user?.id, pendingApply, order, userLoading]);

  // Get field badge color
  const getFieldColor = (field: string, newValue?: string | null): string => {
    switch (field.toLowerCase()) {
      case "status":
        // Status-specific colors based on new value
        if (newValue) {
          const status = newValue.toLowerCase();
          switch (status) {
            case "open":
              return colors.link; // Blue
            case "pending_review":
              return colors.orange; // Orange/Yellow
            case "in_progress":
              return colors.orange; // Orange/Yellow
            case "completed":
              return colors.openNow; // Green
            case "cancelled":
            case "closed":
            case "rejected":
              return colors.errorVariant; // Red
          }
        }
        return colors.link; // Default blue for status
      case "title":
        return colors.accentSecondary; // Purple
      case "budget":
        return colors.orange; // Orange
      default:
        return colors.tint;
    }
  };

  // Format field name for display
  const formatFieldName = (field: string): string => {
    const fieldMap: { [key: string]: string } = {
      status: t("status"),
      title: t("title"),
      budget: t("budget"),
    };
    return fieldMap[field] || field.charAt(0).toUpperCase() + field.slice(1);
  };

  // Format value for display
  const formatValue = (
    field: string,
    value: string | null | undefined
  ): string => {
    if (!value) return "-";

    if (field === "budget") {
      return `$${parseFloat(value).toLocaleString()}`;
    }

    if (field === "status") {
      return value
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }

    return value;
  };

  // Render change history
  const renderChangeHistory = () => {
    // Only show change history for authenticated users
    if (!user?.id) {
      return null;
    }

    return (
      <ResponsiveCard>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("orderChangeHistory")}
        </Text>
        {changeHistoryLoading ? (
          <ActivityIndicator
            size="small"
            color={colors.tint}
            style={{ marginTop: 12 }}
          />
        ) : !changeHistory || changeHistory.length === 0 ? (
          <Text
            style={[styles.emptyHistoryText, { color: colors.tabIconDefault }]}
          >
            {t("noChangeHistory")}
          </Text>
        ) : (
          <>
            {changeHistory.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.changeHistoryItem,
                  {
                    borderBottomColor:
                      index < changeHistory.length - 1
                        ? colors.border
                        : "transparent",
                  },
                ]}
              >
                <View style={styles.changeHistoryContent}>
                  <Badge
                    text={formatFieldName(item.fieldChanged)}
                    backgroundColor={getFieldColor(item.fieldChanged, item.newValue)}
                    textColor={colors.textInverse}
                    size="sm"
                    style={{ minWidth: 80 }}
                  />
                  <View style={styles.changeHistoryDetails}>
                    <View style={styles.changeValueRow}>
                      <Text
                        style={[
                          styles.changeLabel,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        {t("from")}:
                      </Text>
                      <Text
                        style={[styles.changeValue, { color: colors.text }]}
                      >
                        {formatValue(item.fieldChanged, item.oldValue)}
                      </Text>
                    </View>
                    <View style={styles.changeValueRow}>
                      <Text
                        style={[
                          styles.changeLabel,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        {t("to")}:
                      </Text>
                      <Text
                        style={[
                          styles.changeValue,
                          { color: colors.text, fontWeight: "600" },
                        ]}
                      >
                        {formatValue(item.fieldChanged, item.newValue)}
                      </Text>
                    </View>
                    <Text
                      style={[styles.changeTimestamp, { color: colors.text }]}
                    >
                      {new Date(item.createdAt).toLocaleString()}
                    </Text>
                    {item.ChangedBy && (
                      <Text
                        style={[
                          styles.changeChangedBy,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        {t("changedBy")}: {item.ChangedBy.name}
                      </Text>
                    )}
                    {item.reason && (
                      <Text
                        style={[
                          styles.changeReason,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        {item.reason}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
      </ResponsiveCard>
    );
  };

  const renderOrderOverview = () => {
    return (
      <ResponsiveCard>
        <View>
          <Text style={[styles.orderTitle, { color: colors.text }]}>
            {getLocalizedText("title", language, order)}
          </Text>
          <Text
            style={[styles.orderDescription, { color: colors.tabIconDefault }]}
          >
            {getLocalizedText("description", language, order)}
          </Text>

          {/* Status Badge */}
          {order &&
            (order.status === "pending_review" ||
              order.status === "rejected") && (
              <Badge
                text={order.status === "pending_review" ? t("pendingReview") : t("rejected")}
                variant={order.status === "pending_review" ? "pending" : "error"}
                icon={order.status === "pending_review" ? "clock.fill" : "xmark.circle.fill"}
                iconSize={14}
                size="md"
                style={{ marginTop: 12, marginBottom: 8 }}
              />
            )}

          {/* Rejection Reason */}
          {order?.status === "rejected" && order.rejectionReason && (
            <View
              style={[
                styles.rejectionReasonContainer,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.rejectionReasonLabel, { color: colors.text }]}
              >
                {t("rejectionReason")}:
              </Text>
              <Text
                style={[
                  styles.rejectionReasonText,
                  { color: colors.tabIconDefault },
                ]}
              >
                {order.rejectionReason}
              </Text>
            </View>
          )}

          {/* Check-In Button (for permanent orders) or Apply Button (for one-time orders) */}
          {order && !isMyJobs && user?.id !== order.clientId && (
            <>
              {(order as any).orderType === "permanent" ? (
                <Button
                  variant="primary"
                  icon="calendar.badge.plus"
                  iconSize={16}
                  iconPosition="left"
                  title={t("checkIn")}
                  onPress={handleCheckIn}
                  style={{ marginTop: Spacing.md }}
                />
              ) : (
                <ApplyButton
                  order={order}
                  hasAppliedToOrder={hasAppliedToOrder}
                  onApply={handleApplyToOrder}
                  style={{ paddingVertical: 10 }}
                />
              )}
            </>
          )}

          {/* Cancel Button - Only show for My Jobs */}
          {isMyJobs && order?.Proposals && order.Proposals.length > 0 && (
            <Button
              onPress={handleCancelProposal}
              title={t("cancel")}
              icon="trash"
              iconSize={16}
              iconPosition="left"
              variant="outline"
              textColor={colors.errorVariant}
            />
          )}
        </View>
      </ResponsiveCard>
    );
  };

  // Reusable Media Files Display Component
  const renderMediaFiles = (mediaFiles: any[], canDelete: boolean = false) => {
    if (!mediaFiles || mediaFiles.length === 0) return null;

    const handleDeleteMedia = async (mediaFileId: number) => {
      Alert.alert(t("delete"), t("areYouSureDeleteMediaFile"), [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await apiService.deleteMediaFile(mediaFileId);
              const orderData = await apiService.getOrderById(
                parseInt(id as string)
              );
              setOrder(orderData);
              Alert.alert(t("success"), t("mediaFileDeletedSuccessfully"));
            } catch (error: any) {
              console.error("Error deleting media file:", error);
              const errorMessage =
                error?.message || t("failedToDeleteMediaFile");
              Alert.alert(t("error"), errorMessage);
            }
          },
        },
      ]);
    };

    return (
      <ResponsiveCard>
        <View style={styles.mediaGrid}>
          {mediaFiles.map((mediaFile) => (
            <View key={mediaFile.id} style={styles.mediaGridItemContainer}>
              <TouchableOpacity
                style={styles.mediaGridItem}
                onPress={() => setSelectedImage(mediaFile.fileUrl)}
              >
                {mediaFile.fileType === "image" ? (
                  <Image
                    source={mediaFile.fileUrl}
                    style={styles.mediaGridImage}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.mediaGridPlaceholder,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <IconSymbol
                      name="play.circle.fill"
                      size={24}
                      color={colors.tint}
                    />
                  </View>
                )}
              </TouchableOpacity>
              {canDelete && (
                <TouchableOpacity
                  style={styles.deleteMediaButton}
                  onPress={() => handleDeleteMedia(mediaFile.id)}
                >
                  <IconSymbol
                    name="xmark.circle.fill"
                    size={20}
                    color={colors.errorVariant}
                  />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ResponsiveCard>
    );
  };

  const renderOrderDetails = () => {
    return (
      <ResponsiveCard>
        <View style={styles.detailsContainer}>
          <View style={styles.detailItem}>
            <IconSymbol
              name="dollarsign.circle.fill"
              size={20}
              color={colors.tint}
            />
            <View style={styles.detailContent}>
              <Text
                style={[styles.detailLabel, { color: colors.tabIconDefault }]}
              >
                {t("budget")}
              </Text>
              <PriceCurrency
                price={order?.budget}
                currency={order?.currency}
                rateUnit={order?.rateUnit}
                showOriginal={true}
                style={{ ...styles.detailValue, color: colors.text }}
                originalStyle={{
                  ...styles.detailValueSmall,
                  color: colors.tabIconDefault,
                }}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.detailItem}
            onPress={() => {
              const locationCoordinates = parseLocationCoordinates(
                order?.location
              );
              if (locationCoordinates) {
                setShowMapModal(true);
              }
            }}
            disabled={!parseLocationCoordinates(order?.location)}
            activeOpacity={parseLocationCoordinates(order?.location) ? 0.6 : 1}
          >
            <IconSymbol
              name="location.fill"
              size={20}
              color={
                parseLocationCoordinates(order?.location)
                  ? colors.tint
                  : colors.tabIconDefault
              }
            />
            <View style={styles.detailContent}>
              <Text
                style={[styles.detailLabel, { color: colors.tabIconDefault }]}
              >
                {t("location")}
              </Text>
              <Text
                style={[
                  styles.detailValue,
                  {
                    color: colors.text,
                    textDecorationLine: parseLocationCoordinates(
                      order?.location
                    )
                      ? "underline"
                      : "none",
                  },
                ]}
              >
                {parseLocationCoordinates(order?.location)?.address ||
                  order?.location ||
                  t("remote")}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.detailItem}>
            <IconSymbol name="calendar" size={20} color={colors.tint} />
            <View style={styles.detailContent}>
              <Text
                style={[styles.detailLabel, { color: colors.tabIconDefault }]}
              >
                {t("createdAt")}
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {order?.createdAt
                  ? new Date(order.createdAt).toLocaleDateString()
                  : ""}
              </Text>
            </View>
          </View>

          {order?.Category && (
            <View style={styles.detailItem}>
              <IconSymbol name="briefcase.fill" size={20} color={colors.tint} />
              <View style={styles.detailContent}>
                <Text
                  style={[styles.detailLabel, { color: colors.tabIconDefault }]}
                >
                  {t("category")}
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {getLocalizedCategoryName(order.Category, language)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ResponsiveCard>
    );
  };

  const renderRequiredSkills = () => {
    return (
      <ResponsiveCard>
        <View style={styles.skillsContainer}>
          {order?.skills.map((skill: string, index: number) => {
            // Try to get skillId from OrderSkills if available
            const orderSkills = (order as any).OrderSkills;
            const skillId =
              orderSkills && orderSkills[index]
                ? orderSkills[index].Skill?.id
                : null;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.skillTag,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  // Navigate to orders list with skill search
                  router.push(`/orders?q=${encodeURIComponent(skill)}`);
                }}
                onLongPress={() => {
                  if (skillId) {
                    setSelectedSkillId(skillId);
                    setShowSkillModal(true);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.skillText, { color: colors.text }]}>
                  {skill}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ResponsiveCard>
    );
  };

  const renderAvailableDates = () => {
    const parseDates = (dateString: string) => {
      const cleanString = dateString.replace(/^[{"']|["'}]$/g, "");
      const dates = cleanString.match(/Sep \d+/g) || [];

      return dates.map((date) => {
        const dateIndex = cleanString.indexOf(date);
        const nextDateIndex = cleanString.indexOf("Sep", dateIndex + 1);
        const endIndex =
          nextDateIndex === -1 ? cleanString.length : nextDateIndex;
        const dateSection = cleanString.substring(dateIndex, endIndex);
        const times = dateSection.match(/\d{1,2}:\d{2}/g) || [];

        return { date, times };
      });
    };

    // Parse all available dates
    const allDateTimes = order?.availableDates
      .filter((dateStr) => dateStr && dateStr.trim() !== "")
      .flatMap((dateStr) => parseDates(dateStr));

    // Only show if there are valid dates
    return allDateTimes && allDateTimes?.length > 0 ? (
      <ResponsiveCard>
        <View style={styles.datesContainer}>
          {allDateTimes.map((dateTime, index) => (
            <View key={index} style={styles.dateTimeItem}>
              <View style={styles.dateHeader}>
                <IconSymbol name="calendar" size={16} color={colors.tint} />
                <Text style={[styles.dateText, { color: colors.text }]}>
                  {dateTime.date}
                </Text>
              </View>
              {dateTime.times && dateTime.times.length > 0 && (
                <View style={styles.timesContainer}>
                  {dateTime.times.map((time, timeIndex) => (
                    <View
                      key={timeIndex}
                      style={[
                        styles.timeChip,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.tint,
                        },
                      ]}
                    >
                      <IconSymbol name="clock" size={12} color={colors.tint} />
                      <Text style={[styles.timeText, { color: colors.tint }]}>
                        {time}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      </ResponsiveCard>
    ) : null;
  };

  const renderReviewsSection = () => {
    if (!isPermanentOrder) return null;

    // Calculate average rating
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) /
          reviews.length
        : 0;

    return (
      <ResponsiveCard>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("reviews")}
          </Text>
          <View style={styles.reviewsHeaderRight}>
            {avgRating > 0 && (
              <View style={styles.ratingBadge}>
                <IconSymbol name="star.fill" size={14} color={colors.rating} />
                <Text style={[styles.ratingBadgeText, { color: colors.text }]}>
                  {avgRating.toFixed(1)}
                </Text>
              </View>
            )}
            {user && !hasReviewed && (
              <Button
                onPress={handleOpenReviewModal}
                title={t("submitMarketReview")}
                variant="primary"
                icon="star"
                iconSize={14}
                backgroundColor={colors.primary}
              />
            )}
          </View>
        </View>

        {reviews.length > 0 ? (
          reviews.map((review: any) => (
            <View
              key={review.id}
              style={[
                styles.reviewItem,
                { borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.reviewHeader}>
                <View style={styles.reviewerInfo}>
                  <Text
                    style={[styles.reviewerName, { color: colors.text }]}
                  >
                    {review.Reviewer?.name || t("anonymous")}
                  </Text>
                  <View style={styles.reviewRating}>
                    {[...Array(5)].map((_, i) => (
                      <IconSymbol
                        key={i}
                        name="star.fill"
                        size={12}
                        color={i < review.rating ? colors.rating : colors.border}
                      />
                    ))}
                  </View>
                </View>
                <View style={styles.reviewHeaderRight}>
                  <Text
                    style={[
                      styles.reviewDate,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {new Date(review.createdAt).toLocaleDateString()}
                  </Text>
                  {user && review.reviewerId === user.id && (
                    <TouchableOpacity
                      onPress={() => {
                        setReviewRating(review.rating);
                        setReviewComment(review.comment || "");
                        setEditingReviewId(review.id);
                        setShowReviewModal(true);
                      }}
                      style={styles.editReviewButton}
                    >
                      <IconSymbol
                        name="pencil"
                        size={16}
                        color={colors.tint}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {review.comment && (
                <Text style={[styles.reviewComment, { color: colors.text }]}>
                  {review.comment}
                </Text>
              )}
            </View>
          ))
        ) : (
          <Text
            style={[
              styles.noReviews,
              { color: colors.tabIconDefault },
            ]}
          >
            {t("noReviews")}
          </Text>
        )}
      </ResponsiveCard>
    );
  };

  const renderPendingBookings = () => {
    // Only show for permanent orders where user is the owner
    if (!isPermanentOrder || !order || user?.id !== order.clientId) {
      return null;
    }

    const pendingBookings = bookings.filter((b) => b.status === "pending");

    if (pendingBookings.length === 0) {
      return null;
    }

    return (
      <ResponsiveCard>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("pendingBookings") || "Pending Bookings"}
          </Text>
          <Text
            style={[
              styles.sectionSubtitle,
              { color: colors.tabIconDefault },
            ]}
          >
            {pendingBookings.length}{" "}
            {t("pendingBookingsCount") || "awaiting approval"}
          </Text>
        </View>

        {bookingsLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          pendingBookings.map((booking) => (
            <View
              key={booking.id}
              style={[
                styles.bookingItem,
                { borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.bookingInfo}>
                <View style={styles.bookingHeader}>
                  <Text style={[styles.bookingClientName, { color: colors.text }]}>
                    {booking.Client?.name || t("client")}
                  </Text>
                  <Badge
                    text={t("pending")}
                    variant="pending"
                    size="sm"
                    backgroundColor={colors.warning} // fixed: use a valid property instead of colors.orangeSecondary
                  />
                </View>
                {order?.resourceBookingMode === "select" && booking.MarketMember?.User && (
                  <View style={styles.bookingDateTime}>
                    <IconSymbol
                      name="person.fill"
                      size={16}
                      color={colors.tabIconDefault}
                    />
                    <Text
                      style={[
                        styles.bookingDateText,
                        { color: colors.tabIconDefault },
                      ]}
                    >
                      {t("specialist")}: {booking.MarketMember.User.name}
                    </Text>
                  </View>
                )}
                <View style={styles.bookingDateTime}>
                  <IconSymbol
                    name="calendar"
                    size={16}
                    color={colors.tabIconDefault}
                  />
                  <Text
                    style={[
                      styles.bookingDateText,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {new Date(booking.scheduledDate).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.bookingDateTime}>
                  <IconSymbol
                    name="clock"
                    size={16}
                    color={colors.tabIconDefault}
                  />
                  <Text
                    style={[
                      styles.bookingTimeText,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {booking.startTime} - {booking.endTime}
                  </Text>
                </View>
              </View>
              <View style={styles.bookingActions}>
                <Button
                  onPress={() =>
                    handleBookingStatusUpdate(booking.id, "confirmed")
                  }
                  title={t("approve") || "Approve"}
                  variant="primary"
                  disabled={updatingBookingStatus === booking.id}
                  loading={updatingBookingStatus === booking.id}
                  style={styles.approveButton}
                />
                <Button
                  onPress={() =>
                    handleBookingStatusUpdate(booking.id, "cancelled")
                  }
                  title={t("reject") || "Reject"}
                  variant="outline"
                  textColor={colors.errorVariant}
                  disabled={updatingBookingStatus === booking.id}
                  style={styles.rejectButton}
                />
              </View>
            </View>
          ))
        )}
      </ResponsiveCard>
    );
  };

  const renderClientInformation = () => {
    return (
      <ResponsiveCard>
        <TouchableOpacity
          style={styles.clientInfo}
          onPress={() =>
            router.push(`/profile/profile?userId=${order?.Client?.id}`)
          }
          activeOpacity={0.7}
        >
          <View style={styles.clientHeader}>
            <View style={styles.clientMainInfo}>
              <View style={styles.clientAvatarContainer}>
                {order?.Client?.avatarUrl && !avatarImageError ? (
                  <Image
                    source={order?.Client?.avatarUrl?.trim()}
                    style={styles.clientAvatar}
                    contentFit="cover"
                    onError={() => setAvatarImageError(true)}
                  />
                ) : (
                  <View
                    style={[
                      styles.clientAvatarPlaceholder,
                      { backgroundColor: colors.tint },
                    ]}
                  >
                    <Text
                      style={[
                        styles.clientAvatarText,
                        { color: colors.background },
                      ]}
                    >
                      {(order?.Client?.name || t("deletedUser"))
                        ?.charAt(0)
                        ?.toUpperCase() || "?"}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.clientNameContainer}>
                <Text style={[styles.clientName, { color: colors.text }]}>
                  {order?.Client?.name || t("deletedUser")}
                </Text>
                {order?.Client?.verified && (
                  <View style={styles.verifiedBadge}>
                    <IconSymbol
                      name="checkmark.seal.fill"
                      size={14}
                      color={colors.success}
                    />
                    <Text style={[styles.verifiedText, { color: colors.success }]}>
                      {t("verified")}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.clientActionContainer}>
                <IconSymbol
                  name="chevron.right"
                  size={16}
                  color={colors.tabIconDefault}
                />
              </View>
            </View>
          </View>
          {order?.Client?.email && (
            <View style={styles.clientDetails}>
              <View style={styles.clientDetailItem}>
                <IconSymbol
                  name="envelope.fill"
                  size={16}
                  color={colors.tint}
                />
                <Text style={[styles.clientDetailText, { color: colors.text }]}>
                  {order?.Client?.email}
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </ResponsiveCard>
    );
  };

  // Create header and footer (can be used even when order is loading)
  const header = (
    <Header
      title={t("orderDetails")}
      showBackButton={true}
      onBackPress={() => router.back()}
      rightComponent={
        order ? (
          <TouchableOpacity
            onPress={handleShare}
            style={styles.shareButton}
            activeOpacity={0.7}
          >
            <IconSymbol
              name="square.and.arrow.up"
              size={Platform.OS === "android" ? 24 : 20}
              color={colors.tint}
            />
          </TouchableOpacity>
        ) : undefined
      }
    />
  );

  const footer = (
    <Footer>
      <FooterButton
        title={t("startChat")}
        onPress={handleStartChat}
        variant="primary"
      />
    </Footer>
  );

  if (loading || userLoading) {
    return <OrderDetailSkeleton header={header} footer={footer} />;
  }

  if (!order) {
    return (
      <Layout>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            {t("orderNotFound")}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={() => router.back()}
          >
            <Text
              style={[styles.retryButtonText, { color: colors.background }]}
            >
              {t("goBack")}
            </Text>
          </TouchableOpacity>
        </View>
      </Layout>
    );
  }

  return (
    <Layout header={header} footer={footer}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ResponsiveContainer>
          {/* Order Overview */}
          {renderOrderOverview()}
          {/* Media Files */}
          {renderMediaFiles(order?.MediaFiles || [], false)}

          {/* Order Details */}
          {renderOrderDetails()}

          {/* Required Skills */}
          {order?.skills && order.skills.length > 0 && renderRequiredSkills()}

          {/* Available Dates */}
          {order?.availableDates &&
            order.availableDates.length > 0 &&
            renderAvailableDates()}

          {/* Client Information */}
          {order?.Client && renderClientInformation()}

          {/* Change History */}
          {renderChangeHistory()}

          {/* Pending Bookings (only for permanent orders, owner only) */}
          {renderPendingBookings()}

          {/* Reviews Section (only for permanent orders) */}
          {isPermanentOrder && renderReviewsSection()}
        </ResponsiveContainer>
      </ScrollView>

      {/* Image Modal */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedImage(null)}
        >
          <Image
            source={selectedImage || ""}
            style={styles.modalImage}
            contentFit="contain"
          />
        </TouchableOpacity>
      </Modal>

      {/* Feedback Dialog */}
      <FeedbackDialog
        visible={feedbackDialogVisible}
        onClose={handleFeedbackClose}
        onSubmit={handleFeedbackSubmit}
        title={t("reviewTitle")}
        subtitle={t("reviewSubtitle")}
        loading={feedbackLoading}
      />

      {/* Map Modal */}
      {parseLocationCoordinates(order?.location) && (
        <Modal
          visible={showMapModal}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowMapModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <MapViewComponent
              initialLocation={parseLocationCoordinates(order?.location)!}
              onLocationSelect={() => {}}
              onClose={() => setShowMapModal(false)}
              showCurrentLocationButton={false}
              showConfirmButton={false}
            />
          </View>
        </Modal>
      )}

      {/* Skill Description Modal */}
      <SkillDescriptionModal
        visible={showSkillModal}
        skillId={selectedSkillId}
        onClose={() => {
          setShowSkillModal(false);
          setSelectedSkillId(null);
        }}
      />

      {/* Apply Modal */}
      <ApplyModal
        visible={showApplyModal}
        onClose={handleCloseApplyModal}
        order={order}
        onSubmit={handleSubmitApplication}
        loading={applyLoading}
      />

      {/* Check-In Modal (for permanent orders) */}
      <CheckInModal
        visible={showCheckInModal}
        onClose={handleCloseCheckInModal}
        order={order}
        onSubmit={handleSubmitCheckIn}
        loading={checkInLoading}
      />

      {/* Review Modal (for permanent orders) */}
      {isPermanentOrder && (
        <Modal
          visible={showReviewModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowReviewModal(false)}
        >
          <View style={styles.reviewModalOverlay}>
            <View
              style={[
                styles.reviewModalContent,
                { backgroundColor: colors.background },
              ]}
            >
              <View style={styles.reviewModalHeader}>
                <Text style={[styles.reviewModalTitle, { color: colors.text }]}>
                  {editingReviewId
                    ? `${t("edit")} ${t("reviews")?.toLowerCase() || t("submitMarketReview")}`
                    : t("submitMarketReview")}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowReviewModal(false);
                    setReviewRating(0);
                    setReviewComment("");
                    setEditingReviewId(null);
                  }}
                >
                  <IconSymbol name="xmark" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.reviewRatingSection}>
                <Text style={[styles.reviewRatingLabel, { color: colors.text }]}>
                  {t("rating")}
                </Text>
                <View style={styles.reviewStarsContainer}>
                  {[...Array(5)].map((_, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setReviewRating(i + 1)}
                    >
                      <IconSymbol
                        name="star.fill"
                        size={32}
                        color={i < reviewRating ? colors.rating : colors.border}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.reviewCommentSection}>
                <Text style={[styles.reviewCommentLabel, { color: colors.text }]}>
                  {t("comment")} ({t("optional")})
                </Text>
                <TextInput
                  style={[
                    styles.reviewCommentInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  placeholder={t("writeYourReview") || t("writeYourFeedback")}
                  placeholderTextColor={colors.tabIconDefault}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.reviewModalActions}>
                <Button
                  variant="outline"
                  title={t("cancel")}
                  onPress={() => {
                    setShowReviewModal(false);
                    setReviewRating(0);
                    setReviewComment("");
                    setEditingReviewId(null);
                  }}
                  backgroundColor={colors.background}
                  textColor={colors.text}
                />
                <Button
                  variant="primary"
                  title={t("submit")}
                  onPress={handleSubmitReview}
                  backgroundColor={colors.primary}
                  textColor={colors.textInverse}
                  disabled={reviewRating === 0}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    opacity: 0.7,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: "600",
    // Note: Should use colors.textInverse dynamically - consider inline style
    color: "white",
  },
  sectionTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  orderTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    lineHeight: 32,
  },
  orderDescription: {
    marginBottom: 10,
    fontSize: 15,
    lineHeight: 26,
    opacity: 0.9,
  },
  appliedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    marginTop: 20,
  },
  appliedButtonText: {
    fontSize: 12,
    fontWeight: "600",
    // Note: Should use colors.textInverse dynamically - consider inline style
    color: "white",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
    marginTop: 12,
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  detailsContainer: {
    gap: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    marginBottom: 4,
    opacity: 0.7,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  detailValueSmall: {
    fontSize: 12,
    fontWeight: "500",
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  skillTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  skillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  datesContainer: {
    gap: 16,
  },
  dateTimeItem: {
    gap: 8,
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
  },
  timesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginLeft: 24,
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  timeText: {
    fontSize: 10,
    fontWeight: "500",
  },
  allDayText: {
    fontSize: 12,
    fontStyle: "italic",
    marginLeft: 24,
    opacity: 0.7,
  },
  noDatesText: {
    fontSize: 14,
    fontStyle: "italic",
    opacity: 0.7,
  },
  clientInfo: {
    gap: 20,
  },
  clientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  clientMainInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  clientActionContainer: {
    padding: 4,
  },
  clientAvatarContainer: {
    // Note: Should use colors.border or colors.textTertiary dynamically - consider inline style
    backgroundColor: "gray",
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
  },
  clientAvatar: {
    width: "100%",
    height: "100%",
  },
  clientAvatarPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  clientAvatarText: {
    fontSize: 18,
    fontWeight: "700",
  },
  clientNameContainer: {
    flex: 1,
    gap: 6,
  },
  clientName: {
    fontSize: 18,
    fontWeight: "700",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "600",
  },
  clientDetails: {
    gap: 12,
  },
  clientDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  clientDetailText: {
    fontSize: 13,
    fontWeight: "500",
  },
  // Media Files Styles
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  mediaGridItemContainer: {
    width: "30%",
    position: "relative",
  },
  mediaGridItem: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  mediaGridImage: {
    width: "100%",
    height: "100%",
  },
  mediaGridPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  deleteMediaButton: {
    position: "absolute",
    top: -6,
    right: -6,
    // Note: Should use colors.surface dynamically - consider inline style
    backgroundColor: "white",
    borderRadius: 12,
    zIndex: 10,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: "90%",
    height: "90%",
  },
  shareButton: {
    padding: 8,
    marginRight: -8,
  },
  // Change History Styles
  changeHistoryItem: {
    paddingBlock: Spacing.sm,
    borderBottomWidth: 1,
  },
  changeHistoryContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  changeHistoryDetails: {
    flex: 1,
    gap: 6,
  },
  changeValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  changeLabel: {
    fontSize: 11,
    opacity: 0.7,
    minWidth: 40,
  },
  changeValue: {
    fontSize: 12,
    flex: 1,
  },
  changeTimestamp: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
    opacity: 0.8,
  },
  changeChangedBy: {
    fontSize: 10,
    opacity: 0.7,
  },
  changeReason: {
    fontSize: 10,
    fontStyle: "italic",
    marginTop: 2,
    opacity: 0.8,
  },
  changeHistoryConnector: {
    width: 2,
    height: 16,
    marginLeft: 50,
    marginTop: 4,
  },
  emptyHistoryText: {
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 20,
    opacity: 0.7,
    fontStyle: "italic",
  },
  rejectionReasonContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  rejectionReasonLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  rejectionReasonText: {
    fontSize: 12,
    lineHeight: 20,
  },
  // Review Section Styles
  reviewsHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    // Note: This should use colors.rating with opacity, but StyleSheet doesn't support dynamic colors
    // Consider using inline style: backgroundColor: colors.rating + "20"
    backgroundColor: "#FFD70020",
  },
  ratingBadgeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  reviewItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  reviewRating: {
    flexDirection: "row",
    gap: 2,
  },
  reviewHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reviewDate: {
    fontSize: 12,
  },
  editReviewButton: {
    padding: 4,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
  },
  noReviews: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 24,
  },
  // Review Modal Styles
  reviewModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  reviewModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.card,
    maxHeight: "80%",
  },
  reviewModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  reviewModalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  reviewRatingSection: {
    marginBottom: 24,
  },
  reviewRatingLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  reviewStarsContainer: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  reviewCommentSection: {
    marginBottom: 24,
  },
  reviewCommentLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  reviewCommentInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  reviewModalActions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  sectionSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  bookingItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  bookingInfo: {
    marginBottom: 12,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bookingClientName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  bookingDateTime: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  bookingDateText: {
    fontSize: 14,
  },
  bookingTimeText: {
    fontSize: 14,
  },
  bookingActions: {
    flexDirection: "row",
    gap: 8,
  },
  approveButton: {
    flex: 1,
  },
  rejectButton: {
    flex: 1,
  },
});

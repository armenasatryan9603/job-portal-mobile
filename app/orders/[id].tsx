import { Footer, FooterButton } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { useModal } from "@/contexts/ModalContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, { useState, useEffect, useCallback } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
  Modal,
} from "react-native";
import { apiService, Order } from "@/services/api";
import { chatService } from "@/services/chatService";
import { FeedbackDialog } from "@/components/FeedbackDialog";

export default function EditOrderScreen() {
  const { id, myJobs } = useLocalSearchParams();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { user, isLoading: userLoading } = useAuth();
  const { showLoginModal } = useModal();
  const isMyJobs = myJobs === "true";

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [pendingApply, setPendingApply] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Track applied orders (fetched from backend)
  const [appliedOrders, setAppliedOrders] = useState<Set<number>>(new Set());

  // Feedback dialog state
  const [feedbackDialogVisible, setFeedbackDialogVisible] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Helper function to check if user has applied to an order
  const hasAppliedToOrder = (orderId: number): boolean => {
    return appliedOrders.has(orderId);
  };

  // Fetch user's applied orders from backend
  const loadAppliedOrders = async () => {
    if (!user?.id) {
      console.log("No user ID available, skipping applied orders load");
      return;
    }

    try {
      const proposals = await apiService.getProposalsByUser(user.id);
      const appliedOrderIds = new Set<number>(
        proposals.proposals.map((proposal: any) => proposal.orderId)
      );
      setAppliedOrders(appliedOrderIds);
      console.log(
        "Loaded applied orders from backend:",
        Array.from(appliedOrderIds)
      );
    } catch (error) {
      console.error("Error loading applied orders:", error);
    }
  };

  // Load order data
  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        // Get order data (works for both authenticated and non-authenticated users)
        const orderData = await apiService.getOrderById(parseInt(id as string));
        setOrder(orderData);

        // Check if current user is the owner - if so, redirect to create.tsx for editing
        if (user?.id === orderData.clientId) {
          router.replace(`/orders/create?orderId=${id}`);
          return;
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
      Alert.alert("Error", "Failed to start chat. Please try again.");
    }
  };

  const handleSubmitProposal = () => {
    // Check if user is authenticated
    if (!user?.id) {
      showLoginModal();
      return;
    }

    router.push(`/proposals/create?orderId=${id}`);
  };

  const handleApplyToOrder = () => {
    // Check if user is authenticated
    if (!user?.id) {
      setPendingApply(true);
      showLoginModal();
      return;
    }

    // Navigate to proposal creation
    router.push(`/proposals/create?orderId=${id}`);
  };

  const handleFeedbackSubmit = async (
    rating: number,
    feedback: string,
    reasonIds?: number[]
  ) => {
    setFeedbackLoading(true);
    try {
      // Submit feedback for the canceled proposal
      await chatService.submitFeedback({
        orderId: order?.id || 0,
        userId: user?.id,
        rating,
        comment: feedback,
        feedbackType: "canceled",
        reasonIds,
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

  // Handle automatic Apply after login
  useEffect(() => {
    // If user just logged in and we have a pending apply, proceed with it
    if (user?.id && pendingApply && order && !userLoading) {
      setPendingApply(false);
      // Small delay to ensure the page has fully rendered after login
      const timer = setTimeout(() => {
        router.push(`/proposals/create?orderId=${id}`);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [user?.id, pendingApply, order, userLoading, id]);

  // Reusable Media Files Display Component
  const renderMediaFiles = (mediaFiles: any[], canDelete: boolean = false) => {
    if (!mediaFiles || mediaFiles.length === 0) return null;

    const handleDeleteMedia = async (mediaFileId: number) => {
      Alert.alert(
        t("delete"),
        "Are you sure you want to delete this media file?",
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("delete"),
            style: "destructive",
            onPress: async () => {
              try {
                console.log("Deleting media file:", mediaFileId);
                await apiService.deleteMediaFile(mediaFileId);
                console.log("Media file deleted successfully");

                // Reload order to refresh media files
                const orderData = await apiService.getOrderById(
                  parseInt(id as string)
                );
                setOrder(orderData);
                Alert.alert(
                  t("success") || "Success",
                  "Media file deleted successfully"
                );
              } catch (error: any) {
                console.error("Error deleting media file:", error);
                const errorMessage =
                  error?.message || "Failed to delete media file";
                Alert.alert(t("error") || "Error", errorMessage);
              }
            },
          },
        ]
      );
    };

    return (
      <ResponsiveCard>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t("mediaFiles")} ({mediaFiles.length})
        </Text>
        <View style={styles.mediaGrid}>
          {mediaFiles.map((mediaFile) => (
            <View key={mediaFile.id} style={styles.mediaGridItemContainer}>
              <TouchableOpacity
                style={styles.mediaGridItem}
                onPress={() => setSelectedImage(mediaFile.fileUrl)}
              >
                {mediaFile.fileType === "image" ? (
                  <Image
                    source={{ uri: mediaFile.fileUrl }}
                    style={styles.mediaGridImage}
                    resizeMode="cover"
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
                    color="#FF3B30"
                  />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ResponsiveCard>
    );
  };

  if (loading || userLoading) {
    return (
      <Layout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t("loading")}
          </Text>
        </View>
      </Layout>
    );
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

  const header = (
    <Header
      title={t("orderDetails")}
      subtitle={order?.title}
      showBackButton={true}
      onBackPress={() => router.back()}
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

  return (
    <Layout header={header} footer={footer}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ResponsiveContainer>
          {/* View Mode - Show read-only details */}
          <>
            {/* Order Overview */}
            <ResponsiveCard>
              <View style={styles.detailSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("orderOverview")}
                </Text>
                <Text style={[styles.orderTitle, { color: colors.text }]}>
                  {order?.title}
                </Text>
                <Text
                  style={[
                    styles.orderDescription,
                    { color: colors.tabIconDefault },
                  ]}
                >
                  {order?.description}
                </Text>

                {/* Apply Button or Applied Status */}
                {order?.status === "open" && !hasAppliedToOrder(order.id) ? (
                  <TouchableOpacity
                    style={[
                      styles.applyButton,
                      { backgroundColor: colors.tint },
                    ]}
                    onPress={handleApplyToOrder}
                    activeOpacity={0.8}
                  >
                    <IconSymbol
                      name="paperplane.fill"
                      size={16}
                      color="black"
                    />
                    <Text style={styles.applyButtonText}>
                      {t("apply")} ({order.creditCost || 1} {t("credit")})
                    </Text>
                  </TouchableOpacity>
                ) : order?.status === "open" && hasAppliedToOrder(order.id) ? (
                  <View
                    style={[
                      styles.appliedButton,
                      { backgroundColor: colors.tabIconDefault },
                    ]}
                  >
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={16}
                      color="white"
                    />
                    <Text style={styles.appliedButtonText}>{t("applied")}</Text>
                  </View>
                ) : null}

                {/* Cancel Button - Only show for My Jobs */}
                {isMyJobs && order?.Proposals && order.Proposals.length > 0 && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancelProposal}
                    activeOpacity={0.8}
                  >
                    <IconSymbol name="xmark.circle" size={16} color="#FF3B30" />
                    <Text
                      style={[styles.cancelButtonText, { color: "#FF3B30" }]}
                    >
                      {t("cancel")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </ResponsiveCard>

            {/* Order Details */}
            <ResponsiveCard>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("orderDetails")}
              </Text>
              <View style={styles.detailsContainer}>
                <View style={styles.detailItem}>
                  <IconSymbol
                    name="dollarsign.circle.fill"
                    size={20}
                    color={colors.tint}
                  />
                  <View style={styles.detailContent}>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: colors.tabIconDefault },
                      ]}
                    >
                      {t("budget")}
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      ${order?.budget?.toLocaleString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <IconSymbol
                    name="location.fill"
                    size={20}
                    color={colors.tint}
                  />
                  <View style={styles.detailContent}>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: colors.tabIconDefault },
                      ]}
                    >
                      {t("location")}
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {order?.location || t("remote")}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <IconSymbol name="calendar" size={20} color={colors.tint} />
                  <View style={styles.detailContent}>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: colors.tabIconDefault },
                      ]}
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

                {order?.Service && (
                  <View style={styles.detailItem}>
                    <IconSymbol
                      name="briefcase.fill"
                      size={20}
                      color={colors.tint}
                    />
                    <View style={styles.detailContent}>
                      <Text
                        style={[
                          styles.detailLabel,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        {t("service")}
                      </Text>
                      <Text
                        style={[styles.detailValue, { color: colors.text }]}
                      >
                        {order.Service.name}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </ResponsiveCard>

            {/* Required Skills */}
            {order?.skills && order.skills.length > 0 && (
              <ResponsiveCard>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("requiredSkills")}
                </Text>
                <View style={styles.skillsContainer}>
                  {order.skills.map((skill: string, index: number) => (
                    <View
                      key={index}
                      style={[
                        styles.skillTag,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.skillText, { color: colors.text }]}>
                        {skill}
                      </Text>
                    </View>
                  ))}
                </View>
              </ResponsiveCard>
            )}

            {/* Available Dates */}
            {order?.availableDates &&
              order.availableDates.length > 0 &&
              (() => {
                // Parse dates and times from format: {"Sep 26 (12:30",14:30,15:00,15:30),"Sep 27 (14:30)","Sep 22"}
                const parseDates = (dateString: string) => {
                  const cleanString = dateString.replace(/^[{"']|["'}]$/g, "");
                  const dates = cleanString.match(/Sep \d+/g) || [];

                  return dates.map((date) => {
                    const dateIndex = cleanString.indexOf(date);
                    const nextDateIndex = cleanString.indexOf(
                      "Sep",
                      dateIndex + 1
                    );
                    const endIndex =
                      nextDateIndex === -1 ? cleanString.length : nextDateIndex;
                    const dateSection = cleanString.substring(
                      dateIndex,
                      endIndex
                    );
                    const times = dateSection.match(/\d{1,2}:\d{2}/g) || [];

                    return { date, times };
                  });
                };

                // Parse all available dates
                const allDateTimes = order.availableDates
                  .filter((dateStr) => dateStr && dateStr.trim() !== "")
                  .flatMap((dateStr) => parseDates(dateStr));

                // Only show if there are valid dates
                return allDateTimes.length > 0 ? (
                  <ResponsiveCard>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {t("availableDates")}
                    </Text>
                    <View style={styles.datesContainer}>
                      {allDateTimes.map((dateTime, index) => (
                        <View key={index} style={styles.dateTimeItem}>
                          <View style={styles.dateHeader}>
                            <IconSymbol
                              name="calendar"
                              size={16}
                              color={colors.tint}
                            />
                            <Text
                              style={[styles.dateText, { color: colors.text }]}
                            >
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
                                  <IconSymbol
                                    name="clock"
                                    size={12}
                                    color={colors.tint}
                                  />
                                  <Text
                                    style={[
                                      styles.timeText,
                                      { color: colors.tint },
                                    ]}
                                  >
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
              })()}

            {/* Media Files */}
            {renderMediaFiles(order?.MediaFiles || [], false)}

            {/* Client Information */}
            {order?.Client && (
              <ResponsiveCard>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t("clientInformation")}
                </Text>
                <TouchableOpacity
                  style={styles.clientInfo}
                  onPress={() =>
                    router.push(`/profile/profile?userId=${order.Client.id}`)
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.clientHeader}>
                    <View style={styles.clientMainInfo}>
                      <View style={styles.clientAvatarContainer}>
                        {order.Client.avatarUrl ? (
                          <Image
                            source={{ uri: order.Client.avatarUrl }}
                            style={styles.clientAvatar}
                            resizeMode="cover"
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
                              {order.Client.name?.charAt(0)?.toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.clientNameContainer}>
                        <Text
                          style={[styles.clientName, { color: colors.text }]}
                        >
                          {order.Client.name}
                        </Text>
                        {order.Client.verified && (
                          <View style={styles.verifiedBadge}>
                            <IconSymbol
                              name="checkmark.seal.fill"
                              size={14}
                              color="#4CAF50"
                            />
                            <Text
                              style={[
                                styles.verifiedText,
                                { color: "#4CAF50" },
                              ]}
                            >
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
                  {order.Client.email && (
                    <View style={styles.clientDetails}>
                      <View style={styles.clientDetailItem}>
                        <IconSymbol
                          name="envelope.fill"
                          size={16}
                          color={colors.tint}
                        />
                        <Text
                          style={[
                            styles.clientDetailText,
                            { color: colors.text },
                          ]}
                        >
                          {order.Client.email}
                        </Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              </ResponsiveCard>
            )}
          </>
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
            source={{ uri: selectedImage || "" }}
            style={styles.modalImage}
            resizeMode="contain"
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
    fontSize: 16,
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
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
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  // View Mode Styles
  detailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },
  orderTitle: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 12,
    lineHeight: 32,
  },
  orderDescription: {
    fontSize: 17,
    lineHeight: 26,
    opacity: 0.9,
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    marginTop: 20,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "black",
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
    fontSize: 14,
    fontWeight: "600",
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
    fontSize: 14,
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
    fontSize: 15,
    marginBottom: 4,
    opacity: 0.7,
  },
  detailValue: {
    fontSize: 17,
    fontWeight: "700",
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
    fontSize: 14,
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
    fontSize: 16,
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
    fontSize: 12,
    fontWeight: "500",
  },
  allDayText: {
    fontSize: 14,
    fontStyle: "italic",
    marginLeft: 24,
    opacity: 0.7,
  },
  noDatesText: {
    fontSize: 16,
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
    fontSize: 20,
    fontWeight: "700",
  },
  clientNameContainer: {
    flex: 1,
    gap: 6,
  },
  clientName: {
    fontSize: 20,
    fontWeight: "700",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  verifiedText: {
    fontSize: 14,
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
    fontSize: 15,
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
});

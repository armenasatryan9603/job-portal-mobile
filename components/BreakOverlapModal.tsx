import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { BorderRadius, Spacing, ThemeColors } from "@/constants/styles";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Button } from "@/components/ui/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTranslation } from "@/contexts/TranslationContext";

interface Booking {
  id: number;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: string;
  Client?: {
    id: number;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

interface BreakOverlapModalProps {
  visible: boolean;
  overlappingBookings: Booking[];
  onOverlap: () => void;
  onMakePriority: () => void;
  onCancel: () => void;
}

export const BreakOverlapModal: React.FC<BreakOverlapModalProps> = ({
  visible,
  overlappingBookings,
  onOverlap,
  onMakePriority,
  onCancel,
}) => {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { t } = useTranslation();

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerIconContainer}>
              <IconSymbol
                name="exclamationmark.triangle.fill"
                size={24}
                color={colors.errorVariant}
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {t("breaksOverlapWithBookings") || "Breaks Overlap with Existing Bookings"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
              {t("breaksOverlapDescription") ||
                "Some breaks overlap with existing bookings. Choose how to handle this:"}
            </Text>
          </View>

          <ScrollView style={styles.bookingsList} showsVerticalScrollIndicator={false}>
            {overlappingBookings.map((booking) => (
              <View
                key={booking.id}
                style={[
                  styles.bookingCard,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.bookingHeader}>
                  <IconSymbol
                    name="calendar"
                    size={20}
                    color={colors.primary}
                  />
                  <View style={styles.bookingInfo}>
                    <Text style={[styles.bookingDate, { color: colors.text }]}>
                      {formatDate(booking.scheduledDate)}
                    </Text>
                    <Text style={[styles.bookingTime, { color: colors.tabIconDefault }]}>
                      {booking.startTime} - {booking.endTime}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          booking.status === "confirmed"
                            ? colors.primary + "20"
                            : colors.tabIconDefault + "20",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            booking.status === "confirmed"
                              ? colors.primary
                              : colors.tabIconDefault,
                        },
                      ]}
                    >
                      {booking.status === "confirmed"
                        ? t("confirmed") || "Confirmed"
                        : t("pending") || "Pending"}
                    </Text>
                  </View>
                </View>
                {booking.Client && (
                  <View style={styles.clientInfo}>
                    <IconSymbol
                      name="person.circle.fill"
                      size={16}
                      color={colors.tabIconDefault}
                    />
                    <Text style={[styles.clientName, { color: colors.tabIconDefault }]}>
                      {booking.Client.name}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={onCancel}
              style={styles.cancelButton}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelButtonText, { color: colors.tabIconDefault }]}>
                {t("cancel")}
              </Text>
            </TouchableOpacity>

            <View style={styles.mainActions}>
              <Button
                variant="outline"
                title={t("overlap") || "Overlap"}
                onPress={onOverlap}
                style={{ flex: 1 }}
                icon="exclamationmark.circle"
                iconSize={16}
              />
              <Button
                variant="primary"
                title={t("makePriority") || "Make Priority"}
                onPress={onMakePriority}
                style={{ flex: 1 }}
                icon="star.fill"
                iconSize={16}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  headerIconContainer: {
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    opacity: 0.8,
  },
  bookingsList: {
    maxHeight: 300,
    marginBottom: Spacing.lg,
  },
  bookingCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  bookingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  bookingInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  bookingDate: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  bookingTime: {
    fontSize: 13,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  clientInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
    paddingLeft: 28,
  },
  clientName: {
    fontSize: 13,
    marginLeft: Spacing.xs,
  },
  actions: {
    gap: Spacing.md,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  mainActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
});

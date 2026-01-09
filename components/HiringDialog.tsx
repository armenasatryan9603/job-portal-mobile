import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemeColors } from "@/constants/styles";
import { apiService } from "@/services/api";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "./ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRateUnits } from "@/hooks/useRateUnits";
import { formatPriceDisplay } from "@/utils/currencyRateUnit";

interface HiringDialogProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (message: string, orderId: number) => Promise<void>;
  specialistName: string;
  specialistId: number;
  userOrders: any[];
  loading?: boolean;
}

export function HiringDialog({
  visible,
  onClose,
  onSubmit,
  specialistName,
  specialistId,
  userOrders,
  loading = false,
}: HiringDialogProps) {
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { data: rateUnitsData } = useRateUnits();
  const rateUnits = rateUnitsData || [];
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  const [message, setMessage] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isAlreadyHired, setIsAlreadyHired] = useState(false);
  const [hiringStatusMessage, setHiringStatusMessage] = useState("");
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Check hiring status when order is selected
  useEffect(() => {
    if (selectedOrderId && specialistId) {
      checkHiringStatus();
    } else {
      setIsAlreadyHired(false);
      setHiringStatusMessage("");
    }
  }, [selectedOrderId, specialistId]);

  // Handle keyboard show/hide to scroll to input
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        // Scroll to bottom (where input is) when keyboard appears
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    return () => {
      keyboardWillShow.remove();
    };
  }, []);

  const checkHiringStatus = async () => {
    if (!selectedOrderId || !specialistId) return;

    try {
      setCheckingStatus(true);
      const result = await apiService.checkHiringStatus({
        specialistId,
        orderId: selectedOrderId,
      });

      setIsAlreadyHired(result.isAlreadyHired);
      setHiringStatusMessage(result.message);
    } catch (error) {
      console.error("Error checking hiring status:", error);
      setIsAlreadyHired(false);
      setHiringStatusMessage("");
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert(t("error"), t("pleaseEnterMessage"));
      return;
    }

    if (!selectedOrderId) {
      Alert.alert(t("error"), t("pleaseSelectOrder"));
      return;
    }

    try {
      await onSubmit(message.trim(), selectedOrderId);
      setMessage("");
      setSelectedOrderId(null);
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleClose = () => {
    setMessage("");
    setSelectedOrderId(null);
    setIsAlreadyHired(false);
    setHiringStatusMessage("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t("hireSpecialist")}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={
            Platform.OS === "ios" ? insets.top + 50 : 20 + insets.top
          }
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.contentScrollView}
              contentContainerStyle={[
                styles.content,
                { paddingBottom: Math.max(insets.bottom, 100) },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.specialistInfo}>
                <Text style={[styles.specialistName, { color: colors.text }]}>
                  {t("hiringSpecialist")} {specialistName}
                </Text>
              </View>

              <View style={styles.orderSection}>
                <Text style={[styles.orderLabel, { color: colors.text }]}>
                  {t("selectOrder")} (
                  {userOrders.filter((order) => order.status === "open").length}
                  )
                </Text>
                <ScrollView
                  style={styles.orderScrollView}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.orderList}>
                    {userOrders
                      .filter((order) => order.status === "open")
                      .map((order) => (
                        <TouchableOpacity
                          key={order.id}
                          style={[
                            styles.orderItem,
                            {
                              backgroundColor:
                                selectedOrderId === order.id
                                  ? colors.tint + "15"
                                  : "transparent",
                              borderColor:
                                selectedOrderId === order.id
                                  ? colors.tint
                                  : colors.border,
                            },
                          ]}
                          onPress={() => setSelectedOrderId(order.id)}
                        >
                          <View style={styles.orderContent}>
                            <View style={styles.orderTitleRow}>
                              <Text
                                style={[
                                  styles.orderTitle,
                                  { color: colors.text },
                                ]}
                              >
                                {order.title}
                              </Text>
                              <Text
                                style={[
                                  styles.orderCost,
                                  { color: colors.tabIconDefault },
                                ]}
                              >
                                {formatPriceDisplay(
                                  order.budget,
                                  order.currency,
                                  order.rateUnit,
                                  rateUnits,
                                  language,
                                  {
                                    defaultCurrency: "USD",
                                    defaultRateUnit: "per project",
                                  }
                                )}
                              </Text>
                            </View>
                          </View>
                          {selectedOrderId === order.id && (
                            <IconSymbol
                              name="checkmark"
                              size={16}
                              color={colors.tint}
                              style={styles.checkIcon}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                  </View>
                </ScrollView>
              </View>

              {/* Hiring Status Message */}
              {selectedOrderId && (
                <View style={styles.statusSection}>
                  {checkingStatus ? (
                    <View style={styles.statusContainer}>
                      <ActivityIndicator size="small" color={colors.tint} />
                      <Text style={[styles.statusText, { color: colors.text }]}>
                        {t("checkingHiringStatus")}
                      </Text>
                    </View>
                  ) : hiringStatusMessage ? (
                    <View style={styles.statusContainer}>
                      <IconSymbol
                        name={
                          isAlreadyHired
                            ? "exclamationmark.triangle"
                            : "checkmark.circle"
                        }
                        size={16}
                        color={isAlreadyHired ? "#FF6B6B" : "#4CAF50"}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: isAlreadyHired ? "#FF6B6B" : "#4CAF50",
                          },
                        ]}
                      >
                        {hiringStatusMessage}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}

              <View style={styles.messageSection}>
                <TextInput
                  ref={textInputRef}
                  style={[
                    styles.messageInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder={t("writeYourMessage")}
                  placeholderTextColor={colors.tabIconDefault}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  onFocus={() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }}
                />
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button
            title={t("cancel")}
            onPress={handleClose}
            disabled={loading}
            variant="secondary"
          />

          <Button
            title={t("sendHiringRequest")}
            onPress={handleSubmit}
            disabled={
              loading || !message.trim() || !selectedOrderId || isAlreadyHired
            }
            loading={loading}
            variant="primary"
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  placeholder: {
    width: 32,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentScrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  specialistInfo: {
    marginBottom: 20,
  },
  specialistName: {
    fontSize: 18,
    fontWeight: "600",
  },
  orderSection: {
    marginBottom: 20,
  },
  orderLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
  },
  orderScrollView: {
    maxHeight: 200,
  },
  orderList: {
    gap: 6,
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  orderContent: {
    flex: 1,
  },
  orderTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderTitle: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
    marginRight: 8,
  },
  orderCost: {
    fontSize: 13,
    fontWeight: "600",
  },
  checkIcon: {
    marginLeft: 8,
  },
  messageSection: {
    marginBottom: 20,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
  },
  footer: {
    justifyContent: "center",
    flexDirection: "row",
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === "ios" ? 20 : 16,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  footerButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
  statusSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
});

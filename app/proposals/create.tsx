import { Footer, FooterButton } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useTranslation } from "@/contexts/TranslationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { useRateUnits, RateUnit } from "@/hooks/useRateUnits";
import { formatPriceDisplay } from "@/utils/currencyRateUnit";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiService } from "@/services/api";
import AnalyticsService from "@/services/AnalyticsService";
import { useAnalytics } from "@/hooks/useAnalytics";

// Dummy data for the order being applied to
const dummyOrderData = {
  1: {
    id: 1,
    title: "E-commerce Website Development",
    description:
      "Need a full-stack e-commerce website with payment integration and admin panel. The website should include user authentication, product catalog, shopping cart, checkout process, and an admin dashboard for managing products, orders, and customers.",
    budget: 5000,
    currency: "USD",
    rateUnit: "per project",
    location: "Remote",
    skills: ["React", "Node.js", "MongoDB", "Stripe", "Express", "JWT"],
    availableDates: ["2024-01-15", "2024-01-20", "2024-01-25"],
    clientName: "John Smith",
    serviceName: "Web Development",
  },
  2: {
    id: 2,
    title: "Mobile App for Food Delivery",
    description:
      "Looking for a React Native developer to create a food delivery app with real-time tracking, payment integration, and push notifications. The app should work on both iOS and Android platforms.",
    budget: 8000,
    currency: "USD",
    rateUnit: "per project",
    location: "New York, NY",
    skills: [
      "React Native",
      "Firebase",
      "Maps API",
      "Stripe",
      "Push Notifications",
    ],
    availableDates: ["2024-01-18", "2024-01-22"],
    clientName: "Sarah Johnson",
    serviceName: "Mobile App Development",
  },
};

// Dummy specialist profile data
const dummySpecialistProfile = {
  id: 1,
  name: "Alex Johnson",
  title: "Senior Full-Stack Developer",
  experienceYears: 8,
  priceMin: 80,
  priceMax: 150,
  skills: ["React", "Node.js", "TypeScript", "MongoDB", "AWS", "Docker"],
  rating: 4.9,
  completedProjects: 45,
};

export default function CreateProposalScreen() {
  useAnalytics("CreateProposal");
  const { orderId } = useLocalSearchParams();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];
  const { data: rateUnitsData } = useRateUnits();
  const rateUnits: RateUnit[] = rateUnitsData || [];

  const orderIdNum = parseInt(orderId as string);
  const order = dummyOrderData[orderIdNum as keyof typeof dummyOrderData];

  const [formData, setFormData] = useState({
    price: "",
    message: "",
    estimatedDuration: "",
    availableStartDate: "",
    relevantExperience: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!order) {
    return (
      <Layout header={<Header title={t("orderNotFound")} />} footer={null}>
        <ResponsiveContainer>
          <ResponsiveCard>
            <Text style={[styles.errorText, { color: colors.text }]}>
              {t("orderNotFound")}
            </Text>
          </ResponsiveCard>
        </ResponsiveContainer>
      </Layout>
    );
  }

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.price || parseFloat(formData.price) <= 0) {
      Alert.alert(t("error"), t("pleaseEnterValidPrice"));
      return;
    }
    if (!formData.message.trim()) {
      Alert.alert(t("error"), t("pleaseEnterProposalMessage"));
      return;
    }
    if (!formData.estimatedDuration.trim()) {
      Alert.alert(t("error"), t("pleaseProvideEstimatedDuration"));
      return;
    }

    setIsSubmitting(true);

    try {
      // Create proposal using real API
      const proposalData = {
        orderId: orderIdNum,
        price: Number(formData.price),
        message: formData.message.trim(),
        // Add additional fields if needed
        // specialistProfileId: currentUser.specialistProfileId,
        // userId: currentUser.id,
      };

      const result = await apiService.createProposal(proposalData);

      // Track proposal submitted
      AnalyticsService.getInstance().logProposalSubmitted(
        orderIdNum.toString(),
        result.id?.toString() || "pending"
      );

      // Proposal submitted successfully
      router.replace(`/orders/${orderId}`);
    } catch (error) {
      console.error("Error creating proposal:", error);
      Alert.alert(t("error"), t("failedToSubmitProposal"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const header = (
    <Header
      title={t("submitProposal")}
      subtitle={`${t("applyFor")}: ${order.title}`}
      showBackButton={true}
      onBackPress={handleCancel}
    />
  );

  const footer = (
    <View>
      <Footer>
        <FooterButton
          title={t("submitProposal")}
          onPress={handleSubmit}
          variant="primary"
          disabled={isSubmitting}
        />
        <FooterButton
          title={t("cancel")}
          onPress={handleCancel}
          variant="secondary"
        />
      </Footer>
    </View>
  );

  return (
    <Layout header={header} footer={footer}>
      <ScrollView style={{ flex: 1 }}>
        <ResponsiveContainer>
          {/* Order Summary */}
          <ResponsiveCard>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Job Details
            </Text>

            <View style={styles.orderSummary}>
              <Text style={[styles.orderTitle, { color: colors.text }]}>
                {order.title}
              </Text>
              <Text
                style={[
                  styles.orderDescription,
                  { color: colors.tabIconDefault },
                ]}
              >
                {order.description}
              </Text>

              <View style={styles.orderDetails}>
                <View style={styles.detailRow}>
                  <IconSymbol
                    name="dollarsign.circle.fill"
                    size={16}
                    color={colors.tint}
                  />
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    Budget:{" "}
                    {formatPriceDisplay(
                      order.budget,
                      order.currency,
                      order.rateUnit,
                      rateUnits,
                      language
                    )}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <IconSymbol
                    name="location.fill"
                    size={16}
                    color={colors.tint}
                  />
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    Location: {order.location}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <IconSymbol
                    name="person.fill"
                    size={16}
                    color={colors.tint}
                  />
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    Client: {order.clientName}
                  </Text>
                </View>
              </View>

              <View style={styles.skillsSection}>
                <Text style={[styles.skillsTitle, { color: colors.text }]}>
                  Required Skills:
                </Text>
                <View style={styles.skillsContainer}>
                  {order.skills.map((skill, index) => (
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
              </View>
            </View>
          </ResponsiveCard>

          {/* Your Profile Summary */}
          <ResponsiveCard>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Your Profile
            </Text>

            <View style={styles.profileSummary}>
              <View style={styles.profileHeader}>
                <Text style={[styles.profileName, { color: colors.text }]}>
                  {dummySpecialistProfile.name}
                </Text>
                <Text style={[styles.profileTitle, { color: colors.tint }]}>
                  {dummySpecialistProfile.title}
                </Text>
              </View>

              <View style={styles.profileStats}>
                <View style={styles.statItem}>
                  <IconSymbol name="star.fill" size={16} color="#FFD700" />
                  <Text style={[styles.statText, { color: colors.text }]}>
                    {dummySpecialistProfile.rating} rating
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <IconSymbol
                    name="briefcase.fill"
                    size={16}
                    color={colors.tint}
                  />
                  <Text style={[styles.statText, { color: colors.text }]}>
                    {dummySpecialistProfile.completedProjects} projects
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <IconSymbol name="clock.fill" size={16} color={colors.tint} />
                  <Text style={[styles.statText, { color: colors.text }]}>
                    {dummySpecialistProfile.experienceYears} years experience
                  </Text>
                </View>
              </View>

              <View style={styles.pricingInfo}>
                <Text style={[styles.pricingText, { color: colors.text }]}>
                  Your rate: ${dummySpecialistProfile.priceMin}-$
                  {dummySpecialistProfile.priceMax}/hr
                </Text>
              </View>
            </View>
          </ResponsiveCard>

          {/* Proposal Form */}
          <ResponsiveCard>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Your Proposal
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {t("yourPrice")} ({order.currency || "USD"}) *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={formData.price}
                onChangeText={(value) => updateField("price", value)}
                placeholder={t("pricePlaceholder")}
                placeholderTextColor={colors.tabIconDefault}
                keyboardType="numeric"
              />
              <Text
                style={[styles.helperText, { color: colors.tabIconDefault }]}
              >
                Client budget:{" "}
                {formatPriceDisplay(
                  order.budget,
                  order.currency,
                  order.rateUnit,
                  rateUnits,
                  language
                )}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Estimated Duration *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={formData.estimatedDuration}
                onChangeText={(value) =>
                  updateField("estimatedDuration", value)
                }
                placeholder={t("durationPlaceholder")}
                placeholderTextColor={colors.tabIconDefault}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Available Start Date
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={formData.availableStartDate}
                onChangeText={(value) =>
                  updateField("availableStartDate", value)
                }
                placeholder={t("startDatePlaceholder")}
                placeholderTextColor={colors.tabIconDefault}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Relevant Experience
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={formData.relevantExperience}
                onChangeText={(value) =>
                  updateField("relevantExperience", value)
                }
                placeholder={t("experiencePlaceholder")}
                placeholderTextColor={colors.tabIconDefault}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Proposal Message *
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={formData.message}
                onChangeText={(value) => updateField("message", value)}
                placeholder={t("proposalMessagePlaceholder")}
                placeholderTextColor={colors.tabIconDefault}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>
          </ResponsiveCard>

          {/* Tips */}
          <ResponsiveCard>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Tips
            </Text>
            <View style={styles.tipsList}>
              <Text style={[styles.tipText, { color: colors.text }]}>
                • Address specific requirements • Highlight relevant experience
                • Provide clear timeline • Be professional
              </Text>
            </View>
          </ResponsiveCard>
        </ResponsiveContainer>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  errorText: {
    fontSize: 18,
    textAlign: "center",
    marginVertical: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 20,
  },
  orderSummary: {
    gap: 15,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  orderDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  orderDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontWeight: "500",
  },
  skillsSection: {
    marginTop: 10,
  },
  skillsTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  skillTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  skillText: {
    fontSize: 12,
    fontWeight: "500",
  },
  profileSummary: {
    gap: 12,
  },
  profileHeader: {
    gap: 4,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "600",
  },
  profileTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  profileStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 12,
    fontWeight: "500",
  },
  pricingInfo: {
    marginTop: 8,
  },
  pricingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },
  tipsList: {
    gap: 8,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

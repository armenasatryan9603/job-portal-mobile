import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import {
  ResponsiveCard,
  ResponsiveContainer,
} from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useTranslation } from "@/contexts/TranslationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Alert,
} from "react-native";

export default function ProfileHelpScreen() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const colors = ThemeColors[isDark ? "dark" : "light"];
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleContactSupport = (type: string) => {
    switch (type) {
      case "email":
        Linking.openURL("mailto:support@jobportal.com?subject=Support Request");
        break;
      case "phone":
        Linking.openURL("tel:+37477754955");
        break;
      case "website":
        Linking.openURL("https://job-portal-web-site-bay.vercel.app");
        break;
      default:
        Alert.alert(t("contactSupport"), t("chooseContactMethod"));
    }
  };

  const header = (
    <Header
      title={t("help")}
      subtitle={t("getHelpAndContactSupport")}
      showBackButton={true}
      onBackPress={() => router.back()}
    />
  );

  const helpSections = [
    {
      title: t("gettingStarted"),
      items: [
        {
          title: t("howToCreateAccount"),
          description: t("learnHowToSetupProfile"),
        },
        {
          title: t("findingServices"),
          description: t("discoverAvailableServices"),
        },
        {
          title: t("makingFirstOrder"),
          description: t("stepByStepGuideToOrdering"),
        },
        {
          title: t("appPermissions"),
          description: t("understandRequiredPermissions"),
        },
      ],
    },
    {
      title: t("accountAndProfile"),
      items: [
        {
          title: t("updatingYourProfile"),
          description: t("keepYourInformationCurrent"),
        },
        {
          title: t("privacySettings"),
          description: t("controlWhoCanSeeYourInfo"),
        },
        {
          title: t("accountSecurity"),
          description: t("keepYourAccountSafe"),
        },
        {
          title: t("dataExport"),
          description: t("downloadYourData"),
        },
        {
          title: t("accountDeletion"),
          description: t("permanentlyDeleteAccount"),
        },
      ],
    },
    {
      title: t("ordersAndPayments"),
      items: [
        {
          title: t("trackingYourOrders"),
          description: t("monitorOrderProgress"),
        },
        {
          title: t("paymentMethods"),
          description: t("addAndManagePaymentOptions"),
        },
        {
          title: t("creditSystem"),
          description: t("understandCreditUsage"),
        },
        {
          title: t("orderCancellation"),
          description: t("cancelOrdersAndApplications"),
        },
      ],
    },
    {
      title: t("legalAndCompliance"),
      items: [
        {
          title: t("privacyPolicy"),
          description: t("howWeProtectYourData"),
        },
        {
          title: t("termsOfService"),
          description: t("userAgreementAndRules"),
        },
        {
          title: t("cookiePolicy"),
          description: t("howWeUseCookies"),
        },
        {
          title: t("gdprCompliance"),
          description: t("europeanDataProtection"),
        },
      ],
    },
  ];

  const contactOptions = [
    {
      title: t("emailSupport"),
      description: t("getHelpViaEmail"),
      icon: "envelope.fill",
      action: t("sendEmail"),
      type: "email",
    },
    {
      title: t("phoneSupport"),
      description: t("callForImmediateHelp"),
      icon: "phone.fill",
      action: t("callNow"),
      type: "phone",
    },
    {
      title: t("websiteSupport"),
      description: t("visitOurSupportCenter"),
      icon: "globe",
      action: t("visitWebsite"),
      type: "website",
    },
  ];

  const faqData = [
    {
      question: t("howDoIUpdateProfile"),
      answer: t("profileUpdateInstructions"),
    },
    {
      question: t("whatPaymentMethodsDoYouAccept"),
      answer: t("acceptedPaymentMethods"),
    },
    {
      question: t("howCanICancelOrder"),
      answer: t("orderCancellationProcess"),
    },
    {
      question: t("isMyPersonalInformationSecure"),
      answer: t("dataSecurityExplanation"),
    },
    {
      question: t("howDoIDeleteMyAccount"),
      answer: t("accountDeletionProcess"),
    },
    {
      question: t("whatAreTheAppPermissions"),
      answer: t("appPermissionsExplanation"),
    },
    {
      question: t("howDoIReportABug"),
      answer: t("bugReportingProcess"),
    },
    {
      question: t("howDoCreditsWork"),
      answer: t("creditSystemExplanation"),
    },
  ];

  return (
    <Layout header={header}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
          {/* Quick Help */}
          <ResponsiveCard>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("quickHelp")}
            </Text>
            <Text
              style={[
                styles.sectionDescription,
                { color: colors.textSecondary },
              ]}
            >
              {t("findAnswersToCommonQuestions")}
            </Text>
          </ResponsiveCard>

          {/* Help Sections */}
          {helpSections.map((section, sectionIndex) => (
            <ResponsiveCard key={sectionIndex}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {section.title}
              </Text>
              <View style={styles.helpItems}>
                {section.items.map((item, itemIndex) => (
                  <TouchableOpacity
                    key={itemIndex}
                    style={[
                      styles.helpItem,
                      { borderBottomColor: colors.border },
                      itemIndex === section.items.length - 1 && {
                        borderBottomWidth: 0,
                      },
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: "/profile/help/[id]",
                        params: {
                          id: `${sectionIndex}-${itemIndex}`,
                          title: item.title,
                          description: item.description,
                          sectionTitle: section.title,
                        },
                      })
                    }
                  >
                    <View style={styles.helpItemContent}>
                      <Text
                        style={[styles.helpItemTitle, { color: colors.text }]}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={[
                          styles.helpItemDescription,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {item.description}
                      </Text>
                    </View>
                    <IconSymbol
                      name="chevron.right"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </ResponsiveCard>
          ))}

          {/* Contact Support */}
          <ResponsiveCard>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("contactSupport")}
            </Text>
            <Text
              style={[
                styles.sectionDescription,
                { color: colors.textSecondary },
              ]}
            >
              {t("needMoreHelpReachOut")}
            </Text>

            <View style={styles.contactOptions}>
              {contactOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.contactOption,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => handleContactSupport(option.type)}
                >
                  <View style={styles.contactOptionContent}>
                    <IconSymbol
                      name={option.icon as any}
                      size={24}
                      color={colors.primary}
                    />
                    <View style={styles.contactOptionText}>
                      <Text
                        style={[
                          styles.contactOptionTitle,
                          { color: colors.text },
                        ]}
                      >
                        {option.title}
                      </Text>
                      <Text
                        style={[
                          styles.contactOptionDescription,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {option.description}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.contactOptionAction,
                      { color: colors.primary },
                    ]}
                  >
                    {option.action}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ResponsiveCard>

          {/* FAQ */}
          <ResponsiveCard style={{ marginBottom: 110 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("frequentlyAskedQuestions")}
            </Text>

            {faqData.map((faq, index) => (
              <View key={index}>
                <TouchableOpacity
                  style={[
                    styles.faqItem,
                    index === faqData.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() =>
                    setExpandedFaq(expandedFaq === index ? null : index)
                  }
                >
                  <Text style={[styles.faqQuestion, { color: colors.text }]}>
                    {faq.question}
                  </Text>
                  <IconSymbol
                    name={expandedFaq === index ? "chevron.up" : "chevron.down"}
                    size={16}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
                {expandedFaq === index && (
                  <View style={styles.faqAnswer}>
                    <Text
                      style={[
                        styles.faqAnswerText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {faq.answer}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </ResponsiveCard>
        </ResponsiveContainer>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  helpItems: {
    gap: 0,
  },
  helpItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  helpItemContent: {
    flex: 1,
  },
  helpItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  helpItemDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  contactOptions: {
    gap: 12,
    marginTop: 16,
  },
  contactOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  contactOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  contactOptionText: {
    flex: 1,
  },
  contactOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  contactOptionDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  contactOptionAction: {
    fontSize: 14,
    fontWeight: "600",
  },
  faqItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  faqAnswerText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

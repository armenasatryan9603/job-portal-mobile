import { Header } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { ResponsiveCard } from "@/components/ResponsiveContainer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeColors } from "@/constants/styles";
import { useTranslation } from "@/contexts/TranslationContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Dummy data for order proposals
const dummyProposals = [
  {
    id: 1,
    orderId: 1,
    specialistProfileId: 1,
    userId: 1,
    price: 4500,
    message:
      "I have extensive experience building e-commerce platforms with React and Node.js. I've completed similar projects for 5+ clients and can deliver a high-quality solution within your timeline. I'm particularly skilled with Stripe integration and can implement advanced features like inventory management and analytics dashboard.",
    status: "pending",
    createdAt: "2024-01-12",
    estimatedDuration: "2-3 weeks",
    availableStartDate: "2024-01-20",
    relevantExperience:
      "Built 3 e-commerce platforms, 5+ years React/Node.js experience, Stripe certified developer",
    specialist: {
      id: 1,
      name: "Alex Johnson",
      title: "Senior Full-Stack Developer",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      rating: 4.9,
      reviewCount: 127,
      experienceYears: 8,
      priceMin: 80,
      priceMax: 150,
      location: "San Francisco, CA",
      completedProjects: 45,
      skills: ["React", "Node.js", "TypeScript", "MongoDB", "AWS", "Docker"],
    },
  },
  {
    id: 2,
    orderId: 1,
    specialistProfileId: 2,
    userId: 2,
    price: 4200,
    message:
      "Hello! I'm excited about this e-commerce project. I specialize in modern web development and have built several successful e-commerce sites. I can provide a clean, responsive design with excellent user experience. My approach includes thorough testing and documentation.",
    status: "pending",
    createdAt: "2024-01-11",
    estimatedDuration: "3-4 weeks",
    availableStartDate: "2024-01-18",
    relevantExperience:
      "E-commerce specialist, 4 years experience, Shopify and custom solutions",
    specialist: {
      id: 2,
      name: "Sarah Chen",
      title: "Full-Stack Developer",
      avatar:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      rating: 4.8,
      reviewCount: 89,
      experienceYears: 6,
      priceMin: 70,
      priceMax: 120,
      location: "New York, NY",
      completedProjects: 32,
      skills: ["React", "Vue.js", "Node.js", "PostgreSQL", "Stripe"],
    },
  },
  {
    id: 3,
    orderId: 1,
    specialistProfileId: 3,
    userId: 3,
    price: 4800,
    message:
      "I have a strong background in e-commerce development and can deliver a robust solution. I'll focus on performance optimization and security best practices. I'm available to start immediately and can provide regular updates throughout the development process.",
    status: "pending",
    createdAt: "2024-01-10",
    estimatedDuration: "2 weeks",
    availableStartDate: "2024-01-15",
    relevantExperience:
      "Senior developer, 7 years experience, e-commerce expert, security specialist",
    specialist: {
      id: 3,
      name: "Mike Rodriguez",
      title: "Senior Web Developer",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      rating: 4.9,
      reviewCount: 156,
      experienceYears: 7,
      priceMin: 90,
      priceMax: 140,
      location: "Austin, TX",
      completedProjects: 67,
      skills: ["React", "Node.js", "MongoDB", "AWS", "Docker", "Security"],
    },
  },
];

export default function OrderProposalsScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = ThemeColors[colorScheme ?? "light"];

  const orderId = parseInt(id as string);
  const [selectedProposal, setSelectedProposal] = useState<number | null>(null);

  const proposals = dummyProposals.filter((p) => p.orderId === orderId);

  const handleAcceptProposal = (proposalId: number) => {
    Alert.alert(
      t("acceptProposal"),
      "Are you sure you want to accept this proposal? This will notify the specialist and start the project.",
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("accept"),
          style: "default",
          onPress: () => {
            // Handle proposal acceptance
            // Proposal accepted
          },
        },
      ]
    );
  };

  const handleRejectProposal = (proposalId: number) => {
    Alert.alert(
      t("rejectProposal"),
      "Are you sure you want to reject this proposal?",
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("reject"),
          style: "destructive",
          onPress: () => {
            // Handle proposal rejection
            // Proposal rejected
          },
        },
      ]
    );
  };

  const handleViewSpecialist = (specialistId: number) => {
    router.push(`/specialists/${specialistId}`);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <IconSymbol key={i} name="star.fill" size={14} color="#FFD700" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <IconSymbol
          key="half"
          name="star.leadinghalf.filled"
          size={14}
          color="#FFD700"
        />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <IconSymbol key={`empty-${i}`} name="star" size={14} color="#E0E0E0" />
      );
    }

    return stars;
  };

  return (
    <Layout
      header={
        <Header
          title={t("proposals")}
          subtitle={`${proposals.length} ${t("proposalsReceived")}`}
          showBackButton={true}
          onBackPress={() => router.back()}
        />
      }
      footer={null}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* <ResponsiveContainer> */}
        <ResponsiveCard>
          <View style={styles.summarySection}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              Proposals Summary
            </Text>
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <IconSymbol
                  name="person.2.fill"
                  size={20}
                  color={colors.tint}
                />
                <Text style={[styles.statText, { color: colors.text }]}>
                  {proposals.length} Proposals
                </Text>
              </View>
              <View style={styles.statItem}>
                <IconSymbol
                  name="dollarsign.circle.fill"
                  size={20}
                  color={colors.tint}
                />
                <Text style={[styles.statText, { color: colors.text }]}>
                  ${Math.min(...proposals.map((p) => p.price)).toLocaleString()}{" "}
                  - $
                  {Math.max(...proposals.map((p) => p.price)).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        </ResponsiveCard>

        {/* Proposals List */}
        <View style={styles.proposalsSection}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, marginLeft: 16 },
            ]}
          >
            Received Proposals
          </Text>

          {proposals.map((proposal) => (
            <ResponsiveCard key={proposal.id}>
              {/* <View> */}
              {/* Specialist Header */}
              <View style={styles.specialistHeader}>
                <Image
                  source={{ uri: proposal.specialist.avatar }}
                  style={styles.avatar}
                />
                <View style={styles.specialistInfo}>
                  <Text style={[styles.specialistName, { color: colors.text }]}>
                    {proposal.specialist.name}
                  </Text>
                  <Text
                    style={[styles.specialistTitle, { color: colors.tint }]}
                  >
                    {proposal.specialist.title}
                  </Text>
                  <View style={styles.ratingContainer}>
                    <View style={styles.stars}>
                      <Text>{renderStars(proposal.specialist.rating)}</Text>
                    </View>
                    <Text style={[styles.ratingText, { color: colors.text }]}>
                      {proposal.specialist.rating} (
                      {proposal.specialist.reviewCount} reviews)
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.viewProfileButton,
                    { borderColor: colors.tint },
                  ]}
                  onPress={() => handleViewSpecialist(proposal.specialist.id)}
                >
                  <Text
                    style={[styles.viewProfileText, { color: colors.tint }]}
                  >
                    View Profile
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Proposal Details */}
              <View style={styles.proposalDetails}>
                <View style={styles.priceSection}>
                  <Text
                    style={[
                      styles.priceLabel,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    Proposed Price
                  </Text>
                  <Text style={[styles.priceValue, { color: colors.text }]}>
                    ${proposal.price.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <IconSymbol
                      name="clock.fill"
                      size={16}
                      color={colors.tint}
                    />
                    <Text style={[styles.detailText, { color: colors.text }]}>
                      {proposal.estimatedDuration}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <IconSymbol name="calendar" size={16} color={colors.tint} />
                    <Text style={[styles.detailText, { color: colors.text }]}>
                      Start: {proposal.availableStartDate}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <IconSymbol
                      name="location.fill"
                      size={16}
                      color={colors.tint}
                    />
                    <Text style={[styles.detailText, { color: colors.text }]}>
                      {proposal.specialist.location}
                    </Text>
                  </View>
                </View>

                <View style={styles.experienceSection}>
                  <Text
                    style={[
                      styles.experienceLabel,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    Relevant Experience
                  </Text>
                  <Text style={[styles.experienceText, { color: colors.text }]}>
                    {proposal.relevantExperience}
                  </Text>
                </View>

                <View style={styles.messageSection}>
                  <Text
                    style={[
                      styles.messageLabel,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    Proposal Message
                  </Text>
                  <Text style={[styles.messageText, { color: colors.text }]}>
                    {proposal.message}
                  </Text>
                </View>

                <View style={styles.skillsSection}>
                  <Text
                    style={[
                      styles.skillsLabel,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    Skills
                  </Text>
                  <View style={styles.skillsContainer}>
                    {proposal.specialist.skills
                      .slice(0, 6)
                      .map((skill, index) => (
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
                          <Text
                            style={[styles.skillText, { color: colors.text }]}
                          >
                            {skill}
                          </Text>
                        </View>
                      ))}
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.acceptButton, { backgroundColor: "#4CAF50" }]}
                  onPress={() => handleAcceptProposal(proposal.id)}
                >
                  <IconSymbol
                    name="checkmark.circle.fill"
                    size={16}
                    color="white"
                  />
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.rejectButton, { backgroundColor: "#F44336" }]}
                  onPress={() => handleRejectProposal(proposal.id)}
                >
                  <IconSymbol
                    name="xmark.circle.fill"
                    size={16}
                    color="white"
                  />
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>

              <Text
                style={[styles.proposalDate, { color: colors.tabIconDefault }]}
              >
                Submitted on {proposal.createdAt}
              </Text>
            </ResponsiveCard>
          ))}
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  summarySection: {
    gap: 20,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  summaryStats: {
    flexDirection: "row",
    gap: 24,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statText: {
    fontSize: 18,
    fontWeight: "600",
  },
  proposalsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 20,
  },
  specialistHeader: {
    flexDirection: "row",
    marginBottom: 20,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 16,
  },
  specialistInfo: {
    flex: 1,
  },
  specialistName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
    lineHeight: 26,
  },
  specialistTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
    opacity: 0.8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stars: {
    flexDirection: "row",
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "600",
  },
  viewProfileButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  viewProfileText: {
    fontSize: 12,
    fontWeight: "600",
  },
  proposalDetails: {
    gap: 20,
    marginBottom: 20,
  },
  priceSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 12,
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  priceValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#4CAF50",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 15,
    fontWeight: "600",
  },
  experienceSection: {
    gap: 8,
  },
  experienceLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  experienceText: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.9,
  },
  messageSection: {
    gap: 8,
  },
  messageLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.9,
  },
  skillsSection: {
    gap: 12,
  },
  skillsLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  skillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  acceptButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
    minHeight: 44,
  },
  acceptButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
    minHeight: 44,
  },
  rejectButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  proposalDate: {
    fontSize: 13,
    textAlign: "center",
    fontStyle: "italic",
    opacity: 0.7,
  },
});

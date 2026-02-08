import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Category } from "@/categories/api";
import { IconSymbol } from "@/components/ui/icon-symbol";
import React from "react";
import { Spacing } from "@/constants/styles";

interface CategoryCardProps {
  category: Category;
  onPress: (categoryId: number) => void;
  childCount?: number;
  colors: {
    surface: string;
    text: string;
    tint: string;
  };
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onPress,
  childCount = 0,
  colors,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(category.id)}
      style={{ flex: 1, marginHorizontal: Spacing.xs }}
    >
      <View style={[styles.gridCard, { backgroundColor: colors.surface }]}>
          <Image
            source={{ uri: category.imageUrl }}
            style={styles.gridServiceImage}
            resizeMode="contain"
          />
        <View style={styles.gridCardContent}>
          <Text
            style={[styles.gridServiceName, { color: colors.text }]}
            numberOfLines={2}
          >
            {category.name}
          </Text>
          <View style={styles.gridServiceStats}>
            <View style={styles.gridStatItem}>
              <IconSymbol name="person.2.fill" size={12} color={colors.tint} />
              <Text
                style={[
                  styles.gridStatText,
                  { color: colors.text, marginLeft: 4 },
                ]}
              >
                {category.specialistCount}
              </Text>
            </View>
            {childCount > 0 && (
              <View style={styles.gridStatItem}>
                <IconSymbol
                  name="square.grid.2x2.fill"
                  size={12}
                  color={colors.tint}
                />
                <Text
                  style={[
                    styles.gridStatText,
                    { color: colors.text, marginLeft: 4 },
                  ]}
                >
                  {childCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gridCard: {
    borderRadius: 12,
    overflow: "hidden",
    height: 144
  },
  gridServiceImage: {
    width: "100%",
    height: 80,
    backgroundColor: "#fff",
  },
  gridCardContent: {
    padding: Spacing.sm,
  },
  gridServiceName: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  gridServiceStats: {
    flexDirection: "row",
    marginBottom: Spacing.xs,
    marginRight: -Spacing.xs,
  },
  gridStatItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: Spacing.xs,
  },
  gridStatText: {
    fontSize: 11,
    fontWeight: "600",
  },
});

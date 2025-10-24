import { Stack } from "expo-router";
import React from "react";

export default function ProposalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: "card",
        animation: "none",
      }}
    >
      <Stack.Screen name="create" />
    </Stack>
  );
}

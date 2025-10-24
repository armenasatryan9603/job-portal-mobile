import { useTheme } from "@/contexts/ThemeContext";

export const useColorScheme = () => {
  const { isDark } = useTheme();
  return isDark ? "dark" : "light";
};

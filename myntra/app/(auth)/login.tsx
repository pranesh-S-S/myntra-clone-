import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import React from "react";
import { Eye, EyeOff } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/hooks/useResponsive";
import { useTheme } from "@/context/ThemeContext";

export default function Login() {
  const { login } = useAuth();
  const { isMobile } = useResponsive();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isloading, setisloading] = useState(false);

  const handleLogin = async () => {
    try {
      setisloading(true);
      await login(email, password);
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error(error);
      alert(error?.response?.data?.message || error.message || "An error occurred");
    } finally {
      setisloading(false);
    }
  };

  // Build themed styles using useMemo so they only recalculate when theme changes
  const s = useMemo(() => createThemedStyles(theme, isMobile), [theme, isMobile]);

  return (
    <View style={s.container}>
      <Image
        source={{
          uri: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop",
        }}
        style={s.backgroundImage}
      />
      <View style={s.formContainer}>
        <Text style={s.title}>Welcome to Myntra</Text>
        <Text style={s.subtitle}>Login to continue shopping</Text>
        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor={theme.colors.inputPlaceholder}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <View style={s.passwordContainer}>
          <TextInput
            style={s.passwordInput}
            placeholder="Password"
            placeholderTextColor={theme.colors.inputPlaceholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={s.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff size={20} color={theme.colors.textTertiary} />
            ) : (
              <Eye size={20} color={theme.colors.textTertiary} />
            )}
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={s.button}
          onPress={handleLogin}
          disabled={isloading}
        >
          {isloading ? (
            <ActivityIndicator color={theme.colors.primaryText} />
          ) : (
            <Text style={s.buttonText}>LOGIN</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={s.signupLink}
          onPress={() => router.push("/signup")}
        >
          <Text style={s.signupText}>Don't have an account? Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Themed Styles Factory ───────────────────────────────────────────────────
// Components never hardcode colors — they always consume theme.colors.xyz

import type { Theme } from "@/constants/theme";

function createThemedStyles(theme: Theme, isMobile: boolean) {
  const { colors, spacing, radii, typography } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      ...(isMobile ? {} : { justifyContent: "center" as const, alignItems: "center" as const }),
    },
    backgroundImage: {
      width: "100%",
      height: isMobile ? "50%" : "100%",
      position: "absolute",
      top: 0,
    },
    formContainer: {
      flex: isMobile ? 1 : 0,
      justifyContent: "center",
      padding: isMobile ? spacing.lg : spacing.xxl,
      backgroundColor: theme.isDark
        ? `${colors.surface}F2` // ~95% opacity on dark bg
        : "rgba(255, 255, 255, 0.93)",
      marginTop: isMobile ? "60%" : 0,
      borderTopLeftRadius: isMobile ? radii.xl + 10 : 0,
      borderTopRightRadius: isMobile ? radii.xl + 10 : 0,
      borderRadius: isMobile ? 0 : radii.xl,
      ...(isMobile
        ? {}
        : {
          maxWidth: 450,
          width: "100%",
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        }),
    },
    title: {
      fontSize: typography.sizes.hero,
      fontWeight: typography.weights.bold,
      marginBottom: spacing.sm + 2,
      color: colors.text,
    },
    subtitle: {
      fontSize: typography.sizes.md,
      color: colors.textSecondary,
      marginBottom: spacing.xl,
    },
    input: {
      backgroundColor: colors.inputBackground,
      padding: spacing.md,
      borderRadius: radii.md,
      marginBottom: spacing.md,
      fontSize: typography.sizes.md,
      color: colors.inputText,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    passwordContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBackground,
      borderRadius: radii.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    passwordInput: {
      flex: 1,
      padding: spacing.md,
      fontSize: typography.sizes.md,
      color: colors.inputText,
    },
    eyeIcon: {
      padding: spacing.md,
    },
    button: {
      backgroundColor: colors.primary,
      padding: spacing.md,
      borderRadius: radii.md,
      alignItems: "center",
      marginTop: spacing.sm + 2,
    },
    buttonText: {
      color: colors.primaryText,
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.bold,
    },
    signupLink: {
      marginTop: spacing.lg,
      alignItems: "center",
    },
    signupText: {
      color: colors.primary,
      fontSize: typography.sizes.md,
    },
  });
}

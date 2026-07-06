import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  Check,
  Palette,
  Bell,
  Shield,
  Info,
} from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/hooks/useResponsive";
import { useTheme } from "@/context/ThemeContext";

export default function Settings() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const { theme, themeMode, setThemeMode, availableModes } = useTheme();
  const colors = theme.colors;

  const getThemeIcon = (modeId: string) => {
    if (modeId === "dark") return Moon;
    if (modeId === "light") return Sun;
    if (modeId === "highContrast") return Palette;
    return Monitor;
  };

  const getThemeDescription = (modeId: string) => {
    if (modeId === "system") return "Follows your device's appearance settings";
    if (modeId === "light") return "Always use light colors";
    if (modeId === "dark") return "Always use dark colors";
    if (modeId === "highContrast") return "Maximum contrast for accessibility";
    return "";
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, isDesktop && { alignItems: "center" }]}>
      <View style={{ maxWidth: isDesktop ? contentMaxWidth : "100%", width: "100%", flex: 1 }}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Appearance Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Palette size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
            </View>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              Choose how the app looks to you
            </Text>

            <View style={styles.themeGrid}>
              {availableModes.map((mode) => {
                const Icon = getThemeIcon(mode.id);
                const isActive = themeMode === mode.id;
                return (
                  <TouchableOpacity
                    key={mode.id}
                    style={[
                      styles.themeCard,
                      {
                        backgroundColor: isActive ? colors.primaryLight : colors.card,
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setThemeMode(mode.id)}
                  >
                    <View style={[styles.themeIconWrap, { backgroundColor: isActive ? colors.primary : colors.surface }]}>
                      <Icon size={22} color={isActive ? colors.primaryText : colors.textSecondary} />
                    </View>
                    <Text style={[styles.themeLabel, { color: isActive ? colors.primary : colors.text }]}>
                      {mode.label}
                    </Text>
                    <Text style={[styles.themeDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {getThemeDescription(mode.id)}
                    </Text>
                    {isActive && (
                      <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                        <Check size={14} color={colors.primaryText} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Other Settings Sections */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Bell size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>
            </View>
            <TouchableOpacity style={[styles.settingItem, { borderBottomColor: colors.border }]}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Push Notifications</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Enabled</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.settingItem, { borderBottomColor: colors.border }]}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Email Notifications</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Enabled</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.settingItem, { borderBottomColor: "transparent" }]}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Order Updates</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Enabled</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Shield size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Privacy & Security</Text>
            </View>
            <TouchableOpacity style={[styles.settingItem, { borderBottomColor: colors.border }]}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Change Password</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.settingItem, { borderBottomColor: "transparent" }]}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Delete Account</Text>
              <Text style={{ color: colors.error, fontSize: 13 }}>Permanent</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Info size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
            </View>
            <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>App Version</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>1.0.0</Text>
            </View>
            <View style={[styles.settingItem, { borderBottomColor: "transparent" }]}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Logged in as</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{user?.email || "Guest"}</Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  content: { flex: 1, padding: 15 },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
  },
  sectionDesc: {
    fontSize: 13,
    marginBottom: 16,
    marginLeft: 30,
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  themeCard: {
    width: "47%",
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    position: "relative",
    minHeight: 130,
  },
  themeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  themeLabel: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 4,
  },
  themeDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  checkBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginLeft: 20,
    borderBottomWidth: 1,
  },
  settingLabel: {
    fontSize: 15,
  },
});

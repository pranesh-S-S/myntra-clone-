import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import {
  User,
  Package,
  Heart,
  CreditCard,
  MapPin,
  Settings,
  LogOut,
  ChevronRight,
  Receipt,
  Moon,
  Sun,
  Monitor
} from "lucide-react-native";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/hooks/useResponsive";
import { useTheme } from "@/context/ThemeContext";

const menuItems = [
  { icon: Package, label: "Orders", route: "/orders" },
  { icon: Receipt, label: "My Transactions", route: "/transactions" },
  { icon: Heart, label: "Wishlist", route: "/wishlist" },
  { icon: CreditCard, label: "Payment Methods", route: "/payments" },
  { icon: MapPin, label: "Addresses", route: "/addresses" },
  { icon: Settings, label: "Settings", route: "/settings" },
];

export default function Profile() {
  const router = useRouter();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const { user, logout } = useAuth();
  const { theme, themeMode, setThemeMode } = useTheme();

  const handleLogout = () => {
    logout()
    router.replace("/");
  };

  const handleThemeToggle = () => {
    if (themeMode === 'light') setThemeMode('dark');
    else if (themeMode === 'dark') setThemeMode('system');
    else setThemeMode('light');
  };

  const getThemeIcon = () => {
    if (themeMode === 'dark') return Moon;
    if (themeMode === 'light') return Sun;
    return Monitor;
  };

  const ThemeIcon = getThemeIcon();
  const getThemeLabel = () => {
    if (themeMode === 'dark') return "Dark Mode";
    if (themeMode === 'light') return "Light Mode";
    return "System Default";
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }, isDesktop && { alignItems: 'center' }]}>
        <View style={[styles.innerContainer, { maxWidth: isDesktop ? contentMaxWidth : '100%', width: '100%' }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Profile</Text>
        </View>
        <View style={styles.emptyState}>
          <User size={64} color={theme.colors.primary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            Please login to view your profile
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.loginButtonText}>LOGIN</Text>
          </TouchableOpacity>
        </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }, isDesktop && { alignItems: 'center' }]}>
      <View style={[styles.innerContainer, { maxWidth: isDesktop ? contentMaxWidth : '100%', width: '100%' }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.userInfo, { backgroundColor: theme.colors.card }]}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <User size={40} color="#fff" />
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: theme.colors.text }]}>{user.name}</Text>
            <Text style={[styles.userEmail, { color: theme.colors.text }]}>{user.email}</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}
            onPress={handleThemeToggle}
          >
            <View style={styles.menuItemLeft}>
              <ThemeIcon size={24} color={theme.colors.text} />
              <Text style={[styles.menuItemLabel, { color: theme.colors.text }]}>Appearance: {getThemeLabel()}</Text>
            </View>
            <ChevronRight size={24} color={theme.colors.text} />
          </TouchableOpacity>

          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.menuItemLeft}>
                <item.icon size={24} color={theme.colors.text} />
                <Text style={[styles.menuItemLabel, { color: theme.colors.text }]}>{item.label}</Text>
              </View>
              <ChevronRight size={24} color={theme.colors.text} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.primary }]} onPress={handleLogout}>
          <LogOut size={24} color={theme.colors.primary} />
          <Text style={[styles.logoutText, { color: theme.colors.primary }]}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  innerContainer: {
    flex: 1,
  },
  header: {
    padding: 15,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#3e3e3e",
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    color: "#3e3e3e",
    marginTop: 20,
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: "#ff3f6c",
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ff3f6c",
    justifyContent: "center",
    alignItems: "center",
  },
  userDetails: {
    marginLeft: 15,
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3e3e3e",
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
  },
  menuSection: {
    marginTop: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemLabel: {
    fontSize: 16,
    color: "#3e3e3e",
    marginLeft: 15,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    marginTop: 20,
    marginHorizontal: 15,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ff3f6c",
  },
  logoutText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#ff3f6c",
    fontWeight: "bold",
  },
});

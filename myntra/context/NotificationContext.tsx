import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { registerForPushNotificationsAsync } from "@/utils/notifications";

const API_BASE = `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/notifications`;

type NotificationContextType = {
  expoPushToken: string | null;
  notifications: Notifications.Notification[];
};

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<
    Notifications.Notification[]
  >([]);
  const { user, registerLoginSync } = useAuth();
  const router = useRouter();

  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  // Helper to send the token to the server
  const sendTokenToServer = useCallback(
    async (token: string, userId: string) => {
      try {
        await axios.post(`${API_BASE}/register-token`, {
          userId,
          token,
          platform: Platform.OS,
          deviceId: Platform.OS === "web" ? "web_browser" : "native_device",
        });
        console.log("[NotificationContext] Push token sent to backend for user", userId);
      } catch (error) {
        console.warn("[NotificationContext] Failed to register push token on backend:", error);
      }
    },
    []
  );

  // Function to register push notification permissions and get the token
  const registerToken = useCallback(async (userId: string) => {
    const token = await registerForPushNotificationsAsync();
    if (token) {
      setExpoPushToken(token);
      await sendTokenToServer(token, userId);
    }
  }, [sendTokenToServer]);

  useEffect(() => {
    // 1. Register sync callback for future login events
    registerLoginSync(async (userId: string) => {
      await registerToken(userId);
    });

    // 2. Initial load: if user is already logged in, register immediately
    if (user && user._id) {
      registerToken(user._id);
    }
  }, [user, registerToken, registerLoginSync]);

  useEffect(() => {
    // Only set up listeners on native platforms
    if (Platform.OS === "web") return;

    // 3. Foreground Listener: fires when a notification is received while the app is open
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("[Notifications] Received in foreground:", notification);
        setNotifications((prev) => [notification, ...prev]);
      });

    // 4. Response Listener: fires when a user taps/clicks on a notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const { data } = response.notification.request.content;
        console.log("[Notifications] Tapped on notification response:", data);

        // Perform deep linking using expo-router
        if (data && typeof data === "object") {
          const screen = (data as any).screen;
          if (screen === "order" && (data as any).orderId) {
            router.push(`/Order/user/${user?._id}`);
          } else if (screen === "bag") {
            router.push("/bag");
          } else if (screen === "profile") {
            router.push("/profile");
          }
        }
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user, router]);

  return (
    <NotificationContext.Provider value={{ expoPushToken, notifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return ctx;
};

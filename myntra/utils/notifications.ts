import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Configure how foreground notifications are handled.
 * Only applies to native platforms.
 */
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Registers the device for Expo Push Notifications and returns the token.
 * Gracefully returns null on web, simulators without tokens, or when permissions are denied.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Gracefully skip on web
  if (Platform.OS === "web") {
    console.log("[Notifications] Skipped token registration on Web platform.");
    return null;
  }

  // Must be on a physical device for native push notifications (Expo limitation)
  if (!Device.isDevice) {
    console.warn("[Notifications] Must use a physical device for push notifications.");
    return null;
  }

  try {
    // 1. Check existing permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // 2. Request permission if not already granted
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("[Notifications] Failed to get push token: permission denied.");
      return null;
    }

    // 3. Get Expo push token
    // projectId is required for newer Expo SDKs
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    console.log("[Notifications] Registered push token:", tokenData.data);

    // 4. Configure Android channels
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF3F6C",
      });
    }

    return tokenData.data;
  } catch (error) {
    console.error("[Notifications] Error registering for push notifications:", error);
    return null;
  }
}

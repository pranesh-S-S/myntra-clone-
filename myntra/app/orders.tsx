import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Package,
  ChevronRight,
  MapPin,
  Truck,
  Clock,
  Calendar,
  CreditCard,
  ArrowLeft,
} from "lucide-react-native";
import React from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useResponsive } from "@/hooks/useResponsive";

export default function Orders() {
  const router = useRouter();
  const { fromCheckout } = useLocalSearchParams();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const [orders, setorder] = useState<any>(null);
  const { theme } = useTheme();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const colors = theme.colors;

  const handleBack = () => {
    if (fromCheckout === "true") {
      router.replace("/");
    } else {
      router.back();
    }
  };

  useEffect(() => {
    if (fromCheckout === "true") {
      const backAction = () => {
        router.replace("/");
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction
      );
      return () => backHandler.remove();
    }
  }, [fromCheckout]);

  useEffect(() => {
    const fetchorder = async () => {
      if (user) {
        try {
          setIsLoading(true);
          const product = await axios.get(
            `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/order/user/${user._id}`
          );
          setorder(product.data);
        } catch (error) {
          console.log(error);
          setIsLoading(false);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchorder();
  }, [user]);

  if (isLoading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Orders</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Package size={64} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Please login to view orders</Text>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/login")}>
            <Text style={styles.primaryBtnText}>LOGIN</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Orders</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Package size={64} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No orders found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, isDesktop && { alignItems: "center" }]}>
      <View style={{ maxWidth: isDesktop ? contentMaxWidth : "100%", width: "100%", flex: 1 }}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Orders</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          {orders.map((order: any) => (
            <View key={order._id} style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.orderHeader, { borderBottomColor: colors.border }]}
                onPress={() => toggleOrderDetails(order._id)}
              >
                <View>
                  <Text style={[styles.orderId, { color: colors.text }]}>Order #{order._id}</Text>
                  <Text style={[styles.orderDate, { color: colors.textSecondary }]}>{new Date(order.createdAt || Date.now()).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.statusContainer, { backgroundColor: colors.primaryLight }]}>
                  <Package size={16} color={colors.primary} />
                  <Text style={[styles.orderStatus, { color: colors.primary }]}>{order.status}</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.itemsContainer}>
                {order.items.map((item: any) => (
                  <View key={item._id} style={styles.orderItem}>
                    <Image
                      source={{ uri: item.productId?.images?.[0] || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&auto=format&fit=crop" }}
                      style={styles.itemImage}
                    />
                    <View style={styles.itemInfo}>
                      <Text style={[styles.brandName, { color: colors.textSecondary }]}>{item.productId?.brand}</Text>
                      <Text style={[styles.itemName, { color: colors.text }]}>{item.productId?.name}</Text>
                      <Text style={[styles.itemSize, { color: colors.textSecondary }]}>Size: {item.size} · Qty: {item.quantity}</Text>
                      <Text style={[styles.itemPrice, { color: colors.text }]}>₹{item.productId?.price}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {expandedOrder === order._id && (
                <View style={[styles.orderDetails, { borderTopColor: colors.border }]}>
                  <View style={styles.detailSection}>
                    <View style={styles.detailHeader}>
                      <MapPin size={20} color={colors.text} />
                      <Text style={[styles.detailTitle, { color: colors.text }]}>Shipping Address</Text>
                    </View>
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>{order.shippingAddress}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <View style={styles.detailHeader}>
                      <CreditCard size={20} color={colors.text} />
                      <Text style={[styles.detailTitle, { color: colors.text }]}>Payment Method</Text>
                    </View>
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>{order.paymentMethod}</Text>
                  </View>

                  {order.tracking && (
                    <View style={styles.detailSection}>
                      <View style={styles.detailHeader}>
                        <Truck size={20} color={colors.text} />
                        <Text style={[styles.detailTitle, { color: colors.text }]}>Tracking Information</Text>
                      </View>
                      <View style={styles.trackingInfo}>
                        <Text style={[styles.trackingNumber, { color: colors.textSecondary }]}>
                          Tracking Number: {order.tracking.number}
                        </Text>
                        <Text style={[styles.trackingCarrier, { color: colors.textSecondary }]}>
                          Carrier: {order.tracking.carrier}
                        </Text>
                      </View>

                      <View style={styles.timeline}>
                        {order.tracking.timeline?.map((event: any, index: any) => (
                          <View key={index} style={styles.timelineEvent}>
                            <View style={[styles.timelinePoint, { backgroundColor: colors.primary }]} />
                            <View style={styles.timelineContent}>
                              <Text style={[styles.timelineStatus, { color: colors.text }]}>
                                {event.status}
                              </Text>
                              <Text style={[styles.timelineLocation, { color: colors.textSecondary }]}>
                                {event.location}
                              </Text>
                              <Text style={[styles.timelineTimestamp, { color: colors.textTertiary }]}>
                                {event.timestamp}
                              </Text>
                            </View>
                            {index !== order.tracking.timeline.length - 1 && (
                              <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                            )}
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}

              <View style={[styles.orderFooter, { borderTopColor: colors.border }]}>
                <View style={styles.totalContainer}>
                  <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Order Total</Text>
                  <Text style={[styles.totalAmount, { color: colors.text }]}>₹{order.total}</Text>
                </View>
                <TouchableOpacity
                  style={styles.detailsButton}
                  onPress={() => toggleOrderDetails(order._id)}
                >
                  <Text style={[styles.detailsButtonText, { color: colors.primary }]}>
                    {expandedOrder === order._id ? "Hide Details" : "View Details"}
                  </Text>
                  <ChevronRight size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 15,
  },
  orderCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 15,
    overflow: "hidden",
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
  },
  orderId: {
    fontSize: 15,
    fontWeight: "bold",
  },
  orderDate: {
    fontSize: 13,
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  orderStatus: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 5,
  },
  itemsContainer: {
    padding: 15,
  },
  orderItem: {
    flexDirection: "row",
    marginBottom: 15,
  },
  itemImage: {
    width: 70,
    height: 90,
    borderRadius: 8,
    resizeMode: "cover",
  },
  itemInfo: {
    flex: 1,
    marginLeft: 15,
  },
  brandName: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 2,
  },
  itemName: {
    fontSize: 15,
    marginBottom: 2,
  },
  itemSize: {
    fontSize: 13,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "bold",
  },
  orderDetails: {
    padding: 15,
    borderTopWidth: 1,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginLeft: 8,
  },
  detailText: {
    fontSize: 14,
    lineHeight: 20,
  },
  trackingInfo: {
    marginBottom: 15,
  },
  trackingNumber: {
    fontSize: 14,
    marginBottom: 4,
  },
  trackingCarrier: {
    fontSize: 14,
  },
  timeline: {
    marginTop: 10,
  },
  timelineEvent: {
    flexDirection: "row",
    marginBottom: 20,
    position: "relative",
  },
  timelinePoint: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  timelineLine: {
    position: "absolute",
    left: 4,
    top: 15,
    width: 2,
    height: "100%",
  },
  timelineContent: {
    marginLeft: 15,
    flex: 1,
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  timelineLocation: {
    fontSize: 13,
    marginBottom: 2,
  },
  timelineTimestamp: {
    fontSize: 12,
  },
  orderFooter: {
    padding: 15,
    borderTopWidth: 1,
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 15,
  },
  totalAmount: {
    fontSize: 17,
    fontWeight: "bold",
  },
  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  detailsButtonText: {
    fontSize: 15,
    fontWeight: "600",
    marginRight: 5,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  primaryBtn: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

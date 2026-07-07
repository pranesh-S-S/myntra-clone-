import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { ShoppingBag, Minus, Plus, Trash2, ShieldAlert, Bookmark } from "lucide-react-native";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/hooks/useResponsive";
import { useTheme } from "@/context/ThemeContext";
import axios from "axios";

type CartItem = {
  productId: {
    _id: string;
    name: string;
    brand: string;
    price: number;
    discount: string;
    images: string[];
    stock: number;
    isDiscontinued: boolean;
  };
  size: string;
  quantity: number;
  priceAtAdd: number;
  addedAt: string;
  _id: string;
};

type CartType = {
  _id: string;
  userId: string;
  items: CartItem[];
  savedForLater: CartItem[];
  __v: number;
};

export default function Bag() {
  const router = useRouter();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [cart, setCart] = useState<CartType | null>(null);
  const [validationIssues, setValidationIssues] = useState<any[]>([]);

  const fetchCart = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const res = await axios.get(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/cart/${user._id}`);
      setCart(res.data);
      setValidationIssues([]); // Clear issues on reload
    } catch (error) {
      console.log("Error fetching cart:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchCart();
    }, [fetchCart])
  );

  // Compute active items total
  const total = useMemo(() => {
    if (!cart || !cart.items) return 0;
    return cart.items.reduce(
      (sum, item) => sum + (item.productId?.price || 0) * item.quantity,
      0
    );
  }, [cart]);

  // Concurrency-Safe Quantity Update (Optimistic Locking)
  const handleQuantityChange = async (
    productId: string,
    size: string,
    newQuantity: number,
    target: "active" | "saved"
  ) => {
    if (!user || !cart || newQuantity < 1) return;

    try {
      const res = await axios.put(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/cart/update-quantity`, {
        userId: user._id,
        productId,
        size,
        quantity: newQuantity,
        cartVersion: cart.__v, // Send known version
        target,
      });
      setCart(res.data);
      setValidationIssues([]);
    } catch (error: any) {
      if (error.response?.status === 409) {
        // Concurrency Conflict Detected!
        Alert.alert(
          "Cart Updated Elsewhere",
          "Your cart was modified on another device. We've synchronized it to the latest state.",
          [{ text: "OK" }]
        );
        // Sync with the latest cart returned
        if (error.response.data?.latestCart) {
          setCart(error.response.data.latestCart);
        }
      } else {
        console.log("Error updating quantity:", error);
        Alert.alert("Error", "Could not update quantity.");
      }
    }
  };

  const handleSaveForLater = async (productId: string, size: string) => {
    if (!user) return;
    try {
      const res = await axios.post(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/cart/save-for-later`, {
        userId: user._id,
        productId,
        size,
      });
      setCart(res.data);
      setValidationIssues([]);
    } catch (error) {
      console.log("Error saving for later:", error);
    }
  };

  const handleMoveToCart = async (productId: string, size: string) => {
    if (!user) return;
    try {
      const res = await axios.post(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/cart/move-to-cart`, {
        userId: user._id,
        productId,
        size,
      });
      setCart(res.data);
      setValidationIssues([]);
    } catch (error) {
      console.log("Error moving item to active cart:", error);
    }
  };

  const handleDelete = async (productId: string, size: string, target: "active" | "saved") => {
    if (!user) return;
    try {
      const res = await axios.delete(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/cart/remove`, {
        data: {
          userId: user._id,
          productId,
          size,
          target,
        },
      });
      setCart(res.data);
      setValidationIssues([]);
    } catch (error) {
      console.log("Error removing item:", error);
    }
  };

  // Checkout Validation before placing order
  const handlePlaceOrder = async () => {
    if (!user || !cart) return;

    try {
      const res = await axios.post(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/cart/validate-checkout`, {
        userId: user._id,
      });

      const { valid, issues, cartVersion } = res.data;

      // Update cart version state in case the validation updated snapshot prices or auto-pruned discontinued items
      if (res.data.cartVersion !== undefined) {
        setCart((prev) => prev ? { ...prev, __v: cartVersion } : null);
      }

      if (valid) {
        // Validation passed! Proceed to checkout
        router.push("/checkout");
      } else {
        // Validation failed, show issues to user
        setValidationIssues(issues);
        
        // Fetch cart again to reflect updated prices/quantities automatically resolved on server
        await fetchCart();

        Alert.alert(
          "Cart Verification Warning",
          "Some items in your cart had price drifts, stock limit adjustments, or were discontinued. Please review details below before proceeding.",
          [{ text: "Review" }]
        );
      }
    } catch (error) {
      console.log("Checkout validation request failed:", error);
      Alert.alert("Checkout Error", "Could not validate cart items. Please try again.");
    }
  };

  // Theme support
  const s = useMemo(() => createThemedStyles(theme, isDesktop), [theme, isDesktop]);

  if (!user) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Shopping Bag</Text>
        </View>
        <View style={s.emptyState}>
          <ShoppingBag size={64} color={theme.colors.primary} />
          <Text style={s.emptyTitle}>Please login to view your bag</Text>
          <TouchableOpacity
            style={s.loginButton}
            onPress={() => router.push("/login")}
          >
            <Text style={s.loginButtonText}>LOGIN</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isLoading && !cart) {
    return (
      <View style={s.loaderContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.innerContainer}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Shopping Bag</Text>
        </View>

        <View style={isDesktop ? { flexDirection: 'row', flex: 1, maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center', padding: 15 } : { flex: 1 }}>
          <ScrollView style={isDesktop ? { flex: 2 } : s.content} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Checkout validation issue banners */}
            {validationIssues.length > 0 && (
              <View style={s.issuesBlock}>
                <View style={s.issuesHeader}>
                  <ShieldAlert size={18} color={theme.colors.error} />
                  <Text style={s.issuesHeaderTitle}>Action Required</Text>
                </View>
                {validationIssues.map((issue, idx) => (
                  <Text key={idx} style={s.issueText}>
                    • {issue.message}
                  </Text>
                ))}
              </View>
            )}

            {/* Active Items Section */}
            <Text style={s.sectionHeader}>Active Items ({cart?.items?.length || 0})</Text>
            {!cart || cart.items.length === 0 ? (
              <View style={s.emptyStateSection}>
                <ShoppingBag size={32} color={theme.colors.textSecondary} />
                <Text style={s.emptySectionText}>Your active bag is empty</Text>
              </View>
            ) : (
              cart.items.map((item) => {
                if (!item.productId) return null;
                return (
                  <View key={item._id} style={s.bagItem}>
                    <Image
                      source={{ uri: item.productId.images?.[0] }}
                      style={s.itemImage}
                    />
                    <View style={s.itemInfo}>
                      <Text style={s.brandName}>{item.productId.brand}</Text>
                      <Text style={s.itemName}>{item.productId.name}</Text>
                      <Text style={s.itemSize}>Size: {item.size}</Text>
                      <Text style={s.itemPrice}>₹{item.productId.price}</Text>

                      {/* Price change notification check */}
                      {item.priceAtAdd !== item.productId.price && (
                        <Text style={s.priceChangedAlert}>
                          Price changed from ₹{item.priceAtAdd}
                        </Text>
                      )}

                      <View style={s.quantityContainer}>
                        <TouchableOpacity
                          style={s.quantityButton}
                          onPress={() =>
                            handleQuantityChange(
                              item.productId._id,
                              item.size,
                              item.quantity - 1,
                              "active"
                            )
                          }
                        >
                          <Minus size={16} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text style={s.quantity}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={s.quantityButton}
                          onPress={() =>
                            handleQuantityChange(
                              item.productId._id,
                              item.size,
                              item.quantity + 1,
                              "active"
                            )
                          }
                        >
                          <Plus size={16} color={theme.colors.text} />
                        </TouchableOpacity>

                        <View style={s.itemActions}>
                          <TouchableOpacity
                            style={s.actionIconButton}
                            onPress={() => handleSaveForLater(item.productId._id, item.size)}
                            title="Save for Later"
                          >
                            <Bookmark size={18} color={theme.colors.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={s.actionIconButton}
                            onPress={() => handleDelete(item.productId._id, item.size, "active")}
                            title="Remove"
                          >
                            <Trash2 size={18} color={theme.colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            {/* Save for Later Section */}
            <Text style={s.sectionHeader}>Saved For Later ({cart?.savedForLater?.length || 0})</Text>
            {!cart || cart.savedForLater.length === 0 ? (
              <View style={s.emptyStateSection}>
                <Bookmark size={32} color={theme.colors.textSecondary} />
                <Text style={s.emptySectionText}>No saved items</Text>
              </View>
            ) : (
              cart.savedForLater.map((item) => {
                if (!item.productId) return null;
                return (
                  <View key={item._id} style={[s.bagItem, s.savedItemCard]}>
                    <Image
                      source={{ uri: item.productId.images?.[0] }}
                      style={s.itemImage}
                    />
                    <View style={s.itemInfo}>
                      <Text style={s.brandName}>{item.productId.brand}</Text>
                      <Text style={s.itemName}>{item.productId.name}</Text>
                      <Text style={s.itemSize}>Size: {item.size}</Text>
                      <Text style={s.itemPrice}>₹{item.productId.price}</Text>

                      <View style={s.quantityContainer}>
                        <TouchableOpacity
                          style={s.quantityButton}
                          onPress={() =>
                            handleQuantityChange(
                              item.productId._id,
                              item.size,
                              item.quantity - 1,
                              "saved"
                            )
                          }
                        >
                          <Minus size={16} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text style={s.quantity}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={s.quantityButton}
                          onPress={() =>
                            handleQuantityChange(
                              item.productId._id,
                              item.size,
                              item.quantity + 1,
                              "saved"
                            )
                          }
                        >
                          <Plus size={16} color={theme.colors.text} />
                        </TouchableOpacity>

                        <View style={s.itemActions}>
                          <TouchableOpacity
                            style={s.moveButton}
                            onPress={() => handleMoveToCart(item.productId._id, item.size)}
                          >
                            <Text style={s.moveButtonText}>Move to Cart</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={s.actionIconButton}
                            onPress={() => handleDelete(item.productId._id, item.size, "saved")}
                          >
                            <Trash2 size={18} color={theme.colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {isDesktop && cart && cart.items.length > 0 && (
            <View style={{ width: 350, marginLeft: 20, padding: 20, backgroundColor: theme.colors.surfaceElevated, borderRadius: 12, alignSelf: 'flex-start', borderWidth: 1, borderColor: theme.colors.border }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginBottom: 15, letterSpacing: 0.5 }}>PRICE DETAILS ({cart.items.length} Items)</Text>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>Total MRP</Text>
                <Text style={{ color: theme.colors.text, fontSize: 14 }}>₹{total}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>Discount on MRP</Text>
                <Text style={{ color: theme.colors.success, fontSize: 14 }}>₹0</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>Convenience Fee</Text>
                <Text style={{ color: theme.colors.success, fontSize: 14 }}>FREE</Text>
              </View>

              <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 15 }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.text }}>Total Amount</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.text }}>₹{total}</Text>
              </View>

              <TouchableOpacity
                style={{ backgroundColor: theme.colors.primary, padding: 15, borderRadius: 8, alignItems: 'center' }}
                onPress={handlePlaceOrder}
              >
                <Text style={{ color: theme.colors.primaryText, fontSize: 15, fontWeight: 'bold' }}>PLACE ORDER</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Footer for mobile only */}
        {!isDesktop && cart && cart.items.length > 0 && (
          <View style={s.footer}>
            <View style={s.totalContainer}>
              <Text style={s.totalLabel}>Total Amount</Text>
              <Text style={s.totalAmount}>₹{total}</Text>
            </View>
            <TouchableOpacity
              style={s.checkoutButton}
              onPress={handlePlaceOrder}
            >
              <Text style={s.checkoutButtonText}>PLACE ORDER</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Theme styling builder ───────────────────────────────────────────────────
import type { Theme } from "@/constants/theme";

function createThemedStyles(theme: Theme, isDesktop: boolean) {
  const { colors, spacing, radii, typography } = theme;

  return StyleSheet.create({
    loaderContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
      ...(isDesktop ? { alignItems: "center" as const } : {}),
    },
    innerContainer: {
      flex: 1,
      width: "100%",
      ...(isDesktop ? { maxWidth: 800 } : {}),
    },
    header: {
      padding: spacing.md,
      paddingTop: 50,
      backgroundColor: colors.surfaceElevated,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    headerTitle: {
      fontSize: typography.sizes.xxl,
      fontWeight: typography.weights.bold,
      color: colors.text,
    },
    content: {
      flex: 1,
      padding: spacing.md,
    },
    sectionHeader: {
      fontSize: typography.sizes.lg,
      fontWeight: typography.weights.semibold,
      color: colors.text,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    issuesBlock: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.error,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    issuesHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.xs,
      gap: 6,
    },
    issuesHeaderTitle: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.bold,
      color: colors.error,
    },
    issueText: {
      fontSize: typography.sizes.sm,
      color: colors.text,
      lineHeight: 18,
      marginTop: 2,
    },
    emptyStateSection: {
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xl,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderStyle: "dashed" as const,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptySectionText: {
      color: colors.textSecondary,
      fontSize: typography.sizes.sm,
      marginTop: spacing.sm,
    },
    emptyState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.xl,
    },
    emptyTitle: {
      fontSize: typography.sizes.lg,
      color: colors.text,
      marginTop: spacing.lg,
      marginBottom: spacing.lg,
    },
    loginButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
    },
    loginButtonText: {
      color: colors.primaryText,
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.bold,
    },
    bagItem: {
      flexDirection: "row",
      backgroundColor: colors.surfaceElevated,
      borderRadius: radii.md,
      marginBottom: spacing.md,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 4,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    savedItemCard: {
      opacity: 0.85,
    },
    itemImage: {
      width: 100,
      height: 125,
      resizeMode: "cover" as const,
    },
    itemInfo: {
      flex: 1,
      padding: spacing.md,
    },
    brandName: {
      fontSize: typography.sizes.xs,
      color: colors.textSecondary,
      fontWeight: typography.weights.semibold,
      marginBottom: 2,
    },
    itemName: {
      fontSize: typography.sizes.md,
      color: colors.text,
      marginBottom: 4,
    },
    itemSize: {
      fontSize: typography.sizes.xs,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    itemPrice: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.bold,
      color: colors.text,
      marginBottom: 6,
    },
    priceChangedAlert: {
      fontSize: typography.sizes.xs,
      color: colors.warning,
      fontWeight: typography.weights.medium,
      marginBottom: 6,
    },
    quantityContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: "auto",
    },
    quantityButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    quantity: {
      marginHorizontal: spacing.sm + 2,
      fontSize: typography.sizes.md,
      color: colors.text,
      minWidth: 16,
      textAlign: "center" as const,
    },
    itemActions: {
      flexDirection: "row",
      alignItems: "center",
      marginLeft: "auto",
      gap: 12,
    },
    actionIconButton: {
      padding: 6,
    },
    moveButton: {
      backgroundColor: colors.primaryLight,
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
      borderRadius: radii.sm,
    },
    moveButtonText: {
      fontSize: typography.sizes.xs,
      color: colors.primary,
      fontWeight: typography.weights.semibold,
    },
    footer: {
      padding: spacing.md,
      backgroundColor: colors.surfaceElevated,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    totalContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    totalLabel: {
      fontSize: typography.sizes.md,
      color: colors.textSecondary,
    },
    totalAmount: {
      fontSize: typography.sizes.xl,
      fontWeight: typography.weights.bold,
      color: colors.text,
    },
    checkoutButton: {
      backgroundColor: colors.primary,
      padding: spacing.md,
      borderRadius: radii.md,
      alignItems: "center",
    },
    checkoutButtonText: {
      color: colors.primaryText,
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.bold,
    },
  });
}

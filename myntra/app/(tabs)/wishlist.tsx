import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { useRouter } from "expo-router";
import { Heart, Trash2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { useResponsive } from "@/hooks/useResponsive";
import { useTheme } from "@/context/ThemeContext";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&auto=format&fit=crop";

export default function Wishlist() {
  const router = useRouter();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const { theme } = useTheme();
  const colors = theme.colors;
  const { user } = useAuth();
  const [wishlist, setwishlist] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchproduct();
  }, [user]);

  const fetchproduct = async () => {
    if (user) {
      try {
        setIsLoading(true);
        const bag = await axios.get(
          `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/wishlist/${user._id}`
        );
        setwishlist(bag.data);
      } catch (error) {
        console.log(error);
        setIsLoading(false);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handledelete = async (itemid: any) => {
    try {
      await axios.delete(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/wishlist/${itemid}`);
      fetchproduct();
    } catch (error) {
      console.log(error);
    }
  };

  const getProductImage = (p: any) => {
    if (p?.images && p.images.length > 0 && p.images[0]) return p.images[0];
    return PLACEHOLDER_IMAGE;
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, isDesktop && { alignItems: 'center' }]}>
        <View style={[styles.innerContainer, { maxWidth: isDesktop ? contentMaxWidth : '100%', width: '100%' }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Wishlist</Text>
        </View>
        <View style={styles.emptyState}>
          <Heart size={64} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Please login to view your wishlist
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.loginButtonText}>LOGIN</Text>
          </TouchableOpacity>
        </View>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, isDesktop && { alignItems: 'center' }]}>
      <View style={[styles.innerContainer, { maxWidth: isDesktop ? contentMaxWidth : '100%', width: '100%' }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Wishlist</Text>
        {wishlist && wishlist.length > 0 && (
          <Text style={[styles.itemCount, { color: colors.textSecondary }]}>
            {wishlist.length} item{wishlist.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      <ScrollView style={styles.content}>
        {(!wishlist || wishlist.length === 0) ? (
          <View style={styles.emptyState}>
            <Heart size={64} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Your wishlist is empty
            </Text>
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 20 }}>
              Save items you love to your wishlist
            </Text>
          </View>
        ) : (
          wishlist.map((item: any) => (
            <View key={item._id} style={[styles.wishlistItem, { backgroundColor: colors.card }]}>
              <Image source={{ uri: getProductImage(item.productId) }} style={styles.itemImage} />
              <View style={styles.itemInfo}>
                <Text style={[styles.brandName, { color: colors.textSecondary }]}>{item.productId.brand}</Text>
                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>{item.productId.name}</Text>
                <View style={styles.priceContainer}>
                  <Text style={[styles.price, { color: colors.text }]}>₹{item.productId.price}</Text>
                  <Text style={[styles.discount, { color: colors.primary }]}>{item.productId.discount}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.removeButton} onPress={() => handledelete(item._id)}>
                <Trash2 size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ))
        )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
  header: {
    padding: 15,
    paddingTop: 50,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  itemCount: {
    fontSize: 14,
    marginBottom: 2,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    marginTop: 20,
    marginBottom: 10,
    fontWeight: "600",
  },
  loginButton: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  wishlistItem: {
    flexDirection: "row",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  itemImage: {
    width: 100,
    height: 120,
    resizeMode: "cover",
  },
  itemInfo: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
  },
  brandName: {
    fontSize: 13,
    marginBottom: 4,
    fontWeight: "500",
  },
  itemName: {
    fontSize: 15,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  price: {
    fontSize: 15,
    fontWeight: "bold",
    marginRight: 10,
  },
  discount: {
    fontSize: 13,
    fontWeight: "600",
  },
  removeButton: {
    padding: 15,
    justifyContent: "center",
  },
});

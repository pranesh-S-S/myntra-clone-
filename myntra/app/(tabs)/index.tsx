import {
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Search, ChevronRight } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/hooks/useResponsive";
import { useRecentlyViewed } from "@/context/RecentlyViewedContext";
import { useTheme } from "@/context/ThemeContext";
import axios from "axios";

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&auto=format&fit=crop";

const deals = [
  {
    id: 1,
    title: "Under ₹599",
    image:
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500&auto=format&fit=crop",
  },
  {
    id: 2,
    title: "40-70% Off",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&auto=format&fit=crop",
  },
  {
    id: 3,
    title: "New Arrivals",
    image:
      "https://images.unsplash.com/photo-1558171813-01a36e0e19d8?w=500&auto=format&fit=crop",
  },
];

export default function Home() {
  const router = useRouter();
  const { isDesktop, isTablet, isMobile, contentMaxWidth } = useResponsive();
  const { recentlyViewed } = useRecentlyViewed();
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [product, setproduct] = useState<any>(null);
  const [categories, setcategories] = useState<any>(null);
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [recommendationSource, setRecommendationSource] = useState<string>("personalized");

  const handleProductPress = (productId: number) => {
    if (!user) {
      router.push("/login");
    } else {
      router.push(`/product/${productId}`);
    }
  };

  useEffect(() => {
    const fetchproduct = async () => {
      try {
        setIsLoading(true);
        const cat = await axios.get(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/category`);
        const product = await axios.get(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/product`);
        setcategories(cat.data);
        setproduct(product.data);
      } catch (error) {
        console.log(error);
        setIsLoading(false);
      } finally {
        setIsLoading(false);
      }
    };
    fetchproduct();
  }, []);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const params = user?._id ? `?userId=${user._id}` : "";
        const res = await axios.get(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/recommendations${params}`);
        setRecommendations(res.data.recommendations || []);
        setRecommendationSource(res.data.source || "popular");
      } catch (e) {
        // Silently ignore recommendation errors — non-critical feature
      }
    };
    fetchRecommendations();
  }, [user?._id]);

  const getProductCardWidth = () => {
    if (isDesktop) return "23%";
    if (isTablet) return "31%";
    return "48%";
  };

  const getCategoryCardSize = () => {
    if (isDesktop) return 120;
    if (isTablet) return 110;
    return 90;
  };

  const getDealCardWidth = () => {
    if (isDesktop) return 380;
    if (isTablet) return 320;
    return 260;
  };

  const getRecentlyViewedProducts = () => {
    if (!recentlyViewed || recentlyViewed.length === 0) return [];
    return recentlyViewed
      .map((item: any) => {
        if (item.productId && typeof item.productId === "object") {
          return item.productId;
        }
        if (product && Array.isArray(product)) {
          return product.find((p: any) => p._id === item.productId);
        }
        return null;
      })
      .filter((p: any) => p != null);
  };

  const getProductImage = (p: any) => {
    if (p?.images && p.images.length > 0 && p.images[0]) return p.images[0];
    return PLACEHOLDER_IMAGE;
  };

  const categorySize = getCategoryCardSize();
  const dealWidth = getDealCardWidth();
  const colors = theme.colors;

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={isDesktop ? { alignItems: 'center' } : undefined}
    >
      <View style={[styles.innerContainer, { maxWidth: isDesktop ? contentMaxWidth : '100%', width: '100%', backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.logo, { color: colors.primary }]}>MYNTRA</Text>
        <TouchableOpacity style={[styles.searchButton, { backgroundColor: colors.surface }]}>
          <Search size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Banner */}
      <Image
        source={{
          uri: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&auto=format&fit=crop",
        }}
        style={[styles.banner, { height: isDesktop ? 400 : isTablet ? 300 : 200 }]}
      />

      {/* Categories */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>SHOP BY CATEGORY</Text>
          <TouchableOpacity style={styles.viewAll}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
            <ChevronRight size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
        >
          {isLoading ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={styles.loader}
            />
          ) : !categories || categories.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No categories available</Text>
          ) : (
            categories.map((category: any) => (
              <TouchableOpacity key={category._id} style={[styles.categoryCard, { width: categorySize }]}>
                <Image
                  source={{ uri: category.image || PLACEHOLDER_IMAGE }}
                  style={[styles.categoryImage, { width: categorySize, height: categorySize }]}
                />
                <Text style={[styles.categoryName, { color: colors.text }]}>{category.name}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {/* Recently Viewed */}
      {getRecentlyViewedProducts().length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>RECENTLY VIEWED</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
          >
            {getRecentlyViewedProducts().map((rvProduct: any) => (
              <TouchableOpacity
                key={rvProduct._id}
                style={[styles.categoryCard, { width: categorySize }]}
                onPress={() => handleProductPress(rvProduct._id)}
              >
                <Image
                  source={{ uri: getProductImage(rvProduct) }}
                  style={[styles.categoryImage, { width: categorySize, height: categorySize }]}
                />
                <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={1}>
                  {rvProduct.brand}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: "center" }} numberOfLines={1}>
                  {rvProduct.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {recommendationSource === "personalized"
                ? "YOU MAY ALSO LIKE"
                : "TRENDING PICKS"}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
          >
            {recommendations.map((rec: any) => (
              <TouchableOpacity
                key={rec._id}
                style={[styles.categoryCard, { width: categorySize }]}
                onPress={() => handleProductPress(rec._id)}
              >
                <Image
                  source={{ uri: getProductImage(rec) }}
                  style={[styles.categoryImage, { width: categorySize, height: categorySize }]}
                />
                <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={1}>
                  {rec.brand}
                </Text>
                <Text
                  style={{ fontSize: 11, color: colors.textSecondary, textAlign: "center" }}
                  numberOfLines={1}
                >
                  {rec.name}
                </Text>
                <Text
                  style={{ fontSize: 12, fontWeight: "bold", color: colors.primary, textAlign: "center" }}
                >
                  ₹{rec.price}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Deals */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>DEALS OF THE DAY</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dealsScroll}
        >
          {deals.map((deal) => (
            <TouchableOpacity key={deal.id} style={[styles.dealCard, { width: dealWidth }]}>
              <Image source={{ uri: deal.image }} style={styles.dealImage} />
              <View style={styles.dealOverlay}>
                <Text style={styles.dealTitle}>{deal.title}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Trending Now */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>TRENDING NOW</Text>
        </View>
        <View style={styles.productsGrid}>
          {isLoading ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={styles.loader}
            />
          ) : !product || product.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No Product available</Text>
          ) : ( 
            <View style={styles.productsGrid}>
              {product.map((p: any) => (
                <TouchableOpacity
                  key={p._id}
                  style={[styles.productCard, { width: getProductCardWidth(), backgroundColor: colors.card }]}
                  onPress={() => handleProductPress(p._id)}
                >
                  <Image
                    source={{ uri: getProductImage(p) }}
                    style={[styles.productImage, { height: isDesktop ? 260 : isTablet ? 240 : 200 }]}
                  />
                  <View style={styles.productInfo}>
                    <Text style={[styles.brandName, { color: colors.textSecondary }]}>{p.brand}</Text>
                    <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
                    <View style={styles.priceRow}>
                      <Text style={[styles.productPrice, { color: colors.text }]}>₹{p.price}</Text>
                      <Text style={[styles.discount, { color: colors.primary }]}>{p.discount}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {},
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },
  logo: {
    fontSize: 26,
    fontWeight: "bold",
    letterSpacing: 3,
  },
  searchButton: {
    padding: 10,
    borderRadius: 20,
  },
  banner: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  section: {
    padding: 15,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  viewAll: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    marginRight: 5,
    fontWeight: "500",
  },
  categoriesScroll: {
    marginHorizontal: -15,
  },
  categoryCard: {
    width: 100,
    marginHorizontal: 8,
    alignItems: "center",
  },
  categoryImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  categoryName: {
    textAlign: "center",
    marginTop: 8,
    fontSize: 13,
    fontWeight: "500",
  },
  dealsScroll: {
    marginHorizontal: -15,
  },
  dealCard: {
    width: 280,
    height: 160,
    marginHorizontal: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  dealImage: {
    width: "100%",
    height: "100%",
  },
  dealOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 15,
  },
  dealTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  productCard: {
    width: "48%",
    marginHorizontal: "1%",
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  productInfo: {
    padding: 10,
  },
  brandName: {
    fontSize: 13,
    marginBottom: 2,
    fontWeight: "500",
  },
  productName: {
    fontSize: 14,
    marginBottom: 5,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "bold",
    marginRight: 8,
  },
  discount: {
    fontSize: 13,
    fontWeight: "600",
  },
  loader: {
    marginTop: 50,
  },
});

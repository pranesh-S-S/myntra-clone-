import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Heart, ShoppingBag } from "lucide-react-native";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/hooks/useResponsive";
import { useRecentlyViewed } from "@/context/RecentlyViewedContext";
import { useTheme } from "@/context/ThemeContext";
import axios from "axios";

// Mock product data - in a real app, this would come from an API
// const products = {
//   "1": {
//     id: 1,
//     name: "Casual White T-Shirt",
//     brand: "Roadster",
//     price: 499,
//     discount: "60% OFF",
//     description:
//       "Classic white t-shirt made from premium cotton. Perfect for everyday wear with a comfortable regular fit.",
//     sizes: ["S", "M", "L", "XL"],
//     images: [
//       "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop",
//       "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=500&auto=format&fit=crop",
//       "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500&auto=format&fit=crop",
//     ],
//   },
//   "2": {
//     id: 2,
//     name: "Denim Jacket",
//     brand: "Levis",
//     price: 2499,
//     discount: "40% OFF",
//     description:
//       "Classic denim jacket with a modern twist. Features premium quality denim and comfortable fit.",
//     sizes: ["S", "M", "L", "XL"],
//     images: [
//       "https://images.unsplash.com/photo-1523205771623-e0faa4d2813d?w=500&auto=format&fit=crop",
//       "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&auto=format&fit=crop",
//       "https://images.unsplash.com/photo-1601933973783-43cf8a7d4c5f?w=500&auto=format&fit=crop",
//     ],
//   },
//   "3": {
//     id: 3,
//     name: "Summer Dress",
//     brand: "ONLY",
//     price: 1299,
//     discount: "50% OFF",
//     description:
//       "Flowy summer dress perfect for warm weather. Made from lightweight fabric with a flattering cut.",
//     sizes: ["XS", "S", "M", "L"],
//     images: [
//       "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&auto=format&fit=crop",
//       "https://images.unsplash.com/photo-1623609163859-ca93c959b98a?w=500&auto=format&fit=crop",
//       "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop",
//     ],
//   },
//   "4": {
//     id: 4,
//     name: "Classic Sneakers",
//     brand: "Nike",
//     price: 3499,
//     discount: "30% OFF",
//     description:
//       "Versatile sneakers that combine style and comfort. Perfect for both casual wear and light exercise.",
//     sizes: ["UK6", "UK7", "UK8", "UK9", "UK10"],
//     images: [
//       "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop",
//       "https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=500&auto=format&fit=crop",
//       "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&auto=format&fit=crop",
//     ],
//   },
// };

export default function ProductDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width, isDesktop, contentMaxWidth } = useResponsive();
  const [selectedSize, setSelectedSize] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollTimer = useRef<NodeJS.Timeout>();
  const { user } = useAuth();
  const { trackView } = useRecentlyViewed();
  const { theme } = useTheme();
  const colors = theme.colors;
  const [product, setproduct] = useState<any>(null);
  const [iswishlist, setiswishlist] = useState(false);

  useEffect(() => {
    if (id && typeof id === "string") {
      trackView(id, user?._id);
      // Track view for personalization engine (fire-and-forget; don't block UI)
      if (user?._id) {
        axios
          .post(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/recommendations/track-view`, {
            userId: user._id,
            productId: id,
          })
          .catch(() => {}); // Silently ignore tracking errors
      }
    }
  }, [id, user?._id, trackView]);

  useEffect(() => {
    // Simulate loading time

    const fetchproduct = async () => {
      try {
        setIsLoading(true);
        const product = await axios.get(
          `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/product/${id}`
        );
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
    // Start auto-scroll
    startAutoScroll();

    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, []);

  const startAutoScroll = () => {
    autoScrollTimer.current = setInterval(() => {
      if (product && scrollViewRef.current) {
        const nextIndex = (currentImageIndex + 1) % product.images.length;
        scrollViewRef.current.scrollTo({
          x: nextIndex * width,
          animated: true,
        });
        setCurrentImageIndex(nextIndex);
      }
    }, 3000);
  };

  if (!product) {
    return (
      <View style={styles.container}>
        <Text>Product not found</Text>
      </View>
    );
  }
  const handleAddwishlist = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      await axios.post(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/wishlist`, {
        userId: user._id,
        productId: id,
      });
      setiswishlist(true);
      router.push("/wishlist");
    } catch (error) {
      console.log(error);
    }
  };
  const handleAddToBag = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (!selectedSize) {
      // In a real app, show a proper error message
      alert("Please select a size");
      return;
    }
    try {
      setLoading(true);
      await axios.post(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/bag`, {
        userId: user._id,
        productId: id,
        size: selectedSize,
        quantity: 1,
      });
      router.push("/bag");
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
    // In a real app, this would add the item to the cart in your state management solution
  };

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const imageIndex = Math.round(contentOffset.x / width);
    setCurrentImageIndex(imageIndex);

    // Reset auto-scroll timer when user manually scrolls
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      startAutoScroll();
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, isDesktop && { alignItems: 'center' }]}>
      <ScrollView contentContainerStyle={isDesktop ? { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' } : undefined}>
        <View style={isDesktop ? styles.desktopRow : undefined}>
          <View style={isDesktop ? styles.desktopImageSection : undefined}>
            <View style={styles.carouselContainer}>
              <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
              >
                {product.images.map((image: any, index: any) => (
                  <Image
                    key={index}
                    source={{ uri: image }}
                    style={[styles.productImage, { width: isDesktop ? width * 0.45 : width }]}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              <View style={styles.pagination}>
                {product.images.map((_: any, index: any) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      currentImageIndex === index && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>

          <View style={isDesktop ? styles.desktopDetailsSection : undefined}>
            <View style={[styles.content, { backgroundColor: colors.background }]}>
              <View style={styles.header}>
                <View>
                  <Text style={[styles.brand, { color: colors.textSecondary }]}>{product.brand}</Text>
                  <Text style={[styles.name, { color: colors.text }]}>{product.name}</Text>
                </View>
                <TouchableOpacity
                  style={styles.wishlistButton}
                  onPress={handleAddwishlist}
                >
                  <Heart
                    size={24}
                    color={iswishlist ? colors.primary : colors.textTertiary}
                    fill={iswishlist ? colors.primary : "none"}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.priceContainer}>
                <Text style={[styles.price, { color: colors.text }]}>₹{product.price}</Text>
                <Text style={[styles.discount, { color: colors.primary }]}>{product.discount}</Text>
              </View>

              <Text style={[styles.description, { color: colors.textSecondary }]}>{product.description}</Text>

              <View style={styles.sizeSection}>
                <Text style={[styles.sizeTitle, { color: colors.text }]}>Select Size</Text>
                <View style={styles.sizeGrid}>
                  {product.sizes.map((size: any) => (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.sizeButton,
                        { borderColor: colors.border },
                        selectedSize === size && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                      ]}
                      onPress={() => setSelectedSize(size)}
                    >
                      <Text
                        style={[
                          styles.sizeText,
                          { color: colors.text },
                          selectedSize === size && { color: colors.primary },
                        ]}
                      >
                        {size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {isDesktop && (
                <TouchableOpacity
                  style={[styles.addToBagButton, { backgroundColor: colors.primary }]}
                  onPress={handleAddToBag}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.primaryText} />
                  ) : (
                    <>
                      <ShoppingBag size={20} color={colors.primaryText} />
                      <Text style={[styles.addToBagText, { color: colors.primaryText }]}>ADD TO BAG</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {!isDesktop && (
        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.addToBagButton, { backgroundColor: colors.primary }]}
            onPress={handleAddToBag}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.primaryText} />
            ) : (
              <>
                <ShoppingBag size={20} color={colors.primaryText} />
                <Text style={[styles.addToBagText, { color: colors.primaryText }]}>ADD TO BAG</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  desktopRow: {
    flexDirection: "row",
  },
  desktopImageSection: {
    flex: 1,
    maxWidth: "50%",
  },
  desktopDetailsSection: {
    flex: 1,
    maxWidth: "50%",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  carouselContainer: {
    position: "relative",
  },
  productImage: {
    height: 400,
  },
  pagination: {
    position: "absolute",
    bottom: 16,
    flexDirection: "row",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: "#fff",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brand: {
    fontSize: 16,
    marginBottom: 5,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  wishlistButton: {
    padding: 10,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  price: {
    fontSize: 20,
    fontWeight: "bold",
    marginRight: 10,
  },
  discount: {
    fontSize: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  sizeSection: {
    marginBottom: 20,
  },
  sizeTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  sizeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  sizeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sizeText: {
    fontSize: 16,
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
  },
  addToBagButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  addToBagText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});


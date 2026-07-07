import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { useRouter } from "expo-router";
import { CreditCard, MapPin, Truck } from "lucide-react-native";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/context/ThemeContext";

export default function Checkout() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Address form states
  const [fullName, setFullName] = useState("John Doe");
  const [addressLine1, setAddressLine1] = useState("123 Main Street");
  const [addressLine2, setAddressLine2] = useState("Apt 4B");
  const [city, setCity] = useState("New York");
  const [stateVal, setStateVal] = useState("NY");
  const [pincode, setPincode] = useState("10001");
  const [country, setCountry] = useState("United States");

  // Saved addresses list from profile
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Dynamic Cart calculations
  const [cart, setCart] = useState<any>(null);
  const [isLoadingCart, setIsLoadingCart] = useState(false);

  useEffect(() => {
    if (user) {
      loadSavedAddresses();
      fetchCart();
    }
  }, [user]);

  const loadSavedAddresses = async () => {
    try {
      const stored = await AsyncStorage.getItem(`@addresses_${user._id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSavedAddresses(parsed);
        // Find default address to select initially
        const defaultAddr = parsed.find((a: any) => a.isDefault);
        if (defaultAddr) {
          selectAddress(defaultAddr);
        }
      }
    } catch (err) {
      console.error("Failed to load saved addresses:", err);
    }
  };

  const fetchCart = async () => {
    try {
      setIsLoadingCart(true);
      const res = await axios.get(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/cart/${user._id}`);
      setCart(res.data);
    } catch (error) {
      console.log("Error loading cart for checkout:", error);
    } finally {
      setIsLoadingCart(false);
    }
  };

  const selectAddress = (addr: any) => {
    setSelectedAddressId(addr.id);
    setFullName(addr.name);
    setAddressLine1(addr.addressLine1);
    setAddressLine2(addr.addressLine2 || "");
    setCity(addr.city);
    setStateVal(addr.state);
    setPincode(addr.pincode);
    setCountry("India"); // Default country for saved addresses
  };

  // Computations
  const subtotal = cart?.items?.reduce(
    (sum: number, item: any) => sum + (item.productId?.price || 0) * item.quantity,
    0
  ) || 0;

  const tax = Math.round(subtotal * 0.05); // 5% GST/Tax
  const shipping = subtotal > 999 || subtotal === 0 ? 0 : 99; // Free shipping above 999
  const grandTotal = subtotal + tax + shipping;

  const handleplaceorder = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (!fullName.trim() || !addressLine1.trim() || !city.trim() || !stateVal.trim() || !pincode.trim() || !country.trim()) {
      if (Platform.OS === "web") {
        alert("Please fill in all shipping details.");
      } else {
        Alert.alert("Missing Details", "Please fill in all shipping details.");
      }
      return;
    }

    try {
      setLoading(true);
      // Construct dynamic shipping address string
      const shippingAddress = `${fullName}, ${addressLine1}${addressLine2 ? ', ' + addressLine2 : ''}, ${city}, ${stateVal} - ${pincode}, ${country}`;

      await axios.post(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/order/create/${user._id}`, {
        shippingAddress,
        paymentMethod: "Card",
      });
      // Redirect to /orders with fromCheckout=true to handle back actions properly
      router.replace("/orders?fromCheckout=true");
    } catch (error) {
      console.log(error);
      if (Platform.OS === "web") {
        alert("Failed to place order. Please try again.");
      } else {
        Alert.alert("Error", "Failed to place order.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Checkout</Text>
      </View>
      <ScrollView style={styles.content}>
        
        {/* Saved Addresses Section */}
        {savedAddresses.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <MapPin size={24} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Saved Address</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
              {savedAddresses.map((addr) => (
                <TouchableOpacity
                  key={addr.id}
                  style={[
                    styles.addressCard,
                    {
                      borderColor: selectedAddressId === addr.id ? colors.primary : colors.border,
                      backgroundColor: selectedAddressId === addr.id ? colors.primaryLight : colors.surface,
                    },
                  ]}
                  onPress={() => selectAddress(addr)}
                >
                  <Text style={[styles.addressLabel, { color: colors.text }]} numberOfLines={1}>{addr.label}</Text>
                  <Text style={[styles.addressText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {addr.name}
                  </Text>
                  <Text style={[styles.addressText, { color: colors.textTertiary }]} numberOfLines={1}>
                    {addr.addressLine1}, {addr.city}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.addressCard,
                  {
                    borderColor: selectedAddressId === null ? colors.primary : colors.border,
                    backgroundColor: selectedAddressId === null ? colors.primaryLight : colors.surface,
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
                onPress={() => {
                  setSelectedAddressId(null);
                  setFullName("");
                  setAddressLine1("");
                  setAddressLine2("");
                  setCity("");
                  setStateVal("");
                  setPincode("");
                  setCountry("");
                }}
              >
                <Text style={{ color: colors.primary, fontWeight: "600" }}>Manual / New</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Address Form */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <MapPin size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Shipping Address</Text>
          </View>
          <View style={styles.form}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
              placeholder="Full Name"
              placeholderTextColor={colors.inputPlaceholder}
              value={fullName}
              onChangeText={(t) => {
                setFullName(t);
                setSelectedAddressId(null);
              }}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
              placeholder="Address Line 1"
              placeholderTextColor={colors.inputPlaceholder}
              value={addressLine1}
              onChangeText={(t) => {
                setAddressLine1(t);
                setSelectedAddressId(null);
              }}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
              placeholder="Address Line 2 (optional)"
              placeholderTextColor={colors.inputPlaceholder}
              value={addressLine2}
              onChangeText={(t) => {
                setAddressLine2(t);
                setSelectedAddressId(null);
              }}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                placeholder="City"
                placeholderTextColor={colors.inputPlaceholder}
                value={city}
                onChangeText={(t) => {
                  setCity(t);
                  setSelectedAddressId(null);
                }}
              />
              <TextInput
                style={[styles.input, styles.halfInput, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                placeholder="State"
                placeholderTextColor={colors.inputPlaceholder}
                value={stateVal}
                onChangeText={(t) => {
                  setStateVal(t);
                  setSelectedAddressId(null);
                }}
              />
            </View>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                placeholder="Postal Code"
                placeholderTextColor={colors.inputPlaceholder}
                value={pincode}
                onChangeText={(t) => {
                  setPincode(t);
                  setSelectedAddressId(null);
                }}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.halfInput, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                placeholder="Country"
                placeholderTextColor={colors.inputPlaceholder}
                value={country}
                onChangeText={(t) => {
                  setCountry(t);
                  setSelectedAddressId(null);
                }}
              />
            </View>
          </View>
        </View>

        {/* Payment Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <CreditCard size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Method</Text>
          </View>
          <View style={styles.form}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
              placeholder="Card Number"
              placeholderTextColor={colors.inputPlaceholder}
              defaultValue="**** **** **** 4242"
              editable={false}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                placeholder="Expiry Date"
                placeholderTextColor={colors.inputPlaceholder}
                defaultValue="12/25"
                editable={false}
              />
              <TextInput
                style={[styles.input, styles.halfInput, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                placeholder="CVV"
                placeholderTextColor={colors.inputPlaceholder}
                defaultValue="***"
                editable={false}
              />
            </View>
          </View>
        </View>

        {/* Dynamic Order Summary */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Truck size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Summary</Text>
          </View>
          {isLoadingCart ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Subtotal</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>₹{subtotal}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Shipping</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {shipping === 0 ? "FREE" : `₹${shipping}`}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Tax (5% GST)</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>₹{tax}</Text>
              </View>
              <View style={[styles.summaryRow, styles.total, { borderTopColor: colors.border }]}>
                <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
                <Text style={[styles.totalValue, { color: colors.primary }]}>₹{grandTotal}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.placeOrderButton, { backgroundColor: colors.primary }]}
          onPress={handleplaceorder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primaryText} />
          ) : (
            <Text style={[styles.placeOrderButtonText, { color: colors.primaryText }]}>PLACE ORDER</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 15,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
    marginBottom: 20,
    borderRadius: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  form: {
    gap: 10,
  },
  input: {
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfInput: {
    width: "48%",
  },
  summary: {
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  summaryLabel: {
    fontSize: 16,
  },
  summaryValue: {
    fontSize: 16,
  },
  total: {
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
  },
  placeOrderButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  placeOrderButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  addressCard: {
    width: 140,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    marginRight: 10,
    minHeight: 90,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  addressText: {
    fontSize: 12,
    lineHeight: 16,
  },
});

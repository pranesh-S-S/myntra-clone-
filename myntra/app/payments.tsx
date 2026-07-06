import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import {
  CreditCard,
  Plus,
  Trash2,
  ArrowLeft,
  Check,
  Smartphone,
} from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/hooks/useResponsive";
import { useTheme } from "@/context/ThemeContext";

type PaymentMethod = {
  id: string;
  type: "card" | "upi";
  label: string;
  last4?: string;
  cardHolder?: string;
  expiryMonth?: string;
  expiryYear?: string;
  upiId?: string;
  isDefault: boolean;
};

export default function Payments() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const { theme } = useTheme();
  const colors = theme.colors;

  const [methods, setMethods] = useState<PaymentMethod[]>([
    {
      id: "1",
      type: "card",
      label: "Visa ending in 4242",
      last4: "4242",
      cardHolder: "Pranesh S S",
      expiryMonth: "12",
      expiryYear: "28",
      isDefault: true,
    },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addType, setAddType] = useState<"card" | "upi">("card");

  // Card form
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");

  // UPI form
  const [upiId, setUpiId] = useState("");

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 16);
    return cleaned.replace(/(.{4})/g, "$1 ").trim();
  };

  const handleAddCard = () => {
    const cleaned = cardNumber.replace(/\s/g, "");
    if (cleaned.length < 16) {
      showAlert("Invalid Card", "Please enter a valid 16-digit card number.");
      return;
    }
    if (!cardHolder.trim()) {
      showAlert("Missing Name", "Please enter the cardholder name.");
      return;
    }
    if (!expiryMonth || !expiryYear) {
      showAlert("Missing Expiry", "Please enter the expiry month and year.");
      return;
    }

    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      type: "card",
      label: `Card ending in ${cleaned.slice(-4)}`,
      last4: cleaned.slice(-4),
      cardHolder: cardHolder.trim(),
      expiryMonth,
      expiryYear,
      isDefault: methods.length === 0,
    };
    setMethods([...methods, newMethod]);
    resetForm();
  };

  const handleAddUpi = () => {
    if (!upiId.includes("@")) {
      showAlert("Invalid UPI ID", "Please enter a valid UPI ID (e.g., name@upi).");
      return;
    }
    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      type: "upi",
      label: upiId,
      upiId,
      isDefault: methods.length === 0,
    };
    setMethods([...methods, newMethod]);
    resetForm();
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setCardNumber("");
    setCardHolder("");
    setExpiryMonth("");
    setExpiryYear("");
    setUpiId("");
  };

  const handleDelete = (id: string) => {
    setMethods(methods.filter((m) => m.id !== id));
  };

  const handleSetDefault = (id: string) => {
    setMethods(
      methods.map((m) => ({ ...m, isDefault: m.id === id }))
    );
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Payment Methods</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <CreditCard size={64} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Please login to manage payment methods</Text>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/login")}>
            <Text style={styles.primaryBtnText}>LOGIN</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, isDesktop && { alignItems: "center" }]}>
      <View style={{ maxWidth: isDesktop ? contentMaxWidth : "100%", width: "100%", flex: 1 }}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Payment Methods</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Saved methods */}
          {methods.map((method) => (
            <View key={method.id} style={[styles.methodCard, { backgroundColor: colors.card, borderColor: method.isDefault ? colors.primary : colors.border }]}>
              <View style={styles.methodRow}>
                {method.type === "card" ? (
                  <CreditCard size={24} color={colors.primary} />
                ) : (
                  <Smartphone size={24} color={colors.primary} />
                )}
                <View style={styles.methodInfo}>
                  <Text style={[styles.methodLabel, { color: colors.text }]}>{method.label}</Text>
                  {method.type === "card" && (
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      {method.cardHolder} · Expires {method.expiryMonth}/{method.expiryYear}
                    </Text>
                  )}
                  {method.isDefault && (
                    <View style={[styles.defaultBadge, { backgroundColor: colors.primaryLight }]}>
                      <Check size={12} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontSize: 12, marginLeft: 4 }}>Default</Text>
                    </View>
                  )}
                </View>
                <View style={styles.methodActions}>
                  {!method.isDefault && (
                    <TouchableOpacity onPress={() => handleSetDefault(method.id)} style={{ marginRight: 12 }}>
                      <Text style={{ color: colors.primary, fontSize: 13 }}>Set Default</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => handleDelete(method.id)}>
                    <Trash2 size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          {methods.length === 0 && !showAddForm && (
            <View style={styles.emptyState}>
              <CreditCard size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No payment methods saved</Text>
              <Text style={{ color: colors.textSecondary, textAlign: "center", marginBottom: 20 }}>
                Add a card or UPI to make checkout faster
              </Text>
            </View>
          )}

          {/* Add form */}
          {showAddForm ? (
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>Add Payment Method</Text>

              {/* Type toggle */}
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[styles.typeBtn, { backgroundColor: addType === "card" ? colors.primary : colors.surface }]}
                  onPress={() => setAddType("card")}
                >
                  <CreditCard size={16} color={addType === "card" ? colors.primaryText : colors.text} />
                  <Text style={{ color: addType === "card" ? colors.primaryText : colors.text, marginLeft: 6, fontWeight: "600" }}>Card</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, { backgroundColor: addType === "upi" ? colors.primary : colors.surface }]}
                  onPress={() => setAddType("upi")}
                >
                  <Smartphone size={16} color={addType === "upi" ? colors.primaryText : colors.text} />
                  <Text style={{ color: addType === "upi" ? colors.primaryText : colors.text, marginLeft: 6, fontWeight: "600" }}>UPI</Text>
                </TouchableOpacity>
              </View>

              {addType === "card" ? (
                <>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Card Number</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                    placeholder="1234 5678 9012 3456"
                    placeholderTextColor={colors.inputPlaceholder}
                    value={formatCardNumber(cardNumber)}
                    onChangeText={(t) => setCardNumber(t.replace(/\s/g, ""))}
                    keyboardType="number-pad"
                    maxLength={19}
                  />
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Cardholder Name</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                    placeholder="John Doe"
                    placeholderTextColor={colors.inputPlaceholder}
                    value={cardHolder}
                    onChangeText={setCardHolder}
                  />
                  <View style={styles.expiryRow}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Month</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                        placeholder="MM"
                        placeholderTextColor={colors.inputPlaceholder}
                        value={expiryMonth}
                        onChangeText={(t) => setExpiryMonth(t.replace(/\D/g, "").slice(0, 2))}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Year</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                        placeholder="YY"
                        placeholderTextColor={colors.inputPlaceholder}
                        value={expiryYear}
                        onChangeText={(t) => setExpiryYear(t.replace(/\D/g, "").slice(0, 2))}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                    </View>
                  </View>
                  <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={handleAddCard}>
                    <Text style={styles.primaryBtnText}>Save Card</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>UPI ID</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                    placeholder="yourname@upi"
                    placeholderTextColor={colors.inputPlaceholder}
                    value={upiId}
                    onChangeText={setUpiId}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={handleAddUpi}>
                    <Text style={styles.primaryBtnText}>Save UPI</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={resetForm}>
                <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.addButton, { borderColor: colors.primary }]}
              onPress={() => setShowAddForm(true)}
            >
              <Plus size={20} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: "600", marginLeft: 8 }}>Add Payment Method</Text>
            </TouchableOpacity>
          )}
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
  emptyState: { alignItems: "center", justifyContent: "center", marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginTop: 16, marginBottom: 8 },
  methodCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  methodRow: { flexDirection: "row", alignItems: "center" },
  methodInfo: { flex: 1, marginLeft: 14 },
  methodLabel: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  defaultBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4, alignSelf: "flex-start" },
  methodActions: { flexDirection: "row", alignItems: "center" },
  formCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    marginTop: 10,
  },
  formTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16 },
  typeToggle: { flexDirection: "row", gap: 10, marginBottom: 20 },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
  inputLabel: { fontSize: 13, marginBottom: 6, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    marginBottom: 14,
  },
  expiryRow: { flexDirection: "row" },
  primaryBtn: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginTop: 10,
  },
});

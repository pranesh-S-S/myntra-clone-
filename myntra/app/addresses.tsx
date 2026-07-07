import React, { useState, useEffect } from "react";
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
  MapPin,
  Plus,
  Trash2,
  ArrowLeft,
  Check,
  Edit3,
  Home,
  Briefcase,
} from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/hooks/useResponsive";
import { useTheme } from "@/context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Address = {
  id: string;
  label: "Home" | "Work" | "Other";
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

export default function Addresses() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const { theme } = useTheme();
  const colors = theme.colors;

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [label, setLabel] = useState<"Home" | "Work" | "Other">("Home");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  useEffect(() => {
    if (user) {
      loadAddresses();
    }
  }, [user]);

  const loadAddresses = async () => {
    try {
      const stored = await AsyncStorage.getItem(`@addresses_${user._id}`);
      if (stored) {
        setAddresses(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load addresses:", err);
    }
  };

  const saveAddresses = async (newAddrs: Address[]) => {
    try {
      await AsyncStorage.setItem(`@addresses_${user._id}`, JSON.stringify(newAddrs));
    } catch (err) {
      console.error("Failed to save addresses:", err);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setLabel("Home");
    setName("");
    setPhone("");
    setAddressLine1("");
    setAddressLine2("");
    setCity("");
    setState("");
    setPincode("");
  };

  const handleSave = () => {
    if (!name.trim()) { showAlert("Missing", "Please enter your full name."); return; }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) { showAlert("Invalid", "Please enter a valid 10-digit phone number."); return; }
    if (!addressLine1.trim()) { showAlert("Missing", "Please enter your address."); return; }
    if (!city.trim()) { showAlert("Missing", "Please enter the city."); return; }
    if (!state.trim()) { showAlert("Missing", "Please enter the state."); return; }
    if (!pincode.trim() || pincode.replace(/\D/g, "").length < 6) { showAlert("Invalid", "Please enter a valid 6-digit pincode."); return; }

    const newAddress: Address = {
      id: editingId || Date.now().toString(),
      label,
      name: name.trim(),
      phone: phone.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      isDefault: addresses.length === 0,
    };

    let updated;
    if (editingId) {
      updated = addresses.map((a) => (a.id === editingId ? { ...newAddress, isDefault: a.isDefault } : a));
    } else {
      updated = [...addresses, newAddress];
    }
    setAddresses(updated);
    saveAddresses(updated);
    resetForm();
  };

  const handleEdit = (addr: Address) => {
    setEditingId(addr.id);
    setLabel(addr.label);
    setName(addr.name);
    setPhone(addr.phone);
    setAddressLine1(addr.addressLine1);
    setAddressLine2(addr.addressLine2);
    setCity(addr.city);
    setState(addr.state);
    setPincode(addr.pincode);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const remaining = addresses.filter((a) => a.id !== id);
    // If deleted the default, make the first remaining one the default
    if (remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
      remaining[0].isDefault = true;
    }
    setAddresses(remaining);
    saveAddresses(remaining);
  };

  const handleSetDefault = (id: string) => {
    const updated = addresses.map((a) => ({ ...a, isDefault: a.id === id }));
    setAddresses(updated);
    saveAddresses(updated);
  };

  const getLabelIcon = (l: string) => {
    if (l === "Home") return Home;
    if (l === "Work") return Briefcase;
    return MapPin;
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Addresses</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <MapPin size={64} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Please login to manage addresses</Text>
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Addresses</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Saved addresses */}
          {addresses.map((addr) => {
            const LabelIcon = getLabelIcon(addr.label);
            return (
              <View key={addr.id} style={[styles.addrCard, { backgroundColor: colors.card, borderColor: addr.isDefault ? colors.primary : colors.border }]}>
                <View style={styles.addrRow}>
                  <LabelIcon size={22} color={colors.primary} />
                  <View style={styles.addrInfo}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={[styles.addrLabel, { color: colors.text }]}>{addr.label}</Text>
                      {addr.isDefault && (
                        <View style={[styles.defaultBadge, { backgroundColor: colors.primaryLight }]}>
                          <Check size={10} color={colors.primary} />
                          <Text style={{ color: colors.primary, fontSize: 11, marginLeft: 3 }}>Default</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.addrName, { color: colors.text }]}>{addr.name}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                      {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      {addr.city}, {addr.state} - {addr.pincode}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>📞 {addr.phone}</Text>
                  </View>
                </View>
                <View style={styles.addrActions}>
                  {!addr.isDefault && (
                    <TouchableOpacity onPress={() => handleSetDefault(addr.id)} style={styles.actionBtn}>
                      <Text style={{ color: colors.primary, fontSize: 13 }}>Set Default</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => handleEdit(addr)} style={styles.actionBtn}>
                    <Edit3 size={16} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginLeft: 4 }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(addr.id)} style={styles.actionBtn}>
                    <Trash2 size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {addresses.length === 0 && !showForm && (
            <View style={styles.emptyState}>
              <MapPin size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No addresses saved</Text>
              <Text style={{ color: colors.textSecondary, textAlign: "center", marginBottom: 20 }}>
                Add a delivery address to make checkout faster
              </Text>
            </View>
          )}

          {/* Add/Edit form */}
          {showForm ? (
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>
                {editingId ? "Edit Address" : "Add New Address"}
              </Text>

              {/* Label selector */}
              <View style={styles.labelRow}>
                {(["Home", "Work", "Other"] as const).map((l) => {
                  const Icon = getLabelIcon(l);
                  return (
                    <TouchableOpacity
                      key={l}
                      style={[styles.labelBtn, { backgroundColor: label === l ? colors.primary : colors.surface }]}
                      onPress={() => setLabel(l)}
                    >
                      <Icon size={14} color={label === l ? colors.primaryText : colors.text} />
                      <Text style={{ color: label === l ? colors.primaryText : colors.text, marginLeft: 6, fontWeight: "600", fontSize: 13 }}>{l}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                placeholder="John Doe"
                placeholderTextColor={colors.inputPlaceholder}
                value={name}
                onChangeText={setName}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Phone Number</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                placeholder="9876543210"
                placeholderTextColor={colors.inputPlaceholder}
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 10))}
                keyboardType="phone-pad"
                maxLength={10}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Address Line 1</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                placeholder="House No., Street, Area"
                placeholderTextColor={colors.inputPlaceholder}
                value={addressLine1}
                onChangeText={setAddressLine1}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Address Line 2 (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                placeholder="Landmark, nearby"
                placeholderTextColor={colors.inputPlaceholder}
                value={addressLine2}
                onChangeText={setAddressLine2}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>City</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                    placeholder="Chennai"
                    placeholderTextColor={colors.inputPlaceholder}
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>State</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                    placeholder="Tamil Nadu"
                    placeholderTextColor={colors.inputPlaceholder}
                    value={state}
                    onChangeText={setState}
                  />
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Pincode</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.inputText, borderColor: colors.border }]}
                placeholder="600001"
                placeholderTextColor={colors.inputPlaceholder}
                value={pincode}
                onChangeText={(t) => setPincode(t.replace(/\D/g, "").slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />

              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
                <Text style={styles.primaryBtnText}>{editingId ? "Update Address" : "Save Address"}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={resetForm}>
                <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.addButton, { borderColor: colors.primary }]}
              onPress={() => setShowForm(true)}
            >
              <Plus size={20} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: "600", marginLeft: 8 }}>Add New Address</Text>
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
  addrCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  addrRow: { flexDirection: "row", alignItems: "flex-start" },
  addrInfo: { flex: 1, marginLeft: 14 },
  addrLabel: { fontSize: 15, fontWeight: "bold" },
  addrName: { fontSize: 14, fontWeight: "600", marginTop: 4 },
  defaultBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  addrActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 12, gap: 16 },
  actionBtn: { flexDirection: "row", alignItems: "center" },
  formCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    marginTop: 10,
  },
  formTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16 },
  labelRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  labelBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
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
  row: { flexDirection: "row" },
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

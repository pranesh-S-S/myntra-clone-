import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Download,
  FileText,
  Filter,
  X,
  ChevronDown,
} from "lucide-react-native";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/hooks/useResponsive";
import { useTheme } from "@/context/ThemeContext";

const API_BASE = `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/transactions`;

type Transaction = {
  _id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMode: string;
  gatewayTransactionId: string;
  createdAt: string;
};

const PAYMENT_MODES = ["Card", "UPI", "NetBanking", "Wallet", "COD"];
const STATUSES = ["Pending", "Success", "Failed", "Refunded"];

export default function TransactionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDesktop, contentMaxWidth } = useResponsive();
  const { theme } = useTheme();
  const colors = theme.colors;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPaymentMode, setFilterPaymentMode] = useState("");

  // Receipt download states
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    Success: { bg: theme.isDark ? "#103E2D" : "#E6F9F0", text: theme.isDark ? "#34D399" : "#0D8050" },
    Pending: { bg: theme.isDark ? "#5C3E1A" : "#FFF8E6", text: theme.isDark ? "#FBBF24" : "#D9822B" },
    Failed: { bg: theme.isDark ? "#4C1D24" : "#FFE6EB", text: theme.isDark ? "#FF527B" : "#D01C53" },
    Refunded: { bg: theme.isDark ? "#1E2A4A" : "#E6F0FF", text: theme.isDark ? "#60A5FA" : "#1A6DCC" },
  };

  const fetchTransactions = useCallback(
    async (cursor?: string | null, append = false) => {
      if (!user) return;

      if (append) setLoadingMore(true);
      else setIsLoading(true);

      try {
        const params: Record<string, string> = { userId: user._id, limit: "15" };
        if (filterStatus) params.status = filterStatus;
        if (filterPaymentMode) params.paymentMode = filterPaymentMode;
        if (cursor) params.cursor = cursor;

        const res = await axios.get(API_BASE, { params });
        const data = res.data;

        if (append) {
          setTransactions((prev) => [...prev, ...data.items]);
        } else {
          setTransactions(data.items);
        }
        setNextCursor(data.nextCursor);
        setHasNextPage(data.hasNextPage);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setIsLoading(false);
        setLoadingMore(false);
      }
    },
    [user, filterStatus, filterPaymentMode]
  );

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleLoadMore = () => {
    if (hasNextPage && nextCursor && !loadingMore) {
      fetchTransactions(nextCursor, true);
    }
  };

  const handleExportCSV = async () => {
    if (!user) return;
    const params = new URLSearchParams({ userId: user._id });
    if (filterStatus) params.set("status", filterStatus);
    if (filterPaymentMode) params.set("paymentMode", filterPaymentMode);

    const url = `${API_BASE}/export?${params.toString()}`;

    if (Platform.OS === "web") {
      window.open(url, "_blank");
    } else {
      await Linking.openURL(url);
    }
  };

  const handleDownloadReceipt = async (transactionId: string) => {
    setDownloadingId(transactionId);
    try {
      const res = await axios.get(`${API_BASE}/receipt/token/${transactionId}`);
      const { downloadUrl } = res.data;

      if (Platform.OS === "web") {
        window.open(downloadUrl, "_blank");
      } else {
        await Linking.openURL(downloadUrl);
      }
    } catch (error) {
      console.error("Error downloading receipt:", error);
      alert("Failed to generate receipt download link.");
    } finally {
      setDownloadingId(null);
    }
  };

  const resetFilters = () => {
    setFilterStatus("");
    setFilterPaymentMode("");
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Transactions</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <FileText size={64} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Please login to view transactions</Text>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/login")}>
            <Text style={styles.primaryBtnText}>LOGIN</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, isDesktop && { alignItems: "center" }]}>
      <View
        style={[
          styles.innerContainer,
          { maxWidth: isDesktop ? contentMaxWidth : "100%", width: "100%", backgroundColor: colors.background },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Transactions</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Filter size={20} color={showFilters ? colors.primary : colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleExportCSV}>
              <Download size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Bar */}
        {showFilters && (
          <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Status:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {STATUSES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.filterChip,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      filterStatus === s && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setFilterStatus(filterStatus === s ? "" : s)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: colors.text },
                        filterStatus === s && { color: colors.primaryText, fontWeight: "600" },
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Mode:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {PAYMENT_MODES.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.filterChip,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      filterPaymentMode === m && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() =>
                      setFilterPaymentMode(filterPaymentMode === m ? "" : m)
                    }
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: colors.text },
                        filterPaymentMode === m && { color: colors.primaryText, fontWeight: "600" },
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            {(filterStatus || filterPaymentMode) && (
              <TouchableOpacity style={styles.clearFilters} onPress={resetFilters}>
                <X size={14} color={colors.primary} />
                <Text style={[styles.clearFiltersText, { color: colors.primary }]}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Transaction List */}
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No transactions found</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={{ paddingBottom: 30 }}
          >
            {transactions.map((tx) => {
              const statusColor = STATUS_COLORS[tx.status] || {
                bg: colors.surface,
                text: colors.text,
              };
              return (
                <View key={tx._id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.cardTop}>
                    <View>
                      <Text style={[styles.invoiceId, { color: colors.text }]}>{tx.invoiceId}</Text>
                      <Text style={[styles.dateText, { color: colors.textTertiary }]}>{formatDate(tx.createdAt)}</Text>
                    </View>
                    <View
                      style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}
                    >
                      <Text style={[styles.statusText, { color: statusColor.text }]}>
                        {tx.status}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.cardBottom, { borderTopColor: colors.border }]}>
                    <View style={styles.cardDetails}>
                      <Text style={[styles.amountText, { color: colors.text }]}>
                        ₹{tx.amount.toFixed(2)}
                      </Text>
                      <Text style={[styles.paymentModeText, { color: colors.textSecondary, backgroundColor: colors.surface }]}>{tx.paymentMode}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.receiptButton, { borderColor: colors.primary }]}
                      onPress={() => handleDownloadReceipt(tx._id)}
                      disabled={downloadingId === tx._id}
                    >
                      {downloadingId === tx._id ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <>
                          <FileText size={16} color={colors.primary} />
                          <Text style={[styles.receiptButtonText, { color: colors.primary }]}>Receipt</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {/* Load More */}
            {hasNextPage && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <ChevronDown size={16} color={colors.primary} />
                    <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load More</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  headerActions: {
    flexDirection: "row",
    gap: 10,
  },
  iconButton: {
    padding: 8,
  },
  filterBar: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginRight: 10,
    minWidth: 50,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
  },
  clearFilters: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 4,
  },
  clearFiltersText: {
    fontSize: 13,
    marginLeft: 4,
  },
  list: {
    flex: 1,
    padding: 15,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  invoiceId: {
    fontSize: 15,
    fontWeight: "700",
  },
  dateText: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 12,
  },
  cardDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  amountText: {
    fontSize: 18,
    fontWeight: "700",
  },
  paymentModeText: {
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  receiptButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  receiptButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  loadMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    gap: 6,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
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

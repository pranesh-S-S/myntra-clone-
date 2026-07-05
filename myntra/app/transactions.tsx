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

const API_BASE = "http://localhost:5000/transactions";

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

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Success: { bg: "#E6F9F0", text: "#0D8050" },
  Pending: { bg: "#FFF8E6", text: "#D9822B" },
  Failed: { bg: "#FFE6EB", text: "#D01C53" },
  Refunded: { bg: "#E6F0FF", text: "#1A6DCC" },
};

const PAYMENT_MODES = ["Card", "UPI", "NetBanking", "Wallet", "COD"];
const STATUSES = ["Pending", "Success", "Failed", "Refunded"];

export default function TransactionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDesktop, contentMaxWidth } = useResponsive();

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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#3e3e3e" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Transactions</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Please login to view transactions</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDesktop && { alignItems: "center" }]}>
      <View
        style={[
          styles.innerContainer,
          { maxWidth: isDesktop ? contentMaxWidth : "100%", width: "100%" },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#3e3e3e" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Transactions</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Filter size={20} color={showFilters ? "#ff3f6c" : "#3e3e3e"} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleExportCSV}>
              <Download size={20} color="#3e3e3e" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Bar */}
        {showFilters && (
          <View style={styles.filterBar}>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Status:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {STATUSES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.filterChip,
                      filterStatus === s && styles.filterChipActive,
                    ]}
                    onPress={() => setFilterStatus(filterStatus === s ? "" : s)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filterStatus === s && styles.filterChipTextActive,
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Mode:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {PAYMENT_MODES.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.filterChip,
                      filterPaymentMode === m && styles.filterChipActive,
                    ]}
                    onPress={() =>
                      setFilterPaymentMode(filterPaymentMode === m ? "" : m)
                    }
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filterPaymentMode === m && styles.filterChipTextActive,
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
                <X size={14} color="#ff3f6c" />
                <Text style={styles.clearFiltersText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Transaction List */}
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#ff3f6c" />
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={48} color="#ccc" />
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={{ paddingBottom: 30 }}
          >
            {transactions.map((tx) => {
              const statusColor = STATUS_COLORS[tx.status] || {
                bg: "#f0f0f0",
                text: "#3e3e3e",
              };
              return (
                <View key={tx._id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View>
                      <Text style={styles.invoiceId}>{tx.invoiceId}</Text>
                      <Text style={styles.dateText}>{formatDate(tx.createdAt)}</Text>
                    </View>
                    <View
                      style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}
                    >
                      <Text style={[styles.statusText, { color: statusColor.text }]}>
                        {tx.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardBottom}>
                    <View style={styles.cardDetails}>
                      <Text style={styles.amountText}>
                        ₹{tx.amount.toFixed(2)}
                      </Text>
                      <Text style={styles.paymentModeText}>{tx.paymentMode}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.receiptButton}
                      onPress={() => handleDownloadReceipt(tx._id)}
                      disabled={downloadingId === tx._id}
                    >
                      {downloadingId === tx._id ? (
                        <ActivityIndicator size="small" color="#ff3f6c" />
                      ) : (
                        <>
                          <FileText size={16} color="#ff3f6c" />
                          <Text style={styles.receiptButtonText}>Receipt</Text>
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
                  <ActivityIndicator size="small" color="#ff3f6c" />
                ) : (
                  <>
                    <ChevronDown size={16} color="#ff3f6c" />
                    <Text style={styles.loadMoreText}>Load More</Text>
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
    backgroundColor: "#f8f8f8",
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
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3e3e3e",
  },
  headerActions: {
    flexDirection: "row",
    gap: 10,
  },
  iconButton: {
    padding: 8,
  },
  filterBar: {
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginRight: 10,
    minWidth: 50,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginRight: 8,
    backgroundColor: "#fff",
  },
  filterChipActive: {
    backgroundColor: "#ff3f6c",
    borderColor: "#ff3f6c",
  },
  filterChipText: {
    fontSize: 13,
    color: "#3e3e3e",
  },
  filterChipTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  clearFilters: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 4,
  },
  clearFiltersText: {
    color: "#ff3f6c",
    fontSize: 13,
    marginLeft: 4,
  },
  list: {
    flex: 1,
    padding: 15,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
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
    color: "#3e3e3e",
  },
  dateText: {
    fontSize: 12,
    color: "#999",
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
    borderTopColor: "#f5f5f5",
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
    color: "#3e3e3e",
  },
  paymentModeText: {
    fontSize: 13,
    color: "#888",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  receiptButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ff3f6c",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  receiptButtonText: {
    color: "#ff3f6c",
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
    color: "#ff3f6c",
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
    color: "#999",
    marginTop: 16,
  },
});

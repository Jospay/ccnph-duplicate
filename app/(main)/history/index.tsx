import TransactionDetails, {
  formatDate,
  formatMoney,
  getStyle,
  getSubtitle,
  getTitle,
  getTotal,
} from "@/components/TransactionDetails";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getWalletTransactions,
  WalletTransaction,
} from "@/services/walletService";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Filter = "all" | "today" | "week" | "month";

export default function HistoryPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);

  const [selectedTransaction, setSelectedTransaction] =
    useState<WalletTransaction | null>(null);

  const [filter, setFilter] = useState<Filter>("all");

  const loadTransactions = async () => {
    try {
      const data = await getWalletTransactions();
      setTransactions(data);
    } catch (error) {
      console.log("Transaction Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  }, []);

  const filteredTransactions = useMemo(() => {
    const now = new Date();

    return transactions.filter((item) => {
      const created = new Date(item.created_at);

      if (filter === "today") {
        return created.toDateString() === now.toDateString();
      }

      if (filter === "week") {
        const diff =
          (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

        return diff <= 7;
      }

      if (filter === "month") {
        return (
          created.getMonth() === now.getMonth() &&
          created.getFullYear() === now.getFullYear()
        );
      }

      return true;
    });
  }, [transactions, filter]);

  const renderFilterButton = (label: string, value: Filter) => {
    const active = filter === value;

    return (
      <TouchableOpacity
        onPress={() => setFilter(value)}
        className={`px-4 py-2 rounded-full mr-2 ${
          active ? "bg-[#034194]" : "bg-white border border-slate-200"
        }`}
      >
        <Text
          className={`text-sm font-medium ${
            active ? "text-white" : "text-slate-600"
          }`}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-[#F8FAFC] px-4 pt-10">
      {/* FILTER */}
      <View className="flex-row mb-5">
        {renderFilterButton("All", "all")}
        {renderFilterButton("Today", "today")}
        {renderFilterButton("7 Days", "week")}
        {renderFilterButton("This Month", "month")}
      </View>

      {loading ? (
        <View className="gap-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <View
              key={index}
              className="bg-white p-4 rounded-2xl flex-row items-center"
            >
              <Skeleton className="w-12 h-12 rounded-full" />

              <View className="flex-1 ml-3">
                <Skeleton className="h-4 w-40 mb-2" />
                <Skeleton className="h-3 w-24" />
              </View>

              <Skeleton className="h-4 w-20" />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#034194"]}
              tintColor="#034194"
            />
          }
          ListEmptyComponent={
            <View className="items-center mt-32">
              <Ionicons name="wallet-outline" size={80} color="#CBD5E1" />

              <Text className="text-lg font-semibold text-slate-400 mt-4">
                No Transactions Found
              </Text>

              <Text className="text-slate-400 text-center mt-2 px-10">
                Your wallet transaction history will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const style = getStyle(item.type);
            const subtitle = getSubtitle(item);

            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedTransaction(item)}
                className="bg-white rounded-2xl px-4 py-4 mb-3 border border-slate-100"
              >
                <View className="flex-row items-center">
                  {/* ICON */}
                  <View
                    style={{ backgroundColor: style.bg }}
                    className="w-12 h-12 rounded-full items-center justify-center"
                  >
                    <Ionicons
                      name={style.icon as any}
                      size={22}
                      color={style.color}
                    />
                  </View>

                  {/* DETAILS */}
                  <View className="flex-1 ml-3 mr-2">
                    <Text
                      numberOfLines={1}
                      className="text-base font-semibold text-slate-800"
                    >
                      {getTitle(item)}
                    </Text>

                    {subtitle ? (
                      <Text
                        numberOfLines={1}
                        className="text-xs text-slate-500 mt-0.5"
                      >
                        {subtitle}
                      </Text>
                    ) : null}

                    <Text className="text-xs text-slate-400 mt-1">
                      {formatDate(item.created_at)}
                    </Text>
                  </View>

                  {/* AMOUNT (total = amount + fee) */}
                  <View className="items-end">
                    <Text
                      style={{ color: style.color }}
                      className="text-base font-bold"
                    >
                      {style.sign}
                      {formatMoney(getTotal(item))}
                    </Text>

                    <Text
                      style={{ color: style.color }}
                      className="text-xs mt-1"
                    >
                      {style.label}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* DETAILS BOTTOM SHEET */}
      <TransactionDetails
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </View>
  );
}

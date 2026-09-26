import { Skeleton } from "@/components/ui/skeleton";
import { getIntellectualProperties } from "@/services/intellectualService";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import "../../global.css";

export default function IndexPage() {
  const router = useRouter();

  const isProcessing = useRef(false);
  const [navigating, setNavigating] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  const [properties, setProperties] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      setNavigating(false);
      isProcessing.current = false;
      fetchProperties();
    }, []),
  );

  const fetchProperties = async () => {
    try {
      setPageLoading(true);

      console.log("📡 Fetching Intellectual Properties...");

      const res = await getIntellectualProperties({
        include: "status,schedules",
      });

      console.log("✅ DATA:", res);

      setProperties(res.data || []);
    } catch (error: any) {
      console.log("❌ FETCH ERROR:", error?.response?.data || error);
    } finally {
      setPageLoading(false);
      setRefreshing(false); // ✅ important for refresh stop
    }
  };

  /**
   * 🔄 REFRESH (NO DESIGN CHANGE)
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProperties();
  }, []);

  const filteredHistory = properties.filter((item) => {
    const status = item.attributes?.status || "Unknown";
    if (activeFilter === "All") return true;
    return status === activeFilter;
  });

  useEffect(() => {
    if (pageLoading) return;
    setFilterLoading(true);
    const timer = setTimeout(() => setFilterLoading(false), 350);
    return () => clearTimeout(timer);
  }, [activeFilter]);

  const handleViewDetails = (id: any) => {
    if (isProcessing.current || navigating) return;
    isProcessing.current = true;
    setNavigating(true);
    router.push(`/details?id=${id}`);
  };

  const handleApplyForm = () => {
    if (isProcessing.current || navigating) return;

    isProcessing.current = true;
    setNavigating(true);

    setTimeout(() => {
      router.push("/propertyForm");
    }, 100);
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#034194"]}
            tintColor="#034194"
          />
        }
      >
        <View className="items-center pb-10 px-5">
          <View className="w-full max-w-[500px] mx-auto">
            {/* HEADER */}
            <View className="pt-7">
              {pageLoading ? (
                <Skeleton className="h-10 w-64 self-center mb-6" />
              ) : (
                <Text className="text-center text-primary font-bold text-3xl mb-6">
                  Registered Property
                </Text>
              )}

              {/* FILTER */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row mb-2"
              >
                {["All", "registered", "pending", "rejected", "expired"].map(
                  (filter) => (
                    <TouchableOpacity
                      key={filter}
                      disabled={navigating}
                      onPress={() => setActiveFilter(filter)}
                      className={`mr-2 px-5 py-2 rounded-full border ${
                        activeFilter === filter
                          ? "bg-primary border-primary"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          activeFilter === filter
                            ? "text-white"
                            : "text-slate-400"
                        }`}
                      >
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </ScrollView>
            </View>

            {/* LIST */}
            <View className="mt-2">
              {pageLoading || filterLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <View
                    key={i}
                    className="bg-white rounded-3xl p-5 mt-4 border border-slate-100"
                  >
                    <Skeleton className="h-3 w-20 mb-4" />
                    <Skeleton className="h-8 w-32" />
                  </View>
                ))
              ) : filteredHistory.length > 0 ? (
                filteredHistory.map((item) => {
                  const attr = item.attributes;

                  return (
                    <View
                      key={item.id}
                      style={{
                        elevation: 4,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        marginTop: 15,
                      }}
                      className="bg-white rounded-3xl overflow-hidden border border-slate-50"
                    >
                      <View className="p-5">
                        <View className="flex-row justify-between items-center mb-4">
                          <Text className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                            Ref ID: #{item.id}
                          </Text>

                          <View
                            className={`px-3 py-1 rounded-full ${
                              attr.status === "registered"
                                ? "bg-green-100"
                                : attr.status === "pending"
                                  ? "bg-amber-100"
                                  : "bg-[#FFE6E9]"
                            }`}
                          >
                            <Text
                              className={`font-bold text-[10px] uppercase ${
                                attr.status === "registered"
                                  ? "text-green-700"
                                  : attr.status === "pending"
                                    ? "text-amber-700"
                                    : "text-[#D70127]"
                              }`}
                            >
                              {attr.status === "waiting_for_payment"
                                ? "Waiting For Payment"
                                : attr.status}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row justify-between items-center">
                          <View className="flex-1 pr-4">
                            <Text className="text-slate-800 text-xl font-bold">
                              {attr.title}
                            </Text>
                          </View>

                          <TouchableOpacity
                            onPress={() => handleViewDetails(item.id)}
                            disabled={navigating}
                            className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100"
                          >
                            <Text className="text-primary font-bold text-[10px]">
                              Details
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View
                        className={`h-1 w-full ${
                          attr.status === "registered"
                            ? "bg-green-500"
                            : attr.status === "pending"
                              ? "bg-amber-500"
                              : "bg-[#D70127]"
                        }`}
                      />
                    </View>
                  );
                })
              ) : (
                <View className="py-20 items-center">
                  <Text className="text-slate-400 italic">
                    No {activeFilter.toLowerCase()} records found.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View className="w-full p-5 bg-white border-t border-slate-200">
        <TouchableOpacity
          onPress={handleApplyForm}
          disabled={navigating}
          className={`h-16 rounded-2xl justify-center items-center ${
            navigating ? "bg-slate-400" : "bg-primary"
          }`}
        >
          {navigating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Apply New</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

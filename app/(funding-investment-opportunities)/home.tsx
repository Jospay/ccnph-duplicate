import { Skeleton } from "@/components/ui/skeleton";
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

// ---------------------------------------------------------------------
// Static data — swap the body of loadRequests() for a real fetch later
// without touching anything else below.
// ---------------------------------------------------------------------
const STATIC_FUNDING_REQUESTS = [
  {
    id: "2041",
    attributes: {
      fundingType: "Bank Loan / Lending Programs",
      applicationType: "Investment",
      status: "completed",
    },
  },
  {
    id: "2040",
    attributes: {
      fundingType: "Government Programs & Grants",
      applicationType: "Grant",
      status: "in_review",
    },
  },
  {
    id: "2039",
    attributes: {
      fundingType: "Private Investors",
      applicationType: "Investment",
      status: "pending",
    },
  },
  {
    id: "2038",
    attributes: {
      fundingType: "Microfinance / Lending App",
      applicationType: "Grant",
      status: "rejected",
    },
  },
  {
    id: "2037",
    attributes: {
      fundingType: "Family & Friends Investment",
      applicationType: "Investment",
      status: "completed",
    },
  },
];

// Status -> label / color mapping (static, presentation-only)
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending Review",
  in_review: "In Review",
  completed: "Completed",
  rejected: "Rejected",
};

const STATUS_STYLES: Record<
  string,
  { badgeBg: string; badgeText: string; barBg: string }
> = {
  pending: {
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    barBg: "bg-amber-500",
  },
  in_review: {
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
    barBg: "bg-blue-500",
  },
  completed: {
    badgeBg: "bg-green-100",
    badgeText: "text-green-700",
    barBg: "bg-green-500",
  },
  rejected: {
    badgeBg: "bg-[#FFE6E9]",
    badgeText: "text-[#D70127]",
    barBg: "bg-[#D70127]",
  },
};

const FILTER_OPTIONS = ["All", "pending", "in_review", "completed", "rejected"];

export default function FundingInvestmentOpportunitiesIndex() {
  const router = useRouter();

  const isProcessing = useRef(false);
  const [navigating, setNavigating] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  const [requests, setRequests] = useState<typeof STATIC_FUNDING_REQUESTS>([]);

  useFocusEffect(
    useCallback(() => {
      setNavigating(false);
      isProcessing.current = false;
      loadRequests();
    }, []),
  );

  // Static "load" — no network call. Keeps a short delay purely so the
  // skeleton state still has something to show.
  const loadRequests = () => {
    setPageLoading(true);

    setTimeout(() => {
      setRequests(STATIC_FUNDING_REQUESTS);
      setPageLoading(false);
      setRefreshing(false);
    }, 400);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRequests();
  }, []);

  const filteredRequests = requests.filter((item) => {
    const status = item.attributes?.status || "pending";
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
      router.push(
        "/(funding-investment-opportunities)/funding-investment-form",
      );
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
            colors={["#3E4093"]}
            tintColor="#3E4093"
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
                  My Applications
                </Text>
              )}

              {/* FILTER */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row mb-2"
              >
                {FILTER_OPTIONS.map((filter) => (
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
                      {filter === "All" ? "All" : STATUS_LABELS[filter]}
                    </Text>
                  </TouchableOpacity>
                ))}
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
              ) : filteredRequests.length > 0 ? (
                filteredRequests.map((item) => {
                  const attr = item.attributes;
                  const statusStyle =
                    STATUS_STYLES[attr.status] ?? STATUS_STYLES.pending;

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
                            className={`px-3 py-1 rounded-full ${statusStyle.badgeBg}`}
                          >
                            <Text
                              className={`font-bold text-[10px] uppercase ${statusStyle.badgeText}`}
                            >
                              {STATUS_LABELS[attr.status] || attr.status}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row justify-between items-center">
                          <View className="flex-1 pr-4">
                            <Text className="text-slate-800 text-xl font-bold">
                              {attr.fundingType}
                            </Text>
                            <Text className="text-slate-400 text-xs mt-1">
                              Application Type: {attr.applicationType}
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

                      <View className={`h-1 w-full ${statusStyle.barBg}`} />
                    </View>
                  );
                })
              ) : (
                <View className="py-20 items-center">
                  <Text className="text-slate-400 italic">
                    No{" "}
                    {activeFilter === "All"
                      ? ""
                      : `${STATUS_LABELS[activeFilter]?.toLowerCase()} `}
                    records found.
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

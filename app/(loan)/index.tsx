import { Skeleton } from "@/components/ui/skeleton";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import loanAds from "../../assets/images/loanAssets.png";
import "../../global.css";

import {
  getLoanableAmount,
  getLoans,
  getShareCapital,
} from "@/services/loanService";
import { Loan } from "@/types/loan.types";

export default function IndexPage() {
  const router = useRouter();

  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);

  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanableAmount, setLoanableAmount] = useState("0.00");
  const [shareCapitalPaid, setShareCapitalPaid] = useState<boolean>(false);
  const [hasShareCapitalRecord, setHasShareCapitalRecord] =
    useState<boolean>(false);

  const [settings, setSettings] = useState<{
    default_term_months: number;
    default_interest_rate: number;
  } | null>(null);

  const isProcessing = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);

  const [activeFilter, setActiveFilter] = useState("All");

  useFocusEffect(
    useCallback(() => {
      setIsLoading(false);
      setNavigating(false);
      isProcessing.current = false;
    }, []),
  );

  const fetchLoans = async (isRefresh = false) => {
    try {
      if (!isRefresh) setPageLoading(true);

      const [res, amount, shareCapitalRes] = await Promise.all([
        getLoans(),
        getLoanableAmount(),
        getShareCapital(),
      ]);

      setLoans(res.data);
      setLoanableAmount(amount);
      setSettings(res.meta?.settings ?? null);

      if (
        shareCapitalRes &&
        Array.isArray(shareCapitalRes.data) &&
        shareCapitalRes.data.length > 0
      ) {
        const record = shareCapitalRes.data[0];
        setHasShareCapitalRecord(true);

        const isPaid = record.attributes
          ? !!record.attributes.is_fully_paid
          : !!record.is_fully_paid;

        setShareCapitalPaid(isPaid);
      } else if (
        shareCapitalRes &&
        shareCapitalRes.data &&
        !Array.isArray(shareCapitalRes.data)
      ) {
        setHasShareCapitalRecord(true);

        const isPaid = shareCapitalRes.data.attributes
          ? !!shareCapitalRes.data.attributes.is_fully_paid
          : !!shareCapitalRes.data.is_fully_paid;

        setShareCapitalPaid(isPaid);
      } else {
        setHasShareCapitalRecord(false);
        setShareCapitalPaid(false);
      }
    } catch (error) {
      console.log("Failed to fetch dashboard data:", error);
    } finally {
      setPageLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLoans(true);
  }, []);

  const filteredHistory = loans.filter((loan) => {
    if (activeFilter === "All") return true;
    return loan.attributes.status.toLowerCase() === activeFilter.toLowerCase();
  });

  useEffect(() => {
    if (pageLoading) return;

    setFilterLoading(true);
    const timer = setTimeout(() => setFilterLoading(false), 300);

    return () => clearTimeout(timer);
  }, [activeFilter]);

  const handleViewDetails = (id: number) => {
    router.push(
      `/breakdown?id=${id}&include=user,status,loanSchedules,loanPayments`,
    );
  };

  const handleMainAction = () => {
    if (isProcessing.current || isLoading || navigating) return;

    isProcessing.current = true;
    setIsLoading(true);
    setNavigating(true);

    setTimeout(() => {
      if (!shareCapitalPaid) {
        router.push("/shared-payment");
      } else {
        router.push("/loanForm");
      }
    }, 300);
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
        <View className="items-center pb-12 px-5 pt-8">
          <View className="w-full max-w-[500px] mx-auto">
            {/* BANNER */}
            {pageLoading ? (
              <View className="px-4">
                <Skeleton className="!w-full !h-36 rounded-2xl" />
              </View>
            ) : (
              <Image
                source={loanAds}
                className="!w-full !h-36 rounded-2xl"
                resizeMode="contain"
                style={{ width: "100%" }}
              />
            )}

            {/* ✅ FIXED RESPONSIVE WRAPPER (ONLY CHANGE) */}
            <View className="w-full mx-auto max-w-[420px]">
              {/* LOANABLE AMOUNT */}
              <View
                style={{
                  marginTop: -31,
                  zIndex: 50,
                  elevation: 10,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 5 },
                  shadowOpacity: 0.15,
                  shadowRadius: 10,
                }}
                className="bg-white rounded-2xl border border-primary/20 p-4"
              >
                {pageLoading ? (
                  <View className="gap-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-48" />
                  </View>
                ) : (
                  <>
                    <Text className="text-primary text-md">
                      Loanable Amount
                    </Text>
                    <Text className="text-primary text-3xl pt-2 font-bold">
                      ₱{Number(loanableAmount || 0).toLocaleString()}
                    </Text>
                  </>
                )}
              </View>

              {/* SHARE CAPITAL CONDITIONAL NOTE + MAIN CONTENT */}
              <>
                {!pageLoading && !shareCapitalPaid ? (
                  <View className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <Text className="text-amber-800 text-xs font-bold uppercase tracking-wider">
                      Notice: Share Capital Incomplete
                    </Text>
                    <Text className="text-amber-700 text-[11px] mt-1 leading-4">
                      Before initializing credit line requests, members must
                      complete the mandatory Share Capital framework
                      requirement. Click below to view terms.
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* LOAN DETAILS SECTION */}
                    <View
                      style={{
                        elevation: 10,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 5 },
                        shadowOpacity: 0.15,
                        shadowRadius: 10,
                        marginTop: !shareCapitalPaid ? 14 : 20,
                      }}
                      className="bg-white rounded-2xl border border-primary/20 overflow-hidden"
                    >
                      <View className="flex-row justify-between">
                        <View className="p-4 flex-1">
                          {pageLoading ? (
                            <View className="gap-y-4">
                              <Skeleton className="h-6 w-24" />
                              <View className="flex-row gap-6">
                                <Skeleton className="h-12 w-12" />
                                <Skeleton className="h-12 w-12" />
                              </View>
                            </View>
                          ) : (
                            <>
                              <Text className="text-lg font-semibold">
                                Loan Details
                              </Text>

                              <View className="flex-row gap-6 justify-between mt-2">
                                <View>
                                  <Text className="text-primary text-xs font-bold">
                                    Payable in
                                  </Text>
                                  <Text className="text-primary text-2xl font-bold">
                                    {settings?.default_term_months ?? 0}
                                  </Text>
                                  <Text className="text-primary text-[10px]">
                                    Months
                                  </Text>
                                </View>

                                <View>
                                  <Text className="text-primary text-xs font-bold">
                                    Interest
                                  </Text>
                                  <Text className="text-primary text-2xl font-bold">
                                    {settings?.default_interest_rate ?? 0}%
                                  </Text>
                                  <Text className="text-primary text-[10px]">
                                    ave per mo.
                                  </Text>
                                </View>
                              </View>
                            </>
                          )}
                        </View>

                        <View className="bg-primary w-24 items-center justify-center">
                          <Text className="text-white font-bold uppercase text-center">
                            Need{"\n"}Help?
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* FILTER */}
                    {shareCapitalPaid && (
                      <View className="pt-8">
                        <Text className="text-center text-primary font-bold text-xl mb-5">
                          Loan History
                        </Text>

                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                        >
                          {[
                            "All",
                            "pending",
                            "active",
                            "finished",
                            "rejected",
                          ].map((filter) => (
                            <TouchableOpacity
                              key={filter}
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
                                {filter.toUpperCase()}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* LOAN LIST (ONLY IF SHARE CAPITAL PAID) */}
                    {shareCapitalPaid && (
                      <View className="mt-2">
                        {pageLoading || filterLoading ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <View
                              key={i}
                              className="bg-white rounded-3xl p-5 mt-4 border border-slate-100"
                            >
                              <View className="flex-row justify-between mb-4">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-5 w-16 rounded-full" />
                              </View>
                              <View className="flex-row justify-between">
                                <Skeleton className="h-8 w-32" />
                                <Skeleton className="h-8 w-12 rounded-xl" />
                              </View>
                            </View>
                          ))
                        ) : filteredHistory.length > 0 ? (
                          filteredHistory.map((loan) => {
                            const {
                              amount,
                              start_date,
                              end_date,
                              status,
                              term_months,
                            } = loan.attributes;

                            const normalizedStatus = status.toLowerCase();

                            const formatDate = (dateString: string) => {
                              if (!dateString) return "";
                              return new Intl.DateTimeFormat("en-US", {
                                month: "long",
                                day: "2-digit",
                                year: "numeric",
                              }).format(new Date(dateString));
                            };

                            const getStatusStyles = (status: string) => {
                              switch (status) {
                                case "active":
                                  return {
                                    bg: "bg-green-100",
                                    text: "text-green-700",
                                  };
                                case "pending":
                                  return {
                                    bg: "bg-amber-100",
                                    text: "text-amber-700",
                                  };
                                case "finished":
                                  return {
                                    bg: "bg-blue",
                                    text: "text-primary",
                                  };
                                case "rejected":
                                  return {
                                    bg: "bg-[#FFE6E9]",
                                    text: "text-[#D70127]",
                                  };
                                default:
                                  return {
                                    bg: "bg-slate-100",
                                    text: "text-slate-700",
                                  };
                              }
                            };

                            const statusStyle =
                              getStatusStyles(normalizedStatus);

                            return (
                              <View
                                key={loan.id}
                                style={{
                                  elevation: 8,
                                  shadowColor: "#000",
                                  shadowOpacity: 0.1,
                                  shadowRadius: 12,
                                  marginTop: 15,
                                }}
                                className="bg-white rounded-3xl overflow-hidden border border-slate-50"
                              >
                                <View className="p-5">
                                  <View className="flex-row justify-between mb-4 items-center">
                                    <View className="flex-1">
                                      <View className="flex-row items-center">
                                        <Text className="text-[10px] font-bold text-slate-500">
                                          {formatDate(start_date)}
                                        </Text>

                                        {end_date && (
                                          <>
                                            <Text className="text-[10px] text-slate-300 mx-2">
                                              |
                                            </Text>
                                            <Text className="text-[10px] font-bold text-slate-500">
                                              {formatDate(end_date)}
                                            </Text>
                                          </>
                                        )}
                                      </View>

                                      <Text className="text-[9px] text-primary font-bold uppercase mt-0.5">
                                        {term_months} Months Term
                                      </Text>
                                    </View>

                                    <View
                                      className={`px-3 py-1 rounded-full ${statusStyle.bg}`}
                                    >
                                      <Text
                                        className={`text-[10px] font-bold uppercase ${statusStyle.text}`}
                                      >
                                        {status}
                                      </Text>
                                    </View>
                                  </View>

                                  <View className="flex-row justify-between items-center border-t border-slate-50 pt-3">
                                    <View>
                                      <Text className="text-[9px] text-slate-400 uppercase font-bold">
                                        Total Amount
                                      </Text>
                                      <Text className="text-2xl font-black text-slate-900">
                                        ₱{Number(amount).toLocaleString()}
                                      </Text>
                                    </View>

                                    <TouchableOpacity
                                      onPress={() => handleViewDetails(loan.id)}
                                      className="bg-primary px-5 py-2.5 rounded-xl"
                                    >
                                      <Text className="text-white font-bold text-[11px]">
                                        View Details
                                      </Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>

                                <View
                                  className={`h-1 w-full ${
                                    normalizedStatus === "active"
                                      ? "bg-green-500"
                                      : normalizedStatus === "pending"
                                        ? "bg-amber-500"
                                        : normalizedStatus === "finished"
                                          ? "bg-primary"
                                          : normalizedStatus === "rejected"
                                            ? "bg-[#D70127]"
                                            : "bg-slate-500"
                                  }`}
                                />
                              </View>
                            );
                          })
                        ) : (
                          <Text className="text-center text-slate-400 mt-10">
                            No records found.
                          </Text>
                        )}
                      </View>
                    )}
                  </>
                )}
              </>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View className="w-full p-5 bg-white border-t border-slate-200">
        {pageLoading ? (
          <Skeleton className="h-[60px] w-full rounded-2xl" />
        ) : (
          <TouchableOpacity
            onPress={handleMainAction}
            disabled={isLoading || navigating}
            className={`h-16 rounded-2xl justify-center items-center ${
              isLoading || navigating
                ? "bg-slate-400"
                : !shareCapitalPaid
                  ? "bg-amber-600"
                  : "bg-primary"
            }`}
          >
            {isLoading || navigating ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">
                {!shareCapitalPaid
                  ? hasShareCapitalRecord
                    ? "Pay Share Capital"
                    : "Initialize Share Capital"
                  : "Get Started"}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

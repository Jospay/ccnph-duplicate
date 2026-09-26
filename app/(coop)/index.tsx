import {
  AllocationBreakdown,
  CooperativeServiceOption,
  CooperativeSummary,
  cooperativeService,
} from "@/services/cooperativeService";
import { profileService } from "@/services/profileService";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import "../../global.css";

const peso = (value: number) =>
  `₱${(value ?? 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const ALL_SERVICES_OPTION: CooperativeServiceOption = {
  id: 0,
  name: "All Services",
  slug: "all",
  description: "Combined view across every service.",
  icon: null,
};

// Use the full "screen" (not "window") so the modal backdrop dimensions match
const SCREEN = Dimensions.get("screen");

/* ------------------------------------------------------------------ */
/* SKELETON PRIMITIVES                                               */
/* ------------------------------------------------------------------ */

function SkeletonBlock({
  className,
  style,
}: {
  className?: string;
  style?: any;
}) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      className={`bg-slate-200 rounded-lg ${className ?? ""}`}
      style={[{ opacity }, style]}
    />
  );
}

function PageSkeleton() {
  return (
    <View className="px-6 py-10">
      <SkeletonBlock className="h-8 w-3/5 mb-3" />
      <SkeletonBlock className="h-4 w-4/5 mb-8" />

      <View className="flex-row gap-x-3 mb-8">
        <SkeletonBlock className="h-16 flex-1" />
        <SkeletonBlock className="h-16 flex-1" />
      </View>

      <SkeletonBlock className="h-28 w-full mb-8 rounded-2xl" />

      <SkeletonBlock className="h-6 w-32 mb-4" />
      <View className="gap-y-6 mb-10">
        {[0, 1].map((i) => (
          <View key={i} className="border border-slate-200 rounded-2xl p-5">
            <View className="flex-row justify-between mb-4">
              <SkeletonBlock className="h-5 w-2/5" />
              <SkeletonBlock className="h-5 w-1/5" />
            </View>
            <View className="gap-y-3">
              <SkeletonBlock className="h-16 w-full rounded-xl" />
              <SkeletonBlock className="h-16 w-full rounded-xl" />
            </View>
          </View>
        ))}
      </View>

      <SkeletonBlock className="h-6 w-48 mb-4" />
      <View className="gap-y-4">
        {[0, 1, 2].map((i) => (
          <SkeletonBlock key={i} className="h-24 w-full rounded-xl" />
        ))}
      </View>
    </View>
  );
}

function SummarySkeleton() {
  return (
    <View>
      <SkeletonBlock className="h-28 w-full mb-8 rounded-2xl" />

      <SkeletonBlock className="h-6 w-32 mb-4" />
      <View className="gap-y-6 mb-10">
        {[0, 1].map((i) => (
          <View key={i} className="border border-slate-200 rounded-2xl p-5">
            <View className="flex-row justify-between mb-4">
              <SkeletonBlock className="h-5 w-2/5" />
              <SkeletonBlock className="h-5 w-1/5" />
            </View>
            <View className="gap-y-3">
              <SkeletonBlock className="h-16 w-full rounded-xl" />
              <SkeletonBlock className="h-16 w-full rounded-xl" />
            </View>
          </View>
        ))}
      </View>

      <SkeletonBlock className="h-6 w-48 mb-4" />
      <View className="gap-y-4">
        {[0, 1, 2].map((i) => (
          <SkeletonBlock key={i} className="h-24 w-full rounded-xl" />
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* HELPER FUNCTION FOR ALLOCATION BADGES & TARGETS                   */
/* ------------------------------------------------------------------ */

function renderAllocationBadge(allocation: AllocationBreakdown) {
  const isFixed =
    (allocation as any).type === "PHP" ||
    (allocation as any).type === "FIXED" ||
    (allocation as any).is_fixed === true;

  if (isFixed) {
    const val =
      (allocation as any).configured_value ??
      allocation.configured_percentage ??
      0;
    return {
      badge: "Fixed",
      targetText: `Target ${peso(val)}/txn`,
    };
  }

  return {
    badge: `${allocation.actual_percentage ?? 0}%`,
    targetText: `Target ${allocation.configured_percentage ?? 0}%`,
  };
}

/* ------------------------------------------------------------------ */
/* PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function CooperativeMembershipPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- filters ---
  const [years, setYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [showYearModal, setShowYearModal] = useState(false);

  const [services, setServices] = useState<CooperativeServiceOption[]>([
    ALL_SERVICES_OPTION,
  ]);
  const [selectedService, setSelectedService] =
    useState<CooperativeServiceOption>(ALL_SERVICES_OPTION);
  const [showServiceModal, setShowServiceModal] = useState(false);

  // --- data ---
  const [summary, setSummary] = useState<CooperativeSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // --- MEMBERSHIP / STATUS FLAGS ---
  const userTypeName = user?.user_type?.name?.toUpperCase() || "";
  const statusName = user?.status?.name?.toLowerCase() || "";

  const isBasic = userTypeName === "BASIC";
  const isMember = userTypeName === "MEMBER";
  const isActive = statusName === "active";
  const isApproved = statusName === "approved";
  const isForApproval = statusName === "for_approval";

  // Only fully active Members can view cooperative transparency
  const hasAccess = isMember && isActive;

  const canAccessCooperative = (profile: any) => {
    const type = profile?.user_type?.name?.toUpperCase() || "";
    const status = profile?.status?.name?.toLowerCase() || "";
    return type === "MEMBER" && status === "active";
  };

  const fetchProfile = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await profileService.getProfile();
      setUser(data);
      return data;
    } catch (error) {
      console.error("Profile Fetch Error:", error);
      return null;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const [yearList, serviceList] = await Promise.all([
        cooperativeService.getYears(),
        cooperativeService.getServices(),
      ]);

      setYears(yearList);
      setServices([ALL_SERVICES_OPTION, ...serviceList]);

      if (yearList.length > 0) {
        setSelectedYear((prev) => prev ?? yearList[0]);
      }
    } catch (error) {
      console.error("Cooperative Filters Fetch Error:", error);
    }
  };

  const fetchSummary = useCallback(
    async (year: string, serviceSlug: string) => {
      setSummaryLoading(true);
      setSummaryError(null);
      try {
        const data = await cooperativeService.getSummary(year, serviceSlug);
        setSummary(data);
      } catch (error) {
        console.error("Cooperative Summary Fetch Error:", error);
        setSummaryError("Unable to load cooperative fund data right now.");
      } finally {
        setSummaryLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    (async () => {
      const profile = await fetchProfile();
      if (canAccessCooperative(profile)) {
        fetchFilters();
      }
    })();
  }, []);

  useEffect(() => {
    if (hasAccess && selectedYear) {
      fetchSummary(selectedYear, selectedService.slug);
    }
  }, [hasAccess, selectedYear, selectedService, fetchSummary]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const profile = await fetchProfile(true);
    const canAccess = canAccessCooperative(profile);

    if (canAccess) {
      await fetchFilters();
      if (selectedYear) {
        fetchSummary(selectedYear, selectedService.slug);
      } else {
        setRefreshing(false);
      }
    } else {
      setRefreshing(false);
    }
  }, [selectedYear, selectedService, fetchSummary]);

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        <ScrollView showsVerticalScrollIndicator={false}>
          <PageSkeleton />
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        <View className="px-6 py-10">
          <Text className="text-primary text-3xl font-bold">
            Cooperative Transparency
          </Text>

          <Text className="text-slate-500 mt-3 mb-8">
            View yearly membership contribution, cooperative earnings, and fund
            allocation.
          </Text>

          {/* --- GATE: BASIC & ACTIVE --- */}
          {isBasic && isActive && (
            <View className="bg-orange-50 border border-orange-200 p-5 rounded-[30px] mb-8">
              <View className="flex-row items-center">
                <View className="bg-[#C6890F] p-2 rounded-full">
                  <Ionicons name="warning" size={20} color="white" />
                </View>
                <View className="flex-1 ml-4">
                  <Text className="text-[#C6890F] font-bold text-lg">
                    Complete Your Profile
                  </Text>
                </View>
              </View>

              <Text className="text-[#C6890F] text-sm mt-2 leading-5">
                To view cooperative transparency, you need to complete your
                profile, address, and a valid ID first, then get approved as a
                Member.
              </Text>

              <TouchableOpacity
                onPress={() => router.push("/profile/setupProfile")}
                className="bg-[#C6890F] mt-4 py-3 rounded-2xl items-center flex-row justify-center"
              >
                <Text className="text-white font-bold text-base mr-2">
                  Complete Now
                </Text>
                <Ionicons name="arrow-forward" size={18} color="white" />
              </TouchableOpacity>
            </View>
          )}

          {/* --- GATE: BASIC & FOR APPROVAL --- */}
          {isBasic && isForApproval && (
            <View className="bg-blue border border-primary p-5 rounded-[30px] mb-8">
              <View className="flex-row items-center">
                <View className="bg-primary p-2 rounded-full">
                  <Ionicons name="time" size={20} color="white" />
                </View>
                <View className="flex-1 ml-4">
                  <Text className="text-primary font-bold text-lg">
                    Review in Progress
                  </Text>
                </View>
              </View>

              <Text className="text-primary text-sm mt-2 leading-5">
                Your account details have been submitted. Please wait 2-3 days
                for approval before cooperative transparency becomes available.
              </Text>
            </View>
          )}

          {/* --- GATE: BASIC & APPROVED --- */}
          {isBasic && isApproved && (
            <View className="bg-green-50 border border-green-200 p-5 rounded-[30px] mb-8">
              <View className="flex-row items-center">
                <View className="bg-green-600 p-2 rounded-full">
                  <MaterialIcons
                    name="account-balance-wallet"
                    size={20}
                    color="white"
                  />
                </View>
                <View className="flex-1 ml-4">
                  <Text className="text-green-800 font-bold text-lg">
                    Capital Contribution
                  </Text>
                </View>
              </View>

              <Text className="text-green-700 text-sm mt-2 leading-5">
                To view cooperative transparency, you need to contribute to the
                initial share capital. You can choose{" "}
                <Text className="font-bold">installment</Text> or{" "}
                <Text className="font-bold">full payment</Text> now.
              </Text>

              <TouchableOpacity
                onPress={() => router.push("/profile/membership")}
                className="bg-green-600 mt-4 py-3 rounded-2xl items-center flex-row justify-center"
              >
                <Text className="text-white font-bold text-base mr-2">
                  Pay Contribution
                </Text>
                <Ionicons name="card-outline" size={18} color="white" />
              </TouchableOpacity>
            </View>
          )}

          {/* --- FULL CONTENT: MEMBER & ACTIVE ONLY --- */}
          {hasAccess ? (
            <>
              {/* FILTERS: YEAR + SERVICE */}
              <View className="flex-row gap-x-3 mb-8">
                <TouchableOpacity
                  onPress={() => setShowYearModal(true)}
                  disabled={years.length === 0}
                  className="flex-1 bg-slate-100 p-5 rounded-xl flex-row items-center justify-between"
                >
                  <View>
                    <Text className="text-xs text-slate-400 mb-1">Year</Text>
                    <Text className="font-bold">
                      {selectedYear ?? "No data"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color="#64748B" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowServiceModal(true)}
                  className="flex-1 bg-slate-100 p-5 rounded-xl flex-row items-center justify-between"
                >
                  <View className="flex-1 mr-2">
                    <Text className="text-xs text-slate-400 mb-1">Service</Text>
                    <Text className="font-bold" numberOfLines={1}>
                      {selectedService.name}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              {summaryLoading && !summary ? (
                <SummarySkeleton />
              ) : summaryError ? (
                <View className="items-center py-16">
                  <Ionicons
                    name="alert-circle-outline"
                    size={36}
                    color="#F87171"
                  />
                  <Text className="text-red-400 font-semibold mt-3 text-center">
                    {summaryError}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      selectedYear &&
                      fetchSummary(selectedYear, selectedService.slug)
                    }
                    className="bg-primary mt-4 px-6 py-3 rounded-xl"
                  >
                    <Text className="text-white font-bold">Try Again</Text>
                  </TouchableOpacity>
                </View>
              ) : summary && years.length > 0 ? (
                <>
                  {/* TOTAL FUND */}
                  <View className="bg-slate-50 border border-slate-200 rounded-2xl p-6 items-center mb-8">
                    <Text className="text-slate-500">
                      TOTAL COOPERATIVE FUND {summary.year}
                      {selectedService.slug !== "all"
                        ? ` · ${selectedService.name}`
                        : ""}
                    </Text>
                    <Text className="text-4xl font-black mt-2">
                      {peso(summary.total_fund)}
                    </Text>
                    <Text className="text-slate-400 text-xs mt-2">
                      {summary.total_transactions} recorded transaction
                      {summary.total_transactions === 1 ? "" : "s"}
                    </Text>
                  </View>

                  {/* PER-SERVICE BREAKDOWN */}
                  <Text className="text-xl font-bold mb-4">
                    {selectedService.slug === "all"
                      ? "Services"
                      : "Service Detail"}
                  </Text>

                  {summary.services.length === 0 ? (
                    <View className="items-center py-10 mb-4">
                      <Ionicons
                        name="file-tray-outline"
                        size={32}
                        color="#CBD5E1"
                      />
                      <Text className="text-slate-400 mt-3 text-center">
                        No recorded fund activity for this selection yet.
                      </Text>
                    </View>
                  ) : (
                    <View className="gap-y-6 mb-10">
                      {summary.services.map((service) => (
                        <View
                          key={service.id}
                          className="border border-slate-200 rounded-2xl p-5"
                        >
                          <View className="flex-row justify-between items-start">
                            <Text className="font-bold text-lg text-slate-800 flex-1 mr-2">
                              {service.name}
                            </Text>
                            <Text className="font-black text-primary">
                              {peso(service.total)}
                            </Text>
                          </View>

                          {service.description ? (
                            <Text className="text-slate-500 mt-1 mb-4">
                              {service.description}
                            </Text>
                          ) : (
                            <View className="mb-4" />
                          )}

                          <View className="gap-y-3">
                            {service.allocations.map(
                              (allocation: AllocationBreakdown) => {
                                const { badge, targetText } =
                                  renderAllocationBadge(allocation);

                                return (
                                  <View
                                    key={allocation.id}
                                    className="bg-slate-50 rounded-xl p-4"
                                  >
                                    <View className="flex-row justify-between items-center">
                                      <Text className="font-bold text-slate-700 flex-1 mr-2">
                                        {allocation.name}
                                      </Text>
                                      {/* <Text className="font-black text-primary">
                                        {badge}
                                      </Text> */}
                                    </View>
                                    <Text className="text-slate-500 text-sm mt-1">
                                      {allocation.description}
                                    </Text>
                                    <View className="flex-row justify-between items-center mt-3">
                                      <Text className="font-bold">
                                        {peso(allocation.amount)}
                                      </Text>
                                      <Text className="text-xs text-slate-400">
                                        {targetText} ·{" "}
                                        {allocation.transaction_count} txn
                                        {allocation.transaction_count === 1
                                          ? ""
                                          : "s"}
                                      </Text>
                                    </View>
                                  </View>
                                );
                              },
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* GRAND ALLOCATION SUMMARY */}
                  <Text className="text-xl font-bold mb-4">
                    Fund Allocation Summary
                  </Text>

                  <View className="gap-y-4">
                    {summary.allocations.map((item) => (
                      <View
                        key={item.id}
                        className="border border-slate-200 rounded-xl p-5"
                      >
                        <Text className="font-bold text-slate-700">
                          {item.name}
                        </Text>
                        <Text className="text-slate-500 mt-2">
                          {item.description}
                        </Text>
                        <Text className="font-black text-primary mt-3">
                          {peso(item.amount)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* ADD-ALL TOTAL LINE */}
                  <View className="flex-row justify-between items-center border-t border-slate-200 mt-6 pt-5">
                    <Text className="font-bold text-lg">Total</Text>
                    <Text className="font-black text-xl text-primary">
                      {peso(summary.total_fund)}
                    </Text>
                  </View>
                </>
              ) : (
                <View className="items-center py-10">
                  <Ionicons
                    name="file-tray-outline"
                    size={40}
                    color="#CBD5E1"
                  />
                  <Text className="text-slate-400 font-semibold mt-3 text-center">
                    No cooperative fund data has been recorded yet.
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View className="items-center py-10">
              <Ionicons name="lock-closed-outline" size={40} color="#CBD5E1" />
              <Text className="text-slate-400 font-semibold mt-3 text-center">
                Cooperative transparency is available once your profile is
                complete and your Member status is active.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* YEAR MODAL */}
      <Modal
        visible={showYearModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setShowYearModal(false)}
      >
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: SCREEN.width,
            height: SCREEN.height,
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
          className="justify-center px-8"
        >
          <View className="bg-white rounded-2xl p-6">
            <Text className="text-xl font-bold mb-5">Choose Year</Text>

            {years.map((year) => (
              <TouchableOpacity
                key={year}
                onPress={() => {
                  setSelectedYear(year);
                  setShowYearModal(false);
                }}
                className="bg-slate-100 rounded-xl p-4 mb-3"
              >
                <Text className="text-center font-bold">{year}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity onPress={() => setShowYearModal(false)}>
              <Text className="text-center text-red-500 font-bold mt-3">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SERVICE MODAL */}
      <Modal
        visible={showServiceModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setShowServiceModal(false)}
      >
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: SCREEN.width,
            height: SCREEN.height,
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
          className="justify-center px-8"
        >
          <View className="bg-white rounded-2xl p-6">
            <Text className="text-xl font-bold mb-5">Choose Service</Text>

            <ScrollView style={{ maxHeight: 320 }}>
              {services.map((service) => (
                <TouchableOpacity
                  key={service.slug}
                  onPress={() => {
                    setSelectedService(service);
                    setShowServiceModal(false);
                  }}
                  className="bg-slate-100 rounded-xl p-4 mb-3"
                >
                  <Text className="text-center font-bold">{service.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity onPress={() => setShowServiceModal(false)}>
              <Text className="text-center text-red-500 font-bold mt-3">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

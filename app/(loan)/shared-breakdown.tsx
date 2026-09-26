import { CustomAlert } from "@/components/CustomAlert";
import { getShareCapital } from "@/services/loanService";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function SharedBreakdownPage() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const id = useMemo(() => {
    if (!params?.id) return "";
    return Array.isArray(params.id) ? params.id[0] : params.id;
  }, [params?.id]);

  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
    redirectHome: false,
    isConfirmation: false,
    onConfirm: () => {},
  });

  const formatMoney = (value: any) => {
    const num = Number(String(value || "0").replace(/,/g, ""));
    if (isNaN(num)) return "0.00";
    return num.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (date: string | null, indexOffsetMonths = 0) => {
    let targetDate = date ? new Date(date) : new Date();
    if (!date && indexOffsetMonths > 0) {
      targetDate.setMonth(targetDate.getMonth() + indexOffsetMonths);
    }
    return targetDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const fetchSchedules = async (showLoader = true, returnData = false) => {
    try {
      if (showLoader) setLoading(true);

      const res = await getShareCapital({
        include: "schedules,schedules.payments",
      });

      const shareCapital = res?.data || res;
      const attributes = shareCapital?.attributes || {};
      const relationships = shareCapital?.relationships || {};
      const fallbackId = String(shareCapital?.id || "");

      if (!shareCapital && !id) {
        router.replace("/(main)");
        return [];
      }

      let rawSchedulesList: any[] = [];

      // Extract raw schedule items cleanly
      if (Array.isArray(res?.included)) {
        rawSchedulesList = res.included.filter(
          (item: any) =>
            item?.type === "share-capital-schedules" ||
            item?.type?.toLowerCase().includes("schedule"),
        );
      } else if (Array.isArray(relationships?.schedules?.data)) {
        rawSchedulesList = relationships.schedules.data;
      } else if (Array.isArray(shareCapital?.schedules)) {
        rawSchedulesList = shareCapital.schedules;
      }

      let mapped: any[] = [];

      if (rawSchedulesList.length === 0) {
        if (attributes?.term_months) {
          const totalAmount = Number(attributes.amount || 0);
          const totalTerms = Number(attributes.term_months || 1);
          const installmentAmount =
            Math.round((totalAmount / totalTerms) * 100) / 100;

          for (let i = 1; i <= totalTerms; i++) {
            mapped.push({
              id: `mock-${id || fallbackId}-${i}`,
              amount: installmentAmount,
              due_date: null,
              status: "unpaid",
              installment: i,
              isMocked: true,
            });
          }
        }
      } else {
        const uniqueMap = new Map();

        rawSchedulesList.forEach((s: any, idx: number) => {
          const attr = s.attributes || s;

          // CRITICAL FRONTLINE GUARD: Determine exact logical layout numbers
          const installmentNo = Number(
            attr.installment_no ||
              attr.installment ||
              s.installment_no ||
              idx + 1,
          );
          const scheduleId = String(
            s.id || attr.id || `sched-${installmentNo}`,
          );

          const itemStatus = String(attr.status || "unpaid").toLowerCase();
          const itemAmount = Number(attr.amount || 0);

          // deduplicate rows based on their actual structural positions
          uniqueMap.set(installmentNo, {
            id: scheduleId,
            amount: itemAmount,
            due_date: attr.due_date || null,
            status: itemStatus,
            installment: installmentNo,
            isMocked: false,
          });
        });

        mapped = Array.from(uniqueMap.values()).sort(
          (a: any, b: any) => a.installment - b.installment,
        );
      }

      setSchedules(mapped);
      return mapped;
    } catch (e) {
      console.log("PARSING EXCEPTION:", e);
      setSchedules([]);
      return [];
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSchedules();
    }, [id]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchedules(false);
  };

  const isSinglePayment = schedules.length === 1;

  const nextToPay = useMemo(() => {
    return [...schedules]
      .sort((a, b) => a.installment - b.installment)
      .find((s) => s.status !== "paid" && s.status !== "success");
  }, [schedules]);

  const outstanding = useMemo(() => {
    const rawSum = schedules
      .filter((s) => s.status !== "paid" && s.status !== "success")
      .reduce((a, b) => a + Number(b.amount || 0), 0);
    // Fix JS precision issues (like 16000.01 floating variations)
    return Math.round(rawSum * 100) / 100;
  }, [schedules]);

  const isFullyPaid =
    schedules.length > 0 &&
    schedules.every((s) => s.status === "paid" || s.status === "success");

  const handlePay = async () => {
    try {
      setCheckingPayment(true);
      const updatedSchedules: any = await fetchSchedules(false);

      const latestNextToPay = [...updatedSchedules]
        ?.sort((a: any, b: any) => a.installment - b.installment)
        ?.find((s: any) => s.status !== "paid" && s.status !== "success");

      if (!latestNextToPay) {
        setAlert({
          visible: true,
          title: "Success",
          message:
            "All share capital requirements have already been fully completed.",
          redirectHome: true,
          isConfirmation: false,
          onConfirm: () => {},
        });
        return;
      }

      setAlert({
        visible: true,
        title: "Confirm Payment",
        message: isSinglePayment
          ? `Proceed to payment for ₱${formatMoney(latestNextToPay.amount)}?`
          : `Proceed to payment for Installment ${latestNextToPay.installment} (₱${formatMoney(latestNextToPay.amount)})?`,
        redirectHome: false,
        isConfirmation: true,
        onConfirm: () => {
          setAlert((prev) => ({ ...prev, visible: false }));
          router.push({
            pathname: "/shared-checkout",
            params: {
              scheduleId: latestNextToPay.id,
              amount: latestNextToPay.amount,
              mode: isSinglePayment ? "one_time" : "installment",
              shareCapitalId: String(id),
              installmentNo: latestNextToPay.installment,
            },
          });
        },
      });
    } catch (error) {
      console.log(error);
    } finally {
      setCheckingPayment(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#034194"]}
            tintColor="#034194"
          />
        }
      >
        <View className="bg-white rounded-3xl p-6 mb-6">
          {loading ? (
            <ActivityIndicator color="#034194" />
          ) : (
            <>
              <Text className="text-slate-400 text-xs font-bold uppercase">
                {isSinglePayment
                  ? "Total Outstanding Deposit"
                  : "Outstanding Capital Balance"}
              </Text>
              <Text className="text-primary text-3xl font-black mt-1">
                ₱{formatMoney(outstanding)}
              </Text>
            </>
          )}
        </View>

        <Text className="font-black text-lg mb-4 px-2">
          {isSinglePayment ? "Payment Details" : "Payment Schedule"}
        </Text>

        {loading ? (
          <ActivityIndicator className="mt-10" color="#034194" />
        ) : schedules.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 border border-slate-100 items-center justify-center mt-4">
            <Text className="text-center text-slate-500 font-medium">
              No payment schedules generated yet.
            </Text>
          </View>
        ) : (
          schedules.map((item, index) => {
            const isPaid = item.status === "paid" || item.status === "success";
            const isNext = nextToPay?.installment === item.installment;

            return (
              <View key={item.id} className="mb-4">
                <View
                  className={`rounded-2xl p-4 border ${
                    isPaid
                      ? "bg-slate-100 border-slate-200 opacity-70"
                      : isNext
                        ? "bg-white border-yellow-300 shadow-sm"
                        : "bg-white border-slate-100"
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View
                        className={`px-2 py-1 rounded-full mr-3 ${isPaid ? "bg-green-100" : isNext ? "bg-yellow-100" : "bg-slate-100"}`}
                      >
                        <Text
                          className={`text-[10px] font-bold ${isPaid ? "text-green-600" : isNext ? "text-yellow-600" : "text-slate-500"}`}
                        >
                          {isPaid ? "PAID" : isNext ? "NEXT" : "PENDING"}
                        </Text>
                      </View>

                      <View className="flex-1 pr-2">
                        <Text className="font-bold text-slate-800">
                          {isSinglePayment
                            ? "Share Capital Payment"
                            : `Installment ${item.installment}`}
                        </Text>
                        <Text className="text-xs text-slate-500 mt-0.5">
                          Due {formatDate(item.due_date, index)}
                        </Text>
                      </View>
                    </View>

                    <Text className="font-black text-primary text-base">
                      ₱{formatMoney(item.amount)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <View className="absolute bottom-0 w-full p-5 bg-white border-t border-slate-200">
        <TouchableOpacity
          disabled={
            loading || checkingPayment || schedules.length === 0 || isFullyPaid
          }
          onPress={handlePay}
          className={`h-16 rounded-2xl justify-center items-center ${loading || checkingPayment || schedules.length === 0 || isFullyPaid ? "bg-slate-300" : "bg-primary"}`}
        >
          {loading || checkingPayment ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">
              {isFullyPaid
                ? "All Payments Completed"
                : nextToPay
                  ? `Pay ₱${formatMoney(nextToPay.amount)}`
                  : "Fully Paid"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        confirmText={alert.isConfirmation ? "Proceed" : "Okay"}
        onConfirm={alert.isConfirmation ? alert.onConfirm : undefined}
        onClose={() => {
          const shouldRedirect = alert.redirectHome;
          setAlert((prev) => ({ ...prev, visible: false }));
          if (shouldRedirect) router.replace("/(main)");
        }}
      />
    </View>
  );
}

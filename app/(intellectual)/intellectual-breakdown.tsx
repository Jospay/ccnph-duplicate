import { CustomAlert } from "@/components/CustomAlert";
import { getIntellectualProperty } from "@/services/intellectualService";
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

export default function IntellectualBreakdown() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

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

  const formatDate = (date: string) => {
    if (!date) return "N/A";

    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const fetchSchedules = async (showLoader = true, returnData = false) => {
    try {
      if (!id || typeof id !== "string") return [];

      if (showLoader) {
        setLoading(true);
      }

      const res = await getIntellectualProperty(id);

      const included = res?.included || [];

      const mapped = included
        .filter((item: any) => item?.type?.includes("schedule"))
        .map((s: any) => ({
          id: String(s.id),
          amount: Number(s.attributes?.amount || 0),
          due_date: s.attributes?.due_date || null,
          status: String(s.attributes?.status || "unpaid").toLowerCase(),
          installment: Number(s.attributes?.installment_no || 1),
        }))
        .sort((a: any, b: any) => a.installment - b.installment);

      setSchedules(mapped);

      if (returnData) {
        return mapped;
      }

      return mapped;
    } catch (e) {
      console.log("Fetch Error:", e);
      setSchedules([]);
      return [];
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!id) {
        router.replace("/details");
        return;
      }

      fetchSchedules();

      return () => {};
    }, [id]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchedules(false);
  };

  const isSinglePayment = schedules.length === 1;

  /**
   * ✅ STRICT NEXT INSTALLMENT
   * ALWAYS PRIORITIZE LOWEST UNPAID INSTALLMENT
   */
  const nextToPay = useMemo(() => {
    return [...schedules]
      .sort((a, b) => a.installment - b.installment)
      .find((s) => s.status !== "paid");
  }, [schedules]);

  /**
   * ✅ OUTSTANDING TOTAL
   */
  const outstanding = useMemo(() => {
    return schedules
      .filter((s) => s.status !== "paid")
      .reduce((a, b) => a + Number(b.amount || 0), 0);
  }, [schedules]);

  /**
   * ✅ FULLY PAID CHECK
   */
  const isFullyPaid =
    schedules.length > 0 && schedules.every((s) => s.status === "paid");

  /**
   * ✅ HANDLE PAYMENT
   * RECHECK FROM SERVER BEFORE CONTINUE
   */
  const handlePay = async () => {
    try {
      setCheckingPayment(true);

      /**
       * ✅ ALWAYS REFRESH LATEST DATA
       */
      const updatedSchedules: any = await fetchSchedules(false, true);

      /**
       * ✅ GET LOWEST UNPAID INSTALLMENT
       */
      const latestNextToPay = [...updatedSchedules]
        ?.sort((a: any, b: any) => a.installment - b.installment)
        ?.find((s: any) => s.status !== "paid");

      /**
       * ✅ ALL PAID
       */
      if (!latestNextToPay) {
        setAlert({
          visible: true,
          title: "Success",
          message: "All intellectual property payments are already completed.",
          redirectHome: true,
          isConfirmation: false,
          onConfirm: () => {},
        });

        return;
      }

      /**
       * ✅ CHECK IF ALREADY PAID
       * EXAMPLE:
       * INSTALLMENT 1 = PAID
       * THEN IT AUTO MOVE TO INSTALLMENT 2
       */
      const alreadyPaid = updatedSchedules.find(
        (s: any) =>
          s.installment === latestNextToPay.installment && s.status === "paid",
      );

      if (alreadyPaid) {
        setAlert({
          visible: true,
          title: "Already Paid",
          message: `Installment ${alreadyPaid.installment} is already paid.`,
          redirectHome: false,
          isConfirmation: false,
          onConfirm: () => {},
        });

        return;
      }

      /**
       * ✅ CONFIRM PAYMENT
       */
      setAlert({
        visible: true,
        title: "Confirm Payment",
        message: isSinglePayment
          ? `Proceed to payment for ₱${formatMoney(latestNextToPay.amount)}?`
          : `Proceed to payment for Installment ${
              latestNextToPay.installment
            } (₱${formatMoney(latestNextToPay.amount)})?`,
        redirectHome: false,
        isConfirmation: true,
        onConfirm: () => {
          setAlert((prev) => ({
            ...prev,
            visible: false,
          }));

          router.push({
            pathname: "/intellectual-checkout",
            params: {
              scheduleId: latestNextToPay.id,
              amount: latestNextToPay.amount,
              mode: isSinglePayment ? "one_time" : "installment",
              intellectualId: String(id),
            },
          });
        },
      });
    } catch (error) {
      console.log("Payment Error:", error);
    } finally {
      setCheckingPayment(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: 140,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#034194"]}
            tintColor="#034194"
          />
        }
      >
        {/* SUMMARY */}
        <View className="bg-white rounded-3xl p-6 mb-6">
          {loading ? (
            <ActivityIndicator />
          ) : (
            <>
              <Text className="text-slate-400 text-xs font-bold uppercase">
                {isSinglePayment ? "Intellectual Fee" : "Outstanding Balance"}
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

        {/* LIST */}
        {loading ? (
          <ActivityIndicator className="mt-10" />
        ) : schedules.length === 0 ? (
          <Text className="text-center text-gray-500 mt-10">
            No schedules found.
          </Text>
        ) : (
          schedules.map((item) => {
            const isPaid = item.status === "paid";

            const isNext = nextToPay?.installment === item.installment;

            return (
              <View key={item.id} className="mb-4">
                <View
                  className={`rounded-2xl p-4 border ${
                    isPaid
                      ? "bg-slate-100 border-slate-200 opacity-70"
                      : isNext
                        ? "bg-white border-yellow-300"
                        : "bg-white border-slate-100"
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      {isPaid ? (
                        <View className="bg-green-100 px-2 py-1 rounded-full mr-3">
                          <Text className="text-green-600 text-[10px] font-bold">
                            PAID
                          </Text>
                        </View>
                      ) : isNext ? (
                        <View className="bg-yellow-100 px-2 py-1 rounded-full mr-3">
                          <Text className="text-yellow-600 text-[10px] font-bold">
                            NEXT
                          </Text>
                        </View>
                      ) : (
                        <View className="bg-slate-100 px-2 py-1 rounded-full mr-3">
                          <Text className="text-slate-500 text-[10px] font-bold">
                            PENDING
                          </Text>
                        </View>
                      )}

                      <View>
                        <Text className="font-bold text-slate-800">
                          {isSinglePayment
                            ? "Intellectual Payment"
                            : `Installment ${item.installment}`}
                        </Text>

                        <Text className="text-xs text-slate-500">
                          Due {formatDate(item.due_date)}
                        </Text>
                      </View>
                    </View>

                    <Text className="font-black text-primary text-base">
                      ₱{formatMoney(item.amount)}
                    </Text>
                  </View>

                  {/* PROGRESS */}
                  <View className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <View
                      className={`h-full ${
                        isPaid
                          ? "bg-green-500 w-full"
                          : isNext
                            ? "bg-yellow-400 w-2/3"
                            : "bg-slate-300 w-1/3"
                      }`}
                    />
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* FOOTER */}
      <View className="absolute bottom-0 w-full p-5 bg-white border-t border-slate-200">
        <TouchableOpacity
          disabled={
            loading || checkingPayment || schedules.length === 0 || isFullyPaid
          }
          onPress={handlePay}
          className={`h-16 rounded-2xl justify-center items-center ${
            loading || checkingPayment || schedules.length === 0 || isFullyPaid
              ? "bg-slate-300"
              : "bg-primary"
          }`}
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

      {/* CUSTOM ALERT */}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        confirmText={alert.isConfirmation ? "Proceed" : "Okay"}
        onConfirm={alert.isConfirmation ? alert.onConfirm : undefined}
        onClose={() => {
          const shouldRedirect = alert.redirectHome;

          setAlert((prev) => ({
            ...prev,
            visible: false,
          }));

          if (shouldRedirect) {
            router.replace("/(main)");
          }
        }}
      />
    </View>
  );
}

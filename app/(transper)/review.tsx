import { CustomAlert } from "@/components/CustomAlert";
import {
  TransferVerification,
  TransferVerifyModal,
} from "@/components/TransferVerifyModal";
import { createTransfer, getWalletBalance } from "@/services/walletService";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import "../../global.css";

const TRANSFER_FEE: number = 0.0;

const formatCurrency = (value: number): string => {
  return `₱${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function ReviewTransferPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{
    amount?: string;
    fee?: string;
    channelId?: string;
    channelName?: string;
    recipientName?: string;
    recipientNumber?: string;
    transferMode?: string;
    purpose?: string;
    remarks?: string;
    destinationBic?: string;
  }>();

  const amount = parseFloat(params.amount || "0");
  const fee = parseFloat(params.fee || "0");
  const total = amount + fee;

  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isTampered, setIsTampered] = useState(false);

  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
    redirectToMain: false,
  });

  // Verification modal (password OR Quick & Secure Login)
  const [verifyModal, setVerifyModal] = useState<{
    visible: boolean;
    errorMessage: string | null;
  }>({
    visible: false,
    errorMessage: null,
  });

  // Re-check wallet integrity every time this screen gains focus — the
  // person may have gone back and forth, and the balance could have been
  // flagged as tampered since the form was first filled in.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        try {
          const res = await getWalletBalance();
          if (cancelled) return;

          if (res?.data?.is_tampered) {
            setIsTampered(true);
            setAlert({
              visible: true,
              title: "Security Notice",
              message:
                res.data.message ||
                "Your wallet balance integrity check failed. Please contact chat support for assistance.",
              redirectToMain: true,
            });
          }
        } catch (err) {
          console.log("Failed to verify wallet state", err);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, []),
  );

  const handleOpenVerify = () => {
    if (!isConfirmed || isProcessing) return;

    if (isTampered) {
      setAlert({
        visible: true,
        title: "Security Notice",
        message:
          "Your wallet balance integrity check failed. Transactions are restricted.",
        redirectToMain: true,
      });
      return;
    }

    if (!params.channelId) {
      setAlert({
        visible: true,
        title: "Missing Destination",
        message: "Please go back and select a destination channel.",
        redirectToMain: false,
      });
      return;
    }

    setVerifyModal({ visible: true, errorMessage: null });
  };

  const closeVerifyModal = () => {
    if (isProcessing) return;
    setVerifyModal({ visible: false, errorMessage: null });
  };

  const handleVerified = async (verification: TransferVerification) => {
    setIsProcessing(true);
    setVerifyModal((prev) => ({ ...prev, errorMessage: null }));

    try {
      const response = await createTransfer({
        channel_id: params.channelId!,
        amount,
        account_name: params.recipientName || "",
        account_number: params.recipientNumber || "",
        destination_bic: params.destinationBic || undefined,
        purpose: params.purpose,
        remarks: params.remarks,
        verification_method: verification.method,
        ...(verification.method === "password"
          ? { password: verification.password }
          : { device_id: verification.device_id }),
      });

      setVerifyModal({ visible: false, errorMessage: null });

      router.push({
        pathname: "/success",
        params: {
          amount,
          channelName: params.channelName,
          recipientName: params.recipientName,
          recipientNumber: params.recipientNumber,
          purpose: params.purpose,
          remarks: params.remarks,
          reference: response.data.reference_number,
          status: response.data.status,
        },
      });
    } catch (error: any) {
      const status = error?.response?.status;
      const responseData = error?.response?.data;
      const isTamperResponse = Boolean(responseData?.is_tampered);

      // Extract specific field errors from Laravel validation response if available
      let message =
        responseData?.message ||
        error?.message ||
        "Transfer could not be processed.";

      if (responseData?.errors) {
        const firstErrorKey = Object.keys(responseData.errors)[0];
        if (firstErrorKey && responseData.errors[firstErrorKey][0]) {
          message = responseData.errors[firstErrorKey][0];
        }
      }

      if (isTamperResponse) {
        setIsTampered(true);
        setVerifyModal({ visible: false, errorMessage: null });

        setAlert({
          visible: true,
          title: "Security Notice",
          message,
          redirectToMain: true,
        });
      } else if (status === 422) {
        console.warn("Transfer Verification Error:", message);

        setVerifyModal((prev) => ({
          ...prev,
          errorMessage: message,
        }));
      } else {
        console.error("Transfer Error:", error);

        setVerifyModal({ visible: false, errorMessage: null });

        setAlert({
          visible: true,
          title: "Transfer Failed",
          message,
          redirectToMain: false,
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const Row = ({
    label,
    value,
    bold,
  }: {
    label: string;
    value: string;
    bold?: boolean;
  }) => (
    <View className="flex-row justify-between mb-3">
      <Text className="text-slate-500 text-sm">{label}</Text>

      <Text
        className={`text-sm ${
          bold ? "font-bold text-primary" : "font-bold text-slate-800"
        }`}
      >
        {value}
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="items-center py-8 px-6 w-full max-w-[600px] mx-auto">
          <View className="mx-5 pb-10 max-w-[500px] w-full self-center">
            <Text className="text-slate-700 font-bold text-base mb-3">
              Review Transfer
            </Text>

            {/* TRANSFER DETAILS */}
            <View className="border border-slate-200 rounded-xl p-4 bg-slate-50 mb-4">
              <Row
                label="Method"
                value={
                  params.transferMode === "qr"
                    ? "Transfer via QR"
                    : "Account Number"
                }
              />

              <Row label="Destination" value={params.channelName || "—"} />

              <Row label="Recipient Name" value={params.recipientName || "—"} />

              <Row
                label="Account / Number"
                value={params.recipientNumber || "—"}
              />

              {params.purpose ? (
                <Row label="Purpose" value={params.purpose} />
              ) : null}

              {params.remarks ? (
                <Row label="Remarks" value={params.remarks} />
              ) : null}
            </View>

            {/* TRANSFER AMOUNT SUMMARY */}
            <View className="border border-slate-200 rounded-xl p-4 bg-white mb-5">
              <Row label="Amount" value={formatCurrency(amount)} />

              <Row
                label="Transfer Fee"
                value={fee === 0 ? "Free" : formatCurrency(fee)}
              />

              <View className="h-[1px] bg-slate-100 my-2" />

              <View className="flex-row justify-between">
                <Text className="text-slate-700 font-bold">Total Deducted</Text>

                <Text className="text-primary font-bold text-lg">
                  {formatCurrency(total)}
                </Text>
              </View>
            </View>

            {/* NON-REFUNDABLE NOTICE */}
            <View className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <Text className="text-amber-800 text-xs leading-5">
                <Text className="font-bold">Important Notice: </Text>
                Please verify that the{" "}
                <Text className="font-bold">account details</Text> and{" "}
                <Text className="font-bold">amount</Text> entered are correct.
                Transfers sent to an incorrect account or with an incorrect
                amount are final and{" "}
                <Text className="font-bold">non-refundable.</Text>
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View
        className="w-full p-5 bg-white border-t border-slate-200"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsConfirmed((prev) => !prev)}
          disabled={isTampered}
          className="flex-row items-center pb-4"
        >
          <View
            className={`w-6 h-6 rounded-sm border items-center justify-center mr-3 ${
              isConfirmed
                ? "bg-primary border-primary"
                : "border-primary border-2 bg-white"
            }`}
          >
            {isConfirmed && (
              <Ionicons name="checkmark" size={16} color="white" />
            )}
          </View>

          <Text className="text-slate-700 text-sm flex-1">
            Yes, I confirm that all transfer details above are correct.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleOpenVerify}
          disabled={!isConfirmed || isProcessing || isTampered}
          className={`h-14 rounded-xl justify-center items-center ${
            !isConfirmed || isProcessing || isTampered
              ? "bg-slate-300"
              : "bg-primary"
          }`}
        >
          {isProcessing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">
              Confirm Transfer
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <TransferVerifyModal
        visible={verifyModal.visible}
        loading={isProcessing}
        errorMessage={verifyModal.errorMessage}
        onClose={closeVerifyModal}
        onVerify={handleVerified}
      />

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        confirmText="Okay"
        onClose={() => {
          const shouldRedirect = alert.redirectToMain;

          setAlert((prev) => ({ ...prev, visible: false }));

          if (shouldRedirect) {
            router.replace("/(main)");
          }
        }}
      />
    </View>
  );
}

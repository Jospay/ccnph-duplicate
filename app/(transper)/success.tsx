import * as MediaLibrary from "expo-media-library";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ViewShot from "react-native-view-shot";
import "../../global.css";

export default function TransferSuccessPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    amount?: string;
    channelName?: string;
    recipientName?: string;
    recipientNumber?: string;
    purpose?: string;
    remarks?: string;
    reference?: string;
    status?: string;
  }>();

  const viewShotRef = useRef<ViewShot>(null);
  const [isSaving, setIsSaving] = useState(false);

  const amount = parseFloat(params.amount || "0");
  const isPending = params.status === "pending";

  const date = useMemo(
    () =>
      new Date().toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  );

  const handleSaveReceipt = async () => {
    try {
      setIsSaving(true);

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant media library access to save the receipt to your gallery.",
        );
        setIsSaving(false);
        return;
      }

      if (viewShotRef.current?.capture) {
        const uri = await viewShotRef.current.capture();
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert("Success", "Receipt saved to your photo gallery!");
      } else {
        Alert.alert("Error", "Could not capture receipt layout.");
      }
    } catch (error) {
      console.error("Save receipt error:", error);
      Alert.alert("Error", "Failed to save receipt image.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="items-center py-10 px-6 w-full max-w-[600px] mx-auto">
          <View className="mx-5 max-w-[500px] w-full self-center items-center">
            <ViewShot
              ref={viewShotRef}
              options={{ format: "png", quality: 1.0 }}
              style={{ width: "100%", backgroundColor: "#ffffff" }}
            >
              <View className="items-center bg-white p-4 rounded-2xl">
                <View
                  className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${
                    isPending ? "bg-amber-100" : "bg-green-100"
                  }`}
                >
                  <Text
                    className={`text-3xl font-bold ${
                      isPending ? "text-amber-600" : "text-green-600"
                    }`}
                  >
                    {isPending ? "⏳" : "✓"}
                  </Text>
                </View>

                <Text className="text-slate-800 text-xl font-bold mb-1">
                  {isPending ? "Transfer Submitted" : "Transfer Successful"}
                </Text>
                <Text className="text-slate-400 text-sm mb-6">
                  {isPending
                    ? "Your transfer is being processed"
                    : "Your funds are on their way"}
                </Text>

                <Text className="text-primary text-4xl font-bold mb-8">
                  ₱
                  {amount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </Text>

                <View className="w-full border border-slate-200 rounded-xl p-4 bg-slate-50 gap-y-3">
                  <View className="flex-row justify-between">
                    <Text className="text-slate-500 text-sm">Sent To</Text>
                    <Text className="text-slate-800 font-bold text-sm">
                      {params.recipientName || "—"}
                    </Text>
                  </View>

                  <View className="flex-row justify-between">
                    <Text className="text-slate-500 text-sm">Via</Text>
                    <Text className="text-slate-800 font-bold text-sm">
                      {params.channelName || "—"}
                    </Text>
                  </View>

                  <View className="flex-row justify-between">
                    <Text className="text-slate-500 text-sm">
                      Account Number
                    </Text>
                    <Text className="text-slate-800 font-bold text-sm">
                      {params.recipientNumber || "—"}
                    </Text>
                  </View>

                  {params.purpose ? (
                    <View className="flex-row justify-between">
                      <Text className="text-slate-500 text-sm">Purpose</Text>
                      <Text className="text-slate-800 font-bold text-sm">
                        {params.purpose}
                      </Text>
                    </View>
                  ) : null}

                  {params.remarks ? (
                    <View className="flex-row justify-between">
                      <Text className="text-slate-500 text-sm">Remarks</Text>
                      <Text className="text-slate-800 text-sm">
                        {params.remarks}
                      </Text>
                    </View>
                  ) : null}

                  <View className="h-[1px] bg-slate-200 my-1" />

                  <View className="flex-row justify-between">
                    <Text className="text-slate-500 text-sm">
                      Reference No.
                    </Text>
                    <Text className="text-slate-800 font-bold text-sm">
                      {params.reference || "—"}
                    </Text>
                  </View>

                  <View className="flex-row justify-between">
                    <Text className="text-slate-500 text-sm">Date</Text>
                    <Text className="text-slate-800 font-bold text-sm">
                      {date}
                    </Text>
                  </View>
                </View>
              </View>
            </ViewShot>
          </View>
        </View>
      </ScrollView>

      <View className="w-full p-5 bg-white border-t border-slate-200 gap-y-3">
        <TouchableOpacity
          onPress={handleSaveReceipt}
          disabled={isSaving}
          className="h-14 rounded-xl justify-center items-center border border-primary bg-white"
        >
          {isSaving ? (
            <ActivityIndicator color="#034194" />
          ) : (
            <Text className="text-primary font-bold text-lg">
              Save Receipt as Image
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace("/(main)")}
          className="h-14 rounded-xl justify-center items-center bg-primary"
        >
          <Text className="text-white font-bold text-lg">Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

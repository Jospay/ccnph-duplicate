import { CustomAlert } from "@/components/CustomAlert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  calculateTransferFee,
  getTransferConfig,
  getWalletBalance,
  TransferChannel,
  TransferConfig,
} from "@/services/walletService";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import "../../global.css";

const PURPOSES = [
  "Personal Transfer",
  "Bills Payment",
  "Family Support",
  "Services / Work",
  "Others",
];

const MODE_TABS: { key: "manual" | "qr"; label: string }[] = [
  { key: "manual", label: "Account No." },
  { key: "qr", label: "Transfer via QR" },
];

const toggleStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabBase: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#ffffff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  labelBase: {
    fontWeight: "bold",
    fontSize: 14,
  },
  labelActive: {
    color: "#034194",
  },
  labelInactive: {
    color: "#94a3b8",
  },
});

export default function TransferPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{
    scannedName?: string;
    scannedNumber?: string;
    scannedAmount?: string;
    scannedChannelId?: string;
    scannedProvider?: string; // BIC / institution code extracted from the QR
    scannedRaw?: string;
  }>();
  const lastProcessedRaw = useRef<string | null>(null);

  const [pageLoading, setPageLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);

  // Tamper Alert State
  const [isTampered, setIsTampered] = useState(false);
  const [tamperAlert, setTamperAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  // Dynamic config from the server
  const [channels, setChannels] = useState<TransferChannel[]>([]);
  const [config, setConfig] = useState<TransferConfig>({
    min_transfer: 1,
    fee: { type: "PHP", transfer_fee: 0 },
    channels: [],
  });

  const instapayChannel = channels.find((c) => c.id === "instapay") ?? null;
  const manualChannels = channels.filter((c) => c.id !== "instapay");

  // Form Fields
  const [transferMode, setTransferMode] = useState<"manual" | "qr">("manual");
  const [selectedChannel, setSelectedChannel] =
    useState<TransferChannel | null>(null);
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [remarks, setRemarks] = useState("");

  // QR-specific state
  const [qrScanned, setQrScanned] = useState(false);
  const [qrAmountLocked, setQrAmountLocked] = useState(false);
  const [scannedBic, setScannedBic] = useState(""); // BIC/provider code decoded from the QR

  // Modals
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showPurposeModal, setShowPurposeModal] = useState(false);

  const fetchWalletData = async () => {
    try {
      setPageLoading(true);
      const [walletRes, configRes] = await Promise.all([
        getWalletBalance(),
        getTransferConfig(),
      ]);

      setWalletBalance(parseFloat(walletRes?.data?.balance || "0"));

      if (walletRes?.data?.is_tampered) {
        setIsTampered(true);
        setTamperAlert({
          visible: true,
          title: "Security Notice",
          message:
            walletRes.data.message ||
            "Your wallet balance integrity check failed. Transactions are restricted.",
        });
      }

      const cfg = configRes.data;
      setConfig(cfg);
      setChannels(cfg.channels);
      setSelectedChannel(cfg.channels.find((c) => c.id !== "instapay") ?? null);
    } catch (err) {
      console.error("Failed to load transfer data:", err);
      Alert.alert("Error", "Could not fetch transfer data.");
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const handleAmountChange = (value: string) => {
    let raw = value.replace(/[^0-9]/g, "");
    if (raw) {
      setAmount(parseInt(raw, 10).toLocaleString());
    } else {
      setAmount("");
    }
  };

  // Process scanner return data (wait until channels have loaded)
  useEffect(() => {
    if (pageLoading) return;
    if (!params.scannedRaw || params.scannedRaw === lastProcessedRaw.current) {
      return;
    }
    lastProcessedRaw.current = params.scannedRaw;

    setTransferMode("qr");
    setAccountName(params.scannedName || "");
    setAccountNumber(params.scannedNumber || "");
    setScannedBic(params.scannedProvider || "");
    setSelectedChannel(instapayChannel);

    if (params.scannedAmount) {
      handleAmountChange(params.scannedAmount);
      setQrAmountLocked(true);
    } else {
      setQrAmountLocked(false);
    }

    setQrScanned(true);
  }, [params.scannedRaw, pageLoading]);

  const handleModeChange = (mode: "manual" | "qr") => {
    if (isTampered) return;

    if (mode === "qr") {
      if (!instapayChannel) {
        Alert.alert("Unavailable", "QR transfers are currently unavailable.");
        return;
      }
      setTransferMode("qr");
      setSelectedChannel(instapayChannel);
      router.push("./scanqrcode");
      return;
    }

    if (mode === transferMode) return;

    setTransferMode("manual");
    setSelectedChannel(manualChannels[0] ?? null); // Reset back to first manual channel
    setAccountName("");
    setAccountNumber("");
    setQrScanned(false);
    setScannedBic("");
    if (qrAmountLocked) {
      setAmount("");
    }
    setQrAmountLocked(false);
  };

  const handleRescan = () => {
    if (isTampered) return;

    setQrScanned(false);
    setAccountName("");
    setAccountNumber("");
    setScannedBic("");
    if (qrAmountLocked) {
      setAmount("");
    }
    setQrAmountLocked(false);
    router.push("./scanqrcode");
  };

  const cleanAmount = parseFloat(amount.replace(/,/g, "") || "0");
  const fee = calculateTransferFee(cleanAmount, config.fee);
  const totalDeduct = cleanAmount + fee;

  const isValid =
    !isTampered &&
    cleanAmount >= config.min_transfer &&
    totalDeduct <= walletBalance &&
    (transferMode === "qr"
      ? qrScanned && accountNumber.trim() !== ""
      : !!selectedChannel &&
        accountName.trim() !== "" &&
        accountNumber.trim() !== "");

  const handleContinue = () => {
    if (isTampered) {
      setTamperAlert({
        visible: true,
        title: "Security Notice",
        message:
          "Your wallet balance integrity check failed. Transactions are restricted.",
      });
      return;
    }

    if (!isValid) return;

    const channel = transferMode === "qr" ? instapayChannel : selectedChannel;
    if (!channel) return;

    router.push({
      pathname: "/review",
      params: {
        amount: cleanAmount,
        fee,
        channelId: channel.id,
        channelName: channel.name,
        recipientName: accountName,
        recipientNumber: accountNumber,
        transferMode,
        purpose,
        remarks,
        // Only meaningful for QR transfers — lets the backend skip the
        // name-based BIC lookup that fails for the generic InstaPay channel.
        destinationBic: transferMode === "qr" ? scannedBic : undefined,
      },
    });
  };

  const handleCloseTamperAlert = () => {
    setTamperAlert((prev) => ({ ...prev, visible: false }));
    if (isTampered) {
      router.replace("/(main)");
    }
  };

  if (pageLoading) {
    return (
      <View className="flex-1 bg-white p-5 pt-20">
        <Skeleton className="h-10 w-3/4 self-center mb-4" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        bottomOffset={20}
      >
        <View className="items-center py-8 px-6 w-full max-w-[600px] mx-auto">
          <View className="w-full max-w-[500px]">
            {/* AVAILABLE BALANCE */}
            <View className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-5">
              <Text className="text-slate-500 text-xs uppercase mb-1">
                Available Balance
              </Text>
              <Text className="text-primary text-3xl font-bold">
                ₱
                {walletBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>

            {/* TRANSFER MODE TOGGLE */}
            <View style={toggleStyles.container}>
              {MODE_TABS.map((tab) => {
                const isActive = transferMode === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => handleModeChange(tab.key)}
                    style={[
                      toggleStyles.tabBase,
                      isActive && toggleStyles.tabActive,
                    ]}
                  >
                    <Text
                      style={[
                        toggleStyles.labelBase,
                        isActive
                          ? toggleStyles.labelActive
                          : toggleStyles.labelInactive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* TRANSFER DETAILS FORM */}
            {transferMode === "qr" ? (
              qrScanned ? (
                <View className="gap-y-4 mb-5">
                  <View className="border border-emerald-200 bg-emerald-50 rounded-xl p-4">
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-emerald-700 text-xs font-bold">
                        QR Ph Scanned
                      </Text>
                      <Text className="text-[10px] font-bold text-emerald-800 bg-emerald-200 px-2.5 py-0.5 rounded-full">
                        InstaPay
                      </Text>
                    </View>
                    <Text className="text-slate-800 font-bold">
                      {accountName || "Unknown recipient"}
                    </Text>
                    <Text className="text-slate-500 text-xs">
                      {accountNumber ||
                        "No account number detected — enter it below"}
                    </Text>
                  </View>

                  <View>
                    <Text className="text-slate-600 text-xs font-bold mb-1">
                      Recipient Name
                    </Text>
                    <TextInput
                      value={accountName}
                      onChangeText={setAccountName}
                      editable={!isTampered}
                      placeholder="Recipient name"
                      className="border border-slate-200 rounded-xl p-4 text-slate-800 bg-white"
                    />
                  </View>

                  <View>
                    <Text className="text-slate-600 text-xs font-bold mb-1">
                      Account / Mobile Number
                    </Text>
                    <TextInput
                      value={accountNumber}
                      onChangeText={setAccountNumber}
                      editable={!isTampered}
                      keyboardType="number-pad"
                      placeholder="Account number"
                      className="border border-slate-200 rounded-xl p-4 text-slate-800 bg-white"
                    />
                  </View>

                  <Pressable
                    onPress={handleRescan}
                    disabled={isTampered}
                    className="items-center py-2"
                  >
                    <Text className="text-primary text-xs font-bold">
                      Scan a different QR code
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View className="border border-slate-200 bg-slate-50 rounded-xl p-6 items-center mb-5">
                  <Text className="text-slate-700 font-bold mb-1">
                    Scan Recipient QR
                  </Text>
                  <Text className="text-slate-400 text-xs text-center mb-4">
                    You backed out before scanning.
                  </Text>
                  <Pressable
                    onPress={() => router.push("./scanqrcode")}
                    disabled={isTampered}
                    className="bg-primary px-6 py-3 rounded-xl"
                  >
                    <Text className="text-white font-bold">
                      Open Camera / Scan
                    </Text>
                  </Pressable>
                </View>
              )
            ) : (
              <View className="gap-y-4 mb-5">
                {/* BANK / E-WALLET PICKER (Manual Mode Only) */}
                <View>
                  <Text className="text-slate-600 text-xs font-bold mb-1">
                    Bank / E-Wallet
                  </Text>
                  <Pressable
                    onPress={() => setShowChannelModal(true)}
                    disabled={isTampered}
                    className="border border-slate-200 rounded-xl p-4 bg-white flex-row justify-between items-center"
                  >
                    <Text className="text-slate-800 font-bold">
                      {selectedChannel?.name ?? "No channels available"}
                    </Text>
                    <Text className="text-slate-400 text-xs">
                      Tap to change
                    </Text>
                  </Pressable>
                </View>

                {/* ACCOUNT NAME */}
                <View>
                  <Text className="text-slate-600 text-xs font-bold mb-1">
                    Account Name
                  </Text>
                  <TextInput
                    value={accountName}
                    onChangeText={setAccountName}
                    editable={!isTampered}
                    placeholder="e.g. Juan Dela Cruz"
                    className="border border-slate-200 rounded-xl p-4 text-slate-800 bg-white"
                  />
                </View>

                {/* ACCOUNT NUMBER */}
                <View>
                  <Text className="text-slate-600 text-xs font-bold mb-1">
                    Account / Mobile Number
                  </Text>
                  <TextInput
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    editable={!isTampered}
                    keyboardType="number-pad"
                    placeholder="e.g. 09123456789"
                    className="border border-slate-200 rounded-xl p-4 text-slate-800 bg-white"
                  />
                </View>
              </View>
            )}

            {/* AMOUNT INPUT */}
            <View className="mb-4">
              <Text className="text-slate-600 text-xs font-bold mb-1">
                Amount
              </Text>
              <View className="flex-row items-center border border-slate-200 rounded-xl px-4 bg-white">
                <Text className="text-primary text-xl font-bold mr-2">₱</Text>
                <TextInput
                  value={amount}
                  onChangeText={handleAmountChange}
                  editable={!qrAmountLocked && !isTampered}
                  keyboardType="numeric"
                  placeholder="0.00"
                  className={`text-xl font-bold py-3 flex-1 ${
                    qrAmountLocked ? "text-slate-400" : "text-slate-800"
                  }`}
                />
              </View>
              {totalDeduct > walletBalance ? (
                <Text className="text-xs text-[#ef4444] mt-1">
                  Exceeds available balance{fee > 0 ? " (including fee)" : ""}
                </Text>
              ) : qrAmountLocked ? (
                <Text className="text-xs text-emerald-600 mt-1">
                  Amount set by the scanned QR code
                </Text>
              ) : (
                <Text className="text-xs text-slate-400 mt-1">
                  Minimum transfer is ₱{config.min_transfer.toLocaleString()}
                  {fee > 0 ? ` • Fee: ₱${fee.toFixed(2)}` : ""}
                </Text>
              )}
            </View>

            {/* PURPOSE PICKER */}
            <View className="mb-4">
              <Text className="text-slate-600 text-xs font-bold mb-1">
                Purpose (Optional)
              </Text>
              <Pressable
                onPress={() => setShowPurposeModal(true)}
                disabled={isTampered}
                className="border border-slate-200 rounded-xl p-4 bg-white flex-row justify-between items-center"
              >
                <Text className="text-slate-800">{purpose}</Text>
                <Text className="text-slate-400 text-xs">Select</Text>
              </Pressable>
            </View>

            {/* REMARKS */}
            <View>
              <Text className="text-slate-600 text-xs font-bold mb-1">
                Remarks (Optional)
              </Text>
              <TextInput
                value={remarks}
                onChangeText={setRemarks}
                editable={!isTampered}
                placeholder="Add a note or message"
                className="border border-slate-200 rounded-xl p-4 text-slate-800 bg-white"
              />
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* FOOTER */}
      <View className="w-full p-5 bg-white border-t border-slate-200">
        <Pressable
          onPress={handleContinue}
          disabled={!isValid}
          className={`h-14 rounded-xl justify-center items-center ${
            !isValid ? "bg-slate-300" : "bg-primary"
          }`}
        >
          <Text className="text-white font-bold text-lg">Continue</Text>
        </Pressable>
      </View>

      {/* BANK / WALLET MODAL */}
      <Modal
        visible={showChannelModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View
            className="bg-white rounded-t-2xl p-5 max-h-[70%]"
            style={{ paddingBottom: Math.max(insets.bottom, 20) }}
          >
            <Text className="font-bold text-lg mb-4">
              Select Bank or E-Wallet
            </Text>
            <ScrollView>
              {manualChannels.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setSelectedChannel(item);
                    setShowChannelModal(false);
                  }}
                  className="py-3 border-b border-slate-100 flex-row justify-between items-center"
                >
                  <Text className="font-bold text-slate-800">{item.name}</Text>
                  <Text className="text-xs text-slate-400">
                    {item.category}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setShowChannelModal(false)}
              className="mt-4 p-3 bg-slate-100 rounded-xl items-center"
            >
              <Text className="font-bold text-slate-600">Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* PURPOSE MODAL */}
      <Modal
        visible={showPurposeModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View
            className="bg-white rounded-t-2xl p-5"
            style={{ paddingBottom: Math.max(insets.bottom, 20) }}
          >
            <Text className="font-bold text-lg mb-4">Select Purpose</Text>
            {PURPOSES.map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  setPurpose(item);
                  setShowPurposeModal(false);
                }}
                className="py-3 border-b border-slate-100"
              >
                <Text className="text-slate-800">{item}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setShowPurposeModal(false)}
              className="mt-4 p-3 bg-slate-100 rounded-xl items-center"
            >
              <Text className="font-bold text-slate-600">Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* TAMPER DETECTED CUSTOM ALERT */}
      <CustomAlert
        visible={tamperAlert.visible}
        title={tamperAlert.title}
        message={tamperAlert.message}
        onClose={handleCloseTamperAlert}
      />
    </View>
  );
}

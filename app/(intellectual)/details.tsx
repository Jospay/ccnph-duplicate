import { BASE_URL } from "@/services/api";
import {
  getIntellectualProperty,
  isEditable,
  updateIntellectualProperty,
} from "@/services/intellectualService";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ChevronRight,
  Eye,
  Layers,
  MessageSquare,
  Plus,
  Smartphone,
  Trash2,
  Upload,
  Wallet,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { CustomAlert } from "@/components/CustomAlert";
import "../../global.css";

const { width, height } = Dimensions.get("window");

const STORAGE_URL = `${BASE_URL}/storage/`;
const TOTAL_MAX_UPLOAD_SIZE = 8 * 1024 * 1024;

const normalizeFileUrl = (path: string | null) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  return `${STORAGE_URL}${cleanPath}`;
};

interface Attachment {
  id: string | number;
  name: string;
  uri: string;
  type: string;
  size?: number;
  isNew?: boolean;
}

export default function DetailsPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const scrollRef = useRef<ScrollView>(null);
  const scrollPosition = useRef(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [data, setData] = useState<any>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [hasSchedules, setHasSchedules] = useState(false);

  // Track extracted relationship ID to pass to your chat interface route
  const [conversationId, setConversationId] = useState<string | null>(null);

  // CUSTOM ALERT STATE
  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    applicability: "",
    creation_type: "",
    form_type: "",
    claims: [{ description: "" }],
    delete_document_ids: [] as number[],
  });

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => {
      scrollRef.current?.scrollTo({
        y: scrollPosition.current,
        animated: true,
      });
    });

    const hide = Keyboard.addListener("keyboardDidHide", () => {});

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const fetchDetails = async () => {
    try {
      setLoading(true);

      const res = await getIntellectualProperty(id as string);

      // JSON:API top-level response parsing
      const ip = res.data;
      const included = res.included || [];

      setData(ip);

      // Extract conversation tracking block from payload relationships mapping
      const extractedConvoId =
        ip.relationships?.conversation?.data?.id ||
        ip.attributes?.conversation_id ||
        null;

      setConversationId(extractedConvoId ? String(extractedConvoId) : null);

      // Check if schedules exist in relationships
      const schedulesRefs = ip.relationships?.schedules?.data || [];
      setHasSchedules(schedulesRefs.length > 0);

      const claimRefs = ip.relationships?.claims?.data || [];

      const mappedClaims = claimRefs.map((ref: any) => {
        const fullClaim = included.find(
          (inc: any) =>
            String(inc.id) === String(ref.id) && inc.type.includes("claim"),
        );

        return {
          description: fullClaim?.attributes?.description || "",
        };
      });

      const docRefs = ip.relationships?.documents?.data || [];

      const mappedAttachments = docRefs
        .map((ref: any) => {
          const fullDoc = included.find(
            (inc: any) =>
              String(inc.id) === String(ref.id) &&
              inc.type.includes("document"),
          );

          if (!fullDoc) return null;

          const attachment = fullDoc?.attributes?.attachment || "";

          return {
            id: fullDoc.id,
            name: attachment.split("/").pop() || "File",
            uri: normalizeFileUrl(attachment),
            type: "image/jpeg",
            isNew: false,
          };
        })
        .filter(Boolean);

      setAttachments(mappedAttachments as Attachment[]);

      setForm({
        title: ip.attributes?.title || "",
        description: ip.attributes?.description || "",
        applicability: ip.attributes?.applicability || "",
        creation_type: ip.attributes?.creation_type || "",
        form_type: ip.attributes?.form_type || "",
        claims: mappedClaims.length > 0 ? mappedClaims : [{ description: "" }],
        delete_document_ids: [],
      });
    } catch (error) {
      setAlert({
        visible: true,
        title: "Error",
        message: "Failed to load details payload.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (id) {
        fetchDetails();
      }
    }, [id]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDetails();
  }, [id]);

  const addClaim = () => {
    const lastClaim = form.claims[form.claims.length - 1];

    if (!lastClaim.description.trim()) {
      setAlert({
        visible: true,
        title: "Required",
        message: "Complete current claim text field first.",
      });
      return;
    }

    setForm({
      ...form,
      claims: [...form.claims, { description: "" }],
    });
  };

  const removeClaim = (index: number) => {
    if (form.claims.length === 1) return;

    setForm({
      ...form,
      claims: form.claims.filter((_, i) => i !== index),
    });
  };

  const updateClaim = (text: string, index: number) => {
    const newClaims = [...form.claims];
    newClaims[index].description = text;

    setForm({
      ...form,
      claims: newClaims,
    });
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        multiple: true,
      });

      if (result.canceled) return;

      const oversizedFile = result.assets.find(
        (asset) => (asset.size || 0) > TOTAL_MAX_UPLOAD_SIZE,
      );

      if (oversizedFile) {
        setAlert({
          visible: true,
          title: "File Too Large",
          message: `The image "${oversizedFile.name}" exceeds the maximum limit of 8MB. Please select a smaller file.`,
        });
        return;
      }

      const validFiles: Attachment[] = result.assets.map((asset) => ({
        id: `new-${Date.now()}-${Math.random()}`,
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || "image/jpeg",
        size: asset.size,
        isNew: true,
      }));

      setAttachments((prev) => [...prev, ...validFiles]);
    } catch {
      setAlert({
        visible: true,
        title: "Error",
        message: "Failed to access storage documents.",
      });
    }
  };

  const removeAttachment = (file: Attachment) => {
    if (!file.isNew) {
      setForm((prev) => ({
        ...prev,
        delete_document_ids: [...prev.delete_document_ids, Number(file.id)],
      }));
    }

    setAttachments((prev) => prev.filter((a) => a.id !== file.id));
  };

  const handleUpdate = async () => {
    try {
      setUpdating(true);

      const formData = new FormData();

      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("applicability", form.applicability);
      formData.append("creation_type", form.creation_type);
      formData.append("form_type", form.form_type);

      form.claims
        .filter((c) => c.description.trim())
        .forEach((c, i) => {
          formData.append(`claims[${i}][description]`, c.description);
        });

      form.delete_document_ids.forEach((id, i) =>
        formData.append(`delete_document_ids[${i}]`, id.toString()),
      );

      attachments
        .filter((f) => f.isNew)
        .forEach((f, i) => {
          formData.append(`documents[${i}]`, {
            uri: f.uri,
            name: f.name,
            type: f.type,
          } as any);
        });

      await updateIntellectualProperty(id as string, formData);

      setIsEditing(false);
      fetchDetails();

      setAlert({
        visible: true,
        title: "Success",
        message: "Updated details successfully.",
      });
    } catch {
      setAlert({
        visible: true,
        title: "Error",
        message: "Update failed.",
      });
    } finally {
      setUpdating(false);
    }
  };

  const openPreview = (uri: string) => {
    setSelectedImage(uri);
    setPreviewVisible(true);
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator color="#007AFF" />
      </View>
    );
  }

  const attr = data?.attributes ?? {};
  const showPaymentButton =
    attr.form_type === "payment" &&
    (attr.status?.toLowerCase() === "waiting_for_payment" || hasSchedules);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <View className="flex-1 bg-[#F8FAFC]">
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={(e) => {
            scrollPosition.current = e.nativeEvent.contentOffset.y;
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Status Header Area */}
          <View className="p-6 bg-white border-b border-slate-100 rounded-b-[40px] shadow-sm">
            <View className="flex-row flex-wrap justify-between items-center gap-3">
              <View className="flex-row flex-wrap gap-2 flex-1 min-w-[60%]">
                <View className="bg-slate-100 px-3 py-1.5 rounded-full flex-row items-center">
                  <Layers size={12} color="#64748b" />
                  <Text className="text-slate-600 font-semibold text-[10px] ml-1 uppercase">
                    {form.creation_type}
                  </Text>
                </View>

                <View className="bg-slate-100 px-3 py-1.5 rounded-full flex-row items-center">
                  <Smartphone size={12} color="#64748b" />
                  <Text className="text-slate-600 font-semibold text-[10px] ml-1 uppercase">
                    {form.form_type}
                  </Text>
                </View>
              </View>

              <View
                className={`px-4 py-2 rounded-2xl ${
                  attr.status === "registered"
                    ? "bg-green-100"
                    : attr.status === "pending"
                      ? "bg-amber-100"
                      : "bg-[#FFE6E9]"
                }`}
              >
                <Text
                  className={`font-bold text-xs uppercase ${
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
          </View>

          <View className="p-5">
            {/* HELPDESK CHAT CARD LINKAGE */}
            {conversationId && (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/(intellectual-chat)/",
                    params: {
                      conversationId: conversationId,
                      title: form.title,
                    },
                  })
                }
                className="bg-primary rounded-3xl p-4 mb-6 shadow-lg shadow-emerald-600/20 active:opacity-90"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-white text-lg font-extrabold mb-1 tracking-wide">
                      Message Intellectual Support
                    </Text>
                  </View>

                  <View className="bg-white/15 p-3.5 rounded-2xl flex-row items-center gap-1">
                    <MessageSquare size={24} color="white" />
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* PAYMENT LOGS LINKAGE */}
            {showPaymentButton && (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/intellectual-payment",
                    params: { id: id as string },
                  })
                }
                className="bg-primary rounded-3xl p-5 mb-6 shadow-lg shadow-primary/30 active:opacity-90"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-4">
                    <Text className="text-white text-xl font-extrabold mb-1 tracking-wide">
                      {hasSchedules
                        ? "View Payment Breakdown"
                        : "Proceed to Payment"}
                    </Text>
                    <Text className="text-white/80 text-xs font-medium leading-relaxed">
                      {hasSchedules
                        ? "Your payment schedule is active. Tap here to view your installment logs and outstanding balances."
                        : "Your application is approved. Tap here to choose your payment term and complete the process."}
                    </Text>
                  </View>

                  <View className="bg-white/15 p-3.5 rounded-2xl flex-row items-center gap-1">
                    <Wallet size={24} color="white" />
                    <ChevronRight
                      size={18}
                      color="white"
                      className="opacity-80"
                    />
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Content Display Form Container */}
            <View className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 mb-6">
              <Text className="text-slate-400 text-[10px] font-black uppercase mb-2">
                Property Title || {conversationId || "Hello"}
              </Text>

              {isEditing ? (
                <TextInput
                  className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-900 mb-6 font-bold"
                  value={form.title}
                  onChangeText={(t) => setForm({ ...form, title: t })}
                />
              ) : (
                <Text className="text-xl font-bold text-slate-800 mb-6">
                  {attr.title}
                </Text>
              )}

              <Text className="text-slate-400 text-[10px] font-black uppercase mb-2">
                Detailed Description
              </Text>

              {isEditing ? (
                <TextInput
                  multiline
                  className="bg-slate-50 p-4 rounded-xl border border-slate-200 min-h-[100px] text-slate-700"
                  value={form.description}
                  onChangeText={(t) => setForm({ ...form, description: t })}
                />
              ) : (
                <Text className="text-slate-600 leading-6 text-[15px]">
                  {attr.description}
                </Text>
              )}
            </View>

            {/* Claims Context Layout */}
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-4 px-2">
                <Text className="text-slate-900 text-lg font-black">
                  Claims List
                </Text>

                {isEditing && (
                  <TouchableOpacity
                    onPress={addClaim}
                    className="bg-primary w-10 h-10 rounded-full items-center justify-center"
                  >
                    <Plus size={20} color="white" />
                  </TouchableOpacity>
                )}
              </View>

              {form.claims.map((c, i) => (
                <View
                  key={i}
                  className="bg-white p-4 rounded-2xl mb-3 border border-slate-100 flex-row"
                >
                  <Text className="text-primary font-black mr-3 mt-1">
                    0{i + 1}
                  </Text>

                  <View className="flex-1">
                    {isEditing ? (
                      <View className="flex-row">
                        <TextInput
                          multiline
                          className="flex-1 text-slate-700"
                          value={c.description}
                          onChangeText={(t) => updateClaim(t, i)}
                          placeholder="Describe claim criteria..."
                        />

                        <TouchableOpacity
                          onPress={() => removeClaim(i)}
                          className="ml-2"
                        >
                          <Trash2 size={18} color="#FDA4AF" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text className="text-slate-600 text-sm leading-5">
                        {c.description}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* Attachments Section View */}
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-4 px-2">
                <Text className="text-slate-900 text-lg font-black">
                  Attachments
                </Text>

                {isEditing && (
                  <TouchableOpacity
                    onPress={handlePickFile}
                    className="flex-row items-center bg-slate-100 px-4 py-2 rounded-full"
                  >
                    <Upload size={16} color="#64748b" />
                    <Text className="text-slate-600 font-bold text-xs ml-2">
                      Upload
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View className="flex-row flex-wrap justify-between">
                {attachments.map((file) => (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    key={file.id}
                    onPress={() => openPreview(file.uri)}
                    style={{ width: (width - 60) / 2 }}
                    className="bg-white rounded-2xl border border-slate-100 mb-4 overflow-hidden shadow-sm p-2"
                  >
                    <View className="relative">
                      <Image
                        source={{ uri: file.uri }}
                        className="h-32 w-full rounded-xl"
                        resizeMode="cover"
                      />

                      <View className="absolute bottom-2 right-2 bg-black/50 p-1.5 rounded-lg">
                        <Eye size={12} color="white" />
                      </View>

                      {isEditing && (
                        <TouchableOpacity
                          onPress={() => removeAttachment(file)}
                          className="absolute -top-1 -right-1 bg-[#D70127] p-1.5 rounded-full border-2 border-white shadow-sm"
                        >
                          <X size={12} color="white" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <Text
                      numberOfLines={1}
                      className="text-[10px] font-bold text-slate-400 mt-2 px-1 uppercase"
                    >
                      {file.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Industrial Applicability Context Card */}
            <View className="bg-primary/5 rounded-[32px] p-6 border border-primary/10">
              <Text className="text-primary font-black text-[10px] uppercase mb-2">
                Industrial Applicability
              </Text>

              {isEditing ? (
                <TextInput
                  multiline
                  className="bg-white p-4 rounded-xl border border-slate-200 text-slate-700"
                  value={form.applicability}
                  onChangeText={(t) => setForm({ ...form, applicability: t })}
                />
              ) : (
                <Text className="text-slate-700 text-sm italic">
                  {form.applicability || "N/A"}
                </Text>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Global Interaction Base Bar */}
        <View className="w-full p-5 bg-white border-t border-slate-200">
          {isEditable(data) && !isEditing ? (
            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              className="bg-primary h-14 rounded-2xl justify-center items-center shadow-lg shadow-primary/30"
            >
              <Text className="text-white font-black text-lg">
                Modify Application
              </Text>
            </TouchableOpacity>
          ) : (
            isEditing && (
              <View className="flex-row gap-4">
                <TouchableOpacity
                  onPress={() => {
                    setIsEditing(false);
                    fetchDetails();
                  }}
                  className="flex-1 h-14 rounded-2xl justify-center items-center border border-slate-200 bg-white"
                >
                  <Text className="text-slate-500 font-bold">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleUpdate}
                  className="flex-[2] bg-primary h-14 rounded-2xl justify-center items-center shadow-lg shadow-green-200"
                >
                  {updating ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-black">Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            )
          )}
        </View>

        {/* Media Preview Modal Overlay */}
        <Modal visible={previewVisible} transparent={true} animationType="fade">
          <View className="flex-1 bg-black justify-center items-center">
            <TouchableOpacity
              onPress={() => setPreviewVisible(false)}
              className="absolute top-12 right-6 z-50 bg-white/20 p-3 rounded-full"
            >
              <X size={24} color="white" />
            </TouchableOpacity>

            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={{ width: width, height: height * 0.7 }}
                resizeMode="contain"
              />
            )}

            <View className="absolute bottom-12">
              <Text className="text-white/60 font-bold">
                Tap Close to return
              </Text>
            </View>
          </View>
        </Modal>

        {/* alert component context handler */}
        <CustomAlert
          visible={alert.visible}
          title={alert.title}
          message={alert.message}
          onClose={() => setAlert({ ...alert, visible: false })}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

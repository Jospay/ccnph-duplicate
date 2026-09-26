import { createIntellectualProperty } from "@/services/intellectualService";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import {
  Check,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { AgreementModal } from "@/components/AgreementModal";
import { CustomAlert } from "@/components/CustomAlert";
import "../../global.css";

interface AgreedState {
  original: boolean;
  terms: boolean;
  privacy: boolean;
}

interface Attachment {
  id: string;
  name: string;
  uri: string;
  type: string;
  size?: number;
}

// Move static textual assets outside the component lifecycle block to prevent layout re-allocations
const AGREEMENT_TITLES = {
  original: "Originality Declaration",
  terms: "Terms and Conditions",
  privacy: "Data Privacy Policy",
};

const AGREEMENT_DESCRIPTIONS = {
  original:
    "By accepting this, you assert that the submitted creation, project details, concepts, and matching documentation represent entirely your original production. You affirm that no assets, technical systems, or frameworks used within this IP configuration break existing active patents, registered property profiles, or local legal frameworks. By accepting this, you assert that the submitted creation, project details, concepts, and matching documentation represent entirely your original production. You affirm that no assets, technical systems, or frameworks used within this IP configuration break existing active patents, registered property profiles, or local legal frameworks.",
  terms:
    "Welcome to our Investment Society platform. By accessing our services, you agree to obey the governing policies detailed herein. Users are responsible for managing data accuracy, processing required asset values safely, and operating layout profiles ethically. System misuse or false submissions will trigger immediate evaluation and access closure.",
  privacy:
    "We strictly value your personal profile and corporate data security. Any uploaded documentation, registration details, identification items, and transactional info remain safely cached and encrypted. Data points are explicitly utilized for processing platform modules like share installments, system validations, and official updates without third-party leaks.",
};

export default function PropertyForm() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const scrollPosition = useRef(0);
  const isProcessing = useRef(false);

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const MAX_FILE_SIZE = 8 * 1024 * 1024;

  // ✅ CUSTOM ALERT STATE
  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  // Modal Configuration States
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: "",
    description: "",
    targetKey: null as keyof AgreedState | null,
  });

  // Keyboard Handling Logic
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => {
      scrollRef.current?.scrollTo({
        y: scrollPosition.current,
        animated: true,
      });
    });
    return () => show.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(false);
      isProcessing.current = false;
    }, []),
  );

  const [creationType, setCreationType] = useState<
    "business_idea" | "invention"
  >("invention");

  const [generalInfo, setGeneralInfo] = useState({
    title: "",
    description: "",
  });

  const [claims, setClaims] = useState(["", "", ""]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [industrial, setIndustrial] = useState({ applicability: "" });

  const [agreed, setAgreed] = useState<AgreedState>({
    original: false,
    terms: false,
    privacy: false,
  });

  const [formType, setFormType] = useState<"grant" | "payment">("grant");

  const addClaim = () => setClaims([...claims, ""]);

  const removeClaim = (index: number) => {
    const newClaims = claims.filter((_, i) => i !== index);
    setClaims(newClaims);
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const oversizedFile = result.assets.find(
        (asset: any) => (asset.size || 0) > MAX_FILE_SIZE,
      );

      if (oversizedFile) {
        setAlert({
          visible: true,
          title: "File Too Large",
          message: `The image "${oversizedFile.name}" exceeds the maximum limit of 8MB. Please select a smaller file.`,
        });
        return;
      }

      const selectedFiles: Attachment[] = result.assets.map(
        (asset: any, index: number): Attachment => ({
          id: String(Date.now() + index),
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "image/jpeg",
          size: asset.size,
        }),
      );

      setAttachments((prev) => [...prev, ...selectedFiles]);
    } catch (error) {
      console.log("FILE PICK ERROR:", error);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const validateStep = () => {
    if (step === 1) {
      if (!creationType) {
        setAlert({
          visible: true,
          title: "Required",
          message: "Please select creation type.",
        });
        return false;
      }
      if (!generalInfo.title.trim() || !generalInfo.description.trim()) {
        setAlert({
          visible: true,
          title: "Required",
          message: "Title and Description are mandatory.",
        });
        return false;
      }
    }
    if (step === 2) {
      if (!claims.some((c) => c.trim() !== "")) {
        setAlert({
          visible: true,
          title: "Required",
          message: "Please enter at least one claim.",
        });
        return false;
      }
    }
    if (step === 3) {
      if (attachments.length === 0) {
        setAlert({
          visible: true,
          title: "Required",
          message: "Please upload at least one image.",
        });
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) setStep((prev) => prev + 1);
  };

  const handleBack = () => setStep((prev) => prev - 1);

  const handleAgreementPress = (key: keyof AgreedState) => {
    if (agreed[key]) {
      setAgreed({ ...agreed, [key]: false });
      return;
    }

    setModalConfig({
      visible: true,
      title: AGREEMENT_TITLES[key],
      description: AGREEMENT_DESCRIPTIONS[key],
      targetKey: key,
    });
  };

  const handleAcceptModal = () => {
    if (modalConfig.targetKey) {
      setAgreed({ ...agreed, [modalConfig.targetKey]: true });
    }
    setModalConfig({ ...modalConfig, visible: false, targetKey: null });
  };

  const handleSubmit = async () => {
    if (isProcessing.current || loading) return;

    if (!agreed.original || !agreed.terms || !agreed.privacy) {
      setAlert({
        visible: true,
        title: "Required",
        message: "Please accept all terms and declarations.",
      });
      return;
    }

    try {
      isProcessing.current = true;
      setLoading(true);

      const formData = new FormData();
      formData.append("creation_type", creationType);
      formData.append("form_type", formType);
      formData.append("title", generalInfo.title);
      formData.append("description", generalInfo.description);
      formData.append("applicability", industrial.applicability);

      claims
        .filter((c) => c.trim() !== "")
        .forEach((claim, index) => {
          formData.append(`claims[${index}][description]`, claim);
        });

      attachments.forEach((file, index) => {
        formData.append(`documents[${index}]`, {
          uri: file.uri,
          name: file.name,
          type: file.type || "application/octet-stream",
        } as any);
      });

      formData.append("is_original", "1");
      formData.append("agreed_terms", "1");
      formData.append("agreed_privacy", "1");

      await createIntellectualProperty(formData);
      router.replace("/congratulations");
    } catch (error: any) {
      setAlert({
        visible: true,
        title: "Error",
        message: error?.response?.data?.message || "Submission failed.",
      });
    } finally {
      setLoading(false);
      isProcessing.current = false;
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <View className="flex-1 bg-white">
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={(e) => {
            scrollPosition.current = e.nativeEvent.contentOffset.y;
          }}
        >
          <View className="px-6 pt-6 mb-4">
            <Text className="text-xl font-bold text-primary text-center uppercase tracking-widest">
              {step === 1 && "General Information"}
              {step === 2 && "Claims"}
              {step === 3 && "Attachments"}
              {step === 4 && "Industrial Use"}
            </Text>
            <Text className="text-md text-black text-center mt-1">
              {step === 2 &&
                "Clearly define the features or process you want to protect"}
              {step === 3 && "Drawing / Diagram / Photos"}
              {step === 4 &&
                "Explain how your invention can be used in industry"}
            </Text>
          </View>

          <View className="flex-row justify-between mb-8 px-2">
            {[1, 2, 3, 4].map((i) => (
              <View
                key={i}
                className={`h-1.5 flex-1 mx-1 rounded-full ${
                  step >= i ? "bg-primary" : "bg-slate-200"
                }`}
              />
            ))}
          </View>

          {/* STEP 1 */}
          {step === 1 && (
            <View className="gap-y-6">
              <View>
                <Text className="text-slate-600 font-bold mb-3">
                  What kind of creation you created?
                </Text>
                <View className="flex-row gap-x-3">
                  <TouchableOpacity
                    onPress={() => setCreationType("business_idea")}
                    className={`flex-1 p-4 rounded-2xl border ${
                      creationType === "business_idea"
                        ? "bg-primary border-primary"
                        : "border-slate-200"
                    }`}
                  >
                    <Text
                      className={`text-center font-bold ${creationType === "business_idea" ? "text-white" : "text-slate-600"}`}
                    >
                      Business Idea
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setCreationType("invention")}
                    className={`flex-1 p-4 rounded-2xl border ${
                      creationType === "invention"
                        ? "bg-primary border-primary"
                        : "border-slate-200"
                    }`}
                  >
                    <Text
                      className={`text-center font-bold ${creationType === "invention" ? "text-white" : "text-slate-600"}`}
                    >
                      Invention
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View>
                <Text className="text-slate-600 font-bold mb-2">
                  Property Title *
                </Text>
                <TextInput
                  className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-slate-900"
                  value={generalInfo.title}
                  onChangeText={(text) =>
                    setGeneralInfo({ ...generalInfo, title: text })
                  }
                />
              </View>

              <View>
                <Text className="text-slate-600 font-bold mb-2">
                  Description *
                </Text>
                <TextInput
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  className="bg-slate-50 border border-slate-200 p-4 rounded-2xl h-44 text-slate-900"
                  value={generalInfo.description}
                  onChangeText={(text) =>
                    setGeneralInfo({ ...generalInfo, description: text })
                  }
                />
              </View>
            </View>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <View>
              {claims.map((claim, index) => (
                <View key={index} className="flex-row items-center mb-4">
                  <TextInput
                    className="flex-1 bg-slate-50 border border-slate-200 p-4 rounded-2xl"
                    value={claim}
                    placeholder={`Claim #${index + 1}`}
                    onChangeText={(text) => {
                      const updated = [...claims];
                      updated[index] = text;
                      setClaims(updated);
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => removeClaim(index)}
                    className="ml-2 p-2"
                  >
                    <Trash2 size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                onPress={addClaim}
                className="flex-row items-center justify-center border border-dashed border-primary p-4 rounded-2xl"
              >
                <Plus size={20} color="#007AFF" />
                <Text className="text-primary font-bold ml-2">Add Claim</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <View className="gap-y-4">
              {attachments.map((file) => (
                <View
                  key={file.id}
                  className="flex-row items-center bg-slate-50 border border-slate-200 p-4 rounded-2xl"
                >
                  <ImageIcon size={20} color="#64748b" />
                  <Text className="ml-3 flex-1" numberOfLines={1}>
                    {file.name}
                  </Text>
                  <TouchableOpacity onPress={() => removeAttachment(file.id)}>
                    <Trash2 size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                onPress={handlePickFile}
                className="flex-row items-center justify-center p-5 rounded-2xl border border-dashed border-primary"
              >
                <Upload size={22} color="#007AFF" />
                <Text className="text-primary font-bold ml-3">Add Image</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <View className="gap-y-6">
              <View>
                <Text className="text-slate-600 font-bold mb-3">
                  Application Type
                </Text>
                <View className="flex-row gap-x-3">
                  <TouchableOpacity
                    onPress={() => setFormType("grant")}
                    className={`flex-1 p-4 rounded-2xl border ${formType === "grant" ? "bg-primary border-primary" : "border-slate-200"}`}
                  >
                    <Text
                      className={`text-center font-bold ${formType === "grant" ? "text-white" : "text-slate-600"}`}
                    >
                      Grant
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setFormType("payment")}
                    className={`flex-1 p-4 rounded-2xl border ${formType === "payment" ? "bg-primary border-primary" : "border-slate-200"}`}
                  >
                    <Text
                      className={`text-center font-bold ${formType === "payment" ? "text-white" : "text-slate-600"}`}
                    >
                      Payment
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View>
                <Text className="text-slate-600 font-bold mb-2">
                  Industrial Applicability
                </Text>
                <TextInput
                  placeholder="Real world usage..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="bg-slate-50 border border-slate-200 p-4 rounded-2xl h-36"
                  value={industrial.applicability}
                  onChangeText={(text) =>
                    setIndustrial({ applicability: text })
                  }
                />
              </View>

              <View className="gap-y-5 pt-4">
                {(Object.keys(agreed) as (keyof AgreedState)[]).map((key) => {
                  const labels = {
                    original: "I declare that this invention is original.",
                    terms: "I agree to the Terms and Conditions.",
                    privacy: "I agree to the Data Privacy Policy.",
                  };
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => handleAgreementPress(key)}
                      className="flex-row items-center active:opacity-70"
                    >
                      <View
                        className={`w-6 h-6 rounded border ${agreed[key] ? "bg-primary border-primary" : "border-slate-300"} items-center justify-center mr-4`}
                      >
                        {agreed[key] && <Check size={16} color="white" />}
                      </View>
                      <Text className="text-slate-700 flex-1 text-sm font-semibold tracking-wide">
                        {labels[key]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <View className="h-24" />
        </ScrollView>

        <View className="flex-row gap-x-3 w-full p-5 bg-white border-t border-slate-200">
          {step > 1 && (
            <TouchableOpacity
              onPress={handleBack}
              className="flex-1 h-16 rounded-2xl justify-center items-center border border-slate-200 bg-white"
            >
              <Text className="text-slate-600 font-bold text-lg">Previous</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={step === 4 ? handleSubmit : handleNext}
            disabled={loading}
            className={`flex-[2] h-16 rounded-2xl justify-center items-center ${loading ? "bg-slate-400" : "bg-primary"}`}
          >
            <Text className="text-white font-bold text-lg">
              {step === 4 ? (loading ? "Submitting..." : "Submit") : "Continue"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ✅ INTEGRATED CUSTOM ALERT */}
        <CustomAlert
          visible={alert.visible}
          title={alert.title}
          message={alert.message}
          onClose={() =>
            setAlert({
              ...alert,
              visible: false,
            })
          }
        />

        {/* ✅ DYNAMIC AGREEMENT SCROLL MODAL WITH AUTO-UNLOCK */}
        <AgreementModal
          visible={modalConfig.visible}
          title={modalConfig.title}
          description={modalConfig.description}
          onAccept={handleAcceptModal}
          onCancel={() =>
            setModalConfig({ ...modalConfig, visible: false, targetKey: null })
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import {
    Check,
    Download,
    Eye,
    FileText,
    Plus,
    Trash2,
} from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import "../../global.css";

import { AgreementModal } from "@/components/AgreementModal";
import { CustomAlert } from "@/components/CustomAlert";
import { createFundingInvestmentRequest } from "@/services/fundingInvestmentService";

// ---------------------------------------------------------------------
// Constants & Styles
// ---------------------------------------------------------------------
const PRIMARY_COLOR = "#3E4093";
const TOTAL_STEPS = 3;

const CARD_STYLE =
  "bg-white p-5 rounded-3xl border border-slate-100 shadow-sm mb-4";

const MAX_FILE_MB = 20;
const MAX_FILE_SIZE = MAX_FILE_MB * 1024 * 1024;

// Only real document files are accepted here (no photos/camera) —
// PDF, Word, PowerPoint, Excel, plain text.
const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

// ---------------------------------------------------------------------
// Step 1 — Type of Funding Options
// ---------------------------------------------------------------------
// NOTE: rename these require() paths to match your actual files under
// ../../assets/images/
const FUNDING_TYPE_OPTIONS = [
  {
    label: "Personal Savings",
    value: "Personal Savings",
    image: require("../../assets/images/icon/personal.png"),
  },
  {
    label: "Family & Friends Investment",
    value: "Family & Friends Investment",
    image: require("../../assets/images/icon/family.png"),
  },
  {
    label: "Bank Loan / Lending Programs",
    value: "Bank Loan / Lending Programs",
    image: require("../../assets/images/icon/bank.png"),
  },
  {
    label: "Government Programs & Grants",
    value: "Government Programs & Grants",
    image: require("../../assets/images/icon/government.png"),
  },
  {
    label: "Microfinance / Lending App",
    value: "Microfinance / Lending App",
    image: require("../../assets/images/icon/micro.png"),
  },
  {
    label: "Private Investors",
    value: "Private Investors",
    image: require("../../assets/images/icon/private.png"),
  },
];

// ---------------------------------------------------------------------
// Step 2 — Overview per Funding Option
// ---------------------------------------------------------------------
interface FundingDetail {
  description: string;
  bestFor: string;
  advantage: string;
  challenge: string;
}

const FUNDING_DETAILS_BY_TYPE: Record<string, FundingDetail> = {
  "Personal Savings": {
    description:
      "Using money you've saved yourself to start or grow your business, without needing approval from anyone else.",
    bestFor:
      "Small-scale or home-based businesses just starting out, and entrepreneurs who want full ownership and control.",
    advantage:
      "No interest, no repayment schedule, and no need to share profits or decision-making with anyone.",
    challenge:
      "Limited by how much you've saved, which may restrict how big or how fast your business can grow.",
  },
  "Family & Friends Investment": {
    description:
      "Borrowing or receiving capital from relatives or close friends who believe in your business idea.",
    bestFor:
      "Entrepreneurs who need quick access to funds without strict paperwork or credit checks.",
    advantage:
      "Flexible terms, lower or no interest, and faster access to funds compared to formal lenders.",
    challenge:
      "Can strain personal relationships if the business struggles or if repayment terms aren't clear from the start.",
  },
  "Bank Loan / Lending Programs": {
    description:
      "Formal loans from banks or accredited lending institutions, released with structured repayment terms.",
    bestFor:
      "Established businesses with steady income and the documentation needed to qualify.",
    advantage:
      "Larger loan amounts and structured terms that can support significant business growth.",
    challenge:
      "Requires good credit standing, collateral, and complete documentation, plus interest and fees.",
  },
  "Government Programs & Grants": {
    description:
      "Funding support from government agencies aimed at helping small businesses and entrepreneurs grow.",
    bestFor:
      "Micro, small, and medium enterprises (MSMEs) that meet specific eligibility requirements.",
    advantage:
      "Often low-interest or non-repayable, with added support like training and mentorship.",
    challenge:
      "The application process can be lengthy and competitive, with strict eligibility criteria to meet.",
  },
  "Microfinance / Lending App": {
    description:
      "Small, short-term loans offered through microfinance institutions or online lending apps.",
    bestFor:
      "Micro-entrepreneurs or informal businesses that need quick, small amounts of capital.",
    advantage:
      "Fast approval, minimal requirements, and accessible even without a strong credit history.",
    challenge:
      "Higher interest rates and shorter repayment periods compared to traditional bank loans.",
  },
  "Private Investors": {
    description:
      "Individuals or firms who provide capital in exchange for equity or a share of future profits.",
    bestFor:
      "Businesses with strong growth potential that are looking to scale quickly.",
    advantage:
      "Access to larger capital along with the investor's expertise, network, and mentorship.",
    challenge:
      "You may need to give up a share of ownership or decision-making control in your business.",
  },
};

// ---------------------------------------------------------------------
// Step 3 — Documents + Application Type
// ---------------------------------------------------------------------
const APPLICATION_TYPE_OPTIONS = [
  {
    label: "Investment",
    value: "Investment",
  },
  {
    label: "Grant",
    value: "Grant",
  },
];

interface FundingDocument {
  id: string;
  name: string;
  uri: string;
  type: string;
  size?: number;
}

interface AgreedState {
  accurate: boolean;
  terms: boolean;
  privacy: boolean;
}

const AGREEMENT_LABELS: Record<
  keyof AgreedState,
  { prefix: string; underline?: string; suffix?: string }
> = {
  accurate: {
    prefix: "I confirm that the information provided is accurate.",
  },
  terms: {
    prefix: "I agree to the ",
    underline: "Terms & Conditions",
    suffix: ".",
  },
  privacy: {
    prefix: "I agree to the ",
    underline: "Data Privacy Policy",
    suffix: ".",
  },
};

const AGREEMENT_TITLES: Record<keyof AgreedState, string> = {
  accurate: "Accuracy Declaration",
  terms: "Terms & Conditions",
  privacy: "Data Privacy Policy",
};

const AGREEMENT_DESCRIPTIONS: Record<keyof AgreedState, string> = {
  accurate:
    "By checking this box, you declare that all information and supporting documents submitted in this Funding & Investment Opportunities request are accurate and truthful to the best of your knowledge. Submitting false or misleading information may result in your request being rejected.",
  terms:
    "By accepting, you agree that the funding and investment matching provided is advisory only and does not guarantee approval, funding, or investment by any third party. You agree to provide truthful information and genuine documents for every request you submit. The full Terms & Conditions govern your participation in this program.",
  privacy:
    "We collect the personal details, business documents, and contact information you submit solely to process and deliver your Funding & Investment Opportunities request. Your data will not be sold to third parties and is retained only for as long as needed to fulfill the request and comply with legal obligations. You may request access to, correction of, or deletion of your data at any time.",
};

export default function FundingInvestmentOpportunitiesForm() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const isProcessing = useRef(false);

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Alert State
  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  // ---------------------------------------------------------
  // Form Fields
  // ---------------------------------------------------------

  // Step 1
  const [fundingType, setFundingType] = useState("");

  // Step 2 has no form fields — it is informational (overview + boxes)

  // Step 3 — Documents + Application Type + Agreements
  const [documents, setDocuments] = useState<FundingDocument[]>([]);
  const [applicationType, setApplicationType] = useState("");

  const [previewModal, setPreviewModal] = useState({
    visible: false,
    document: null as FundingDocument | null,
  });

  const [agreed, setAgreed] = useState<AgreedState>({
    accurate: false,
    terms: false,
    privacy: false,
  });

  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: "",
    description: "",
    targetKey: null as keyof AgreedState | null,
  });

  useFocusEffect(
    useCallback(() => {
      setLoading(false);
      isProcessing.current = false;
    }, []),
  );

  /*
  |--------------------------------------------------------------------------
  | Agreement Checklist Helpers
  |--------------------------------------------------------------------------
  */
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
      setAgreed((prev) => ({ ...prev, [modalConfig.targetKey!]: true }));
    }
    setModalConfig({ ...modalConfig, visible: false, targetKey: null });
  };

  /*
  |--------------------------------------------------------------------------
  | Document Picker (documents only — no camera / image library)
  |--------------------------------------------------------------------------
  */
  const addDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_DOCUMENT_TYPES,
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets?.[0];
      if (!file) return;

      if (file.mimeType?.startsWith("image/")) {
        setAlert({
          visible: true,
          title: "Invalid File",
          message:
            "Photos aren't accepted here. Please upload a document file (PDF, Word, PowerPoint, Excel, etc.).",
        });
        return;
      }

      if (file.size && file.size > MAX_FILE_SIZE) {
        setAlert({
          visible: true,
          title: "File Too Large",
          message: `Please choose a file under ${MAX_FILE_MB}MB.`,
        });
        return;
      }

      setDocuments((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "application/octet-stream",
          size: file.size,
        },
      ]);
    } catch (error) {
      console.error("Document picker error:", error);
      setAlert({
        visible: true,
        title: "Error",
        message: "Could not pick the document. Please try again.",
      });
    }
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const openDocumentPreview = (document: FundingDocument) => {
    setPreviewModal({ visible: true, document });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  /*
  |--------------------------------------------------------------------------
  | Step Validation & Form Submission
  |--------------------------------------------------------------------------
  */
  const validateStep = () => {
    if (step === 1) {
      if (!fundingType.trim()) {
        setAlert({
          visible: true,
          title: "Required",
          message: "Please select a type of funding option.",
        });
        return false;
      }
    }
    if (step === 2) {
      // Informational step — no required fields.
      return true;
    }
    if (step === 3) {
      if (documents.length === 0) {
        setAlert({
          visible: true,
          title: "Required",
          message: "Please add at least one supporting document.",
        });
        return false;
      }
      if (!applicationType.trim()) {
        setAlert({
          visible: true,
          title: "Required",
          message:
            "Please select whether you're applying for Investment or Grant.",
        });
        return false;
      }
      if (!agreed.accurate || !agreed.terms || !agreed.privacy) {
        setAlert({
          visible: true,
          title: "Required",
          message:
            "Please review and check all three agreements before submitting.",
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

  const handleSubmit = async () => {
    if (isProcessing.current || loading) return;
    if (!validateStep()) return;

    try {
      isProcessing.current = true;
      setLoading(true);

      const formData = new FormData();
      formData.append("funding_type", fundingType);
      formData.append("application_type", applicationType);
      formData.append("agreed_accurate", String(agreed.accurate));
      formData.append("agreed_terms", String(agreed.terms));
      formData.append("agreed_privacy", String(agreed.privacy));

      documents.forEach((doc, index) => {
        formData.append(`documents[${index}]`, {
          uri: doc.uri,
          name: doc.name,
          type: doc.type || "application/octet-stream",
        } as any);
      });

      await createFundingInvestmentRequest(formData);
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

  const selectedFundingOption = FUNDING_TYPE_OPTIONS.find(
    (o) => o.value === fundingType,
  );
  const selectedDetail = fundingType
    ? FUNDING_DETAILS_BY_TYPE[fundingType]
    : null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <View className="flex-1 bg-white">
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-6 pt-4"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="pb-12">
            {/* HEADER */}
            <View className="px-2 pt-4 mb-4">
              <Text className="text-xl font-bold text-primary text-center uppercase tracking-widest">
                {step === 1 && "Type of Funding"}
                {step === 2 && "Funding Overview"}
                {step === 3 && "Documents & Application"}
              </Text>
              <Text className="text-md text-slate-500 text-center mt-1">
                {step === 1 && "Select the funding option you're interested in"}
                {step === 2 && "Learn more about your selected option"}
                {step === 3 &&
                  "Upload documents and choose your application type"}
              </Text>
            </View>

            {/* PROGRESS INDICATOR */}
            <View className="flex-row justify-between mb-8 px-2">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((i) => (
                <View
                  key={i}
                  className={`h-1.5 flex-1 mx-1 rounded-full ${
                    step >= i ? "bg-primary" : "bg-slate-200"
                  }`}
                />
              ))}
            </View>

            {/* STEP 1: TYPE OF FUNDING OPTIONS */}
            {step === 1 && (
              <View className="gap-y-3">
                <Text className="text-slate-600 font-bold mb-1">
                  Type of Funding Option *
                </Text>

                <View className="flex-row flex-wrap gap-3">
                  {FUNDING_TYPE_OPTIONS.map((option) => {
                    const selected = fundingType === option.value;

                    return (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => setFundingType(option.value)}
                        className={`w-[48%] flex-row items-center p-5 rounded-2xl border ${
                          selected
                            ? "bg-primary/10 border-primary"
                            : "border-slate-200"
                        }`}
                      >
                        <View className="flex-1 items-center">
                          <View className="w-full h-24 items-center justify-center">
                            <Image
                              source={option.image}
                              className="w-full h-full"
                              resizeMode="contain"
                            />
                          </View>

                          <Text
                            className={`mt-5 text-center ${
                              selected ? "text-primary" : "text-slate-700"
                            }`}
                          >
                            {option.label}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* STEP 2: FUNDING OVERVIEW */}
            {step === 2 && (
              <View className="gap-y-4">
                {!selectedDetail ? (
                  <Text className="text-slate-400 text-sm">
                    Please go back and select a funding option first.
                  </Text>
                ) : (
                  <>
                    <View className="items-center mb-2">
                      {selectedFundingOption && (
                        <View className="w-32 h-32 mb-3 items-center justify-center overflow-hidden">
                          <Image
                            source={selectedFundingOption.image}
                            className="w-full h-full"
                            resizeMode="contain"
                          />
                        </View>
                      )}
                      <Text className="text-lg font-bold text-primary text-center">
                        {fundingType}
                      </Text>
                      <Text className="text-slate-600 text-sm mt-2 text-center leading-5">
                        {selectedDetail.description}
                      </Text>
                    </View>

                    <View className="bg-primary/10 p-4 rounded-2xl">
                      <Text className="mb-1 text-primary">
                        <Text className="font-bold text-md">Best For: </Text>{" "}
                        <Text className="text-sm leading-5">
                          {selectedDetail.bestFor}
                        </Text>
                      </Text>
                    </View>

                    <View className="bg-primary/10 p-4 rounded-2xl">
                      <Text className="mb-1 text-primary">
                        <Text className="font-bold text-md">Advantage: </Text>{" "}
                        <Text className="text-sm leading-5">
                          {selectedDetail.advantage}
                        </Text>
                      </Text>
                    </View>

                    <View className="bg-primary/10 p-4 rounded-2xl">
                      <Text className="mb-1 text-primary">
                        <Text className="font-bold text-md">Challenge: </Text>{" "}
                        <Text className="text-sm leading-5">
                          {selectedDetail.challenge}
                        </Text>
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* STEP 3: DOCUMENTS + APPLICATION TYPE + AGREEMENTS */}
            {step === 3 && (
              <View className="gap-y-2">
                <Text className="text-slate-600 font-bold mb-1">
                  Supporting Documents *
                </Text>
                <Text className="text-slate-400 text-xs mb-3">
                  Document files only — PDF, Word, PowerPoint, Excel, etc.
                  Photos aren{"'"}t accepted here.
                </Text>

                {documents.map((doc) => (
                  <View
                    key={doc.id}
                    className="flex-row items-center bg-slate-50 border border-slate-200 p-3 rounded-2xl mb-3"
                  >
                    <View className="w-14 h-14 rounded-xl bg-slate-200 items-center justify-center">
                      <FileText size={24} color="#64748b" />
                    </View>

                    <View className="ml-3 flex-1">
                      <Text
                        className="text-slate-900 font-semibold"
                        numberOfLines={1}
                      >
                        {doc.name}
                      </Text>
                      <Text className="text-slate-400 text-xs mt-0.5">
                        {formatFileSize(doc.size)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => openDocumentPreview(doc)}
                      className="p-2 mr-1 bg-blue-100 rounded-lg"
                    >
                      <Eye size={18} color="#3E4093" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => removeDocument(doc.id)}
                      className="p-2 bg-red-100 rounded-lg"
                    >
                      <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity
                  onPress={addDocument}
                  className="flex-row items-center justify-center p-4 rounded-2xl border border-dashed border-primary mb-3"
                >
                  <Plus size={20} color="#3E4093" />
                  <Text className="text-primary font-bold ml-3">
                    Add Document
                  </Text>
                </TouchableOpacity>

                <Text className="text-slate-400 text-xs mb-4">
                  Maximum file size: {MAX_FILE_MB}MB per file. You can add as
                  many documents as needed.
                </Text>

                <View className="mb-3">
                  <Text className="text-slate-600 font-bold mb-3">
                    Application Type
                  </Text>

                  <View className="flex-row gap-x-3">
                    {APPLICATION_TYPE_OPTIONS.map((option) => {
                      const selected = applicationType === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => setApplicationType(option.value)}
                          className={`flex-1 p-4 rounded-2xl border ${
                            selected
                              ? "bg-primary border-primary"
                              : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <Text
                            className={`text-center font-bold ${
                              selected ? "text-white" : "text-slate-700"
                            }`}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View className={CARD_STYLE}>
                  <Text className="text-slate-600 font-bold mb-1">
                    Before you submit
                  </Text>
                  <Text className="text-slate-400 text-xs mb-4">
                    Please review and check all three to continue.
                  </Text>

                  <View className="gap-y-5">
                    {(Object.keys(agreed) as (keyof AgreedState)[]).map(
                      (key) => {
                        const label = AGREEMENT_LABELS[key];
                        return (
                          <TouchableOpacity
                            key={key}
                            onPress={() => handleAgreementPress(key)}
                            className="flex-row items-center active:opacity-70"
                          >
                            <View
                              className={`w-6 h-6 rounded border ${
                                agreed[key]
                                  ? "bg-primary border-primary"
                                  : "border-slate-300"
                              } items-center justify-center mr-4`}
                            >
                              {agreed[key] && <Check size={16} color="white" />}
                            </View>
                            <Text className="text-slate-700 flex-1 text-sm font-semibold tracking-wide">
                              {label.prefix}
                              {label.underline && (
                                <Text className="underline">
                                  {label.underline}
                                </Text>
                              )}
                              {label.suffix}
                            </Text>
                          </TouchableOpacity>
                        );
                      },
                    )}
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* STEP NAVIGATION FOOTER */}
        <View className="flex-row gap-x-3 w-full p-5 bg-white border-t border-slate-200">
          {step > 1 && (
            <TouchableOpacity
              onPress={handleBack}
              disabled={loading}
              className="flex-1 h-16 rounded-2xl justify-center items-center border border-slate-200 bg-white"
            >
              <Text className="text-slate-600 font-bold text-lg">Previous</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={step === TOTAL_STEPS ? handleSubmit : handleNext}
            disabled={loading}
            className={`flex-[2] h-16 rounded-2xl justify-center items-center ${
              loading ? "bg-slate-400" : "bg-primary"
            }`}
          >
            <Text className="text-white font-bold text-lg">
              {step === TOTAL_STEPS
                ? loading
                  ? "Submitting..."
                  : "Submit Request"
                : "Continue"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================================================= */}
      {/* DOCUMENT PREVIEW MODAL */}
      {/* ================================================= */}

      <Modal
        visible={previewModal.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() =>
          setPreviewModal({ visible: false, document: null })
        }
      >
        <View className="flex-1 bg-black/90 justify-center items-center px-5">
          <TouchableOpacity
            onPress={() => setPreviewModal({ visible: false, document: null })}
            className="absolute top-12 right-6 p-2 bg-white/20 rounded-full z-10"
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>

          {previewModal.document && (
            <View className="w-full max-w-md">
              <View className="bg-white rounded-2xl p-8 items-center">
                <FileText size={64} color="#3E4093" />
                <Text className="text-lg font-bold text-slate-900 mt-4 text-center">
                  {previewModal.document.name}
                </Text>
                <Text className="text-slate-500 text-sm mt-2">
                  Size: {formatFileSize(previewModal.document.size)}
                </Text>
                <TouchableOpacity className="flex-row items-center mt-6 px-6 py-3 bg-primary rounded-2xl">
                  <Download size={18} color="white" />
                  <Text className="text-white font-bold ml-2">
                    View Document
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* ================================================= */}
      {/* DYNAMIC AGREEMENT SCROLL MODAL WITH AUTO-UNLOCK */}
      {/* ================================================= */}

      <AgreementModal
        visible={modalConfig.visible}
        title={modalConfig.title}
        description={modalConfig.description}
        onAccept={handleAcceptModal}
        onCancel={() =>
          setModalConfig({ ...modalConfig, visible: false, targetKey: null })
        }
      />

      {/* CUSTOM ALERT MODAL */}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert({ visible: false, title: "", message: "" })}
      />
    </KeyboardAvoidingView>
  );
}

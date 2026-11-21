import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    Check,
    Download,
    Eye,
    FileText,
    Plus,
    Tag,
    Trash2,
} from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { AgreementModal } from "@/components/AgreementModal";
import { CustomAlert } from "@/components/CustomAlert";
import "../../global.css";

// ---------------------------------------------------------------------
// Constants & Styles
// ---------------------------------------------------------------------
const PRIMARY_COLOR = "#3E4093";

const MAX_FILE_MB = 20;
const MAX_FILE_SIZE = MAX_FILE_MB * 1024 * 1024;

// Only real document files are accepted here (no photos/camera) — same
// list used on the Funding & Investment form.
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
// Funding Type Options — same list & images used on the create form, so
// editing the funding type here shows the same grid of choices.
// NOTE: rename these require() paths to match your actual files under
// ../../assets/images/
// ---------------------------------------------------------------------
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

const APPLICATION_TYPE_OPTIONS = [
  { label: "Investment", value: "Investment" },
  { label: "Grant", value: "Grant" },
];

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

// Status -> label / color mapping (same palette as the list screen)
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending Review",
  in_review: "In Review",
  completed: "Completed",
  rejected: "Rejected",
};

const STATUS_STYLES: Record<string, { badgeBg: string; badgeText: string }> = {
  pending: { badgeBg: "bg-amber-100", badgeText: "text-amber-700" },
  in_review: { badgeBg: "bg-blue-100", badgeText: "text-blue-700" },
  completed: { badgeBg: "bg-green-100", badgeText: "text-green-700" },
  rejected: { badgeBg: "bg-[#FFE6E9]", badgeText: "text-[#D70127]" },
};

// A request can only be edited while it's still pending or if it was
// rejected (so the user can fix it up and resubmit). Once it's in
// review or completed, editing is locked.
const EDITABLE_STATUSES = ["pending", "rejected"];
const isEditableStatus = (status?: string) =>
  !!status && EDITABLE_STATUSES.includes(status);

interface FundingDocument {
  id: string;
  name: string;
  uri: string;
  type: string;
  size?: number;
  isNew?: boolean;
}

// ---------------------------------------------------------------------
// STATIC DATA
// No backend call anywhere on this screen. Every request below is
// hardcoded sample data, keyed by id so the "Details" button on the
// list screen (which pushes ?id=2041 etc.) resolves to something.
// Swap `fetchDetails` for a real getFundingInvestmentRequest(id) call
// whenever the API is ready — the rest of the screen (edit gating, form
// fields, document handling) is already wired to work the same way once
// that happens.
// ---------------------------------------------------------------------
const STATIC_REQUESTS: Record<
  string,
  {
    id: string;
    attributes: {
      fundingType: string;
      applicationType: string;
      status: string;
      reviewerNotes?: string;
      agreed: AgreedState;
      documents: { id: string; name: string; uri: string; type: string }[];
    };
  }
> = {
  "2041": {
    id: "2041",
    attributes: {
      fundingType: "Bank Loan / Lending Programs",
      applicationType: "Investment",
      status: "completed",
      reviewerNotes:
        "Documentation was complete and the business shows steady income. Matched with a partner lending program — check your email for next steps.",
      agreed: { accurate: true, terms: true, privacy: true },
      documents: [
        {
          id: "d1",
          name: "business_permit.pdf",
          uri: "https://placehold.co/400x400/3E4093/FFFFFF?text=Business+Permit",
          type: "application/pdf",
        },
        {
          id: "d2",
          name: "financial_statement.pdf",
          uri: "https://placehold.co/400x400/3E4093/FFFFFF?text=Financial+Statement",
          type: "application/pdf",
        },
      ],
    },
  },
  "2040": {
    id: "2040",
    attributes: {
      fundingType: "Government Programs & Grants",
      applicationType: "Grant",
      status: "in_review",
      agreed: { accurate: true, terms: true, privacy: true },
      documents: [
        {
          id: "d1",
          name: "grant_proposal.docx",
          uri: "https://placehold.co/400x400/3E4093/FFFFFF?text=Grant+Proposal",
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
      ],
    },
  },
  "2039": {
    id: "2039",
    attributes: {
      fundingType: "Private Investors",
      applicationType: "Investment",
      status: "pending",
      agreed: { accurate: true, terms: true, privacy: true },
      documents: [
        {
          id: "d1",
          name: "pitch_deck.pptx",
          uri: "https://placehold.co/400x400/3E4093/FFFFFF?text=Pitch+Deck",
          type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        },
      ],
    },
  },
  "2038": {
    id: "2038",
    attributes: {
      fundingType: "Microfinance / Lending App",
      applicationType: "Grant",
      status: "rejected",
      reviewerNotes:
        "The submitted financial statement doesn't match the requested loan amount. Please upload an updated statement and resubmit.",
      agreed: { accurate: true, terms: true, privacy: true },
      documents: [
        {
          id: "d1",
          name: "financial_statement.xlsx",
          uri: "https://placehold.co/400x400/3E4093/FFFFFF?text=Financial+Statement",
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    },
  },
  "2037": {
    id: "2037",
    attributes: {
      fundingType: "Family & Friends Investment",
      applicationType: "Investment",
      status: "completed",
      reviewerNotes:
        "Agreement terms with the family investor look reasonable. Matching process is complete.",
      agreed: { accurate: true, terms: true, privacy: true },
      documents: [
        {
          id: "d1",
          name: "investment_agreement.pdf",
          uri: "https://placehold.co/400x400/3E4093/FFFFFF?text=Investment+Agreement",
          type: "application/pdf",
        },
      ],
    },
  },
};

export default function FundingInvestmentDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const scrollRef = useRef<ScrollView>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [data, setData] = useState<(typeof STATIC_REQUESTS)[string] | null>(
    null,
  );
  const [documents, setDocuments] = useState<FundingDocument[]>([]);

  // CUSTOM ALERT STATE
  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const [form, setForm] = useState({
    fundingType: "",
    applicationType: "",
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

  const [previewModal, setPreviewModal] = useState({
    visible: false,
    document: null as FundingDocument | null,
  });

  /*
  |--------------------------------------------------------------------------
  | Static "Fetch" — no network call, just a keyed lookup with a short
  | simulated delay so loading/refresh states still have something to show.
  |--------------------------------------------------------------------------
  */
  const fetchDetails = () => {
    setLoading(true);

    setTimeout(() => {
      const record =
        STATIC_REQUESTS[String(id)] ?? Object.values(STATIC_REQUESTS)[0];

      setData(record);

      setForm({
        fundingType: record.attributes.fundingType,
        applicationType: record.attributes.applicationType,
      });

      setAgreed(record.attributes.agreed);

      setDocuments(
        record.attributes.documents.map((d) => ({ ...d, isNew: false })),
      );

      setLoading(false);
      setRefreshing(false);
    }, 400);
  };

  useFocusEffect(
    useCallback(() => {
      fetchDetails();
    }, [id]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDetails();
  }, [id]);

  /*
  |--------------------------------------------------------------------------
  | Agreement Checklist Helpers — same pattern as the create form.
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
  | Document Picker (documents only — no camera / image library), same
  | pattern as the create form.
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
          id: `new-${Date.now()}`,
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "application/octet-stream",
          size: file.size,
          isNew: true,
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

  const removeDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
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
  | Static "Update" — no network call. Merges the edited form back onto
  | local state so the view reflects the change immediately. Swap the
  | body of this function for a real updateFundingInvestmentRequest(id,
  | formData) call whenever the API is ready.
  |--------------------------------------------------------------------------
  */
  const handleUpdate = async () => {
    if (!form.fundingType.trim()) {
      setAlert({
        visible: true,
        title: "Required",
        message: "Please select a type of funding option.",
      });
      return;
    }

    if (documents.length === 0) {
      setAlert({
        visible: true,
        title: "Required",
        message: "Please keep at least one supporting document.",
      });
      return;
    }

    if (!form.applicationType.trim()) {
      setAlert({
        visible: true,
        title: "Required",
        message:
          "Please select whether you're applying for Investment or Grant.",
      });
      return;
    }

    if (!agreed.accurate || !agreed.terms || !agreed.privacy) {
      setAlert({
        visible: true,
        title: "Required",
        message: "Please review and check all three agreements before saving.",
      });
      return;
    }

    try {
      setUpdating(true);

      // Simulated network delay — replace this whole block with a real
      // FormData + updateFundingInvestmentRequest(id, formData) call later.
      await new Promise((resolve) => setTimeout(resolve, 500));

      setData((prev) =>
        prev
          ? {
              ...prev,
              attributes: {
                ...prev.attributes,
                fundingType: form.fundingType,
                applicationType: form.applicationType,
                agreed,
                documents: documents.map((d) => ({
                  id: d.id,
                  name: d.name,
                  uri: d.uri,
                  type: d.type,
                })),
              },
            }
          : prev,
      );

      setIsEditing(false);
      setAlert({
        visible: true,
        title: "Updated",
        message: "Your changes have been saved.",
      });
    } catch {
      setAlert({
        visible: true,
        title: "Error",
        message: "Update failed. Please try again.",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    if (!data) return;
    setForm({
      fundingType: data.attributes.fundingType,
      applicationType: data.attributes.applicationType,
    });
    setAgreed(data.attributes.agreed);
    setDocuments(
      data.attributes.documents.map((d) => ({ ...d, isNew: false })),
    );
    setIsEditing(false);
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator color={PRIMARY_COLOR} />
      </View>
    );
  }

  const attr = data?.attributes;
  const statusStyle = STATUS_STYLES[attr?.status ?? "pending"];
  const editable = isEditableStatus(attr?.status);
  const selectedFundingOption = FUNDING_TYPE_OPTIONS.find(
    (o) => o.value === form.fundingType,
  );

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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[PRIMARY_COLOR]}
              tintColor={PRIMARY_COLOR}
            />
          }
        >
          {/* Status Header */}
          <View className="p-6 bg-white border-b border-slate-100 rounded-b-[40px] shadow-sm">
            <View className="flex-row flex-wrap justify-between items-center gap-3">
              <View className="flex-row flex-wrap gap-2 flex-1 min-w-[60%]">
                <View className="bg-slate-100 px-3 py-1.5 rounded-full flex-row items-center">
                  <Tag size={12} color="#64748b" />
                  <Text className="text-slate-600 font-semibold text-[10px] ml-1 uppercase">
                    {attr?.applicationType}
                  </Text>
                </View>
              </View>

              <View className={`px-4 py-2 rounded-2xl ${statusStyle.badgeBg}`}>
                <Text
                  className={`font-bold text-xs uppercase ${statusStyle.badgeText}`}
                >
                  {STATUS_LABELS[attr?.status ?? "pending"]}
                </Text>
              </View>
            </View>
          </View>

          <View className="p-5">
            {/* NOT EDITABLE NOTICE */}
            {!editable && (
              <View className="bg-slate-100 rounded-2xl p-4 mb-6">
                <Text className="text-slate-500 text-xs leading-5">
                  {attr?.status === "in_review"
                    ? "This request is currently being reviewed and can no longer be edited."
                    : "This request has been completed and can no longer be edited."}
                </Text>
              </View>
            )}

            {/* FUNDING TYPE CARD */}
            <View className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 mb-6">
              <Text className="text-slate-400 text-[10px] font-black uppercase mb-2">
                Ref ID #{data?.id}
              </Text>

              <Text className="text-slate-400 text-[10px] font-black uppercase mb-3 mt-2">
                Type of Funding Option
              </Text>

              {isEditing ? (
                <View className="flex-row flex-wrap gap-3">
                  {FUNDING_TYPE_OPTIONS.map((option) => {
                    const selected = form.fundingType === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() =>
                          setForm({ ...form, fundingType: option.value })
                        }
                        className={`w-[48%] flex-row items-center p-4 rounded-2xl border ${
                          selected
                            ? "bg-primary/10 border-primary"
                            : "border-slate-200"
                        }`}
                      >
                        <View className="flex-1 items-center">
                          <View className="w-full h-16 items-center justify-center">
                            <Image
                              source={option.image}
                              className="w-full h-full"
                              resizeMode="contain"
                            />
                          </View>
                          <Text
                            className={`mt-3 text-center text-xs ${
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
              ) : (
                <View className="flex-row items-center">
                  {selectedFundingOption && (
                    <View className="w-14 h-14 mr-3 items-center justify-center">
                      <Image
                        source={selectedFundingOption.image}
                        className="w-full h-full"
                        resizeMode="contain"
                      />
                    </View>
                  )}
                  <Text className="text-xl font-bold text-slate-800 flex-1">
                    {attr?.fundingType}
                  </Text>
                </View>
              )}
            </View>

            {/* APPLICATION TYPE CARD */}
            <View className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 mb-6">
              <Text className="text-slate-400 text-[10px] font-black uppercase mb-3">
                Application Type
              </Text>

              {isEditing ? (
                <View className="flex-row gap-x-3">
                  {APPLICATION_TYPE_OPTIONS.map((option) => {
                    const selected = form.applicationType === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() =>
                          setForm({ ...form, applicationType: option.value })
                        }
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
              ) : (
                <Text className="text-slate-600 font-semibold">
                  {attr?.applicationType}
                </Text>
              )}
            </View>

            {/* DOCUMENTS SECTION */}
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-4 px-2">
                <Text className="text-slate-900 text-lg font-black">
                  Supporting Documents
                </Text>
              </View>

              {documents.map((doc) => (
                <View
                  key={doc.id}
                  className="flex-row items-center bg-white border border-slate-100 shadow-sm p-3 rounded-2xl mb-3"
                >
                  <View className="w-14 h-14 rounded-xl bg-slate-100 items-center justify-center">
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

                  {isEditing && (
                    <TouchableOpacity
                      onPress={() => removeDocument(doc.id)}
                      className="p-2 bg-red-100 rounded-lg"
                    >
                      <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {isEditing && (
                <TouchableOpacity
                  onPress={addDocument}
                  className="flex-row items-center justify-center p-4 rounded-2xl border border-dashed border-primary mb-3"
                >
                  <Plus size={20} color="#3E4093" />
                  <Text className="text-primary font-bold ml-3">
                    Add Document
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* AGREEMENTS CARD — shown while editing so a resubmission can
                still confirm the checklist; read-only summary otherwise. */}
            {isEditing ? (
              <View className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm mb-6">
                <Text className="text-slate-600 font-bold mb-1">
                  Before you save
                </Text>
                <Text className="text-slate-400 text-xs mb-4">
                  Please review and check all three to continue.
                </Text>

                <View className="gap-y-5">
                  {(Object.keys(agreed) as (keyof AgreedState)[]).map((key) => {
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
                            <Text className="underline">{label.underline}</Text>
                          )}
                          {label.suffix}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View className="bg-primary/5 border border-primary/10 rounded-[32px] p-6 mb-6">
                <Text className="font-black text-[10px] uppercase mb-3 text-primary">
                  Agreements on File
                </Text>
                <View className="gap-y-2">
                  {(Object.keys(AGREEMENT_LABELS) as (keyof AgreedState)[]).map(
                    (key) => (
                      <View key={key} className="flex-row items-center">
                        <Check size={14} color={PRIMARY_COLOR} />
                        <Text className="text-slate-600 text-xs ml-2">
                          {AGREEMENT_TITLES[key]} — Accepted
                        </Text>
                      </View>
                    ),
                  )}
                </View>
              </View>
            )}

            {/* REVIEWER NOTES CARD — read-only, shown when present */}
            {attr?.reviewerNotes && (
              <View
                className={`rounded-[32px] p-6 border ${
                  attr.status === "rejected"
                    ? "bg-[#FFE6E9]/40 border-[#FFE6E9]"
                    : "bg-primary/5 border-primary/10"
                }`}
              >
                <Text
                  className={`font-black text-[10px] uppercase mb-2 ${
                    attr.status === "rejected"
                      ? "text-[#D70127]"
                      : "text-primary"
                  }`}
                >
                  {attr.status === "rejected"
                    ? "Rejection Reason"
                    : "Reviewer Notes"}
                </Text>
                <Text className="text-slate-700 text-sm italic leading-5">
                  {attr.reviewerNotes}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer — gated by status */}
        <View className="w-full p-5 bg-white border-t border-slate-200">
          {editable && !isEditing ? (
            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              className="bg-primary h-14 rounded-2xl justify-center items-center shadow-lg shadow-primary/30"
            >
              <Text className="text-white font-black text-lg">
                Edit Request
              </Text>
            </TouchableOpacity>
          ) : (
            isEditing && (
              <View className="flex-row gap-4">
                <TouchableOpacity
                  onPress={handleCancelEdit}
                  disabled={updating}
                  className="flex-1 h-14 rounded-2xl justify-center items-center border border-slate-200 bg-white"
                >
                  <Text className="text-slate-500 font-bold">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleUpdate}
                  disabled={updating}
                  className="flex-[2] bg-primary h-14 rounded-2xl justify-center items-center shadow-lg shadow-primary/30"
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

        {/* ================================================= */}
        {/* DOCUMENT PREVIEW MODAL — same layout as the create form */}
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
              onPress={() =>
                setPreviewModal({ visible: false, document: null })
              }
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
          onClose={() => setAlert({ ...alert, visible: false })}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

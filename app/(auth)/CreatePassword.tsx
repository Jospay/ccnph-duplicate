import { AgreementModal } from "@/components/AgreementModal";
import { AuthInput } from "@/components/AuthInput";
import { CustomAlert } from "@/components/CustomAlert";
import HeaderAuth from "@/components/HeaderAuth";
import LogoAuth from "@/components/LogoAuth";
import TitleAuth from "@/components/TitleAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { passwordService } from "@/services/passwordService";
import { termsAndConditionsService } from "@/services/termsAndConditionsService";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import "../../global.css";

export default function CreatePasswordPage() {
  const router = useRouter();

  const { phone, token } = useLocalSearchParams<{
    phone: string;
    token: string;
  }>();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  const [pageLoading, setPageLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const showAlert = (title: string, message: string) => {
    setTimeout(() => {
      setAlert({
        visible: true,
        title,
        message,
      });
    }, 150);
  };

  // ==========================================
  // TERMS AND CONDITIONS
  // ==========================================

  const {
    data: termsAndConditions,
    isLoading: termsLoading,
    isError: termsError,
  } = useQuery({
    queryKey: ["terms-and-conditions"],
    queryFn: termsAndConditionsService.getTermsAndConditions,
    staleTime: 1000 * 60 * 60,
  });

  // ==========================================
  // PREVENT BACK ACTION
  // ==========================================

  useEffect(() => {
    const backAction = () => {
      showAlert(
        "Hold on!",
        "You need to set your password to complete registration.",
      );

      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, []);

  // ==========================================
  // PAGE LOADING
  // ==========================================

  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  // ==========================================
  // SET PASSWORD
  // ==========================================

  const mutation = useMutation({
    mutationFn: () =>
      passwordService.setPassword({
        phone: phone as string,
        password,
        password_confirmation: confirmPassword,
        verification_token: token as string,
      }),

    onSuccess: (data) => {
      router.replace({
        pathname: "/congratulations",
        params: {
          token: data.token,
          user: JSON.stringify(data.user),
        },
      });
    },

    onError: (error: any) => {
      const status = error.response?.status;
      const data = error.response?.data;

      let title = "Error";
      let msg = data?.message || "Failed to complete registration.";

      if (status === 422) {
        title = "Validation Error";

        msg = data?.errors
          ? Object.values(data.errors).flat().join("\n")
          : "Invalid data.";
      } else if (status === 403) {
        title = "Session Expired";

        msg =
          "Your verification token is invalid. Please verify your phone again.";
      }

      showAlert(title, msg);
    },
  });

  // ==========================================
  // TERMS
  // ==========================================

  const handleCheckboxToggle = () => {
    if (agreeToTerms) {
      setAgreeToTerms(false);
    } else {
      if (termsError) {
        showAlert(
          "Unable to Load",
          "Unable to load the Terms and Conditions. Please try again.",
        );

        return;
      }

      setTermsModalVisible(true);
    }
  };

  const handleAcceptTerms = () => {
    setAgreeToTerms(true);
    setTermsModalVisible(false);
  };

  const handleOpenTerms = () => {
    if (termsError) {
      showAlert(
        "Unable to Load",
        "Unable to load the Terms and Conditions. Please try again.",
      );

      return;
    }

    setTermsModalVisible(true);
  };

  // ==========================================
  // REGISTER
  // ==========================================

  const handleRegister = () => {
    if (mutation.isPending) return;

    if (!password || !confirmPassword) {
      return showAlert("Required", "Please fill in both password fields.");
    }

    if (password.length < 8) {
      return showAlert(
        "Security",
        "Password must be at least 8 characters long.",
      );
    }

    if (password !== confirmPassword) {
      return showAlert("Mismatch", "Passwords do not match.");
    }

    if (!agreeToTerms) {
      return showAlert(
        "Agreement",
        "Please agree to the Terms and Conditions to proceed.",
      );
    }

    mutation.mutate();
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
      bottomOffset={20}
    >
      <View className="flex-1 bg-slate-50">
        <HeaderAuth title="Join Us" />

        <View className="flex-1 -mt-10">
          <View className="bg-primary h-[240px] rounded-b-[60px] absolute w-full top-0" />

          <View className="mx-5 pb-10 max-w-[500px] w-[90%] self-center">
            <View className="bg-white p-6 rounded-[40px] shadow-black/20 shadow-md elevation-4">
              {/* LOGO */}
              {pageLoading ? (
                <View className="items-center mb-4">
                  <Skeleton className="w-32 h-32 rounded-full border-4 border-white" />
                </View>
              ) : (
                <LogoAuth />
              )}

              {/* CONTENT */}
              {pageLoading ? (
                <View className="gap-y-6">
                  <Skeleton className="h-8 w-56" />
                  <Skeleton className="h-[70px] w-full rounded-2xl" />
                </View>
              ) : (
                <>
                  <TitleAuth
                    title="Create Password"
                    description={`Set password for +${phone}`}
                  />

                  {/* PASSWORD */}
                  <AuthInput
                    label="Password"
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChangeText={setPassword}
                    editable={!mutation.isPending}
                    isPassword
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword(!showPassword)}
                  />

                  {/* CONFIRM PASSWORD */}
                  <AuthInput
                    label="Retype Password"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!mutation.isPending}
                    isPassword
                    showPassword={showConfirmPassword}
                    onTogglePassword={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                  />

                  {/* TERMS CHECKBOX */}
                  <View className="flex-row ps-2 items-center my-2">
                    <TouchableOpacity
                      onPress={handleCheckboxToggle}
                      disabled={termsLoading}
                      className={`w-5 h-5 rounded border mr-2 items-center justify-center ${
                        agreeToTerms
                          ? "bg-primary border-primary"
                          : "border-slate-300 bg-slate-50"
                      }`}
                    >
                      {agreeToTerms && (
                        <View className="w-1.5 h-1.5 bg-white rounded-sm" />
                      )}
                    </TouchableOpacity>

                    <Text className="text-primary text-sm flex-1">
                      I agree to the{" "}
                      <Text
                        onPress={handleOpenTerms}
                        className="underline font-bold"
                      >
                        Terms and Conditions
                      </Text>
                    </Text>
                  </View>

                  {/* REGISTER */}
                  <TouchableOpacity
                    onPress={handleRegister}
                    disabled={mutation.isPending}
                    className={`mt-5 p-5 rounded-2xl flex-row justify-center items-center ${
                      mutation.isPending ? "bg-slate-400" : "bg-primary"
                    }`}
                  >
                    {mutation.isPending ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-bold text-lg">
                        Complete Registration
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* CUSTOM ALERT */}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={() => {
          setAlert({
            ...alert,
            visible: false,
          });

          if (alert.title === "Session Expired") {
            router.replace("/register");
          }
        }}
      />

      {/* TERMS AND CONDITIONS MODAL */}
      <AgreementModal
        visible={termsModalVisible}
        title={termsAndConditions?.name || "Terms and Conditions of Use"}
        description={termsAndConditions?.content || ""}
        onAccept={handleAcceptTerms}
        onCancel={() => setTermsModalVisible(false)}
      />
    </KeyboardAwareScrollView>
  );
}

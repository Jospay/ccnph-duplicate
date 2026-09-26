// app/register-seller/index.tsx
import { CustomAlert } from "@/components/CustomAlert";
import { registerSellerShop } from "@/services/sellerStoreService";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { CheckCircle, Image as ImageIcon, Upload } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
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
import "../../../global.css";

interface ImageFileState {
  uri: string;
  name: string;
  type: string;
}

export default function RegisterSeller() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const scrollPosition = useRef(0);
  const isProcessing = useRef(false);

  const [loading, setLoading] = useState(false);
  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState<ImageFileState | null>(null);
  const [banner, setBanner] = useState<ImageFileState | null>(null);

  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  // Track scroll parameters safely to ensure the keyboard view matches correctly
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => {
      scrollRef.current?.scrollTo({
        y: scrollPosition.current,
        animated: true,
      });
    });
    return () => show.remove();
  }, []);

  const handlePickFile = async (target: "logo" | "banner") => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const selectedFile: ImageFileState = {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || "image/jpeg",
      };

      if (target === "logo") {
        setLogo(selectedFile);
      } else {
        setBanner(selectedFile);
      }
    } catch (error) {
      console.log("FILE PICK ERROR:", error);
    }
  };

  const handleSubmit = async () => {
    if (isProcessing.current || loading) return;

    // Direct configuration validation check
    if (!shopName.trim() || !description.trim()) {
      setAlert({
        visible: true,
        title: "Missing Fields",
        message: "Please enter your Shop Name and Description details.",
      });
      return;
    }

    if (!logo) {
      setAlert({
        visible: true,
        title: "Logo Required",
        message: "Please choose an image for your store's branding logo.",
      });
      return;
    }

    if (!banner) {
      setAlert({
        visible: true,
        title: "Banner Required",
        message: "Please provide a layout profile banner image.",
      });
      return;
    }

    try {
      isProcessing.current = true;
      setLoading(true);

      await registerSellerShop({
        name: shopName,
        description: description,
        logo: logo,
        banner: banner,
      });

      // Targeted routing redirect upon verification success
      router.replace("../register-seller/congratulations");
    } catch (error: any) {
      setAlert({
        visible: true,
        title: "Registration Failed",
        message:
          error?.response?.data?.message ||
          "Something went wrong. Please check your details.",
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
          {/* Header */}
          <View className="items-center mt-8 p-3 rounded-xl mb-6 bg-primary">
            <Text className="text-2xl font-bold text-white text-center">
              Store Details
            </Text>
          </View>

          {/* Core Input Elements Container */}
          <View className="gap-y-5 pt-2">
            {/* Shop Name */}
            <View>
              <Text className="text-primary mb-2 ml-2 font-semibold tracking-wide">
                Shop Name
              </Text>
              <TextInput
                placeholder="Ex. Juan's Handicrafts"
                className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-slate-900 text-md"
                value={shopName}
                onChangeText={setShopName}
              />
            </View>

            {/* Description */}
            <View>
              <Text className="text-primary mb-2 ml-2 font-semibold tracking-wide">
                About the Store
              </Text>
              <TextInput
                placeholder="Tell customers about the items you offer and what your shop stands for..."
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                className="bg-slate-50 border border-slate-200 p-4 rounded-2xl h-36 text-slate-900 text-md"
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Logo Picker Section */}
            <View>
              <Text className="text-primary mb-2 ml-2 font-semibold tracking-wide">
                Store Logo
              </Text>
              {logo ? (
                <View className="flex-row items-center bg-slate-50 border border-emerald-200 p-4 rounded-2xl">
                  <CheckCircle size={20} color="#10B981" />
                  <Text
                    className="ml-3 flex-1 text-slate-800 text-sm font-medium"
                    numberOfLines={1}
                  >
                    {logo.name}
                  </Text>
                  <TouchableOpacity onPress={() => handlePickFile("logo")}>
                    <Text className="text-primary font-bold text-sm px-2">
                      Change
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => handlePickFile("logo")}
                  className="flex-row items-center justify-center p-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 active:bg-slate-100"
                >
                  <Upload size={20} color="#64748B" />
                  <Text className="text-primary mb-2 ml-2 font-semibold tracking-wide">
                    Shop Logo
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Banner Picker Section */}
            <View>
              <Text className="text-primary mb-2 ml-2 font-semibold tracking-wide">
                Store Banner
              </Text>
              {banner ? (
                <View className="flex-row items-center bg-slate-50 border border-emerald-200 p-4 rounded-2xl">
                  <CheckCircle size={20} color="#10B981" />
                  <Text
                    className="ml-3 flex-1 text-slate-800 text-sm font-medium"
                    numberOfLines={1}
                  >
                    {banner.name}
                  </Text>
                  <TouchableOpacity onPress={() => handlePickFile("banner")}>
                    <Text className="text-primary font-bold text-sm px-2">
                      Change
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => handlePickFile("banner")}
                  className="flex-row items-center justify-center p-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 active:bg-slate-100"
                >
                  <ImageIcon size={20} color="#64748B" />
                  <Text className="text-primary mb-2 ml-2 font-semibold tracking-wide">
                    Store Banner
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Spacer layout element to pad scroll content boundaries */}
          <View className="h-20" />
        </ScrollView>

        {/* Action Button Strip */}
        <View className="p-5 bg-white border-t border-slate-100">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className={`w-full h-16 rounded-2xl justify-center items-center shadow-sm ${
              loading ? "bg-slate-400" : "bg-primary"
            }`}
          >
            <Text className="text-white font-bold text-lg tracking-wide">
              {loading ? "Creating Shop Profile..." : "Submit Registration"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Custom Notifications Layout Hook */}
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

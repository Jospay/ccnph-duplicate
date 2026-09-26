import { CustomAlert } from "@/components/CustomAlert";
import { profileService } from "@/services/profileService";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const MAX_ID_IMAGE_MB = 10;
const MAX_ID_IMAGE_BYTES = MAX_ID_IMAGE_MB * 1024 * 1024;

const pickerTextStyle = { color: "#1f2937" };
const NCR_REGION_CODE = "130000000";

export default function SetupProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Custom Alert State
  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const [regions, setRegions] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [barangays, setBarangays] = useState<any[]>([]);

  const [form, setForm] = useState<any>({
    name: "",
    phone: "",
    email: "",
    gender: "",
    birthdate: "",
    region: "",
    province: "",
    city: "",
    barangay: "",
    valid_id_type: "",
    valid_id_number: "",
    street: "",
    postal_code: "",
    front_valid_id_picture: null,
    back_valid_id_picture: null,
  });

  // --- VALIDATION LOGIC ---
  const isFormComplete = () => {
    const requiredFields = [
      "gender",
      "birthdate",
      "email",
      "region",
      "city",
      "barangay",
      "valid_id_type",
      "valid_id_number",
      "street",
      "postal_code",
    ];

    const baseFieldsComplete = requiredFields.every((field) => !!form[field]);
    const imagesUploaded =
      !!form.front_valid_id_picture?.uri && !!form.back_valid_id_picture?.uri;

    const isNCR = form.region === NCR_REGION_CODE;
    const isProvinceComplete = isNCR ? true : !!form.province;

    return baseFieldsComplete && imagesUploaded && isProvinceComplete;
  };

  useEffect(() => {
    const init = async () => {
      await fetchRegions();
      await fetchProfile();
    };
    init();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await profileService.getProfile();
      const userData = res.data?.attributes || res;

      setForm((prev: any) => ({
        ...prev,
        ...userData,
        front_valid_id_picture: userData.front_valid_id_picture
          ? { uri: userData.front_valid_id_picture }
          : null,
        back_valid_id_picture: userData.back_valid_id_picture
          ? { uri: userData.back_valid_id_picture }
          : null,
      }));

      if (userData.region) {
        if (userData.region === NCR_REGION_CODE) {
          await fetchCitiesForNCR(userData.region);
        } else {
          await fetchProvinces(userData.region);
        }
      }
      if (userData.province) await fetchCities(userData.province);
      if (userData.city) await fetchBarangays(userData.city);
    } catch (err) {
      console.error("Profile Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- ADDRESS API FETCHERS ---
  const fetchRegions = async () => {
    try {
      const res = await fetch("https://psgc.gitlab.io/api/regions/");
      setRegions(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProvinces = async (code: string) => {
    try {
      const res = await fetch(
        `https://psgc.gitlab.io/api/regions/${code}/provinces/`,
      );
      setProvinces(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCities = async (code: string) => {
    try {
      const res = await fetch(
        `https://psgc.gitlab.io/api/provinces/${code}/cities-municipalities/`,
      );
      setCities(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCitiesForNCR = async (regionCode: string) => {
    try {
      const res = await fetch(
        `https://psgc.gitlab.io/api/regions/${regionCode}/cities-municipalities/`,
      );
      setCities(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBarangays = async (code: string) => {
    try {
      const res = await fetch(
        `https://psgc.gitlab.io/api/cities-municipalities/${code}/barangays/`,
      );
      setBarangays(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegionChange = (v: string) => {
    setForm({
      ...form,
      region: v,
      province: "",
      city: "",
      barangay: "",
    });
    setProvinces([]);
    setCities([]);
    setBarangays([]);

    if (v) {
      if (v === NCR_REGION_CODE) {
        fetchCitiesForNCR(v);
      } else {
        fetchProvinces(v);
      }
    }
  };

  const pickImage = async (field: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file) return;

      if (file.size && file.size > MAX_ID_IMAGE_BYTES) {
        setAlert({
          visible: true,
          title: "File Too Large",
          message: `Please select an image smaller than ${MAX_ID_IMAGE_MB}MB.`,
        });
        return;
      }

      setForm((prev: any) => ({
        ...prev,
        [field]: {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "image/jpeg",
        },
      }));
    } catch (err) {
      console.error("Image Pick Error:", err);
      setAlert({
        visible: true,
        title: "Selection Failed",
        message: "Could not select that image. Please try another one.",
      });
    }
  };

  const handleUpdate = async () => {
    if (!isFormComplete()) {
      setAlert({
        visible: true,
        title: "Incomplete Form",
        message: "Please fill out all required fields and upload your IDs.",
      });
      return;
    }

    setSaving(true);
    try {
      await profileService.updateProfile(form);
      router.replace("/profile/congratulations");
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      const errorMessage = errors
        ? (Object.values(errors).flat()[0] as string)
        : err.response?.data?.message ||
          "Failed to update profile. Please try again.";

      setAlert({
        visible: true,
        title: "Error",
        message: errorMessage,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");

    if (event.type === "dismissed") {
      setShowDatePicker(false);
      return;
    }

    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;

      setForm((prev: any) => ({
        ...prev,
        birthdate: formattedDate,
      }));
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#034194" />
      </View>
    );
  }

  // Common Styles
  const card = "bg-white p-5 rounded-3xl mb-4 shadow-sm border border-gray-100";
  const label = "text-primary mb-1 ps-2 text-sm";
  const inputStyle =
    "border border-gray-200 bg-white p-4 rounded-2xl mb-4 text-gray-800 font-medium overflow-hidden";
  const pickerContainer =
    "border border-gray-200 rounded-2xl bg-white mb-4 overflow-hidden";

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1 bg-[#F8F9FB] px-4"
        showsVerticalScrollIndicator={false}
      >
        {/* BASIC INFO */}
        <View className={`${card} mt-4`}>
          <View className="flex-row items-center mb-4">
            <Ionicons name="person-circle-outline" size={24} color="#034194" />
            <Text className="text-lg font-bold ml-2 text-gray-800">
              Basic Information
            </Text>
          </View>

          <Text className={label}>Full Name (Locked)</Text>
          <TextInput
            value={form.name}
            editable={false}
            className={`${inputStyle} bg-gray-100 border-gray-200 color-gray-500`}
          />

          <Text className={label}>Phone Number (Locked)</Text>
          <TextInput
            value={form.phone}
            editable={false}
            className={`${inputStyle} bg-gray-100 border-gray-200 color-gray-500`}
          />

          <Text className={label}>Email Address</Text>
          <TextInput
            value={form.email}
            onChangeText={(t) => setForm({ ...form, email: t })}
            className={inputStyle}
            placeholder="Email Address"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text className={label}>Gender</Text>
          <View className={pickerContainer}>
            <Picker
              selectedValue={form.gender}
              onValueChange={(value) => setForm({ ...form, gender: value })}
              style={pickerTextStyle}
              dropdownIconColor="#034194"
            >
              <Picker.Item label="Select Gender" value="" color="#9CA3AF" />
              <Picker.Item label="Male" value="Male" color="#1f2937" />
              <Picker.Item label="Female" value="Female" color="#1f2937" />
            </Picker>
          </View>

          <Text className={label}>Birthdate</Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            className={inputStyle}
          >
            <Text
              className={form.birthdate ? "text-gray-800" : "text-gray-400"}
            >
              {form.birthdate || "YYYY-MM-DD"}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={
                form.birthdate ? new Date(form.birthdate) : new Date(2000, 0, 1)
              }
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              maximumDate={new Date()}
              onChange={handleDateChange}
            />
          )}
        </View>

        {/* ADDRESS */}
        <View className={card}>
          <View className="flex-row items-center mb-4">
            <Ionicons name="location-outline" size={24} color="#034194" />
            <Text className="text-lg font-bold ml-2 text-gray-800">
              Address Details
            </Text>
          </View>

          <Text className={label}>Region</Text>
          <View className={pickerContainer}>
            <Picker
              selectedValue={form.region}
              onValueChange={handleRegionChange}
              style={pickerTextStyle}
              dropdownIconColor="#034194"
            >
              <Picker.Item label="Select Region" value="" color="#9CA3AF" />
              {regions.map((r) => (
                <Picker.Item
                  key={r.code}
                  label={r.name}
                  value={r.code}
                  color="#1f2937"
                />
              ))}
            </Picker>
          </View>

          <Text className={label}>Province</Text>
          <View className={pickerContainer}>
            <Picker
              selectedValue={form.province}
              enabled={form.region !== NCR_REGION_CODE}
              onValueChange={(v) => {
                setForm({ ...form, province: v, city: "", barangay: "" });
                if (v) fetchCities(v);
              }}
              style={pickerTextStyle}
              dropdownIconColor="#034194"
            >
              <Picker.Item
                label={
                  form.region === NCR_REGION_CODE
                    ? "N/A (NCR Selected)"
                    : "Select Province"
                }
                value=""
                color="#9CA3AF"
              />
              {provinces.map((p) => (
                <Picker.Item
                  key={p.code}
                  label={p.name}
                  value={p.code}
                  color="#1f2937"
                />
              ))}
            </Picker>
          </View>

          <Text className={label}>City / Municipality</Text>
          <View className={pickerContainer}>
            <Picker
              selectedValue={form.city}
              onValueChange={(v) => {
                setForm({ ...form, city: v, barangay: "" });
                if (v) fetchBarangays(v);
              }}
              style={pickerTextStyle}
              dropdownIconColor="#034194"
            >
              <Picker.Item label="Select City" value="" color="#9CA3AF" />
              {cities.map((c) => (
                <Picker.Item
                  key={c.code}
                  label={c.name}
                  value={c.code}
                  color="#1f2937"
                />
              ))}
            </Picker>
          </View>

          <Text className={label}>Barangay</Text>
          <View className={pickerContainer}>
            <Picker
              selectedValue={form.barangay}
              onValueChange={(v) => setForm({ ...form, barangay: v })}
              style={pickerTextStyle}
              dropdownIconColor="#034194"
            >
              <Picker.Item label="Select Barangay" value="" color="#9CA3AF" />
              {barangays.map((b) => (
                <Picker.Item
                  key={b.code}
                  label={b.name}
                  value={b.code}
                  color="#1f2937"
                />
              ))}
            </Picker>
          </View>

          <Text className={label}>Street / House No.</Text>
          <TextInput
            value={form.street}
            onChangeText={(t) => setForm({ ...form, street: t })}
            className={inputStyle}
            placeholder="Street / House No."
          />

          <Text className={label}>Postal Code</Text>
          <TextInput
            value={form.postal_code}
            onChangeText={(t) => setForm({ ...form, postal_code: t })}
            className={inputStyle}
            placeholder="Postal Code"
            keyboardType="numeric"
          />
        </View>

        {/* VERIFICATION / ID */}
        <View className={card}>
          <View className="flex-row items-center mb-4">
            <Ionicons name="card-outline" size={24} color="#034194" />
            <Text className="text-lg font-bold ml-2 text-gray-800">
              Identity Verification
            </Text>
          </View>

          <Text className={label}>ID Type</Text>
          <View className={pickerContainer}>
            <Picker
              selectedValue={form.valid_id_type}
              onValueChange={(v) => setForm({ ...form, valid_id_type: v })}
              style={pickerTextStyle}
              dropdownIconColor="#034194"
            >
              <Picker.Item label="Select ID Type" value="" color="#9CA3AF" />
              <Picker.Item
                label="National ID"
                value="National ID"
                color="#1f2937"
              />
              <Picker.Item label="Passport" value="Passport" color="#1f2937" />
              <Picker.Item
                label="Driver License"
                value="Driver License"
                color="#1f2937"
              />
              <Picker.Item label="UMID" value="UMID" color="#1f2937" />
            </Picker>
          </View>

          <Text className={label}>ID Number</Text>
          <TextInput
            value={form.valid_id_number}
            onChangeText={(t) => setForm({ ...form, valid_id_number: t })}
            className={inputStyle}
            placeholder="ID Number"
          />

          <Text className={label}>Upload Front & Back ID</Text>
          <View className="flex-row justify-between mt-2">
            <TouchableOpacity
              onPress={() => pickImage("front_valid_id_picture")}
              className="w-[48%] bg-gray-50 h-32 rounded-3xl items-center justify-center overflow-hidden border border-gray-200"
            >
              {form.front_valid_id_picture?.uri ? (
                <Image
                  source={{ uri: form.front_valid_id_picture.uri }}
                  className="w-full h-full"
                />
              ) : (
                <View className="items-center">
                  <Ionicons name="camera-outline" size={28} color="#9CA3AF" />
                  <Text className="text-xs text-gray-400 font-medium mt-1">
                    Front ID
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => pickImage("back_valid_id_picture")}
              className="w-[48%] bg-gray-50 h-32 rounded-3xl items-center justify-center overflow-hidden border border-gray-200"
            >
              {form.back_valid_id_picture?.uri ? (
                <Image
                  source={{ uri: form.back_valid_id_picture.uri }}
                  className="w-full h-full"
                />
              ) : (
                <View className="items-center">
                  <Ionicons name="camera-outline" size={28} color="#9CA3AF" />
                  <Text className="text-xs text-gray-400 font-medium mt-1">
                    Back ID
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* SUBMIT BUTTON */}
        <TouchableOpacity
          onPress={handleUpdate}
          disabled={saving || !isFormComplete()}
          className="h-16 rounded-2xl justify-center items-center bg-[#034194] mb-8"
          style={{ opacity: saving || !isFormComplete() ? 0.5 : 1 }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">Complete Setup</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </View>
  );
}

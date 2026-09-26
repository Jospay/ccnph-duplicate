import { CustomAlert } from "@/components/CustomAlert";
import { profileService } from "@/services/profileService";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams } from "expo-router";
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

// Explicit color for every Picker's selected-value text/items.
// Android otherwise inherits this from the system day/night theme,
// which causes invisible text on white cards when a standalone build
// runs on a phone in dark mode.
const pickerTextStyle = { color: "#1f2937" };

export default function EditProfileScreen() {
  const params = useLocalSearchParams();

  const hasNoParams = Object.keys(params).length === 0;
  const showInfo = "info" in params || hasNoParams;
  const showLocation = "location" in params || hasNoParams;
  const showID = "vakidID" in params || hasNoParams;

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  const getNameFromCode = (list: any[], code: string) => {
    const item = list.find((i) => i.code === code);
    return item ? item.name : null;
  };

  const isFormComplete = () => {
    // Province is excluded from the base required fields array
    const requiredFields = [
      "name",
      "phone",
      "email",
      "gender",
      "birthdate",
      "region",
      "city",
      "barangay",
      "valid_id_type",
      "valid_id_number",
      "street",
      "postal_code",
    ];

    const baseFieldsComplete = requiredFields.every((field) => !!form[field]);
    const imagesComplete =
      !!form.front_valid_id_picture && !!form.back_valid_id_picture;

    // NCR region code in PSGC API is "130000000"
    const isNCR = form.region === "130000000";

    // If it's NCR, province is valid (true). Otherwise, require the province field.
    const isProvinceComplete = isNCR ? true : !!form.province;

    return baseFieldsComplete && imagesComplete && isProvinceComplete;
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      await fetchRegions();

      const res = await profileService.getProfile();
      const userData = res.data?.attributes || res;

      setForm({
        ...userData,
        front_valid_id_picture: userData.front_valid_id_picture
          ? { uri: userData.front_valid_id_picture }
          : null,
        back_valid_id_picture: userData.back_valid_id_picture
          ? { uri: userData.back_valid_id_picture }
          : null,
      });

      if (userData.region) await fetchProvinces(userData.region);
      if (userData.province) await fetchCities(userData.province);
      if (userData.city) await fetchBarangays(userData.city);
    } catch (err) {
      console.error(err);
      setAlert({
        visible: true,
        title: "Error",
        message: "Failed to load profile.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRegions = async () => {
    const res = await fetch("https://psgc.gitlab.io/api/regions/");
    setRegions(await res.json());
  };

  const fetchProvinces = async (regionCode: string) => {
    const res = await fetch(
      `https://psgc.gitlab.io/api/regions/${regionCode}/provinces/`,
    );
    setProvinces(await res.json());
  };

  const fetchCities = async (provinceCode: string) => {
    const res = await fetch(
      `https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`,
    );
    setCities(await res.json());
  };

  const fetchBarangays = async (cityCode: string) => {
    const res = await fetch(
      `https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays/`,
    );
    setBarangays(await res.json());
  };

  const pickImage = async (field: string) => {
    if (!isEditing) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true, // ensures a stable, readable local URI on both platforms
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
        title: "Incomplete",
        message: "Please fill in all fields.",
      });
      return;
    }
    setSaving(true);
    try {
      await profileService.updateProfile(form);
      setIsEditing(false);
      setAlert({
        visible: true,
        title: "Success",
        message: "Profile updated.",
      });
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      const errorMessage = errors
        ? (Object.values(errors).flat()[0] as string)
        : err.response?.data?.message || "Failed to update profile.";

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
    if (selectedDate) {
      setForm((prev: any) => ({
        ...prev,
        birthdate: selectedDate.toISOString().split("T")[0],
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

  const card = "bg-white p-5 rounded-3xl mb-4 shadow-sm border border-gray-100";
  const label =
    "text-gray-500 mb-1 font-semibold text-[10px] uppercase tracking-wider";
  const valueStyle = "text-gray-800 font-bold text-base mb-4";
  const inputStyle =
    "border border-gray-200 bg-white p-4 rounded-2xl mb-4 text-gray-800 font-medium";
  const pickerContainer =
    "border border-gray-200 rounded-2xl bg-white mb-4 overflow-hidden";

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1 bg-[#F8F9FB] px-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row justify-between items-center mt-6 mb-4">
          <Text className="text-2xl font-black text-gray-800">
            Account Details
          </Text>
          <TouchableOpacity
            onPress={() => setIsEditing(!isEditing)}
            className={`px-4 py-2 rounded-full ${isEditing ? "bg-[#FEF2F2]" : "bg-blue"}`}
          >
            <Text
              className={`font-bold ${isEditing ? "text-[#D70127]" : "text-[#034194]"}`}
            >
              {isEditing ? "Cancel" : "Edit Details"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* --- BASIC INFO --- */}
        {showInfo && (
          <View className={card}>
            <Text className="text-lg font-bold mb-4 text-gray-800">
              Basic Info
            </Text>

            <Text className={label}>Full Name (Locked)</Text>
            {isEditing ? (
              <TextInput
                value={form.name}
                editable={false}
                className={
                  inputStyle + " bg-gray-100 border-gray-200 color-gray-500"
                }
              />
            ) : (
              <Text className={valueStyle}>{form.name || "---"}</Text>
            )}

            <Text className={label}>Phone Number (Locked)</Text>
            {isEditing ? (
              <TextInput
                value={form.phone}
                editable={false}
                className={
                  inputStyle + " bg-gray-100 border-gray-200 color-gray-500"
                }
              />
            ) : (
              <Text className={valueStyle}>{form.phone || "---"}</Text>
            )}

            <Text className={label}>Gender</Text>
            {isEditing ? (
              <View className={pickerContainer}>
                <Picker
                  selectedValue={form.gender}
                  onValueChange={(v) => setForm({ ...form, gender: v })}
                  style={pickerTextStyle}
                  dropdownIconColor="#034194"
                >
                  <Picker.Item label="Select Gender" value="" color="#9CA3AF" />
                  <Picker.Item label="Male" value="Male" color="#1f2937" />
                  <Picker.Item label="Female" value="Female" color="#1f2937" />
                </Picker>
              </View>
            ) : (
              <Text className={valueStyle}>{form.gender || "---"}</Text>
            )}

            <Text className={label}>Birthdate</Text>
            {isEditing ? (
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className={inputStyle}
              >
                <Text>{form.birthdate || "YYYY-MM-DD"}</Text>
              </TouchableOpacity>
            ) : (
              <Text className={valueStyle}>{form.birthdate || "---"}</Text>
            )}
          </View>
        )}

        {/* --- ADDRESS --- */}
        {showLocation && (
          <View className={card}>
            <Text className="text-lg font-bold mb-4 text-gray-800">
              Address
            </Text>

            <Text className={label}>Region</Text>
            {isEditing ? (
              <View className={pickerContainer}>
                <Picker
                  selectedValue={form.region}
                  onValueChange={(v) => {
                    setForm({
                      ...form,
                      region: v,
                      province: "",
                      city: "",
                      barangay: "",
                    });
                    fetchProvinces(v);
                  }}
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
            ) : (
              <Text className={valueStyle}>
                {getNameFromCode(regions, form.region) || "---"}
              </Text>
            )}

            <Text className={label}>Province</Text>
            {isEditing ? (
              <View className={pickerContainer}>
                <Picker
                  selectedValue={form.province}
                  onValueChange={(v) => {
                    setForm({ ...form, province: v, city: "", barangay: "" });
                    fetchCities(v);
                  }}
                  style={pickerTextStyle}
                  dropdownIconColor="#034194"
                >
                  <Picker.Item
                    label={
                      form.region === "130000000"
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
            ) : (
              <Text className={valueStyle}>
                {getNameFromCode(provinces, form.province) || "---"}
              </Text>
            )}

            <Text className={label}>City / Municipality</Text>
            {isEditing ? (
              <View className={pickerContainer}>
                <Picker
                  selectedValue={form.city}
                  onValueChange={(v) => {
                    setForm({ ...form, city: v, barangay: "" });
                    fetchBarangays(v);
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
            ) : (
              <Text className={valueStyle}>
                {getNameFromCode(cities, form.city) || "---"}
              </Text>
            )}

            <Text className={label}>Barangay</Text>
            {isEditing ? (
              <View className={pickerContainer}>
                <Picker
                  selectedValue={form.barangay}
                  onValueChange={(v) => setForm({ ...form, barangay: v })}
                  style={pickerTextStyle}
                  dropdownIconColor="#034194"
                >
                  <Picker.Item
                    label="Select Barangay"
                    value=""
                    color="#9CA3AF"
                  />
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
            ) : (
              <Text className={valueStyle}>
                {getNameFromCode(barangays, form.barangay) || "---"}
              </Text>
            )}

            <Text className={label}>Street</Text>
            {isEditing ? (
              <TextInput
                value={form.street}
                onChangeText={(t) => setForm({ ...form, street: t })}
                className={inputStyle}
              />
            ) : (
              <Text className={valueStyle}>{form.street || "---"}</Text>
            )}

            <Text className={label}>Postal Code</Text>
            {isEditing ? (
              <TextInput
                value={form.postal_code}
                onChangeText={(t) => setForm({ ...form, postal_code: t })}
                className={inputStyle}
              />
            ) : (
              <Text className={valueStyle}>{form.postal_code || "---"}</Text>
            )}
          </View>
        )}

        {/* --- ID --- */}
        {showID && (
          <View className={card}>
            <Text className="text-lg font-bold mb-4 text-gray-800">
              Verification
            </Text>

            <Text className={label}>ID Type & Number</Text>
            {isEditing ? (
              <>
                <View className={pickerContainer}>
                  <Picker
                    selectedValue={form.valid_id_type}
                    onValueChange={(v) =>
                      setForm({ ...form, valid_id_type: v })
                    }
                    style={pickerTextStyle}
                    dropdownIconColor="#034194"
                  >
                    <Picker.Item
                      label="Select ID Type"
                      value=""
                      color="#9CA3AF"
                    />
                    <Picker.Item
                      label="National ID"
                      value="National ID"
                      color="#1f2937"
                    />
                    <Picker.Item
                      label="Passport"
                      value="Passport"
                      color="#1f2937"
                    />
                  </Picker>
                </View>

                <TextInput
                  value={form.valid_id_number}
                  onChangeText={(t) => setForm({ ...form, valid_id_number: t })}
                  className={inputStyle}
                />
              </>
            ) : (
              <Text className={valueStyle}>
                {form.valid_id_type} - {form.valid_id_number || "---"}
              </Text>
            )}

            <View className="flex-row justify-between mt-2">
              <TouchableOpacity
                onPress={() => pickImage("front_valid_id_picture")}
                className="w-[48%] bg-gray-50 h-32 rounded-3xl items-center justify-center overflow-hidden border border-gray-100"
              >
                {form.front_valid_id_picture?.uri ? (
                  <Image
                    source={{ uri: form.front_valid_id_picture.uri }}
                    className="w-full h-full"
                  />
                ) : (
                  <Ionicons name="camera" size={24} color="#ccc" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => pickImage("back_valid_id_picture")}
                className="w-[48%] bg-gray-50 h-32 rounded-3xl items-center justify-center overflow-hidden border border-gray-100"
              >
                {form.back_valid_id_picture?.uri ? (
                  <Image
                    source={{ uri: form.back_valid_id_picture.uri }}
                    className="w-full h-full"
                  />
                ) : (
                  <Ionicons name="camera" size={24} color="#ccc" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {isEditing && (
        <View className="w-full p-5 bg-white border-t border-slate-200">
          <TouchableOpacity
            onPress={handleUpdate}
            disabled={saving || !isFormComplete()}
            className="h-16 rounded-2xl justify-center items-center bg-primary"
            style={{ opacity: saving || !isFormComplete() ? 0.6 : 1 }}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-lg">Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          onChange={handleDateChange}
        />
      )}

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </View>
  );
}

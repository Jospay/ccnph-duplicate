import { CustomAlert } from "@/components/CustomAlert";
import { profileService } from "@/services/profileService";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function ManageAddressesScreen() {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);

  // Address Dropdown Data lists
  const [regions, setRegions] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [barangays, setBarangays] = useState<any[]>([]);

  // Needed so the "Save Address" bar and modal content never sit under the
  // phone's gesture/nav bar (Android) or home indicator (iOS).
  const insets = useSafeAreaInsets();

  // Form State adapted to Migration payload parameters
  const [form, setForm] = useState({
    label: "home",
    recipient_name: "",
    recipient_number: "",
    region: "",
    region_code: "",
    province: null as string | null,
    province_code: null as string | null,
    city: "",
    city_code: "",
    barangay: "",
    barangay_code: "",
    street: "",
    unit_bldg_house: "",
    postal_code: "",
    landmark: "",
    is_default: false,
  });

  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    loadAddresses();
    fetchRegions();
  }, []);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const data = await profileService.getAddresses();
      setAddresses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegions = async () => {
    try {
      const res = await fetch("https://psgc.gitlab.io/api/regions/");
      setRegions(await res.json());
    } catch (err) {
      console.error("Failed to fetch regions", err);
    }
  };

  const fetchProvinces = async (regionCode: string) => {
    try {
      const res = await fetch(
        `https://psgc.gitlab.io/api/regions/${regionCode}/provinces/`,
      );
      setProvinces(await res.json());
    } catch (err) {
      console.error("Failed to fetch provinces", err);
    }
  };

  const fetchCities = async (provinceCode: string) => {
    try {
      const res = await fetch(
        `https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`,
      );
      setCities(await res.json());
    } catch (err) {
      console.error("Failed to fetch cities", err);
    }
  };

  const fetchBarangays = async (cityCode: string) => {
    try {
      const res = await fetch(
        `https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays/`,
      );
      setBarangays(await res.json());
    } catch (err) {
      console.error("Failed to fetch barangays", err);
    }
  };

  const handleOpenModal = async (address: any = null) => {
    if (address) {
      setEditingAddressId(address.id);

      // Load dependent data sources dynamically via current codes
      if (address.region_code) await fetchProvinces(address.region_code);
      if (address.province_code) await fetchCities(address.province_code);
      if (address.city_code) await fetchBarangays(address.city_code);

      setForm({
        label: address.label || "home",
        recipient_name: address.recipient_name || "",
        recipient_number: address.recipient_number || "",
        region: address.region || "",
        region_code: address.region_code || "",
        province: address.province || "",
        province_code: address.province_code || "",
        city: address.city || "",
        city_code: address.city_code || "",
        barangay: address.barangay || "",
        barangay_code: address.barangay_code || "",
        street: address.street || "",
        unit_bldg_house: address.unit_bldg_house || "",
        postal_code: address.postal_code || "",
        landmark: address.landmark || "",
        is_default: !!address.is_default,
      });
    } else {
      setEditingAddressId(null);
      setForm({
        label: "home",
        recipient_name: "",
        recipient_number: "",
        region: "",
        region_code: "",
        province: "",
        province_code: "",
        city: "",
        city_code: "",
        barangay: "",
        barangay_code: "",
        street: "",
        unit_bldg_house: "",
        postal_code: "",
        landmark: "",
        is_default: addresses.length === 0,
      });
      setProvinces([]);
      setCities([]);
      setBarangays([]);
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (
      !form.recipient_name ||
      !form.recipient_number ||
      !form.region_code ||
      !form.city_code ||
      !form.barangay_code ||
      !form.street ||
      !form.unit_bldg_house ||
      !form.postal_code
    ) {
      setAlert({
        visible: true,
        title: "Missing Fields",
        message: "Please populate all necessary validation markers.",
      });
      return;
    }

    setActionLoading(true);
    try {
      if (editingAddressId) {
        await profileService.updateAddress(editingAddressId, form);
      } else {
        await profileService.addAddress(form);
      }
      setModalVisible(false);
      loadAddresses();
    } catch (err) {
      setAlert({
        visible: true,
        title: "Error",
        message: "Failed to save the location details.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setActionLoading(true);
    try {
      await profileService.deleteAddress(id);
      loadAddresses();
    } catch (err) {
      setAlert({
        visible: true,
        title: "Error",
        message: "Failed to delete address entry.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetDefault = async (address: any) => {
    setActionLoading(true);
    try {
      await profileService.updateAddress(address.id, {
        ...address,
        is_default: true,
      });
      loadAddresses();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#034194" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F8F9FB]">
      <ScrollView
        className="flex-1 px-4 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      >
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-black text-gray-800">
            My Addresses
          </Text>
          <TouchableOpacity
            onPress={() => handleOpenModal(null)}
            className="flex-row items-center bg-[#034194] px-4 py-2 rounded-full"
          >
            <Ionicons name="add" size={18} color="white" />
            <Text className="text-white font-bold ml-1">Add New</Text>
          </TouchableOpacity>
        </View>

        {addresses.map((item) => (
          <View
            key={item.id}
            className="bg-white p-5 rounded-3xl mb-4 border border-gray-100 shadow-sm"
          >
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-row items-center">
                <View
                  className={`px-3 py-1 rounded-full ${item.label === "home" ? "bg-green-50" : "bg-blue-50"}`}
                >
                  <Text
                    className={`font-bold text-xs capitalize ${item.label === "home" ? "text-green-600" : "text-[#034194]"}`}
                  >
                    {item.label}
                  </Text>
                </View>
                {item.is_default && (
                  <View className="bg-amber-50 px-3 py-1 rounded-full ml-2">
                    <Text className="text-amber-600 font-bold text-xs">
                      Default
                    </Text>
                  </View>
                )}
              </View>

              <View className="flex-row space-x-2">
                <TouchableOpacity
                  onPress={() => handleOpenModal(item)}
                  className="p-1"
                >
                  <Ionicons name="create-outline" size={20} color="#4B5563" />
                </TouchableOpacity>
                {!item.is_default && (
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    className="p-1"
                  >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <Text className="text-gray-800 font-bold text-base mb-1">
              {item.recipient_name}
            </Text>
            <Text className="text-gray-500 font-medium text-sm mb-3">
              {item.recipient_number}
            </Text>
            <Text className="text-gray-600 text-sm leading-relaxed">
              {item.full_address ||
                `${item.unit_bldg_house}, ${item.street}, ${item.barangay}, ${item.city}, ${item.province ? item.province + ", " : ""}${item.region}, ${item.postal_code}`}
            </Text>

            {item.landmark && (
              <Text className="text-gray-400 text-xs mt-2 italic">
                Landmark: {item.landmark}
              </Text>
            )}

            {!item.is_default && (
              <TouchableOpacity
                onPress={() => handleSetDefault(item)}
                className="mt-4 border border-gray-200 py-2 rounded-xl items-center"
              >
                <Text className="text-gray-600 font-semibold text-xs">
                  Set as Default Address
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Input Modal for Add/Edit Form */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        // Lets our SafeAreaView below control insets instead of the OS
        // drawing the modal edge-to-edge under the nav bar.
        statusBarTranslucent={Platform.OS === "android"}
      >
        {/* edges=['top','bottom'] keeps content clear of the status bar
            AND the bottom nav bar / home indicator whenever this modal
            is open — this is what was causing the bottom gap/overlap. */}
        <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-white">
          <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-100">
            <Text className="text-xl font-bold text-gray-800">
              {editingAddressId ? "Edit Address" : "New Address"}
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              className="p-1"
            >
              <Ionicons name="close" size={26} color="#4B5563" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1 px-5 pt-4"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Label Type
            </Text>
            <View className="flex-row space-x-3 mb-4">
              {["home", "office"].map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setForm({ ...form, label: type })}
                  className={`flex-1 py-3 rounded-xl items-center border capitalize ${form.label === type ? "border-[#034194] bg-blue-50" : "border-gray-200"}`}
                >
                  <Text
                    className={`font-bold ${form.label === type ? "text-[#034194]" : "text-gray-500"}`}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Recipient Name
            </Text>
            <TextInput
              value={form.recipient_name}
              onChangeText={(t) => setForm({ ...form, recipient_name: t })}
              placeholder="e.g. Juan dela Cruz"
              className="border border-gray-200 p-4 rounded-2xl mb-4 text-gray-800 font-medium"
            />

            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Contact Number
            </Text>
            <TextInput
              value={form.recipient_number}
              onChangeText={(t) => setForm({ ...form, recipient_number: t })}
              placeholder="e.g. 09171234567"
              keyboardType="phone-pad"
              className="border border-gray-200 p-4 rounded-2xl mb-4 text-gray-800 font-medium"
            />

            {/* Region Selector */}
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Region
            </Text>
            <View className="border border-gray-200 rounded-2xl bg-white mb-4 overflow-hidden">
              <Picker
                selectedValue={form.region_code}
                onValueChange={(code) => {
                  const selectedRegion = regions.find((r) => r.code === code);
                  setForm({
                    ...form,
                    region_code: code,
                    region: selectedRegion ? selectedRegion.name : "",
                    province: "",
                    province_code: "",
                    city: "",
                    city_code: "",
                    barangay: "",
                    barangay_code: "",
                  });
                  setProvinces([]);
                  setCities([]);
                  setBarangays([]);
                  if (code) fetchProvinces(code);
                }}
              >
                <Picker.Item label="Select Region" value="" />
                {regions.map((r) => (
                  <Picker.Item key={r.code} label={r.name} value={r.code} />
                ))}
              </Picker>
            </View>

            {/* Province Selector */}
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Province (Optional)
            </Text>
            <View className="border border-gray-200 rounded-2xl bg-white mb-4 overflow-hidden">
              <Picker
                selectedValue={form.province_code}
                onValueChange={(code) => {
                  const selectedProvince = provinces.find(
                    (p) => p.code === code,
                  );
                  setForm({
                    ...form,
                    province_code: code || null,
                    province: selectedProvince ? selectedProvince.name : null,
                    city: "",
                    city_code: "",
                    barangay: "",
                    barangay_code: "",
                  });
                  setCities([]);
                  setBarangays([]);
                  if (code) {
                    fetchCities(code);
                  } else if (form.region_code) {
                    // Fallback for independent cities outside standard provinces (e.g., NCR districts)
                    fetchCities(form.region_code);
                  }
                }}
              >
                <Picker.Item label="Select Province" value="" />
                {provinces.map((p) => (
                  <Picker.Item key={p.code} label={p.name} value={p.code} />
                ))}
              </Picker>
            </View>

            {/* City Selector */}
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              City / Municipality
            </Text>
            <View className="border border-gray-200 rounded-2xl bg-white mb-4 overflow-hidden">
              <Picker
                selectedValue={form.city_code}
                onValueChange={(code) => {
                  const selectedCity = cities.find((c) => c.code === code);
                  setForm({
                    ...form,
                    city_code: code,
                    city: selectedCity ? selectedCity.name : "",
                    barangay: "",
                    barangay_code: "",
                  });
                  setBarangays([]);
                  if (code) fetchBarangays(code);
                }}
              >
                <Picker.Item label="Select City" value="" />
                {cities.map((c) => (
                  <Picker.Item key={c.code} label={c.name} value={c.code} />
                ))}
              </Picker>
            </View>

            {/* Barangay Selector */}
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Barangay
            </Text>
            <View className="border border-gray-200 rounded-2xl bg-white mb-4 overflow-hidden">
              <Picker
                selectedValue={form.barangay_code}
                onValueChange={(code) => {
                  const selectedBarangay = barangays.find(
                    (b) => b.code === code,
                  );
                  setForm({
                    ...form,
                    barangay_code: code,
                    barangay: selectedBarangay ? selectedBarangay.name : "",
                  });
                }}
              >
                <Picker.Item label="Select Barangay" value="" />
                {barangays.map((b) => (
                  <Picker.Item key={b.code} label={b.name} value={b.code} />
                ))}
              </Picker>
            </View>

            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Unit / Building / House No.
            </Text>
            <TextInput
              value={form.unit_bldg_house}
              onChangeText={(t) => setForm({ ...form, unit_bldg_house: t })}
              placeholder="e.g. Apt 4B, 2nd Flr, Blk 5"
              className="border border-gray-200 p-4 rounded-2xl mb-4 text-gray-800 font-medium"
            />

            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Street Name
            </Text>
            <TextInput
              value={form.street}
              onChangeText={(t) => setForm({ ...form, street: t })}
              placeholder="e.g. 123 Rizal Street"
              className="border border-gray-200 p-4 rounded-2xl mb-4 text-gray-800 font-medium"
            />

            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Postal Code
            </Text>
            <TextInput
              value={form.postal_code}
              onChangeText={(t) => setForm({ ...form, postal_code: t })}
              placeholder="e.g. 2009"
              keyboardType="number-pad"
              className="border border-gray-200 p-4 rounded-2xl mb-4 text-gray-800 font-medium"
            />

            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Landmark (Optional)
            </Text>
            <TextInput
              value={form.landmark}
              onChangeText={(t) => setForm({ ...form, landmark: t })}
              placeholder="e.g. Near Barangay Hall, Across Shell Station"
              className="border border-gray-200 p-4 rounded-2xl mb-4 text-gray-800 font-medium"
            />

            <View className="flex-row justify-between items-center py-4 border-t border-b border-gray-100 my-4">
              <View>
                <Text className="text-gray-800 font-bold text-sm">
                  Set as Default Address
                </Text>
                <Text className="text-gray-400 text-xs">
                  Makes this your primary transaction address
                </Text>
              </View>
              <Switch
                value={form.is_default}
                onValueChange={(v) => setForm({ ...form, is_default: v })}
                trackColor={{ false: "#E2E8F0", true: "#DBEAFE" }}
                thumbColor={form.is_default ? "#034194" : "#94A3B8"}
              />
            </View>
            <View className="h-10" />
          </ScrollView>

          {/* paddingBottom here is the actual fix: without insets.bottom,
              this bar either hugs the nav bar with no breathing room, or
              (on some Android devices with translucent nav) sits partly
              underneath it, leaving a dead gap above the real bottom edge. */}
          <View
            className="px-5 pt-5 bg-white border-t border-gray-100"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <TouchableOpacity
              onPress={handleSave}
              disabled={actionLoading}
              className="h-14 rounded-2xl justify-center items-center bg-[#034194]"
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-base">
                  Save Address
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </View>
  );
}

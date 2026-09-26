import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export interface PickerOption {
  label: string;
  value: string | number;
}

interface CustomPickerProps {
  label: string;
  options: PickerOption[];
  selectedValue: string | number;
  onValueChange: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  labelColor?: string;
}

export const CustomPicker = ({
  label,
  options,
  selectedValue,
  onValueChange,
  placeholder = "Select an option...",
  disabled = false,
  labelColor,
}: CustomPickerProps) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedItem = options.find(
    (item) => String(item.value) === String(selectedValue),
  );

  const handleSelect = (value: string | number) => {
    onValueChange(value);
    setModalVisible(false);
  };

  return (
    <View className="mb-5">
      <Text className="mb-1 font-semibold text-[10px] text-primary uppercase tracking-wider">
        {label}
      </Text>

      {/* Trigger Button */}
      <TouchableOpacity
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.7}
        disabled={disabled}
        className={`flex-row items-center justify-between bg-white rounded-2xl border border-slate-200 p-4 ${
          disabled ? "bg-slate-50 opacity-60" : ""
        }`}
      >
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          className={`flex-1 mr-2 text-base font-normal ${
            selectedItem ? "text-slate-800" : "text-slate-400"
          }`}
        >
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#94a3b8" />
      </TouchableOpacity>

      {/* Modal Dropdown */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View className="flex-1 bg-black/50 justify-center items-center px-5">
            <TouchableWithoutFeedback>
              <View className="bg-white w-full max-w-[500px] max-h-[60%] rounded-3xl p-5 shadow-xl">
                <View className="flex-row justify-between items-center pb-3 mb-2 border-b border-slate-100">
                  <Text className="text-slate-800 font-bold text-lg">
                    {label}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    className="p-1"
                  >
                    <Ionicons name="close" size={22} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={options}
                  keyExtractor={(item) => String(item.value)}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const isSelected =
                      String(item.value) === String(selectedValue);
                    return (
                      <TouchableOpacity
                        onPress={() => handleSelect(item.value)}
                        className={`p-4 rounded-xl my-1 flex-row justify-between items-center ${
                          isSelected ? "bg-primary/10" : "active:bg-slate-50"
                        }`}
                      >
                        <Text
                          className={`text-base ${
                            isSelected
                              ? "font-semibold text-primary"
                              : "text-slate-700 font-normal"
                          }`}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

import { Check } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import RenderHTML from "react-native-render-html";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // 1. Import safe area insets

interface AgreementModalProps {
  visible: boolean;
  title: string;
  description: string;
  onAccept: () => void;
  onCancel: () => void;
}

export function AgreementModal({
  visible,
  title,
  description,
  onAccept,
  onCancel,
}: AgreementModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [containerHeight, setContainerHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const insets = useSafeAreaInsets(); // 2. Get safe area inset values
  const { width: windowWidth } = useWindowDimensions();
  const responsiveWidth = windowWidth - 72;

  useEffect(() => {
    if (visible) {
      setHasScrolledToBottom(false);
      setContainerHeight(0);
      setContentHeight(0);
    }
  }, [visible]);

  useEffect(() => {
    if (containerHeight > 0 && contentHeight > 0) {
      if (contentHeight <= containerHeight + 5) {
        setHasScrolledToBottom(true);
      }
    }
  }, [containerHeight, contentHeight]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;

    const isAtBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;

    if (isAtBottom) {
      setHasScrolledToBottom(true);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onCancel}
    >
      <View className="flex-1 justify-end bg-black/30">
        {/* BACKDROP */}
        <Pressable
          className="absolute top-0 left-0 right-0 bottom-0"
          onPress={onCancel}
        />

        {/* MODAL CONTENT */}
        <View
          className="bg-white rounded-t-[32px] px-5 pt-3"
          style={{
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: -6,
            },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 20,
            maxHeight: "85%",
            // 3. Dynamically add the navigation bar height + base padding
            paddingBottom: Math.max(insets.bottom, 16) + 16,
          }}
        >
          {/* HANDLE */}
          <View className="items-center mb-5">
            <View className="w-12 h-1.5 rounded-full bg-slate-300" />
          </View>

          {/* TITLE */}
          <Text className="text-[22px] font-bold text-slate-900 mb-4">
            {title}
          </Text>

          {/* NOTICE */}
          {!hasScrolledToBottom && (
            <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4">
              <Text className="text-center text-amber-700 text-sm font-medium">
                Please scroll to the bottom before accepting.
              </Text>
            </View>
          )}

          {/* DOCUMENT CONTAINER */}
          <View
            className="bg-slate-50 border border-slate-100 rounded-3xl overflow-hidden mb-4"
            style={{
              height: 400,
            }}
            onLayout={(e) => {
              setContainerHeight(e.nativeEvent.layout.height);
            }}
          >
            <ScrollView
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              scrollEventThrottle={16}
              onScroll={handleScroll}
              onContentSizeChange={(w, h) => {
                setContentHeight(h);
              }}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingVertical: 16,
              }}
            >
              <RenderHTML
                contentWidth={responsiveWidth}
                source={{ html: description || "<p>No content available.</p>" }}
                enableExperimentalBRCollapsing={true}
                ignoredDomTags={["o:p", "font"]}
                classesStyles={{
                  bold: {
                    fontWeight: "700",
                    color: "#0f172a",
                  },
                }}
                tagsStyles={{
                  h4: {
                    marginTop: 12,
                    marginBottom: 12,
                    fontSize: 15,
                    lineHeight: 22,
                    fontWeight: "400",
                    color: "#475569",
                  },
                  b: {
                    fontWeight: "700",
                    color: "#0f172a",
                  },
                  strong: {
                    fontWeight: "700",
                    color: "#0f172a",
                  },
                  span: {
                    fontSize: 15,
                    color: "#475569",
                  },
                  p: {
                    fontSize: 15,
                    lineHeight: 22,
                    color: "#475569",
                    marginBottom: 8,
                  },
                }}
              />

              {!hasScrolledToBottom && <View style={{ height: 50 }} />}
            </ScrollView>
          </View>

          {/* ACTION BUTTONS */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onCancel}
              className="flex-1 h-14 border border-slate-200 rounded-2xl justify-center items-center bg-white"
            >
              <Text className="font-semibold text-slate-700">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={!hasScrolledToBottom}
              onPress={onAccept}
              className={`flex-1 h-14 rounded-2xl justify-center items-center flex-row ${
                hasScrolledToBottom ? "bg-primary" : "bg-slate-300"
              }`}
              style={{
                opacity: hasScrolledToBottom ? 1 : 0.7,
              }}
            >
              <Check size={18} color="white" />
              <Text className="text-white font-bold ml-2">Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

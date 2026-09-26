import {
  fetchOrderForRatingAPI,
  MediaFile,
  submitOrderRatingAPI,
} from "@/services/order";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ItemRatingState {
  order_item_id: number;
  product_name: string;
  product_image: string | null;
  variant_name: string | null;
  rating: number;
  comment: string;
  is_anonymous: boolean;
  video: MediaFile | null;
  images: MediaFile[];
}

const MAX_VIDEO_DURATION_SEC = 60; // 1 minute limit
const MAX_VIDEO_SIZE_MB = 100; // 100 MB limit

// --- VIDEO PREVIEW COMPONENT ---
function LocalVideoPreview({
  videoUri,
  onRemove,
  disabled,
}: {
  videoUri: string;
  onRemove: () => void;
  disabled: boolean;
}) {
  const player = useVideoPlayer(videoUri, (player) => {
    player.loop = false;
  });

  return (
    <View className="w-full h-48 bg-black rounded-xl overflow-hidden relative my-2">
      <VideoView
        style={{ width: "100%", height: "100%" }}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
      />
      {!disabled && (
        <TouchableOpacity
          onPress={onRemove}
          className="absolute top-2 right-2 bg-red-500 rounded-full p-1 z-10"
        >
          <Ionicons name="close" size={16} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function RatingProductsScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  // Used so the footer submit bar clears the phone's bottom nav bar /
  // home indicator instead of sitting flush against (or under) it.
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [storeName, setStoreName] = useState<string>("");
  const [itemRatings, setItemRatings] = useState<ItemRatingState[]>([]);

  useEffect(() => {
    if (orderId) {
      loadRatingData();
    }
  }, [orderId]);

  const loadRatingData = async () => {
    try {
      setIsLoading(true);
      const res = await fetchOrderForRatingAPI(orderId!);

      if (res.success && res.data?.order) {
        setStoreName(res.data.order.store?.name || "Store");
        const initialStates: ItemRatingState[] = res.data.order.items.map(
          (item) => ({
            order_item_id: item.id,
            product_name: item.product_name,
            product_image: item.product_image,
            variant_name: item.variant_name,
            rating: item.review?.rating ?? 5,
            comment: item.review?.comment ?? "",
            is_anonymous: item.review?.is_anonymous ?? false,
            video: null,
            images: [],
          }),
        );
        setItemRatings(initialStates);
      } else {
        Alert.alert(
          "Not Available",
          res.message || "This order can no longer be rated.",
          [{ text: "OK", onPress: () => router.back() }],
        );
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const serverMessage = err?.response?.data?.message;

      if (status === 409) {
        Alert.alert(
          "Already Rated",
          serverMessage ||
            "You have already submitted a review for this order.",
          [{ text: "OK", onPress: () => router.back() }],
        );
      } else {
        Alert.alert(
          "Error",
          serverMessage || "Failed to load order for rating.",
          [{ text: "OK", onPress: () => router.back() }],
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateItemState = (
    index: number,
    field: keyof ItemRatingState,
    value: any,
  ) => {
    if (isSubmitting) return;
    setItemRatings((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const pickImages = async (index: number) => {
    if (isSubmitting) return;

    const currentImages = itemRatings[index].images;
    if (currentImages.length >= 5) {
      Alert.alert("Limit Reached", "You can upload up to 5 images per item.");
      return;
    }

    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Permission required",
        "Permission to access photo library is required!",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? "images",
      allowsMultipleSelection: true,
      selectionLimit: 5 - currentImages.length,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newMediaFiles: MediaFile[] = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.fileName || `image_${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      }));
      updateItemState(index, "images", [...currentImages, ...newMediaFiles]);
    }
  };

  const pickVideo = async (index: number) => {
    if (isSubmitting) return;

    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Permission required",
        "Permission to access video library is required!",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Videos ?? "videos",
      allowsEditing: true,
      videoMaxDuration: MAX_VIDEO_DURATION_SEC,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];

      if (asset.duration && asset.duration > MAX_VIDEO_DURATION_SEC * 1000) {
        Alert.alert(
          "Video Too Long",
          `Please select a video that is ${MAX_VIDEO_DURATION_SEC} seconds or shorter.`,
        );
        return;
      }

      if (asset.fileSize && asset.fileSize > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
        Alert.alert(
          "Video Too Large",
          `The video file size must be under ${MAX_VIDEO_SIZE_MB}MB.`,
        );
        return;
      }

      const videoFile: MediaFile = {
        uri: asset.uri,
        name: asset.fileName || `video_${Date.now()}.mp4`,
        type: asset.mimeType || "video/mp4",
      };
      updateItemState(index, "video", videoFile);
    }
  };

  const removeImage = (itemIndex: number, imgIdx: number) => {
    if (isSubmitting) return;
    const updatedImages = itemRatings[itemIndex].images.filter(
      (_, idx) => idx !== imgIdx,
    );
    updateItemState(itemIndex, "images", updatedImages);
  };

  const removeVideo = (itemIndex: number) => {
    if (isSubmitting) return;
    updateItemState(itemIndex, "video", null);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const payload = itemRatings.map((item) => ({
        order_item_id: item.order_item_id,
        rating: item.rating,
        comment: item.comment,
        is_anonymous: item.is_anonymous,
        video: item.video,
        images: item.images,
      }));

      const res = await submitOrderRatingAPI(orderId!, payload);

      if (res.success) {
        Alert.alert("Thank You!", res.message || "Feedback submitted!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert(
          "Submission Error",
          res.message || "Failed to submit reviews.",
        );
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;

      if (status === 422 && data?.errors) {
        const errorMessages: string[] = [];

        Object.keys(data.errors).forEach((key) => {
          const fieldMsg = data.errors[key]?.[0];
          if (!fieldMsg) return;

          const match = key.match(/^items\.(\d+)\.(.+)$/);
          if (match) {
            const itemNum = parseInt(match[1], 10) + 1;
            const fieldName = match[2].replace("_", " ");
            errorMessages.push(`Item #${itemNum} (${fieldName}): ${fieldMsg}`);
          } else {
            errorMessages.push(fieldMsg);
          }
        });

        Alert.alert(
          "Validation Error",
          errorMessages.join("\n") ||
            data.message ||
            "Please check your entry.",
        );
      } else if (status === 409) {
        Alert.alert(
          "Already Rated",
          data?.message ||
            "You have already submitted a review for this order.",
          [{ text: "OK", onPress: () => router.back() }],
        );
      } else if (status === 401 || status === 403) {
        Alert.alert(
          "Unauthorized",
          data?.message || "You cannot rate this order.",
        );
      } else {
        Alert.alert(
          "Submission Error",
          data?.message ||
            "Something went wrong while submitting your review. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-100">
        <ActivityIndicator size="large" color="#034194" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-100">
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        <View className="pt-4">
          {itemRatings.map((item, index) => (
            <View
              key={item.order_item_id}
              className="bg-white rounded-2xl p-4 mb-4 border border-slate-200 shadow-sm"
            >
              {/* PRODUCT SUMMARY */}
              <View className="flex-row items-center pb-3 mb-3 border-b border-slate-100">
                {item.product_image ? (
                  <Image
                    source={{ uri: item.product_image }}
                    className="w-14 h-14 rounded-lg bg-slate-200"
                  />
                ) : (
                  <View className="w-14 h-14 rounded-lg bg-slate-200 justify-center items-center">
                    <Ionicons name="image-outline" size={24} color="#94a3b8" />
                  </View>
                )}

                <View className="ml-3 flex-1">
                  <Text
                    numberOfLines={1}
                    className="font-semibold text-slate-800 text-sm"
                  >
                    {item.product_name}
                  </Text>
                  {item.variant_name ? (
                    <Text className="text-xs text-slate-400 mt-0.5">
                      {item.variant_name}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* STAR RATING PICKER */}
              <View className="items-center my-2">
                <Text className="text-xs font-semibold text-slate-500 mb-2">
                  Overall Quality
                </Text>
                <View className="flex-row gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      disabled={isSubmitting}
                      onPress={() => updateItemState(index, "rating", star)}
                    >
                      <Ionicons
                        name={star <= item.rating ? "star" : "star-outline"}
                        size={32}
                        color={star <= item.rating ? "#eab308" : "#94a3b8"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* COMMENT INPUT */}
              <View className="mt-4">
                <TextInput
                  editable={!isSubmitting}
                  multiline
                  numberOfLines={4}
                  placeholder="Share your thoughts about this product..."
                  value={item.comment}
                  onChangeText={(text) =>
                    updateItemState(index, "comment", text)
                  }
                  className={`bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 min-h-[90px] ${
                    isSubmitting ? "opacity-50" : ""
                  }`}
                  textAlignVertical="top"
                />
              </View>

              {/* MEDIA UPLOAD SECTION */}
              <View className="mt-4">
                <Text className="text-xs font-semibold text-slate-600 mb-2">
                  Add Photo / Video (Max 100mb)
                </Text>

                {/* VIDEO PLAYER PREVIEW */}
                {item.video && (
                  <LocalVideoPreview
                    videoUri={item.video.uri}
                    onRemove={() => removeVideo(index)}
                    disabled={isSubmitting}
                  />
                )}

                {/* PHOTOS LIST & UPLOAD BUTTONS */}
                <View className="flex-row flex-wrap gap-2 items-center mt-1">
                  {item.images.map((img, imgIdx) => (
                    <View key={imgIdx} className="w-20 h-20 relative">
                      <Image
                        source={{ uri: img.uri }}
                        className="w-full h-full rounded-xl bg-slate-200"
                      />
                      {!isSubmitting && (
                        <TouchableOpacity
                          onPress={() => removeImage(index, imgIdx)}
                          className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5"
                        >
                          <Ionicons name="close" size={14} color="#fff" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  {item.images.length < 5 && (
                    <TouchableOpacity
                      disabled={isSubmitting}
                      onPress={() => pickImages(index)}
                      className={`w-20 h-20 border-2 border-dashed border-slate-300 rounded-xl justify-center items-center bg-slate-50 ${
                        isSubmitting ? "opacity-50" : ""
                      }`}
                    >
                      <Ionicons
                        name="camera-outline"
                        size={22}
                        color="#64748b"
                      />
                      <Text className="text-[10px] text-slate-500 mt-1">
                        + Photo
                      </Text>
                    </TouchableOpacity>
                  )}

                  {!item.video && (
                    <TouchableOpacity
                      disabled={isSubmitting}
                      onPress={() => pickVideo(index)}
                      className={`w-20 h-20 border-2 border-dashed border-slate-300 rounded-xl justify-center items-center bg-slate-50 ${
                        isSubmitting ? "opacity-50" : ""
                      }`}
                    >
                      <Ionicons
                        name="videocam-outline"
                        size={22}
                        color="#64748b"
                      />
                      <Text className="text-[10px] text-slate-500 mt-1">
                        + Video
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* ANONYMOUS TOGGLE */}
              <View className="flex-row justify-between items-center mt-4 pt-3 border-t border-slate-100">
                <View className="flex-row items-center">
                  <Ionicons name="eye-off-outline" size={18} color="#64748b" />
                  <Text className="text-xs text-slate-600 font-medium ml-2">
                    Submit Anonymously
                  </Text>
                </View>
                <Switch
                  disabled={isSubmitting}
                  value={item.is_anonymous}
                  onValueChange={(val) =>
                    updateItemState(index, "is_anonymous", val)
                  }
                  trackColor={{ false: "#cbd5e1", true: "#034194" }}
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* FOOTER SUBMIT BUTTON — paddingBottom uses the device's safe-area
          inset so the button always clears the gesture/nav bar or home
          indicator instead of sitting flush against (or under) it. */}
      <View
        className="px-4 pt-4 bg-white border-t border-slate-200"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <TouchableOpacity
          disabled={isSubmitting}
          onPress={handleSubmit}
          className={`py-3.5 rounded-xl justify-center items-center flex-row ${
            isSubmitting ? "bg-slate-400" : "bg-[#034194]"
          }`}
        >
          {isSubmitting && (
            <ActivityIndicator size="small" color="#fff" className="mr-2" />
          )}
          <Text className="text-white font-bold text-base">
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

import { CustomAlert } from "@/components/CustomAlert";
import {
  fetchOrderForRatingAPI,
  MediaFile,
  submitOrderRatingAPI,
} from "@/services/order";
import { Ionicons } from "@expo/vector-icons";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
  cooperative_scope: "local" | "national" | null;
  rating: number;
  comment: string;
  is_anonymous: boolean;
  video: MediaFile | null;
  images: MediaFile[];
}

interface CompressionState {
  index: number;
  progress: number; // 0 - 1
  kind: "image" | "video";
}

const MAX_VIDEO_DURATION_SEC = 30;
const MAX_VIDEO_SIZE_MB = 50;
const MAX_IMAGE_SIDE_PX = 1280;
const IMAGE_QUALITY = 0.7;

// LOCAL / NATIONAL BADGE LOOK
const SCOPE_BADGE = {
  local: {
    label: "Local",
    icon: "location" as const,
    bg: "bg-emerald-600",
  },
  national: {
    label: "National",
    icon: "globe" as const,
    bg: "bg-[#3E4093]",
  },
};

// --- IMAGE COMPRESSION HELPER (uses expo-image-manipulator) ---
// Resizes so the longest side is at most MAX_IMAGE_SIDE_PX (never upscales)
// and re-encodes as JPEG. If anything fails we fall back to the original
// file, so picking photos never breaks.
const compressImage = async (
  uri: string,
  width?: number,
  height?: number,
): Promise<string> => {
  try {
    const context = ImageManipulator.manipulate(uri);

    if (width && height && Math.max(width, height) > MAX_IMAGE_SIDE_PX) {
      if (width >= height) {
        context.resize({ width: MAX_IMAGE_SIDE_PX });
      } else {
        context.resize({ height: MAX_IMAGE_SIDE_PX });
      }
    }

    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({
      compress: IMAGE_QUALITY,
      format: SaveFormat.JPEG,
    });

    return result.uri;
  } catch (error) {
    console.log("[IMAGE_COMPRESS_ERROR]:", error);
    return uri;
  }
};

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
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [compression, setCompression] = useState<CompressionState | null>(null);
  const [storeName, setStoreName] = useState<string>("");
  const [itemRatings, setItemRatings] = useState<ItemRatingState[]>([]);

  // --- CUSTOM ALERT STATE ---
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
  });

  const showAlert = (
    title: string,
    message: string,
    onConfirm?: () => void,
    confirmText = "OK",
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      onConfirm,
      confirmText,
    });
  };

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  const isCompressing = compression !== null;
  const isBusy = isSubmitting || isCompressing;

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
            cooperative_scope: item.cooperative_scope ?? null,
            rating: item.review?.rating ?? 5,
            comment: item.review?.comment ?? "",
            is_anonymous: item.review?.is_anonymous ?? false,
            video: null,
            images: [],
          }),
        );
        setItemRatings(initialStates);
      } else {
        showAlert(
          "Not Available",
          res.message || "This order can no longer be rated.",
          () => {
            hideAlert();
            router.back();
          },
        );
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const serverMessage = err?.response?.data?.message;

      if (status === 409) {
        showAlert(
          "Already Rated",
          serverMessage ||
            "You have already submitted a review for this order.",
          () => {
            hideAlert();
            router.back();
          },
        );
      } else {
        showAlert(
          "Error",
          serverMessage || "Failed to load order for rating.",
          () => {
            hideAlert();
            router.back();
          },
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
    if (isBusy) return;

    const currentImages = itemRatings[index].images;
    if (currentImages.length >= 5) {
      showAlert("Limit Reached", "You can upload up to 5 images per item.");
      return;
    }

    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      showAlert(
        "Permission required",
        "Permission to access photo library is required!",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? "images",
      allowsMultipleSelection: true,
      selectionLimit: 5 - currentImages.length,
      // Keep the original quality here; the compression step below does the resizing
      quality: 1,
    });

    if (result.canceled || result.assets.length === 0) return;

    try {
      setCompression({ index, progress: 0, kind: "image" });

      const compressedFiles: MediaFile[] = [];
      for (let i = 0; i < result.assets.length; i++) {
        const asset = result.assets[i];
        const compressedUri = await compressImage(
          asset.uri,
          asset.width,
          asset.height,
        );

        compressedFiles.push({
          uri: compressedUri,
          name: `image_${Date.now()}_${i}.jpg`,
          type: "image/jpeg",
        });

        setCompression({
          index,
          progress: (i + 1) / result.assets.length,
          kind: "image",
        });
      }

      setItemRatings((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          images: [...updated[index].images, ...compressedFiles].slice(0, 5),
        };
        return updated;
      });
    } finally {
      setCompression(null);
    }
  };

  const pickVideo = async (index: number) => {
    if (isBusy) return;

    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      showAlert(
        "Permission required",
        "Permission to access video library is required!",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Videos ?? "videos",
      allowsEditing: true,
      videoMaxDuration: MAX_VIDEO_DURATION_SEC,
      // iOS only: re-encodes the video at a smaller size. Ignored on Android.
      videoExportPreset: ImagePicker.VideoExportPreset.MediumQuality,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];

      if (asset.duration && asset.duration > MAX_VIDEO_DURATION_SEC * 1000) {
        showAlert(
          "Video Too Long",
          `Please select a video that is ${MAX_VIDEO_DURATION_SEC} seconds or shorter.`,
        );
        return;
      }

      if (asset.fileSize && asset.fileSize > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
        showAlert(
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
    if (isBusy) return;
    const updatedImages = itemRatings[itemIndex].images.filter(
      (_, idx) => idx !== imgIdx,
    );
    updateItemState(itemIndex, "images", updatedImages);
  };

  const removeVideo = (itemIndex: number) => {
    if (isBusy) return;
    updateItemState(itemIndex, "video", null);
  };

  const handleSubmit = async () => {
    if (isBusy) return;

    try {
      setIsSubmitting(true);
      setUploadProgress(0);

      const payload = itemRatings.map((item) => ({
        order_item_id: item.order_item_id,
        rating: item.rating,
        comment: item.comment,
        is_anonymous: item.is_anonymous,
        video: item.video,
        images: item.images,
      }));

      const res = await submitOrderRatingAPI(
        orderId!,
        payload,
        setUploadProgress,
      );

      if (res.success) {
        showAlert("Thank You!", res.message || "Feedback submitted!", () => {
          hideAlert();
          router.back();
        });
      } else {
        showAlert(
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

        showAlert(
          "Validation Error",
          errorMessages.join("\n") ||
            data.message ||
            "Please check your entry.",
        );
      } else if (status === 409) {
        showAlert(
          "Already Rated",
          data?.message ||
            "You have already submitted a review for this order.",
          () => {
            hideAlert();
            router.back();
          },
        );
      } else if (status === 401 || status === 403) {
        showAlert(
          "Unauthorized",
          data?.message || "You cannot rate this order.",
        );
      } else {
        showAlert(
          "Submission Error",
          data?.message ||
            "Something went wrong while submitting your review. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const submitLabel = isCompressing
    ? "Preparing media..."
    : isSubmitting
      ? uploadProgress > 0 && uploadProgress < 100
        ? `Uploading ${uploadProgress}%`
        : "Submitting..."
      : "Submit Review";

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-100">
        <ActivityIndicator size="large" color="#3E4093" />
        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          onClose={hideAlert}
          onConfirm={alertConfig.onConfirm}
          confirmText={alertConfig.confirmText}
        />
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
          {itemRatings.map((item, index) => {
            const badge = item.cooperative_scope
              ? SCOPE_BADGE[item.cooperative_scope]
              : null;

            const itemCompression =
              compression && compression.index === index ? compression : null;

            return (
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
                      <Ionicons
                        name="image-outline"
                        size={24}
                        color="#94a3b8"
                      />
                    </View>
                  )}

                  <View className="ml-3 flex-1">
                    {/* LOCAL / NATIONAL LABEL */}
                    {badge && (
                      <View
                        className={`self-start flex-row items-center px-2 py-0.5 rounded-full mb-1 ${badge.bg}`}
                      >
                        <Ionicons name={badge.icon} size={9} color="#ffffff" />
                        <Text className="text-white text-[9px] font-bold ml-1">
                          {badge.label}
                        </Text>
                      </View>
                    )}

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
                    Add Photo / Video (Video max 30 seconds, 50MB)
                  </Text>

                  {/* PHOTO COMPRESSION PROGRESS */}
                  {itemCompression && (
                    <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 mb-2">
                      <ActivityIndicator size="small" color="#3E4093" />
                      <Text className="ml-2 text-xs text-slate-600 font-medium">
                        Compressing photos...{" "}
                        {Math.round(itemCompression.progress * 100)}%
                      </Text>
                    </View>
                  )}

                  {/* VIDEO PLAYER PREVIEW */}
                  {item.video && (
                    <LocalVideoPreview
                      videoUri={item.video.uri}
                      onRemove={() => removeVideo(index)}
                      disabled={isBusy}
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
                        {!isBusy && (
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
                        disabled={isBusy}
                        onPress={() => pickImages(index)}
                        className={`w-20 h-20 border-2 border-dashed border-slate-300 rounded-xl justify-center items-center bg-slate-50 ${
                          isBusy ? "opacity-50" : ""
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
                        disabled={isBusy}
                        onPress={() => pickVideo(index)}
                        className={`w-20 h-20 border-2 border-dashed border-slate-300 rounded-xl justify-center items-center bg-slate-50 ${
                          isBusy ? "opacity-50" : ""
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
                    <Ionicons
                      name="eye-off-outline"
                      size={18}
                      color="#64748b"
                    />
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
                    trackColor={{ false: "#cbd5e1", true: "#3E4093" }}
                  />
                </View>
              </View>
            );
          })}
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
          disabled={isBusy}
          onPress={handleSubmit}
          className={`py-3.5 rounded-xl justify-center items-center flex-row ${
            isBusy ? "bg-slate-400" : "bg-primary"
          }`}
        >
          {isBusy && (
            <ActivityIndicator size="small" color="#fff" className="mr-2" />
          )}
          <Text className="text-white font-bold text-base">{submitLabel}</Text>
        </TouchableOpacity>
      </View>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => {
          hideAlert();
          alertConfig.onConfirm?.();
        }}
        confirmText={alertConfig.confirmText}
      />
    </View>
  );
}

import { CustomAlert } from "@/components/CustomAlert";
import { profileService } from "@/services/profileService";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const MAX_RAW_MB = 20;
const MAX_RAW_BYTES = MAX_RAW_MB * 1024 * 1024;

const FRAME_SIZE = Math.min(Dimensions.get("window").width - 80, 300);

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

export default function ProfileScreen() {
  const router = useRouter();

  const { clearAuth, user, setUser } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [deletingAvatar, setDeletingAvatar] = useState(false);

  const [loggingOut, setLoggingOut] = useState(false);

  const [showOptions, setShowOptions] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  const [rawImage, setRawImage] = useState<{
    uri: string;
    width: number;
    height: number;
  } | null>(null);

  const [showCropModal, setShowCropModal] = useState(false);

  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const [deleteAvatarConfirm, setDeleteAvatarConfirm] = useState(false);

  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const [avatarAlert, setAvatarAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const userTypeName = user?.user_type?.name?.toUpperCase() || "";
  const statusName = user?.status?.name?.toLowerCase() || "";

  const isBasic = userTypeName === "BASIC";
  const isMember = userTypeName === "MEMBER";

  const isActive = statusName === "active";
  const isRejected = statusName === "rejected";
  const isApproved = statusName === "approved";
  const isForApproval = statusName === "for_approval";

  const fetchProfile = async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }

    try {
      const data = await profileService.getProfile();

      setUser(data);
    } catch (error: any) {
      console.error("Profile Fetch Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (rawImage) {
      setShowCropModal(true);
    }
  }, [rawImage]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfile(true);
  }, []);

  /**
   * Open camera or gallery.
   */
  const openImageSource = async (source: "library" | "camera") => {
    setShowOptions(false);

    const permission =
      source === "library"
        ? await ImagePicker.requestMediaLibraryPermissionsAsync()
        : await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setAvatarAlert({
        visible: true,
        title: "Permission Needed",
        message:
          source === "library"
            ? "Please allow photo library access to change your avatar."
            : "Please allow camera access to take a photo.",
      });

      return;
    }

    const pickerOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    };

    const result =
      source === "library"
        ? await ImagePicker.launchImageLibraryAsync(pickerOptions)
        : await ImagePicker.launchCameraAsync(pickerOptions);

    if (result.canceled) {
      return;
    }

    const asset = result.assets?.[0];

    if (!asset) {
      return;
    }

    if (asset.fileSize && asset.fileSize > MAX_RAW_BYTES) {
      setAvatarAlert({
        visible: true,
        title: "File Too Large",
        message: `Please choose an image under ${MAX_RAW_MB}MB.`,
      });

      return;
    }

    setRawImage({
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
    });
  };

  /**
   * Crop completed.
   */
  const handleCropped = (croppedUri: string) => {
    setShowCropModal(false);
    setRawImage(null);

    setPreviewUri(croppedUri);
    setShowReviewModal(true);
  };

  /**
   * Cancel crop.
   */
  const handleCropCancel = () => {
    setShowCropModal(false);
    setRawImage(null);
  };

  /**
   * Upload the cropped avatar.
   */
  const confirmAndUpload = async () => {
    if (!previewUri) {
      return;
    }

    try {
      setShowReviewModal(false);

      setUploading(true);
      setUploadProgress(0);

      const compressed = await ImageManipulator.manipulateAsync(
        previewUri,
        [
          {
            resize: {
              width: 1024,
              height: 1024,
            },
          },
        ],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );

      const response = await profileService.updateAvatar(
        {
          uri: compressed.uri,
          name: "avatar.jpg",
          type: "image/jpeg",
        },
        (percent) => {
          setUploadProgress(percent);
        },
      );

      if (response.success) {
        setUser({
          ...(user || {}),
          avatar: response.data.avatar,
        });

        setAvatarAlert({
          visible: true,
          title: "Success",
          message: "Profile picture updated!",
        });
      }
    } catch (error: any) {
      const serverMessage =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.avatar?.[0];

      setAvatarAlert({
        visible: true,
        title: "Upload Failed",
        message: serverMessage || "Something went wrong. Please try again.",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setPreviewUri(null);
    }
  };

  /**
   * Open profile photo options.
   *
   * IMPORTANT:
   * This no longer checks if avatar exists.
   * Even when avatar is null, the options modal opens.
   */
  const handleAvatarPress = () => {
    setShowOptions(true);
  };

  /**
   * Ask for confirmation before deleting avatar.
   */
  const handleDeleteAvatar = () => {
    setShowOptions(false);
    setDeleteAvatarConfirm(true);
  };

  /**
   * Delete avatar.
   */
  const confirmDeleteAvatar = async () => {
    try {
      setDeleteAvatarConfirm(false);

      setDeletingAvatar(true);

      const response = await profileService.deleteAvatar();

      if (response.success) {
        setUser({
          ...(user || {}),
          avatar: null,
        });

        setAvatarAlert({
          visible: true,
          title: "Success",
          message: "Profile picture removed successfully.",
        });
      }
    } catch (error: any) {
      console.error("Delete avatar error:", error?.response?.data || error);

      const serverMessage =
        error?.response?.data?.message ||
        "Could not remove your profile picture. Please try again.";

      setAvatarAlert({
        visible: true,
        title: "Delete Failed",
        message: serverMessage,
      });
    } finally {
      setDeletingAvatar(false);
    }
  };

  /**
   * Logout confirmation.
   */
  const handleLogout = () => {
    setAlert({
      visible: true,
      title: "Logout",
      message: "Are you sure you want to log out?",
    });
  };

  /**
   * Logout.
   */
  const confirmLogout = async () => {
    try {
      setAlert({
        ...alert,
        visible: false,
      });

      setLoggingOut(true);

      await clearAuth();

      router.replace("/login");
    } catch (error) {
      setLoggingOut(false);

      Alert.alert("Error", "Logout failed. Please try again.");
    }
  };

  const getStatusColor = (statusName: string) => {
    const status = statusName?.toLowerCase() || "";

    if (status.includes("pending")) {
      return "text-[#C6890F] bg-orange-50";
    }

    if (status.includes("active") || status.includes("approved")) {
      return "text-green-500 bg-green-50";
    }

    return "text-gray-500 bg-gray-50";
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#034194" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#034194"]}
          tintColor="#034194"
        />
      }
    >
      {/* LOGOUT ALERT */}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={() =>
          setAlert({
            ...alert,
            visible: false,
          })
        }
        onConfirm={confirmLogout}
      />

      {/* AVATAR ALERT */}
      <CustomAlert
        visible={avatarAlert.visible}
        title={avatarAlert.title}
        message={avatarAlert.message}
        onClose={() =>
          setAvatarAlert({
            ...avatarAlert,
            visible: false,
          })
        }
      />

      {/* DELETE AVATAR CONFIRMATION */}
      <CustomAlert
        visible={deleteAvatarConfirm}
        title="Delete Profile Photo"
        message="Are you sure you want to remove your profile photo?"
        onClose={() => setDeleteAvatarConfirm(false)}
        onConfirm={confirmDeleteAvatar}
        confirmText="Delete"
      />

      {/* PROFILE HEADER */}
      <View className="bg-white px-8 py-12 items-center shadow-sm border-b border-gray-100">
        <TouchableOpacity
          onPress={handleAvatarPress}
          activeOpacity={0.8}
          className="relative"
        >
          <View className="w-24 h-24 rounded-full bg-blue items-center justify-center border-4 border-[#03419420] overflow-hidden">
            {uploading ? (
              <View className="items-center">
                <ActivityIndicator color="#034194" />

                <Text className="text-[10px] text-[#034194] font-bold mt-1">
                  {uploadProgress}%
                </Text>
              </View>
            ) : user?.avatar ? (
              <Image
                source={{
                  uri: user.avatar,
                }}
                className="w-full h-full"
              />
            ) : (
              <Ionicons name="person" size={50} color="#034194" />
            )}
          </View>

          <View className="absolute bottom-0 right-0 bg-[#034194] p-1.5 rounded-full border-2 border-white shadow-sm">
            <Ionicons name="camera" size={14} color="white" />
          </View>
        </TouchableOpacity>

        <Text className="text-2xl font-bold mt-4 text-[#034194]">
          {user?.name || "Member"}
        </Text>

        <View
          className={`mt-2 px-4 py-1 rounded-full ${getStatusColor(
            user?.status?.name,
          )}`}
        >
          <Text className="font-bold text-xs uppercase tracking-tighter">
            {user?.user_type?.name || "Basic"} • Account
          </Text>
        </View>
      </View>

      {/* BASIC ACTIVE */}
      {isBasic && isActive && (
        <View className="mt-6 px-4">
          <View className="bg-orange-50 border border-orange-200 p-5 rounded-[30px]">
            <View className="flex-row items-center">
              <View className="bg-[#C6890F] p-2 rounded-full">
                <Ionicons name="warning" size={20} color="white" />
              </View>

              <View className="flex-1 ml-4">
                <Text className="text-[#C6890F] font-bold text-lg">
                  Complete Your Profile
                </Text>
              </View>
            </View>

            <Text className="text-[#C6890F] text-sm mt-2 leading-5">
              To upgrade to Member status and unlock all features, please
              provide your information, address, and a valid ID.
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/(main-profile)/setupProfile")}
              className="bg-[#C6890F] mt-4 py-3 rounded-2xl items-center flex-row justify-center"
            >
              <Text className="text-white font-bold text-base mr-2">
                Complete Now
              </Text>

              <Ionicons name="arrow-forward" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* FOR APPROVAL */}
      {isBasic && isForApproval && (
        <View className="mt-6 px-4">
          <View className="bg-blue border border-primary p-5 rounded-[30px]">
            <View className="flex-row items-center">
              <View className="bg-primary p-2 rounded-full">
                <Ionicons name="time" size={20} color="white" />
              </View>

              <View className="flex-1 ml-4">
                <Text className="text-primary font-bold text-lg">
                  Review in Progress
                </Text>
              </View>
            </View>

            <Text className="text-primary text-sm mt-2 leading-5">
              Your account details have been completed. Please wait 2-3 days for
              approval. Updates will be sent to your email.
            </Text>
          </View>
        </View>
      )}

      {/* APPROVED */}
      {isBasic && isApproved && (
        <View className="mt-6 px-4">
          <View className="bg-green-50 border border-green-200 p-5 rounded-[30px]">
            <View className="flex-row items-center">
              <View className="bg-green-600 p-2 rounded-full">
                <MaterialIcons
                  name="account-balance-wallet"
                  size={20}
                  color="white"
                />
              </View>

              <View className="flex-1 ml-4">
                <Text className="text-green-800 font-bold text-lg">
                  Capital Contribution
                </Text>
              </View>
            </View>

            <Text className="text-green-700 text-sm mt-2 leading-5">
              To access other features, you need to contribute to the initial
              share capital. You can choose{" "}
              <Text className="font-bold">installment</Text> or{" "}
              <Text className="font-bold">full payment</Text> now.
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/profile/membership")}
              className="bg-green-600 mt-4 py-3 rounded-2xl items-center flex-row justify-center"
            >
              <Text className="text-white font-bold text-base mr-2">
                Pay Contribution
              </Text>

              <Ionicons name="card-outline" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* REJECTED */}
      {isBasic && isRejected && (
        <View className="mt-6 px-4">
          <View className="bg-red-50 border border-[#D70127] p-5 rounded-[30px]">
            <View className="flex-row items-center">
              <View className="bg-[#D70127] p-2 rounded-full">
                <Ionicons name="close-circle" size={20} color="white" />
              </View>

              <View className="flex-1 ml-4">
                <Text className="text-[#D70127] font-bold text-lg">
                  Application Rejected
                </Text>
              </View>
            </View>

            <Text className="text-[#D70127] text-sm mt-2 leading-5">
              Your profile submission was not approved. Please chat with our
              support team to find out why and how to proceed.
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/(intellectual-chat)/")}
              className="bg-[#D70127] mt-4 py-3 rounded-2xl items-center flex-row justify-center"
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color="white"
                style={{
                  marginRight: 8,
                }}
              />

              <Text className="text-white font-bold text-base">
                Chat with Support
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* MENU ITEMS */}
      <View className="mt-6 px-4">
        {((isBasic && isForApproval) ||
          (isBasic && isApproved) ||
          (isMember && isActive)) && (
          <View>
            {/* ACCOUNT SETTINGS SECTION */}
            <Text className="text-gray-400 font-bold mb-3 ml-2 uppercase text-[11px] tracking-wider">
              Account Settings
            </Text>

            <View className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 mb-6">
              <ProfileMenuItem
                icon="person-outline"
                title="Information"
                onPress={() => router.push("/(main-profile)/editProfile?info")}
              />

              <ProfileMenuItem
                icon="location-outline"
                title="Address"
                onPress={() =>
                  router.push("/(main-profile)/editProfile?location")
                }
              />

              <ProfileMenuItem
                icon="id-card-outline"
                title="Valid ID"
                onPress={() =>
                  router.push("/(main-profile)/editProfile?vakidID")
                }
              />

              <ProfileMenuItem
                icon="lock-closed-outline"
                title="Security & Password"
                onPress={() => router.push("/(main-profile)/changePassword")}
              />

              <ProfileMenuItem
                icon="finger-print-outline"
                title="Quick & Secure Login"
                onPress={() => router.push("/(main-profile)/biometricSettings")}
                isLast
              />
            </View>

            {/* ACCOUNT OPTIONS SECTION */}
            <Text className="text-gray-400 font-bold mb-3 ml-2 uppercase text-[11px] tracking-wider">
              Account Options
            </Text>

            <View className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 mb-6">
              <TouchableOpacity
                onPress={() => router.push("/(main-profile)/deleteAccount")}
                className="flex-row items-center justify-between p-4"
              >
                <View className="flex-row items-center">
                  <Ionicons name="settings-outline" size={22} color="#034194" />
                  <Text className="text-gray-800 font-bold ml-3 text-base">
                    Account Management
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* LOGOUT BUTTON */}
        <TouchableOpacity
          onPress={handleLogout}
          disabled={loggingOut}
          className="mb-12 flex-row items-center p-4 bg-[#D7012710] rounded-2xl border border-[#D7012730]"
        >
          {loggingOut ? (
            <ActivityIndicator color="#D70127" className="mx-auto" />
          ) : (
            <>
              <MaterialIcons name="logout" size={22} color="#D70127" />
              <Text className="text-[#D70127] font-bold ml-3 text-base">
                Logout Account
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* PROFILE PHOTO OPTIONS */}
      <Modal
        visible={showOptions}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setShowOptions(false)}
      >
        <View className="flex-1 bg-black/40 justify-center items-center px-5">
          <View className="bg-white p-8 rounded-[40px] items-center w-full max-w-[380px] shadow-2xl">
            <View className="w-16 h-16 bg-blue rounded-full items-center justify-center mb-4">
              <Ionicons name="image" size={32} color="#034194" />
            </View>

            <Text className="text-xl font-bold text-[#333] mb-2 text-center">
              Profile Photo
            </Text>

            <View className="w-full gap-y-3 mt-4">
              {/* VIEW PHOTO - ONLY IF AVATAR EXISTS */}
              {user?.avatar && (
                <TouchableOpacity
                  onPress={() => {
                    setShowOptions(false);
                    setShowFullImage(true);
                  }}
                  className="w-full flex-row items-center p-4 bg-gray-50 rounded-2xl border border-gray-100"
                >
                  <Ionicons name="eye-outline" size={20} color="#034194" />

                  <Text className="ml-3 font-bold text-gray-700">
                    View Photo
                  </Text>
                </TouchableOpacity>
              )}

              {/* TAKE PHOTO */}
              <TouchableOpacity
                onPress={() => openImageSource("camera")}
                className="w-full flex-row items-center p-4 bg-gray-50 rounded-2xl border border-gray-100"
              >
                <Ionicons name="camera-outline" size={20} color="#034194" />

                <Text className="ml-3 font-bold text-gray-700">Take Photo</Text>
              </TouchableOpacity>

              {/* UPLOAD NEW */}
              <TouchableOpacity
                onPress={() => openImageSource("library")}
                className="w-full flex-row items-center p-4 bg-blue rounded-2xl border border-[#DBEAFE]"
              >
                <Ionicons
                  name="cloud-upload-outline"
                  size={20}
                  color="#034194"
                />

                <Text className="ml-3 font-bold text-[#034194]">
                  Upload New
                </Text>
              </TouchableOpacity>

              {/* DELETE PHOTO - ONLY IF AVATAR EXISTS */}
              {user?.avatar && (
                <TouchableOpacity
                  onPress={handleDeleteAvatar}
                  disabled={deletingAvatar}
                  className="w-full flex-row items-center p-4 bg-[#FEF2F2] rounded-2xl border border-[#D70127]"
                >
                  {deletingAvatar ? (
                    <ActivityIndicator size="small" color="#D70127" />
                  ) : (
                    <Ionicons name="trash-outline" size={20} color="#D70127" />
                  )}

                  <Text className="ml-3 font-bold text-[#D70127]">
                    {deletingAvatar ? "Removing..." : "Delete Photo"}
                  </Text>
                </TouchableOpacity>
              )}

              {/* CLOSE */}
              <TouchableOpacity
                onPress={() => setShowOptions(false)}
                className="w-full mt-2 p-4 items-center"
              >
                <Text className="text-gray-400 font-bold">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CROP MODAL */}
      <Modal
        visible={showCropModal && !!rawImage}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={handleCropCancel}
      >
        {rawImage && (
          <CropScreen
            uri={rawImage.uri}
            naturalWidth={rawImage.width}
            naturalHeight={rawImage.height}
            onCancel={handleCropCancel}
            onDone={handleCropped}
          />
        )}
      </Modal>

      {/* REVIEW MODAL */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => {
          setShowReviewModal(false);
          setPreviewUri(null);
        }}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-5">
          <View className="bg-white p-6 rounded-[32px] items-center w-full max-w-[380px] shadow-2xl">
            <Text className="text-lg font-bold text-[#333] mb-4">
              Review Photo
            </Text>

            {previewUri && (
              <View className="w-56 h-56 rounded-full overflow-hidden border-4 border-[#03419420] mb-6">
                <Image
                  source={{
                    uri: previewUri,
                  }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
            )}

            <View className="w-full gap-y-3">
              <TouchableOpacity
                onPress={confirmAndUpload}
                className="w-full py-3.5 bg-[#034194] rounded-2xl items-center flex-row justify-center"
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="white"
                />

                <Text className="text-white font-bold text-base ml-2">
                  Use Photo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowReviewModal(false);
                  setPreviewUri(null);
                  setShowOptions(true);
                }}
                className="w-full py-3.5 bg-gray-50 rounded-2xl items-center border border-gray-100"
              >
                <Text className="text-gray-600 font-bold text-base">
                  Choose Again
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FULL IMAGE */}
      <Modal
        visible={showFullImage}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setShowFullImage(false)}
      >
        <View className="flex-1 bg-black items-center justify-center">
          <TouchableOpacity
            onPress={() => setShowFullImage(false)}
            className="absolute top-12 right-6 p-2 bg-white/20 rounded-full z-10"
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>

          {user?.avatar && (
            <Image
              source={{
                uri: user.avatar,
              }}
              className="w-full h-auto aspect-square"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

/* -------------------------------------------------------------------------- */
/* CROP SCREEN                                                                */
/* -------------------------------------------------------------------------- */

function CropScreen({
  uri,
  naturalWidth,
  naturalHeight,
  onCancel,
  onDone,
}: {
  uri: string;
  naturalWidth: number;
  naturalHeight: number;
  onCancel: () => void;
  onDone: (croppedUri: string) => void;
}) {
  const [cropping, setCropping] = useState(false);

  const [zoomDisplay, setZoomDisplay] = useState(MIN_ZOOM);

  const OVERSCAN = 1.15;

  const baseScale =
    (FRAME_SIZE / Math.min(naturalWidth, naturalHeight)) * OVERSCAN;

  const baseWidth = naturalWidth * baseScale;

  const baseHeight = naturalHeight * baseScale;

  const scale = useSharedValue(MIN_ZOOM);

  const savedScale = useSharedValue(MIN_ZOOM);

  const translateX = useSharedValue(0);

  const translateY = useSharedValue(0);

  const savedTranslateX = useSharedValue(0);

  const savedTranslateY = useSharedValue(0);

  const clamp = (val: number, min: number, max: number) => {
    "worklet";

    return Math.min(Math.max(val, min), max);
  };

  const getMaxPan = (currentZoom: number) => {
    "worklet";

    const totalScale = baseScale * currentZoom;

    const displayedWidth = naturalWidth * totalScale;

    const displayedHeight = naturalHeight * totalScale;

    return {
      maxX: Math.max(0, (displayedWidth - FRAME_SIZE) / 2),
      maxY: Math.max(0, (displayedHeight - FRAME_SIZE) / 2),
    };
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;

      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      const { maxX, maxY } = getMaxPan(scale.value);

      translateX.value = clamp(
        savedTranslateX.value + e.translationX,
        -maxX,
        maxX,
      );

      translateY.value = clamp(
        savedTranslateY.value + e.translationY,
        -maxY,
        maxY,
      );
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      const newScale = clamp(savedScale.value * e.scale, MIN_ZOOM, MAX_ZOOM);

      scale.value = newScale;

      const { maxX, maxY } = getMaxPan(newScale);

      translateX.value = clamp(translateX.value, -maxX, maxX);

      translateY.value = clamp(translateY.value, -maxY, maxY);

      runOnJS(setZoomDisplay)(newScale);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedImageStyle = useAnimatedStyle(() => ({
    width: baseWidth,
    height: baseHeight,

    transform: [
      {
        translateX: translateX.value,
      },
      {
        translateY: translateY.value,
      },
      {
        scale: scale.value,
      },
    ],
  }));

  const handleReset = () => {
    scale.value = withTiming(MIN_ZOOM);

    savedScale.value = MIN_ZOOM;

    translateX.value = withTiming(0);

    translateY.value = withTiming(0);

    savedTranslateX.value = 0;

    savedTranslateY.value = 0;

    setZoomDisplay(MIN_ZOOM);
  };

  const handleCropConfirm = async () => {
    try {
      setCropping(true);

      const currentZoom = scale.value;

      const pan = {
        x: translateX.value,
        y: translateY.value,
      };

      const totalScale = baseScale * currentZoom;

      const displayedWidth = naturalWidth * totalScale;

      const displayedHeight = naturalHeight * totalScale;

      const offsetX = (FRAME_SIZE - displayedWidth) / 2 + pan.x;

      const offsetY = (FRAME_SIZE - displayedHeight) / 2 + pan.y;

      const origSize = FRAME_SIZE / totalScale;

      let origX = -offsetX / totalScale;

      let origY = -offsetY / totalScale;

      origX = Math.min(Math.max(origX, 0), naturalWidth - origSize);

      origY = Math.min(Math.max(origY, 0), naturalHeight - origSize);

      const result = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            crop: {
              originX: origX,
              originY: origY,
              width: origSize,
              height: origSize,
            },
          },
        ],
        {
          compress: 1,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );

      onDone(result.uri);
    } catch (error) {
      console.error("Crop error:", error);

      Alert.alert("Error", "Could not crop the image. Please try again.");
    } finally {
      setCropping(false);
    }
  };

  return (
    <GestureHandlerRootView
      style={{
        flex: 1,
      }}
    >
      <View className="flex-1 bg-black items-center justify-center px-5">
        <TouchableOpacity
          onPress={onCancel}
          className="absolute top-12 left-6 p-2 bg-white/20 rounded-full z-10"
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleReset}
          className="absolute top-12 right-6 p-2 bg-white/20 rounded-full z-10"
        >
          <Ionicons name="refresh" size={22} color="white" />
        </TouchableOpacity>

        <Text className="text-white font-bold text-lg mb-6 text-center">
          Drag with 1 finger to move • Pinch with 2 fingers to zoom
        </Text>

        <GestureDetector gesture={composedGesture}>
          <View
            style={{
              width: FRAME_SIZE,
              height: FRAME_SIZE,
              borderRadius: FRAME_SIZE / 2,
              overflow: "hidden",
              backgroundColor: "#111",
              borderWidth: 2,
              borderColor: "rgba(255,255,255,0.9)",

              justifyContent: "center",

              alignItems: "center",
            }}
          >
            <Animated.Image
              source={{
                uri,
              }}
              style={animatedImageStyle}
            />
          </View>
        </GestureDetector>

        <Text className="text-white/70 font-bold mt-6">
          {zoomDisplay.toFixed(2)}x
        </Text>

        <View className="w-full mt-8 gap-y-3 max-w-[320px]">
          <TouchableOpacity
            onPress={handleCropConfirm}
            disabled={cropping}
            className="w-full py-3.5 bg-[#034194] rounded-2xl items-center flex-row justify-center"
          >
            {cropping ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="white"
                />

                <Text className="text-white font-bold text-base ml-2">
                  Done
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onCancel}
            disabled={cropping}
            className="w-full py-3.5 items-center"
          >
            <Text className="text-white/70 font-bold text-base">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

/* -------------------------------------------------------------------------- */
/* PROFILE MENU ITEM                                                          */
/* -------------------------------------------------------------------------- */

function ProfileMenuItem({ icon, title, onPress, isLast }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center justify-between p-4 ${
        isLast ? "" : "border-b border-gray-50"
      }`}
    >
      <View className="flex-row items-center">
        <View className="bg-blue p-2 rounded-lg">
          <Ionicons name={icon} size={22} color="#034194" />
        </View>

        <Text className="text-[#333] font-semibold text-base ml-3">
          {title}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

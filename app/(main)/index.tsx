import { Skeleton } from "@/components/ui/skeleton";
import { useCoopTheme } from "@/hooks/useCoopTheme";
import { useUIStore } from "@/store/useUIStore";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import "../../global.css";

// Components
import { BannerSlider } from "@/components/BannerSlider";
import { CustomAlert } from "@/components/CustomAlert";

// Hooks & Services
import { AdItem, getAds } from "@/services/adService";
import echo from "@/services/echo";
import { profileService } from "@/services/profileService";
import {
  getWalletBalance,
  updateWalletVisibility,
} from "@/services/walletService";
import { useAuthStore } from "@/store/useAuthStore";

// Assets
import { Ionicons } from "@expo/vector-icons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
// import Ask from "../../assets/images/icon/Ask.png";
// import FISMPC from "../../assets/images/icon/FISMPC.png";
// import Funding from "../../assets/images/icon/Funding.png";
// import Intellectual from "../../assets/images/icon/Intellectual.png";
// import Licensing from "../../assets/images/icon/Licensing.png";
// import Loan from "../../assets/images/icon/Loan.png";
// import Lost from "../../assets/images/icon/Lost.png";
// import Product from "../../assets/images/icon/Product.png";
// import RD from "../../assets/images/icon/RD.png";
// import Suggest from "../../assets/images/icon/Suggest.png";
// import image from "../../assets/images/HomeImage.png";

const SCREEN = Dimensions.get("screen");

const { width } = Dimensions.get("window");

export default function DashboardPage() {
  const { user, setUser } = useAuthStore();
  const { handleComingSoon } = useUIStore();
  const { primary } = useCoopTheme(); // cooperative brand color
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState<string>("0.00");
  const [showBalance, setShowBalance] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [pendingFeature, setPendingFeature] = useState("");
  const [ads, setAds] = useState<AdItem[]>([]);

  // Tamper Alert State
  const [tamperAlert, setTamperAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const userTypeName = user?.user_type?.name?.toUpperCase() || "";
  const statusName = user?.status?.name?.toLowerCase() || "";

  const isBasic = userTypeName === "BASIC";
  const isMember = user?.user_type_id === 3 || userTypeName === "MEMBER";

  const isActive = statusName === "active";
  const isApproved = statusName === "approved";
  const isRejected = statusName === "rejected";
  const isForApproval = statusName === "for_approval";

  // 1. Create a centralized data fetching function
  const loadData = async (showLoading = false) => {
    if (showLoading) setPageLoading(true);

    try {
      const userData = await profileService.getProfile();
      setUser(userData);

      if (userData?.user_type_id === 3) {
        const walletData = await getWalletBalance();
        setBalance(walletData.data.balance);
        setShowBalance(walletData.data.show);

        // Integrity / Tampering Check
        if (walletData.data.is_tampered) {
          setTamperAlert({
            visible: true,
            title: "Security Notice",
            message:
              walletData.data.message ||
              "Your wallet balance integrity check failed. Please contact chat support for assistance.",
          });
        }
      }

      // Fetch dynamic banner ads
      const adsResponse = await getAds();
      if (adsResponse.success) {
        setAds(adsResponse.data);
      }
    } finally {
      setPageLoading(false);
    }
  };

  // 2. Initial Load: Watch the user object
  useEffect(() => {
    loadData(true);
  }, []); // Run once on mount

  // 3. Updated onRefresh: Now refreshes Profile AND Wallet
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
  }, []);

  // 4. Realtime Wallet Balance Subscription
  useEffect(() => {
    if (!user?.id || !isMember || !echo) return;

    const channelName = `wallet.${user.id}`;
    const channel = echo.private(channelName);

    channel.listen(".wallet.balance.updated", (e: any) => {
      setBalance(e.balance);
    });

    return () => {
      if (echo) {
        echo.leave(channelName);
      }
    };
  }, [user?.id, isMember]);

  const handleToggleBalance = async () => {
    const currentState = showBalance;
    setShowBalance(!currentState);
    try {
      await updateWalletVisibility();
    } catch (error) {
      setShowBalance(currentState);
    }
  };

  // const handleMenuPress = (item: any) => {
  //   if (
  //     item.label === "FISMPC Online Store" ||
  //     item.label === "Coop Membership" ||
  //     item.label === "News & Event"
  //   ) {
  //     router.push(item.href as any);
  //     return;
  //   }

  //   if (!isMember) {
  //     setPendingFeature(item.label);
  //     setShowAlert(true);
  //   }

  //   // Other features require MEMBER
  //   if (!isMember) {
  //     setPendingFeature(item.label);
  //     setShowAlert(true);
  //   } else {
  //     // ✅ CRITICAL: Pass from:"home" so back button knows where to return
  //     // This ensures that when users click back from the feature page,
  //     // they return to home instead of wherever they were before
  //     console.log(
  //       `📍 [Dashboard] Navigating to ${item.label} from home/dashboard`,
  //     );
  //     router.push({
  //       pathname: item.href as any,
  //       params: { from: "home" },
  //     });
  //   }
  // };

  const handleMenuPress = (item: any) => {
    if (item.comingSoon) {
      handleComingSoon();
      return;
    }

    // 1. Check if the user is Basic and either For Approval or Rejected.
    // If so, block them from accessing FISMPC Online Store, Coop Membership, and News & Event (and show the alert).
    if (
      (isBasic && isForApproval) ||
      (isBasic && isRejected) ||
      (isBasic && isActive)
    ) {
      if (
        item.label === "CCNPH Online Store" ||
        item.label === "Coop Membership" ||
        item.label === "News & Event"
      ) {
        setPendingFeature(item.label);
        setShowAlert(true);
        return;
      }
    }

    // 2. Normal free access items for other users/statuses
    if (
      item.label === "CCNPH Online Store" ||
      item.label === "Coop Membership" ||
      item.label === "News & Event"
    ) {
      router.push({
        pathname: item.href as any,
        params: { from: "home" },
      });
      return;
    }

    // 3. If the user is not a member (e.g. Basic + Active or Basic + Approved capital setup), show alert
    if (!isMember) {
      setPendingFeature(item.label);
      setShowAlert(true);
      return;
    }
    router.push({
      pathname: item.href as any,
      params: { from: "home" },
    });
  };

  const menuItems = [
    {
      label: "Business Training",
      href: "/(business)/",
      iconFamily: Ionicons,
      iconName: "school-outline",
    },
    // {
    //   label: "Intellectual Property Assistant",
    //   href: "/(intellectual)/",
    //   iconFamily: Ionicons,
    //   iconName: "bulb-outline",
    // },
    // {
    //   label: "Loan Assistance",
    //   href: "/(loan)/",
    //   iconFamily: FontAwesome,
    //   iconName: "bank",
    // },
    // {
    //   label: "Funding & Invest Opportunities",
    //   href: "/(funding-investment-opportunities)/",
    //   iconFamily: Ionicons,
    //   iconName: "trending-up-outline",
    // },
    // {
    //   label: "Licensing & Permit Assistance",
    //   href: "/(licensing-permit-assistance)/",
    //   iconFamily: Ionicons,
    //   iconName: "document-text-outline",
    // },
    // {
    //   label: "R & D Collaboration",
    //   href: "/(rnd-collaboration)/",
    //   iconFamily: Ionicons,
    //   iconName: "flask-outline",
    // },
    // {
    //   label: "CCNPH Online Store",
    //   href: "/(store)/",
    //   iconFamily: Ionicons,
    //   iconName: "cart-outline",
    // },
    // {
    //   label: "Product Validation Services",
    //   href: "/(product-validation-services)/",
    //   iconFamily: Ionicons,
    //   iconName: "checkmark-done-circle-outline",
    // },
    // {
    //   label: "Lost & Found",
    //   href: "/(lost-and-found)/",
    //   iconFamily: Ionicons,
    //   iconName: "search-outline",
    // },
    // {
    //   label: "Suggest a Service",
    //   href: "/",
    //   iconFamily: Ionicons,
    //   iconName: "chatbox-ellipses-outline",
    // },
    {
      label: "Coop Membership",
      href: "/(coop)/",
      iconFamily: Ionicons,
      iconName: "people-outline",
    },
    {
      label: "News & Event",
      href: "/(news)/",
      iconFamily: Ionicons,
      iconName: "newspaper-outline",
    },
  ];

  const getPopupContent = () => {
    // --- WARNING SECTION: BASIC & ACTIVE (Needs setup) ---
    if (isBasic && isActive) {
      return {
        title: "Complete Your Profile",
        message: (
          <>
            To access{" "}
            <Text className="font-bold text-slate-800">{pendingFeature}</Text>,
            please provide your information, address, and a valid ID to upgrade
            your account.
          </>
        ),
        buttonText: "Complete Now",
        buttonColor: "bg-[#C6890F]",
        // iconBg: "bg-[#C6890F]",
        textColor: "text-[#C6890F]",
        route: "/profile/setupProfile",
        useBrand: false,
        // icon: <Ionicons name="warning" size={32} color="white" />,
      };
    }

    // --- PENDING NOTIFICATION ---
    if (isBasic && isForApproval) {
      return {
        title: "Review in Progress",
        message: (
          <>
            Your account details have already been submitted. Please wait 2-3
            days for approval before accessing{" "}
            <Text className="font-bold text-slate-800">{pendingFeature}</Text>.
          </>
        ),
        buttonText: "View Profile",
        // brand color is applied through inline style (useBrand)
        buttonColor: "",
        // iconBg: "bg-primary",
        textColor: "",
        route: "/profile",
        useBrand: true,
        // icon: <Ionicons name="time" size={32} color="white" />,
      };
    }

    // --- CAPITAL CONTRIBUTION SECTION ---
    if (isBasic && isApproved) {
      return {
        title: "Capital Contribution Required",
        message: (
          <>
            To access{" "}
            <Text className="font-bold text-slate-800">{pendingFeature}</Text>,
            you need to complete your initial share capital contribution through
            installment or full payment.
          </>
        ),
        buttonText: "Pay Contribution",
        buttonColor: "bg-green-600",
        // iconBg: "bg-green-600",
        textColor: "text-green-700",
        route: "/profile/membership",
        useBrand: false,
        // icon: (
        //   <MaterialIcons
        //     name="account-balance-wallet"
        //     size={32}
        //     color="white"
        //   />
        // ),
      };
    }

    // --- REJECTED: Needs to contact support ---
    if (isBasic && isRejected) {
      return {
        title: "Application Rejected",
        message: (
          <>
            Your profile submission was not approved, so{" "}
            <Text className="font-bold text-slate-800">{pendingFeature}</Text>{" "}
            isn{"'"}t available yet. Please chat with our support team to find
            out why and how to proceed.
          </>
        ),
        buttonText: "Chat with Support",
        buttonColor: "bg-[#D70127]",
        textColor: "text-[#D70127]",
        route: "/(intellectual-chat)/",
        useBrand: false,
      };
    }

    return {
      title: "Account Required",
      message: "Please complete your account setup.",
      buttonText: "View Profile",
      buttonColor: "",
      iconBg: "bg-primary",
      textColor: "",
      route: "/profile",
      useBrand: true,
      icon: <Ionicons name="person" size={32} color="white" />,
    };
  };

  const popupContent = getPopupContent();

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      className="flex-1 bg-white"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[primary]}
          tintColor={primary}
        />
      }
    >
      <View className="px-6 pt-4 w-full max-w-[600px] mx-auto">
        {/* 1. WELCOME TEXT */}
        <View className="items-center mb-4">
          {pageLoading ? (
            <>
              <Skeleton className="h-8 w-40 rounded-md" />
              <Skeleton className="h-8 w-40 mt-2 rounded-md" />
            </>
          ) : (
            <>
              <Text className="text-2xl text-slate-800 text-center">
                Hello,{" "}
                <Text className="font-bold">{user?.name || "User"}!</Text>
              </Text>
              <Text className="text-md text-slate-500 text-center">
                How can we help you today?
              </Text>
            </>
          )}
        </View>

        {/* 2. WALLET SECTION */}
        {isMember && !pageLoading && (
          <View
            style={{ backgroundColor: primary }}
            className="p-3 rounded-2xl shadow-lg mb-2"
          >
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-3">
                <Text className="text-white text-2xl font-bold">
                  ₱{" "}
                  {showBalance
                    ? Number(balance).toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                      })
                    : "**.**"}
                </Text>
                <TouchableOpacity onPress={handleToggleBalance}>
                  <Ionicons
                    name={showBalance ? "eye-off" : "eye"}
                    size={24}
                    color="white"
                  />
                </TouchableOpacity>
              </View>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => router.push("/(load)")}
                  // onPress={handleComingSoon}
                  className="bg-white h-10 w-10 flex justify-center items-center rounded-lg"
                >
                  <FontAwesome name="plus" size={22} color={primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push("/(transper)/")}
                  // onPress={handleComingSoon}
                  className="bg-white h-10 w-10 flex justify-center items-center rounded-lg"
                >
                  <FontAwesome name="send" size={20} color={primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* 3. BANNER */}
        <BannerSlider ads={ads} loading={pageLoading} />

        {/* 4. RESPONSIVE GRID MENU (3 Per Row) */}
        <View className="flex-row flex-wrap justify-between pb-5">
          {pageLoading
            ? Array.from({ length: 12 }).map((_, i) => (
                <View key={i} className="w-[30%] items-center mb-5 mt-8">
                  <Skeleton className="w-16 h-16 rounded-2xl" />
                  <Skeleton className="w-20 h-4 mt-2" />
                </View>
              ))
            : menuItems.map((item, index) => {
                const IconComponent = item.iconFamily;
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleMenuPress(item)}
                    className="!w-[30%] items-center mb-8"
                  >
                    <View className="w-14 h-14 mb-2 items-center justify-center">
                      <IconComponent
                        name={item.iconName as any}
                        size={42}
                        color={primary}
                      />
                    </View>
                    <Text className="text-center text-sm font-medium text-slate-700">
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
        </View>
      </View>

      <Modal
        visible={showAlert}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setShowAlert(false)}
      >
        {/* THIS is the important fix */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: SCREEN.width,
            height: SCREEN.height,
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
          className="justify-center"
        >
          <View className="flex-1 justify-center items-center px-5">
            <View className="bg-white p-6 rounded-[30px] items-center w-full max-w-[380px] shadow-2xl">
              {/* <View
                className={`w-20 h-20 rounded-full items-center justify-center mb-5 ${popupContent.iconBg}`}
              >
                {popupContent.icon}
              </View> */}

              <Text
                className={`text-xl font-bold text-center mb-3 ${popupContent.textColor}`}
                style={popupContent.useBrand ? { color: primary } : undefined}
              >
                {popupContent.title}
              </Text>

              <View className="mb-6 px-2">
                <Text className="text-slate-500 text-center leading-6">
                  {popupContent.message}
                </Text>
              </View>

              <View className="w-full gap-y-3">
                {/* Action Button */}
                <TouchableOpacity
                  onPress={() => {
                    setShowAlert(false);
                    router.push(popupContent.route as any);
                  }}
                  className={`${popupContent.buttonColor} w-full py-4 rounded-2xl active:opacity-90`}
                  style={
                    popupContent.useBrand
                      ? { backgroundColor: primary }
                      : undefined
                  }
                >
                  <Text className="text-white text-center font-bold text-lg">
                    {popupContent.buttonText}
                  </Text>
                </TouchableOpacity>

                {/* Cancel Button */}
                <TouchableOpacity
                  onPress={() => setShowAlert(false)}
                  className="w-full py-4 rounded-2xl bg-gray-100 active:opacity-90"
                >
                  <Text className="text-slate-500 text-center font-bold text-lg">
                    Maybe Later
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* TAMPER DETECTED CUSTOM ALERT */}
      <CustomAlert
        visible={tamperAlert.visible}
        title={tamperAlert.title}
        message={tamperAlert.message}
        onClose={() => setTamperAlert((prev) => ({ ...prev, visible: false }))}
      />
    </ScrollView>
  );
}

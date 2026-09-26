import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import logo from "../../../assets/images/logo.png";
import "../../../global.css";

// ---------- STATIC CONTENT ----------

const FOCUS_SECTORS = [
  {
    icon: "leaf-outline",
    title: "Agriculture & Sustainable Farming",
    desc: "Supporting farmers with smart technologies (like green houses) and farm-to-market systems to boost productivity and food security.",
  },
  {
    icon: "cart-outline",
    title: "Retail & E-Commerce",
    desc: "Connecting farmers and consumers directly through platforms like Bagsakan.ph and Pabili Online Store for fresh, affordable goods.",
  },
  {
    icon: "medical-outline",
    title: "Healthcare Services",
    desc: "Ensuring member well-being and boosting quality of life through accessible healthcare support systems.",
  },
  {
    icon: "bus-outline",
    title: "Transport & Smart Logistics",
    desc: "Developing modern, sustainable EV transport solutions, logistics networks, and integrated mobility platforms.",
  },
  {
    icon: "home-outline",
    title: "Real Estate & Land Development",
    desc: "Facilitating livable housing projects and land development that prioritize community well-being and sustainability.",
  },
  {
    icon: "wallet-outline",
    title: "Digital Finance & Crypto",
    desc: "Embracing secure, decentralized financial tools and cryptocurrency to promote financial inclusion and fast transactions.",
  },
] as const;

const COOP_PRINCIPLES = [
  "Voluntary and Open Membership",
  "Democratic Member Control",
  "Member Economic Participation",
  "Autonomy and Independence",
  "Education, Training, and Information",
  "Cooperation among Cooperatives",
] as const;

const MISSION_POINTS = [
  {
    title: "Promote Sustainable Agriculture",
    desc: "Enhance food security using advanced technology and sustainable practices for high-quality organic produce.",
  },
  {
    title: "Advance Affordable Housing",
    desc: "Strategic land and housing development prioritize environmental responsibility and long-term sustainability.",
  },
  {
    title: "Revolutionize Retail & Supply Chains",
    desc: "Direct farm-to-market supply networks (Bagsakan.ph & Pabili) bridging the gap between producers and consumers.",
  },
  {
    title: "Ensure Healthcare Access",
    desc: "Accessible healthcare services focused on improving overall productivity and quality of life for members.",
  },
  {
    title: "Drive Technological & Financial Innovation",
    desc: "Integrating cryptocurrency and digital financial tools for faster, decentralized transactions.",
  },
  {
    title: "Strengthen Cooperative Governance",
    desc: "Democratic member-driven models where every individual has an equal voice in shaping community outcomes.",
  },
] as const;

// ---------- SMALL REUSABLE PIECES ----------

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="text-primary text-lg font-bold mb-3 px-1">{children}</Text>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="bg-white rounded-2xl border border-primary/10 p-4 mb-3 shadow-brand"
      style={{ elevation: 2 }}
    >
      {children}
    </View>
  );
}

// ---------- MAIN SCREEN ----------

export default function InfoIndex() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const call = () => Linking.openURL("tel:+639482959414");
  const email = () => Linking.openURL("mailto:ccnph.system@gmail.com");
  const openMap = () =>
    Linking.openURL(
      "https://www.google.com/maps/search/?api=1&query=164+Dona+Lucing+Ave+Bacolor+Pampanga",
    );

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#034194"]}
          tintColor="#034194"
        />
      }
    >
      {/* ---------- HERO ---------- */}
      <View className="bg-primary items-center pb-10 border border-primary rounded-b-3xl">
        {/* header */}
        <View className="w-full px-6 pt-14 pb-4">
          <TouchableOpacity onPress={() => router.back()} className="w-[31px]">
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
        </View>

        <View className="mb-2">
          <Image
            source={logo}
            style={{ width: 100, height: 100 }}
            resizeMode="contain"
          />
        </View>

        <Text className="text-white text-xl font-bold text-center px-6">
          Cooperatives Cooperation Network Philippines
        </Text>
        <Text className="text-white/80 text-sm mt-1 font-semibold">
          (CCNPh)
        </Text>

        <Text className="text-slate-200 text-xs text-center mt-3 px-8 leading-5 italic">
          {'"'}Empowering Communities through Cooperation, Innovation, and
          Sustainability{'."'}
        </Text>
      </View>

      {/* ---------- ABOUT / WHO WE ARE ---------- */}
      <View className="px-5 mt-6">
        <SectionTitle>Who We Are</SectionTitle>
        <Card>
          <Text className="text-slate-600 leading-6">
            The Cooperatives Cooperation Network Philippines (CCNPh) is a
            dynamic and forward-thinking ecosystem designed to promote
            sustainable economic growth and community empowerment across the
            Philippines.
          </Text>
          <Text className="text-slate-600 leading-6 mt-2">
            As a network of cooperatives, we bring together diverse sectors
            including agriculture, real estate, retail, healthcare,
            transportation, and digital finance to create a self-sustaining
            ecosystem that improves lives and fosters innovation.
          </Text>
        </Card>
      </View>

      {/* ---------- VISION & MISSION ---------- */}
      <View className="px-5 mt-2">
        <SectionTitle>Vision & Mission</SectionTitle>

        <Card>
          <View className="flex-row items-center mb-2">
            <Ionicons name="eye-outline" size={20} color="#034194" />
            <Text className="text-primary font-bold ml-2">Our Vision</Text>
          </View>
          <Text className="text-slate-600 leading-6">
            We envision a future where every Filipino community thrives on the
            principles of cooperation, inclusivity, and sustainability. Through
            a network of empowered cooperatives, we aim to foster resilient,
            self-reliant communities that collectively address the
            socio-economic challenges of the nation.
          </Text>
        </Card>

        <Card>
          <View className="flex-row items-center mb-3">
            <Ionicons name="flag-outline" size={20} color="#034194" />
            <Text className="text-primary font-bold ml-2">Our Mission</Text>
          </View>
          <Text className="text-slate-600 leading-6 mb-3">
            CCNPh exists to create a unified ecosystem that empowers communities
            by facilitating equitable access to essential resources, land, food,
            healthcare, and financial services.
          </Text>

          {MISSION_POINTS.map((m, i) => (
            <View key={m.title} className="mb-3">
              <Text className="text-slate-800 font-bold text-sm">
                • {m.title}
              </Text>
              <Text className="text-slate-500 text-xs leading-5 pl-3 mt-0.5">
                {m.desc}
              </Text>
            </View>
          ))}
        </Card>
      </View>

      {/* ---------- ECOSYSTEM / SECTORS ---------- */}
      <View className="px-5 mt-2">
        <SectionTitle>CCNPh Ecosystem</SectionTitle>
        {FOCUS_SECTORS.map((s) => (
          <Card key={s.title}>
            <View className="flex-row items-start">
              <View className="bg-primary/10 rounded-full p-2 mr-3">
                <Ionicons name={s.icon as any} size={20} color="#034194" />
              </View>
              <View className="flex-1">
                <Text className="text-primary font-bold mb-1">{s.title}</Text>
                <Text className="text-slate-500 text-sm leading-5">
                  {s.desc}
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </View>

      {/* ---------- COOPERATIVE PRINCIPLES ---------- */}
      <View className="px-5 mt-2">
        <SectionTitle>Principles & Values</SectionTitle>
        <Card>
          <Text className="text-slate-600 leading-6 mb-3">
            A cooperative is an organization owned and run by its members under
            the principle of collective ownership and democratic
            decision-making:
          </Text>
          {COOP_PRINCIPLES.map((principle, i) => (
            <View
              key={principle}
              className={`flex-row items-center py-2.5 ${
                i !== COOP_PRINCIPLES.length - 1
                  ? "border-b border-slate-100"
                  : ""
              }`}
            >
              <View className="w-6 h-6 rounded-full bg-primary/10 items-center justify-center mr-3">
                <Text className="text-xs font-bold text-primary">{i + 1}</Text>
              </View>
              <Text className="text-slate-700 text-sm font-medium flex-1">
                {principle}
              </Text>
            </View>
          ))}
        </Card>
      </View>

      {/* ---------- CONTACT ---------- */}
      <View className="px-5 mt-2 mb-6">
        <SectionTitle>Contact Us</SectionTitle>
        <Card>
          <TouchableOpacity
            className="flex-row items-center py-2.5"
            onPress={call}
          >
            <Ionicons name="call-outline" size={20} color="#034194" />
            <Text className="text-slate-600 ml-3 font-medium">
              +63 948 295 9414
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center py-2.5 border-t border-slate-100"
            onPress={email}
          >
            <Ionicons name="mail-outline" size={20} color="#034194" />
            <Text className="text-slate-600 ml-3 font-medium">
              ccnph.system@gmail.com
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-start py-2.5 border-t border-slate-100"
            onPress={openMap}
          >
            <Ionicons
              name="location-outline"
              size={20}
              color="#034194"
              style={{ marginTop: 2 }}
            />
            <Text className="text-slate-600 ml-3 flex-1 font-medium leading-5">
              164 Dona Lucing Ave, Bacolor, Pampanga, Philippines
            </Text>
          </TouchableOpacity>
        </Card>
      </View>

      {/* ---------- FOOTER ATTRIBUTION ---------- */}
      <View className="px-6 items-center">
        <Text className="text-center text-slate-400 text-xs leading-5">
          © 2026 Cooperatives Cooperation Network Philippines. All Rights
          Reserved.
        </Text>
        <Text className="text-center text-slate-400 text-[10px] mt-1">
          Designed & Developed By BB 88 Advertising and Digital Solutions Inc.
        </Text>
      </View>
    </ScrollView>
  );
}

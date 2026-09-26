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

const PROGRAMS = [
  {
    icon: "bulb-outline",
    title: "Invention Development & Commercialization",
    desc: "Prototype refinement, IP registration, and patent facilitation for members.",
  },
  {
    icon: "briefcase-outline",
    title: "Cooperative Enterprise Development",
    desc: "Access to cooperative credit and livelihood programs to turn ideas into businesses.",
  },
  {
    icon: "flask-outline",
    title: "Research and Innovation Hubs",
    desc: "Shared laboratories and fabrication centers for members to build together.",
  },
  {
    icon: "megaphone-outline",
    title: "National Innovation Advocacy",
    desc: "Policy engagement and awareness campaigns for invention-led development.",
  },
  {
    icon: "storefront-outline",
    title: "Trade Fairs and Exhibitions",
    desc: "Events like National Inventors Week connecting inventors with industry partners.",
  },
] as const;

const PILLARS = [
  {
    icon: "rocket-launch-outline",
    title: "Innovation Commercialization & Technology Transfer",
  },
  {
    icon: "leaf",
    title: "Sustainable Cooperative Enterprise & Green Manufacturing",
  },
  {
    icon: "cellphone-link",
    title: "Digital Transformation & Inclusive Market Access",
  },
  {
    icon: "school-outline",
    title: "Capacity Building & Policy Advocacy for Inventors",
  },
] as const;

const SOCIALS = [
  { icon: "logo-facebook", url: "https://facebook.com" },
  { icon: "logo-youtube", url: "https://youtube.com" },
  { icon: "logo-instagram", url: "https://instagram.com" },
  { icon: "logo-twitter", url: "https://twitter.com" },
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

  const call = () => Linking.openURL("tel:+0221234567");
  const email = () => Linking.openURL("mailto:info@fisinventorscoop.org");
  const openMap = () =>
    Linking.openURL(
      "https://www.google.com/maps/search/?api=1&query=821+Cortes+Building+EDSA+Quezon+City",
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
        <View className="w-full px-6 pt-14 pb-8">
          <TouchableOpacity onPress={() => router.back()} className="w-[31px]">
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
        </View>

        <View
          className="bg-white rounded-full p-2 shadow-brand"
          style={{ elevation: 6 }}
        >
          <Image
            source={logo}
            style={{ width: 90, height: 90 }}
            resizeMode="contain"
          />
        </View>
        <Text className="text-white text-xl font-bold text-center mt-4 px-6">
          Filipino Inventors Society{"\n"}Multi-Purpose Cooperative
        </Text>
        <Text className="text-white/80 text-sm mt-2">(FISMPC)</Text>
      </View>

      {/* ---------- ABOUT ---------- */}
      <View className="px-5 mt-6">
        <SectionTitle>About Us</SectionTitle>
        <Card>
          <Text className="text-slate-600 leading-6">
            A dynamic community of visionary inventors, innovators, scientists,
            and entrepreneurs turning Filipino ingenuity into engines of
            inclusive national development. Founded in 2011 as the
            socio-economic arm of the Filipino Inventors Society (FIS), we
            bridge the gap between creative ideas and real-world solutions.
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
            To build a globally recognized innovation cooperative that
            transforms Filipino inventions into sustainable industries, uplifts
            communities, and strengthens the nation{"'"}s self-reliance through
            science, creativity, and cooperative unity.
          </Text>
        </Card>

        <Card>
          <View className="flex-row items-center mb-2">
            <Ionicons name="flag-outline" size={20} color="#034194" />
            <Text className="text-primary font-bold ml-2">Our Mission</Text>
          </View>
          <Text className="text-slate-600 leading-6">
            • Empower inventors through cooperative enterprise, incubation, and
            market linkages.{"\n"}• Bridge invention and industry via product
            development, IP protection, and commercialization.{"\n"}• Create
            inclusive prosperity through sustainable, socially responsible
            innovation.
          </Text>
        </Card>
      </View>

      {/* ---------- PROGRAMS & SERVICES ---------- */}
      <View className="px-5 mt-2">
        <SectionTitle>Programs & Services</SectionTitle>
        {PROGRAMS.map((p) => (
          <Card key={p.title}>
            <View className="flex-row items-start">
              <View className="bg-primary/10 rounded-full p-2 mr-3">
                <Ionicons name={p.icon as any} size={20} color="#034194" />
              </View>
              <View className="flex-1">
                <Text className="text-primary font-bold mb-1">{p.title}</Text>
                <Text className="text-slate-500 text-sm leading-5">
                  {p.desc}
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </View>

      {/* ---------- STRATEGIC PLAN 2026-2028 ---------- */}
      <View className="px-5 mt-2">
        <SectionTitle>Strategic Plan 2026–2028</SectionTitle>
        <Card>
          <Text className="text-slate-600 leading-6 mb-3">
            Our roadmap to make Filipino inventions drivers of national
            productivity, global competitiveness, and cooperative prosperity -
            built on four pillars:
          </Text>
          {PILLARS.map((pillar, i) => (
            <View
              key={pillar.title}
              className={`flex-row items-center py-2 ${
                i !== PILLARS.length - 1 ? "border-b border-slate-100" : ""
              }`}
            >
              <View className="mr-3">
                <Text className="text-xs font-bold text-primary">{i + 1}.</Text>
              </View>

              <Text className="text-slate-700 text-sm flex-1">
                {pillar.title}
              </Text>
            </View>
          ))}
        </Card>
      </View>

      {/* ---------- CONTACT ---------- */}
      <View className="px-5 mt-2 mb-10">
        <SectionTitle>Contact Us</SectionTitle>
        <Card>
          {/* <TouchableOpacity
            className="flex-row items-center py-2"
            onPress={call}
          >
            <Ionicons name="call-outline" size={20} color="#034194" />
            <Text className="text-slate-600 ml-3">(02) 1234-5678</Text>
          </TouchableOpacity> */}

          <TouchableOpacity
            className="flex-row items-center py-2 border-slate-100"
            onPress={email}
          >
            <Ionicons name="mail-outline" size={20} color="#034194" />
            <Text className="text-slate-600 ml-3">
              info@fisinventorscoop.org
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-start py-2 border-t border-slate-100"
            onPress={openMap}
          >
            <Ionicons
              name="location-outline"
              size={20}
              color="#034194"
              style={{ marginTop: 2 }}
            />
            <Text className="text-slate-600 ml-3 flex-1">
              Unit 405, 4th Floor, 821 Cortes Building, EDSA, South Triangle,
              Quezon City, Philippines
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Socials */}
        {/* <View className="flex-row justify-center mt-2">
          {SOCIALS.map((s) => (
            <TouchableOpacity
              key={s.icon}
              onPress={() => Linking.openURL(s.url)}
              className="bg-white border border-primary/20 rounded-full p-3 mx-2 shadow-brand"
            >
              <Ionicons name={s.icon as any} size={20} color="#034194" />
            </TouchableOpacity>
          ))}
        </View>*/}
      </View>

      {/* <Text className="text-center text-slate-400 text-xs mt-6">
        "Investing the Future, Empowering the Nation."
      </Text> */}
    </ScrollView>
  );
}

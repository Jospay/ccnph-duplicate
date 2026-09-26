import { Skeleton } from "@/components/ui/skeleton";
import { trainingService } from "@/services/trainingService";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function CategoryPage() {
  // 1. Destructure typeIcon from params
  const { typeSlug, typeName, typeIcon } = useLocalSearchParams();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 2. Format the URL using our service
  const iconUrl = trainingService.getIconUrl(typeIcon as string);

  useEffect(() => {
    if (typeSlug) {
      setLoading(true);
      trainingService
        .getCategories(typeSlug as string)
        .then((res) => setCategories(res))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [typeSlug]);

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {/* HEADER SECTION WITH ICON */}
        <View className="pt-10 pb-5 items-center">
          <Text className="text-2xl text-center font-extrabold pt-4 pb-1 text-primary tracking-tight">
            Choose Specific Business
          </Text>
          <Text className="text-2xl text-center font-extrabold py-2 text-primary tracking-tight">
            {typeName || "Business"}
          </Text>

          {/* DYNAMIC ICON DISPLAY */}
          <View className="w-36 h-36 my-5 bg-slate-50 rounded-2xl items-center justify-center p-4 overflow-hidden">
            {iconUrl ? (
              <Image
                source={{ uri: iconUrl }}
                className="w-full h-full"
                resizeMode="contain"
              />
            ) : (
              <Ionicons name="business" size={72} color="#034194" />
            )}
          </View>
        </View>

        {/* CATEGORIES LIST */}
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <View key={i} className="mb-4">
              <Skeleton className="h-20 rounded-2xl" />
            </View>
          ))
        ) : Array.isArray(categories) && categories.length > 0 ? (
          categories.map((cat: any) => (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: "/trainingDescription",
                  params: {
                    categorySlug: cat.attributes.slug,
                    categoryName: cat.attributes.name,
                    typeSlug: typeSlug,
                  },
                })
              }
              className="bg-white p-5 rounded-2xl mb-4 flex-row items-center shadow-sm border border-slate-100"
            >
              <View className="flex-1">
                <Text className="text-lg font-bold text-slate-800">
                  {cat.attributes.name}
                </Text>
                <Text className="text-slate-400 text-sm mt-0.5">
                  Tap to see training details
                </Text>
              </View>

              <View className="bg-slate-50 w-10 h-10 rounded-full items-center justify-center">
                <Ionicons name="chevron-forward" size={18} color="#007AFF" />
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View className="items-center py-20">
            <Ionicons name="folder-open-outline" size={48} color="#CBD5E1" />
            <Text className="text-slate-400 mt-4 text-center">
              No categories found for this business type.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

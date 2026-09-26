import { Skeleton } from "@/components/ui/skeleton";
import { trainingService } from "@/services/trainingService";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function DescriptionPage() {
  const { categorySlug, categoryName, typeSlug } = useLocalSearchParams();
  const [categoryAttributes, setCategoryAttributes] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!typeSlug || !categorySlug) return;

    setLoading(true);
    trainingService
      .getCategoryDetails(typeSlug as string, categorySlug as string)
      .then((res) => {
        if (res?.attributes) {
          setCategoryAttributes(res.attributes);
        } else {
          setCategoryAttributes(null);
        }
      })
      .catch((err) => {
        console.error("Fetch Error:", err);
        setCategoryAttributes(null);
      })
      .finally(() => setLoading(false));
  }, [categorySlug, typeSlug]);

  return (
    <View className="flex-1 ">
      {/* Dynamic Header - Styled like CategoryPage */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 pt-10 pb-5">
          <Text className="text-2xl text-center font-extrabold text-primary tracking-tight">
            {categoryName || "Training"}
          </Text>
        </View>

        {loading ? (
          <View>
            <Skeleton className="h-6 w-32 mb-4 mx-auto rounded-md" />
            <Skeleton className="h-48 w-full rounded-3xl" />
          </View>
        ) : (
          <>
            {/* TITLE */}
            <Text className="text-2xl text-center font-extrabold pb-6 tracking-tight">
              Training Description
            </Text>

            {/* DESCRIPTION CARD */}
            <Text className="text-slate-900 text-center text-xl/9">
              {categoryAttributes?.description ||
                "No description found in database."}
            </Text>
          </>
        )}
      </ScrollView>

      {/* FOOTER BUTTON */}
      <View className="w-full p-5 bg-white border-t border-slate-200">
        <TouchableOpacity
          disabled={loading}
          onPress={() => {
            if (!categorySlug) return;
            router.push({
              pathname: "/module",
              params: {
                categorySlug,
                module: "1",
              },
            });
          }}
          className={`h-16 rounded-2xl justify-center items-center ${
            loading ? "bg-slate-400" : "bg-primary"
          }`}
        >
          <Text className="text-white font-bold text-lg mr-2">
            Start Training
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

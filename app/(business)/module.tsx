import { trainingService } from "@/services/trainingService";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ModulePage() {
  const { categorySlug, module } = useLocalSearchParams();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categorySlug || !module) return;

    const fetchModule = async () => {
      setLoading(true);
      try {
        const res = await trainingService.getModule(
          categorySlug as string,
          parseInt(module as string),
        );

        setData(res);

        scrollRef.current?.scrollTo({ y: 0, animated: true });
      } catch (err) {
        console.error("Error fetching module:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchModule();
  }, [module, categorySlug]);

  const formatText = (text: any) => {
    if (!text) return "";
    return String(text).replace(/\\n/g, "\n").replace(/\s+/g, " ").trim();
  };

  /**
   * 🔥 NORMALIZE ANY CONTENT SHAPE
   */
  const normalizeContent = (content: any) => {
    if (!content) return [];

    // If backend returns string JSON
    if (typeof content === "string") {
      try {
        content = JSON.parse(content);
      } catch (e) {
        return [{ title: "Content", description: content }];
      }
    }

    // If single object → wrap into array
    if (!Array.isArray(content)) {
      content = [content];
    }

    return content;
  };

  const renderDynamicItem = (item: any, index: number) => {
    return (
      <View
        key={index}
        className="bg-white p-6 rounded-3xl mb-4 shadow-sm border border-slate-100"
      >
        {/* TITLE */}
        {item.title && (
          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center mr-3">
              <Text className="text-primary font-bold">{index + 1}</Text>
            </View>
            <Text className="flex-1 text-xl font-bold text-slate-800">
              {item.title}
            </Text>
          </View>
        )}

        {/* DESCRIPTION */}
        {item.description && (
          <Text className="text-lg text-slate-600 leading-7 mb-3">
            {formatText(item.description)}
          </Text>
        )}

        {/* ARRAY: advantages */}
        {Array.isArray(item.advantages) && (
          <View className="mt-2">
            <Text className="font-bold text-slate-700 mb-2">Advantages</Text>
            {item.advantages.map((a: string, i: number) => (
              <Text key={i} className="text-slate-600 ml-2">
                • {formatText(a)}
              </Text>
            ))}
          </View>
        )}

        {/* ARRAY OBJECT: required_mindset */}
        {Array.isArray(item.required_mindset) && (
          <View className="mt-2">
            <Text className="font-bold text-slate-700 mb-2">
              Required Mindset
            </Text>
            {item.required_mindset.map((m: any, i: number) => (
              <View key={i} className="mb-2 ml-2">
                <Text className="font-semibold text-slate-700">• {m.name}</Text>
                <Text className="text-slate-600 ml-3">
                  {formatText(m.description)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* BUDGET TABLE */}
        {Array.isArray(item.budget) && (
          <View className="mt-2">
            <Text className="font-bold text-slate-700 mb-2">
              Budget Breakdown
            </Text>
            {item.budget.map((b: any, i: number) => (
              <Text key={i} className="text-slate-600 ml-2">
                • {b.item}: ₱{b.min_cost} - ₱{b.max_cost}
              </Text>
            ))}

            {item.estimated_total && (
              <Text className="mt-2 font-semibold text-slate-700">
                Estimated Total: ₱{item.estimated_total.min_cost} - ₱
                {item.estimated_total.max_cost}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const rawContent = data?.data?.attributes?.content;
  const contentArray = normalizeContent(rawContent);

  const meta = data?.meta;
  const progress = meta ? (meta.current_module / meta.total_modules) * 100 : 0;

  const handleNext = () => {
    if (meta?.is_last) {
      router.push("/congratulations");
    } else if (meta?.next_module) {
      router.setParams({
        module: meta.next_module.toString(),
      });
    }
  };

  const handleBack = () => {
    if (!meta?.is_first && meta?.prev_module) {
      router.setParams({
        module: meta.prev_module.toString(),
      });
    } else {
      router.back();
    }
  };

  if (loading && !data) {
    return (
      <View className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* HEADER */}
      <View className="bg-white p-6 shadow-sm">
        <View className="flex-row justify-between mb-2">
          <Text className="text-slate-400 font-bold text-xs uppercase">
            Module {meta?.current_module ?? 0} of {meta?.total_modules ?? 0}
          </Text>
          <Text className="text-primary font-bold text-xs">
            {Math.round(progress)}% Complete
          </Text>
        </View>

        <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <View
            className="h-full bg-primary"
            style={{ width: `${progress}%` }}
          />
        </View>
      </View>

      {/* CONTENT */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 24, paddingBottom: 130 }}
      >
        {contentArray.length > 0 ? (
          contentArray.map(renderDynamicItem)
        ) : (
          <View className="items-center mt-10">
            <Text className="text-slate-400 italic">
              No content available for this module.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* FOOTER */}
      <View className="w-full p-5 bg-white border-t border-slate-200 flex-row gap-x-3">
        {!meta?.is_first && (
          <TouchableOpacity
            onPress={handleBack}
            className="flex-1 h-16 border border-slate-200 rounded-2xl items-center justify-center"
          >
            <Text className="text-slate-600 font-bold">Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleNext}
          disabled={loading}
          className={`flex-[2] h-16 rounded-2xl items-center justify-center ${
            loading ? "bg-slate-400" : "bg-primary"
          }`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold">
              {meta?.is_last ? "Finish Training" : "Continue"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

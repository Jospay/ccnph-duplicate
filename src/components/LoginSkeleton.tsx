import { Skeleton } from "@/components/ui/skeleton";
import React from "react";
import { View } from "react-native";

export const LoginSkeleton = () => (
  <View className="gap-y-6">
    <View className="items-center mb-4">
      <View className="mt-[-76px] bg-white rounded-full shadow-sm">
        <Skeleton className="w-32 h-32 rounded-full border-4 border-white" />
      </View>
    </View>
    <View className="items-center gap-y-3">
      <Skeleton className="h-8 w-48 rounded-lg" />
      <View className="items-center gap-y-1.5 w-full">
        <Skeleton className="h-3 w-[90%] rounded-md" />
        <Skeleton className="h-3 w-[80%] rounded-md" />
      </View>
    </View>
    <View className="gap-y-5 mt-2">
      <Skeleton className="h-[58px] w-full rounded-2xl" />
      <Skeleton className="h-[58px] w-full rounded-2xl" />
    </View>
    <Skeleton className="h-[64px] w-full rounded-2xl mt-4" />
  </View>
);

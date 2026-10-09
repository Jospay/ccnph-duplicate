import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

// Product Data Contract Type
export interface Product {
  id: string;
  image: string;
  name: string;
  price: string | number;
  sold?: string | number;
  rating: number | null;
  compare_price?: number | null;
  sold_count: string | number | null;
  stock: number;
  // location: string;
  category: string;

  // Cooperative scope label (Local / National)
  scope?: "local" | "national";

  // Favorite / Collection
  isLiked?: boolean;
  isOnSale?: boolean;
  quantity?: number;
}

interface ProductCardProps {
  item: Product;
  onPress: () => void;
  /**
   * Optional favorite handler.
   * If provided, the heart button becomes clickable.
   */
  onFavoritePress?: () => void;
}

// Badge look for each scope
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

export const ProductCard = React.memo(
  ({ item, onPress, onFavoritePress }: ProductCardProps) => {
    const badge = item.scope ? SCOPE_BADGE[item.scope] : null;

    return (
      <View
        className="bg-white rounded-2xl p-2 border border-slate-100 mb-2 shadow overflow-hidden relative"
        style={{
          width: "49%",
        }}
      >
        {/* Main Product Action Zone (Image & Details) */}
        <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
          {/* Product Image + Scope Label */}
          <View className="relative">
            <Image
              source={{
                uri: item.image,
              }}
              className="rounded-xl"
              style={{
                width: "100%",
                height: 150,
              }}
            />

            {badge && (
              <View
                className={`absolute top-2 left-2 flex-row items-center px-2 py-1 rounded-full ${badge.bg}`}
              >
                <Ionicons name={badge.icon} size={10} color="#ffffff" />
                <Text className="text-white text-[10px] font-bold ml-1">
                  {badge.label}
                </Text>
              </View>
            )}
          </View>

          <View className="pt-3">
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              className="font-semibold text-slate-800"
            >
              {item.name}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Pricing & Favorite Interactive Section */}
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onPress}
            className="flex-1"
          >
            <Text className="text-primary font-bold text-lg mt-1">
              {item.price}
            </Text>
          </TouchableOpacity>

          {/* Independent Favorite Button Zone */}
          <TouchableOpacity
            disabled={!onFavoritePress}
            onPress={onFavoritePress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="p-1 z-10"
          >
            <Ionicons
              name={item.isLiked ? "heart" : "heart-outline"}
              size={20}
              color={item.isLiked ? "#D70127" : "#64748b"}
            />
          </TouchableOpacity>
        </View>

        {item.compare_price != null && Number(item.compare_price) > 0 && (
          <Text className="text-xs text-slate-400 line-through">
            ₱
            {Number(item.compare_price).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        )}

        {/* Bottom Metadata Action Zone */}
        <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
          <View className="flex-row items-center justify-start my-1">
            <Text numberOfLines={1} className="text-slate-500 text-xs">
              {item.sold_count}
            </Text>

            <View className="h-4 w-[1px] bg-slate-300 mx-2" />

            <Ionicons name="star" size={12} color="#FBBF24" />

            <Text className="text-slate-600 text-xs ml-1">
              {item.rating ?? 0}
            </Text>
          </View>

          <View className="flex-row border-t border-slate-100 items-center pt-2 mt-2">
            <Text
              numberOfLines={1}
              className="text-slate-500 text-xs ml-1 flex-1"
            >
              {item.stock} AVAILABLE
            </Text>

            <Ionicons name="cube-outline" size={14} color="#64748b" />
          </View>
        </TouchableOpacity>
      </View>
    );
  },
);

ProductCard.displayName = "ProductCard";

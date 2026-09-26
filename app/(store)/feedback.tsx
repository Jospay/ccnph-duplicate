import {
  fetchProductReviewsAPI,
  ReviewItem,
  ReviewStats,
} from "@/services/productService";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// --- VIDEO PLAYER COMPONENT ---
function ReviewVideoPlayer({ videoUrl }: { videoUrl: string }) {
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = false;
  });

  return (
    <View className="mt-2.5 mb-1">
      <View className="w-full h-44 rounded-xl overflow-hidden bg-black">
        <VideoView
          style={{ width: "100%", height: "100%" }}
          player={player}
          allowsFullscreen
          allowsPictureInPicture
        />
      </View>
    </View>
  );
}

export default function ProductFeedbackScreen() {
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId: string }>();

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);

  // Fullscreen Image Modal State
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  const loadReviews = async (
    targetPage = 1,
    filter = selectedFilter,
    isRefresh = false,
  ) => {
    if (!productId) return;

    try {
      if (targetPage === 1 && !isRefresh) setLoading(true);

      const response = await fetchProductReviewsAPI(
        productId,
        targetPage,
        filter,
      );

      if (response.success) {
        setStats(response.data.stats);
        setHasMore(response.data.pagination.has_more);
        setPage(targetPage);

        if (targetPage === 1) {
          setReviews(response.data.reviews);
        } else {
          setReviews((prev) => [...prev, ...response.data.reviews]);
        }
      }
    } catch (error) {
      console.error("[LOAD_REVIEWS_ERROR]:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadReviews(1, selectedFilter);
  }, [productId, selectedFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadReviews(1, selectedFilter, true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingMore && !loading) {
      setLoadingMore(true);
      loadReviews(page + 1, selectedFilter);
    }
  };

  const filterOptions = ["all", "5", "4", "3", "2", "1"];

  const renderReviewItem = ({ item }: { item: ReviewItem }) => (
    <View className="bg-white p-4 mb-3 rounded-2xl border border-slate-100 shadow-xs">
      {/* User Header */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1">
          {item.user_avatar ? (
            <Image
              source={{ uri: item.user_avatar }}
              className="w-9 h-9 rounded-full bg-slate-200 mr-2.5"
            />
          ) : (
            <View className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center mr-2.5 border border-slate-200">
              <Ionicons name="person" size={18} color="#94a3b8" />
            </View>
          )}
          <View className="flex-1">
            <Text
              className="font-semibold text-slate-800 text-sm"
              numberOfLines={1}
            >
              {item.user_name}
            </Text>
            <Text className="text-[10px] text-slate-400 mt-0.5">
              {item.created_at}
            </Text>
          </View>
        </View>

        {/* Stars */}
        <View className="flex-row items-center">
          {[1, 2, 3, 4, 5].map((s) => (
            <Ionicons
              key={s}
              name="star"
              size={13}
              color={s <= item.rating ? "#f59e0b" : "#cbd5e1"}
              style={{ marginLeft: 1 }}
            />
          ))}
        </View>
      </View>

      {/* Review Comment */}
      {item.comment ? (
        <Text className="text-xs text-slate-700 leading-relaxed my-1">
          {item.comment}
        </Text>
      ) : (
        <Text className="text-xs text-slate-400 italic my-1">
          No written feedback.
        </Text>
      )}

      {/* Video Preview */}
      {item.video_url && <ReviewVideoPlayer videoUrl={item.video_url} />}

      {/* Photos Grid */}
      {item.images && item.images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row mt-2"
        >
          {item.images.map((imgUri, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.8}
              onPress={() => setSelectedImageUri(imgUri)}
              className="mr-2"
            >
              <Image
                source={{ uri: imgUri }}
                className="w-20 h-20 rounded-xl bg-slate-100"
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header Summary & Filters */}
      <View className="bg-white p-4 my-3 border-b border-slate-100">
        {stats && (
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
            <View className="items-center px-4">
              <Text className="text-3xl font-extrabold text-slate-800">
                {stats.average_rating}
              </Text>
              <View className="flex-row my-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons
                    key={s}
                    name="star"
                    size={14}
                    color={
                      s <= Math.round(stats.average_rating)
                        ? "#f59e0b"
                        : "#cbd5e1"
                    }
                  />
                ))}
              </View>
              <Text className="text-[11px] text-slate-400 font-medium">
                {stats.total_reviews} reviews
              </Text>
            </View>

            {/* Breakdown bars */}
            <View className="flex-1 ml-4 justify-center">
              {[5, 4, 3, 2, 1].map((star) => {
                const count =
                  stats.breakdown[star as keyof typeof stats.breakdown] || 0;
                const percentage = stats.total_reviews
                  ? (count / stats.total_reviews) * 100
                  : 0;

                return (
                  <View key={star} className="flex-row items-center my-0.5">
                    <Text className="text-[10px] text-slate-500 w-3 font-semibold">
                      {star}
                    </Text>
                    <Ionicons name="star" size={10} color="#f59e0b" />
                    <View className="flex-1 h-1.5 bg-slate-100 rounded-full mx-2 overflow-hidden">
                      <View
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </View>
                    <Text className="text-[10px] text-slate-400 w-6 text-right">
                      {count}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row pt-3"
        >
          {filterOptions.map((filter) => {
            const isActive = selectedFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => setSelectedFilter(filter)}
                className={`px-3.5 py-1.5 rounded-full mr-2 border flex-row items-center ${
                  isActive
                    ? "bg-[#034194] border-[#034194]"
                    : "bg-white border-slate-200"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isActive ? "text-white" : "text-slate-600"
                  }`}
                >
                  {filter === "all" ? "All" : `${filter} Star`}
                </Text>
                {filter !== "all" && (
                  <Ionicons
                    name="star"
                    size={11}
                    color={isActive ? "#ffffff" : "#f59e0b"}
                    style={{ marginLeft: 3 }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Review List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#034194" />
          <Text className="text-xs text-slate-400 mt-2">
            Loading feedback...
          </Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderReviewItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                size="small"
                color="#034194"
                className="py-4"
              />
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <Ionicons
                name="chatbox-ellipses-outline"
                size={48}
                color="#cbd5e1"
              />
              <Text className="text-slate-400 font-medium mt-3">
                No reviews found for this filter.
              </Text>
            </View>
          }
        />
      )}

      {/* Fullscreen Image Modal */}
      <Modal
        visible={!!selectedImageUri}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSelectedImageUri(null)}
      >
        <View className="flex-1 bg-black justify-center items-center">
          <TouchableOpacity
            onPress={() => setSelectedImageUri(null)}
            className="absolute top-12 right-6 z-10 p-2"
          >
            <Ionicons name="close" size={30} color="#ffffff" />
          </TouchableOpacity>
          {selectedImageUri && (
            <Image
              source={{ uri: selectedImageUri }}
              className="w-full h-4/5"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

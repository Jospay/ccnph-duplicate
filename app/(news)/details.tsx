import { Skeleton } from "@/components/ui/skeleton";
import { getNewsById, NewsDetail } from "@/services/newsService";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import ImageViewer from "react-native-image-zoom-viewer";
import RenderHTML from "react-native-render-html";

export default function NewsDetails() {
  const { id } = useLocalSearchParams();

  const [news, setNews] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [imageVisible, setImageVisible] = useState(false);

  const { width: contentWidth } = useWindowDimensions();

  useEffect(() => {
    if (!id) return;

    loadNews();
  }, [id]);

  const loadNews = async () => {
    try {
      setLoading(true);

      const newsId = Array.isArray(id) ? id[0] : id;

      const data = await getNewsById(Number(newsId));

      setNews(data);
    } catch (err) {
      console.log("News detail error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";

    // Convert MySQL format to valid Date
    const date = new Date(dateString.replace(" ", "T"));

    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  // ================= LOADING SKELETON =================
  if (loading) {
    return (
      <View className="flex-1 bg-white">
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* TITLE */}
          <View className="p-4 pt-9">
            <Skeleton className="h-8 w-full rounded-full mb-4" />

            <Skeleton className="h-8 w-11/12 rounded-full mb-4" />

            <Skeleton className="h-4 w-52 rounded-full" />
          </View>

          {/* IMAGE */}
          <Skeleton className="w-full h-60 rounded-none mt-2" />

          {/* CONTENT */}
          <View className="p-4 mt-5">
            <Skeleton className="h-4 w-full rounded-full mb-4" />

            <Skeleton className="h-4 w-full rounded-full mb-4" />

            <Skeleton className="h-4 w-10/12 rounded-full mb-4" />

            <Skeleton className="h-4 w-full rounded-full mb-4" />

            <Skeleton className="h-4 w-11/12 rounded-full mb-4" />

            <Skeleton className="h-4 w-9/12 rounded-full mb-4" />

            <Skeleton className="h-4 w-full rounded-full mb-4" />

            <Skeleton className="h-4 w-8/12 rounded-full mb-4" />

            <Skeleton className="h-4 w-full rounded-full mb-4" />

            <Skeleton className="h-4 w-10/12 rounded-full mb-4" />
          </View>
        </ScrollView>
      </View>
    );
  }

  // ================= NO DATA =================
  if (!news) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-slate-400">No news found</Text>
      </View>
    );
  }

  const imageUrl = `https://newsphilippinesonline.com/editortextadminpanel/postimages/${news.PostImage}`;

  return (
    <View className="flex-1 bg-white">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* TITLE */}
        <View className="p-4">
          <Text className="text-2xl font-bold pt-5 text-slate-800">
            {news.PostTitle}
          </Text>

          <Text className="text-xs text-slate-400 my-2">
            {news.CategoryName} | <Text className="font-bold">Posted on</Text>{" "}
            {formatDate(news.PostingDate)}
          </Text>
        </View>

        {/* CLICKABLE IMAGE */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setImageVisible(true)}
        >
          <Image
            source={{ uri: imageUrl }}
            className="w-full h-60 bg-slate-100"
            resizeMode="cover"
          />
        </TouchableOpacity>

        {/* HTML CONTENT */}
        <View className="p-4 mt-5">
          <RenderHTML
            contentWidth={contentWidth}
            source={{ html: news.PostDetails || "" }}
            ignoredDomTags={["o:p", "font"]}
            tagsStyles={{
              p: {
                fontSize: 15,
                lineHeight: 22,
                color: "#334155",
                marginBottom: 10,
              },

              b: {
                fontWeight: "700",
              },

              strong: {
                fontWeight: "700",
              },

              i: {
                fontStyle: "italic",
              },

              span: {
                fontSize: 15,
              },
            }}
          />
        </View>
      </ScrollView>

      {/* ================= IMAGE VIEWER ================= */}
      <Modal
        visible={imageVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setImageVisible(false)}
      >
        <ImageViewer
          imageUrls={[
            {
              url: imageUrl,
            },
          ]}
          enableSwipeDown
          onSwipeDown={() => setImageVisible(false)}
          backgroundColor="black"
          renderHeader={() => (
            <TouchableOpacity
              onPress={() => setImageVisible(false)}
              style={{
                position: "absolute",
                top: 50,
                right: 20,
                zIndex: 10,
                padding: 10,
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 18,
                  fontWeight: "bold",
                }}
              >
                ✕
              </Text>
            </TouchableOpacity>
          )}
        />
      </Modal>
    </View>
  );
}

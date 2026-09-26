import { CustomAlert } from "@/components/CustomAlert";
import { ProductCard } from "@/components/ProductItems";
import { addToCart, getCart } from "@/services/cart";
import {
  DetailedProduct,
  fetchProductReviewsAPI,
  getProductShow,
  getStoreHome,
  Product,
  ReviewItem,
  selectDirectCheckout,
  toggleCollection,
} from "@/services/productService";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import delivery from "../../../assets/images/icon/deliveryBlueB.png";
import UserProfile from "../../../assets/images/UserProfile.jpg";

type ActionType = "cart" | "buy_now" | null;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function Products() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [menuVisible, setMenuVisible] = useState(false);
  const [product, setProduct] = useState<DetailedProduct | null>(null);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [mainImage, setMainImage] = useState<string | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<
    Record<string, string>
  >({});
  const [quantity, setQuantity] = useState<number>(1);
  const [modal, setModal] = useState<boolean>(false);
  const [modalAction, setModalAction] = useState<ActionType>(null);
  const [cartCount, setCartCount] = useState<number>(0);

  // Custom Alert State
  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  // Animation States
  const [showFlyAnimation, setShowFlyAnimation] = useState<boolean>(false);
  const flyX = useRef(new Animated.Value(0)).current;
  const flyY = useRef(new Animated.Value(0)).current;
  const flyScale = useRef(new Animated.Value(1)).current;

  const fetchCartCountOnly = async () => {
    try {
      const response = await getCart();
      if (
        response &&
        response.success &&
        response.cart &&
        response.cart.items
      ) {
        const totalItemsCount = response.cart.items.reduce(
          (accumulator, item) => accumulator + (item.quantity ?? 0),
          0,
        );
        setCartCount(totalItemsCount);
      }
    } catch (error) {
      console.error(
        "Failed silently to pull modern cart status parameters:",
        error,
      );
    }
  };

  useEffect(() => {
    if (!slug) {
      setError("No product identifier provided.");
      setLoading(false);
      return;
    }

    const fetchProductData = async () => {
      try {
        setLoading(true);
        setError(null);
        setQuantity(1);

        const response = await getProductShow(slug);
        const detailedProduct = response.product;
        setProduct(detailedProduct);

        let initialImage: string | null = null;
        if (detailedProduct.images && detailedProduct.images.length > 0) {
          initialImage = detailedProduct.images[0].url;
        }

        const initialSelections: Record<string, string> = {};
        const defaultVariant =
          detailedProduct.variants.find((v) => v.is_default) ||
          detailedProduct.variants[0];

        if (defaultVariant) {
          if (defaultVariant.image) {
            initialImage = defaultVariant.image;
          }
          defaultVariant.attributes.forEach((attr) => {
            initialSelections[attr.name] = attr.value;
          });
        }

        setMainImage(initialImage);
        setSelectedAttributes(initialSelections);

        if (
          detailedProduct.categories &&
          detailedProduct.categories.length > 0
        ) {
          const primaryCatId = detailedProduct.categories[0].id;
          const homeData = await getStoreHome(primaryCatId, 1);

          const combinedRecs = [
            ...(homeData.data.productsTopDeals || []),
            ...(homeData.data.productsDiscover || []),
          ];

          const uniqueRecs = combinedRecs.reduce((acc: Product[], current) => {
            const isDuplicate = acc.some((item) => item.id === current.id);
            if (!isDuplicate && current.id !== detailedProduct.id) {
              acc.push(current);
            }
            return acc;
          }, []);

          setRecommendations(uniqueRecs.slice(0, 4));
        }
      } catch (err) {
        console.error("Failed to load product page details:", err);
        setError("Could not load product details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [slug]);

  useFocusEffect(
    useCallback(() => {
      fetchCartCountOnly();
    }, []),
  );

  // Variant matching logics
  const currentVariant =
    product?.variants.find(
      (v) =>
        v.attributes.every(
          (attr) => selectedAttributes[attr.name] === attr.value,
        ) && v.attributes.length === Object.keys(selectedAttributes).length,
    ) || null;

  const defaultVariant =
    product?.variants.find((v) => v.is_default) || product?.variants[0];
  const displayPrice = currentVariant
    ? currentVariant.price
    : defaultVariant
      ? defaultVariant.price
      : "0";
  const displayComparePrice = currentVariant
    ? currentVariant.compare_price
    : defaultVariant
      ? defaultVariant.compare_price
      : null;
  const totalDefaultStock =
    product?.variants.reduce((acc, v) => acc + v.stock, 0) || 0;

  const currentStock = currentVariant
    ? currentVariant.stock
    : Object.keys(selectedAttributes).length > 0
      ? product?.variants
          .filter((v) =>
            Object.entries(selectedAttributes).every(([key, val]) =>
              v.attributes.some((a) => a.name === key && a.value === val),
            ),
          )
          .reduce((acc, v) => acc + v.stock, 0) || 0
      : totalDefaultStock;

  const getGroupedAttributes = () => {
    if (!product) return {};
    const grouped: Record<string, string[]> = {};
    product.variants.forEach((v) => {
      v.attributes.forEach((attr) => {
        if (!grouped[attr.name]) grouped[attr.name] = [];
        if (!grouped[attr.name].includes(attr.value))
          grouped[attr.name].push(attr.value);
      });
    });
    return grouped;
  };

  const groupedAttributes = getGroupedAttributes();

  const isOptionAvailable = (attributeName: string, optionValue: string) => {
    if (!product) return false;
    const testSelections = {
      ...selectedAttributes,
      [attributeName]: optionValue,
    };
    return product.variants.some((variant) => {
      return (
        Object.entries(testSelections).every(([key, val]) =>
          variant.attributes.some(
            (attr) => attr.name === key && attr.value === val,
          ),
        ) && variant.stock > 0
      );
    });
  };

  const handleAttributeSelect = (attributeName: string, value: string) => {
    let updatedSelections = { ...selectedAttributes };
    if (updatedSelections[attributeName] === value) {
      delete updatedSelections[attributeName];
    } else {
      updatedSelections[attributeName] = value;
    }
    setSelectedAttributes(updatedSelections);

    const matchingVariant = product?.variants.find(
      (v) =>
        v.attributes.every(
          (attr) => updatedSelections[attr.name] === attr.value,
        ) && v.attributes.length === Object.keys(updatedSelections).length,
    );

    if (matchingVariant?.image) setMainImage(matchingVariant.image);

    if (matchingVariant) {
      if (matchingVariant.stock === 0) setQuantity(0);
      else if (quantity > matchingVariant.stock || quantity === 0)
        setQuantity(matchingVariant.stock);
    } else {
      setQuantity(currentStock > 0 ? 1 : 0);
    }
  };

  const handleToggleFavorite = async (
    productId: number,
    recommendationSlug: string,
  ) => {
    if (!recommendationSlug) return;
    setRecommendations((p) =>
      p.map((item) =>
        item.id === productId ? { ...item, is_liked: !item.is_liked } : item,
      ),
    );
    try {
      await toggleCollection(recommendationSlug);
    } catch (error) {
      console.error("Failed to sync collection endpoint changes:", error);
      setRecommendations((p) =>
        p.map((item) =>
          item.id === productId ? { ...item, is_liked: !item.is_liked } : item,
        ),
      );
    }
  };

  const triggerFlyAnimation = () => {
    flyX.setValue(0);
    flyY.setValue(0);
    flyScale.setValue(1);
    setShowFlyAnimation(true);

    const targetX = SCREEN_WIDTH / 2 - 45;
    const targetY = -(SCREEN_HEIGHT / 2 - 60);

    Animated.parallel([
      Animated.timing(flyX, {
        toValue: targetX,
        duration: 750,
        useNativeDriver: true,
      }),
      Animated.timing(flyY, {
        toValue: targetY,
        duration: 750,
        useNativeDriver: true,
      }),
      Animated.timing(flyScale, {
        toValue: 0.15,
        duration: 750,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowFlyAnimation(false);
      fetchCartCountOnly();
      // Open the success custom alert container
      setAlert({
        visible: true,
        title: "Success",
        message: "Product successfully added to your cart!",
      });
    });
  };

  const handleConfirmAction = async () => {
    if (!currentVariant) {
      setAlert({
        visible: true,
        title: "Variant Required",
        message: "Please select all product options.",
      });
      return;
    }
    try {
      setSubmitting(true);
      if (modalAction === "cart") {
        await addToCart({ product_variant_id: currentVariant.id, quantity });
        setModal(false);
        setTimeout(() => triggerFlyAnimation(), 300);
        return;
      }
      if (modalAction === "buy_now") {
        const verifyResponse = await selectDirectCheckout({
          mode: "direct",
          product_variant_id: currentVariant.id,
          quantity,
        });
        if (verifyResponse.success) {
          setModal(false);
          router.push({
            pathname: "/checkout",
            params: {
              mode: "direct",
              product_variant_id: currentVariant.id,
              quantity,
            },
          });
        }
        return;
      }
    } catch (error: any) {
      console.error(error);
      setAlert({
        visible: true,
        title: "Checkout Error",
        message:
          error?.response?.data?.message ||
          "Something went wrong while executing request.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatImageUrl = (url: string | null) => {
    if (!url) return "";
    return url.startsWith("http") ? url : `http://192.168.1.53:8000${url}`;
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0052cc" />
        <Text className="mt-4 text-slate-500 font-medium">
          Loading details...
        </Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#D70127" />
        <Text className="text-xl font-semibold text-slate-800 mt-4 text-center">
          {error || "Product not found"}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-6 bg-primary px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fallbackImageUri = product.images?.[0]?.url || "";
  const dynamicGalleryUrls = (product.images || [])
    .map((img) => img.url)
    .concat(
      (product.variants || [])
        .map((v) => v.image)
        .filter((img): img is string => !!img),
    )
    .filter((url, index, self) => self.indexOf(url) === index);

  return (
    <View className="flex-1 bg-white relative">
      <HeaderSection
        router={router}
        cartCount={cartCount}
        menuVisible={menuVisible}
        setMenuVisible={setMenuVisible}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        <GallerySection
          mainImage={mainImage}
          fallbackImageUri={fallbackImageUri}
          dynamicGalleryUrls={dynamicGalleryUrls}
          formatImageUrl={formatImageUrl}
          setMainImage={setMainImage}
        />

        <ProductInfoSection
          product={product}
          displayPrice={displayPrice}
          displayComparePrice={displayComparePrice}
          currentStock={currentStock}
        />

        {product.store && (
          <MerchantPartnerSection product={product} router={router} />
        )}

        {/* RECOMMENDATIONS SECTION */}
        <View className="pt-3">
          <View className="w-full h-[10px] bg-slate-300" />
          <View className="py-4 px-3">
            <View className="bg-blue py-2.5 rounded-md mb-4">
              <Text className="text-primary text-center font-bold text-xl">
                Products you may like
              </Text>
            </View>
            <View className="flex-row flex-wrap justify-between">
              {recommendations.map((item) => (
                <ProductCard
                  key={item.id}
                  item={{
                    id: item.id.toString(),
                    name: item.name,
                    price: item.price
                      ? `₱${Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "₱0.00",
                    image: item.image ?? "",
                    sold_count: `${item.sold_count ?? 0} sold`,
                    rating: item.rating,
                    stock: item.stock,
                    category: "",
                    isLiked: item.is_liked,
                  }}
                  onPress={() =>
                    item.slug &&
                    router.push({
                      pathname: "/products/[slug]",
                      params: { slug: item.slug },
                    })
                  }
                  onFavoritePress={() =>
                    handleToggleFavorite(item.id, item.slug)
                  }
                />
              ))}
              {recommendations.length === 0 && (
                <Text className="text-center text-slate-400 w-full py-4">
                  No other products found in this category.
                </Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FOOTER ACTIONS */}
      <View className="absolute bottom-0 left-0 right-0 bg-white p-3 border-t border-slate-100 z-10">
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => {
              if (!product.store?.id) return;
              router.push({
                pathname: "/(store-chat)/",
                params: {
                  storeId: String(product.store.id),
                  storeName: product.store.name,
                },
              });
            }}
            className="flex-1 p-1.5 bg-green-500 rounded-xl items-center justify-center"
          >
            <Ionicons name="chatbubble-outline" size={24} color="#fff" />
            <Text className="text-white font-semibold text-base pt-1">
              Chat
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setModalAction("cart");
              setModal(true);
            }}
            className="flex-1 p-1.5 bg-primary rounded-xl items-center justify-center"
          >
            <Ionicons name="cart-outline" size={24} color="#fff" />
            <Text className="text-white font-semibold text-base pt-1">
              Add to cart
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setModalAction("buy_now");
              setModal(true);
            }}
            className="flex-1 p-1.5 bg-[#D70127] rounded-xl items-center justify-center"
          >
            <Text className="text-white font-semibold text-base">Buy Now</Text>
            <Text className="text-white font-semibold text-base">
              ₱
              {Number(displayPrice).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <VariantPickerModal
        modal={modal}
        setModal={setModal}
        product={product}
        mainImage={mainImage}
        fallbackImageUri={fallbackImageUri}
        displayPrice={displayPrice}
        selectedAttributes={selectedAttributes}
        currentStock={currentStock}
        groupedAttributes={groupedAttributes}
        quantity={quantity}
        setQuantity={setQuantity}
        submitting={submitting}
        modalAction={modalAction}
        isOptionAvailable={isOptionAvailable}
        handleAttributeSelect={handleAttributeSelect}
        handleConfirmAction={handleConfirmAction}
        formatImageUrl={formatImageUrl}
      />

      {/* FLY TO CART ANIMATED CONTAINER */}
      {showFlyAnimation && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.animatedFlyer,
            {
              transform: [
                { translateX: flyX },
                { translateY: flyY },
                { scale: flyScale },
              ],
            },
          ]}
        >
          <Image
            source={{ uri: formatImageUrl(mainImage || fallbackImageUri) }}
            style={{ width: 70, height: 70, borderRadius: 12 }}
          />
        </Animated.View>
      )}

      {/* CUSTOM GLOBAL DIALOG ALERT CONTROLLER */}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </View>
  );
}

// ================= SUB-COMPONENTS TO DRILL DOWN COMPONENT LENGTH =================

const HeaderSection = ({
  router,
  cartCount,
  menuVisible,
  setMenuVisible,
}: any) => (
  <View className="bg-primary w-full items-center rounded-b-2xl pt-14 pb-4">
    <View className="flex-row justify-between items-center w-full px-6">
      <View className="w-[31px]">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
      </View>
      <View className="flex-row items-center gap-1">
        <TouchableOpacity
          onPress={() => router.push("/cart")}
          activeOpacity={0.8}
          className="h-11 w-11 p-2 relative"
        >
          <Ionicons name="cart-outline" size={26} color="#ffffff" />
          {cartCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-[#D70127] rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 border border-white">
              <Text className="text-white text-[10px] font-bold">
                {cartCount > 99 ? "99+" : cartCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <View className="relative">
          <TouchableOpacity
            activeOpacity={0.8}
            className="p-2"
            onPress={() => setMenuVisible(!menuVisible)}
          >
            <Ionicons name="ellipsis-vertical" size={26} color="#ffffff" />
          </TouchableOpacity>
          {menuVisible && (
            <>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setMenuVisible(false)}
                className="absolute"
                style={{
                  position: "absolute",
                  top: -1000,
                  left: -1000,
                  width: 3000,
                  height: 3000,
                  zIndex: 998,
                }}
              />
              <View
                className="absolute top-12 right-0 bg-white rounded-xl border border-slate-200 w-52 overflow-hidden"
                style={{ elevation: 10, zIndex: 999 }}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  className="flex-row items-center px-4 py-3"
                  onPress={() => {
                    setMenuVisible(false);
                    router.replace("/home");
                  }}
                >
                  <Ionicons name="home-outline" size={20} color="#475569" />
                  <Text className="ml-3 text-slate-700 font-medium">
                    Return Home
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  </View>
);

const GallerySection = ({
  mainImage,
  fallbackImageUri,
  dynamicGalleryUrls,
  formatImageUrl,
  setMainImage,
}: any) => (
  <View>
    <View className="p-1 mt-2 border border-primary/20 shadow-brand rounded-2xl relative mx-3">
      {mainImage || fallbackImageUri ? (
        <Image
          source={{ uri: formatImageUrl(mainImage || fallbackImageUri) }}
          className="rounded-xl"
          style={{ width: "100%", height: 350 }}
        />
      ) : (
        <View
          style={{ width: "100%", height: 350 }}
          className="bg-slate-100 items-center border border-green-900 justify-center rounded-xl"
        >
          <Ionicons name="image-outline" size={48} color="#94a3b8" />
        </View>
      )}
    </View>
    {dynamicGalleryUrls.length > 0 && (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-4 px-2"
      >
        {dynamicGalleryUrls.map((imgUrl: string, index: number) => (
          <TouchableOpacity
            key={`gallery-img-${index}`}
            onPress={() => setMainImage(imgUrl)}
            className={`mr-3 rounded-md overflow-hidden border-2 ${mainImage === imgUrl ? "border-primary" : "border-slate-200"}`}
          >
            <Image
              source={{ uri: formatImageUrl(imgUrl) }}
              style={{ width: 70, height: 70 }}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    )}
  </View>
);

const ProductInfoSection = ({
  product,
  displayPrice,
  displayComparePrice,
  currentStock,
}: any) => {
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const loadLatestReviews = async () => {
      if (!product?.id) return;
      try {
        setLoadingReviews(true);
        // Fetch page 1 of reviews
        const response = await fetchProductReviewsAPI(product.id, 1, "all");

        if (isMounted && response?.success && response.data) {
          setReviews(response.data.reviews.slice(0, 2));
          setTotalReviews(response.data.pagination.total);
        }
      } catch (error) {
        console.error("Failed to load product reviews:", error);
      } finally {
        if (isMounted) setLoadingReviews(false);
      }
    };

    loadLatestReviews();

    return () => {
      isMounted = false;
    };
  }, [product?.id]);

  return (
    <View className="py-4 px-3">
      <View className="flex-row pb-4 items-end justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-[#D70127] text-2xl font-semibold mt-2">
            ₱
            {Number(displayPrice).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          {displayComparePrice && (
            <Text className="text-slate-400 line-through text-sm mt-3">
              ₱
              {Number(displayComparePrice).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          )}
        </View>
        <View className="flex-row gap-3 items-center">
          <Text className="text-slate-500">{product.sold_count ?? 0} sold</Text>
          <Text className="text-slate-300">|</Text>
          <Text className="text-slate-500">Stock: {currentStock}</Text>
        </View>
      </View>

      <Text className="text-2xl font-semibold text-primary">
        {product.name}
      </Text>
      <Text className="text-slate-700 text-lg mt-2">
        {product.description || "No product description provided."}
      </Text>

      {/* SHIPPING METRICS */}
      <View className="mt-5 bg-blue rounded-xl p-3">
        <View className="flex-row gap-3 items-center">
          <Image
            source={delivery}
            className="rounded-xl"
            style={{ width: 80, height: 40, resizeMode: "contain" }}
          />
          <View className="flex-1">
            <View className="bg-primary self-start px-5 py-1 rounded-full">
              <Text className="text-white text-[13px]">Fast Delivery</Text>
            </View>
            <Text className="text-slate-600 mt-1 text-[12px]">
              Fast, reliable, and always on time because you deserve delivery
              that moves at your speed.
            </Text>
          </View>
        </View>
      </View>

      {/* DYNAMIC CUSTOMER REVIEWS */}
      <View className="mt-5 bg-blue rounded-xl p-4">
        <View className="flex-row justify-between items-center">
          <Text className="font-semibold text-base">
            <Text className="text-slate-500 pr-3">
              {" "}
              {product.rating ?? 0} ⭐
            </Text>{" "}
            Customer Feedback ({totalReviews})
          </Text>

          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/feedback",
                params: { productId: product.id },
              })
            }
          >
            <Text className="text-primary font-medium">See All</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-3 gap-3">
          {loadingReviews ? (
            <ActivityIndicator size="small" color="#0052cc" className="py-4" />
          ) : reviews.length > 0 ? (
            reviews.map((review) => (
              <View key={review.id} className="bg-white rounded-xl p-3">
                <View className="flex-row justify-between items-start">
                  <View className="flex-row items-center flex-1">
                    <Image
                      source={
                        review.user_avatar
                          ? { uri: review.user_avatar }
                          : UserProfile
                      }
                      style={{ width: 45, height: 45, borderRadius: 100 }}
                    />
                    <View className="ml-3 flex-1">
                      <Text className="font-semibold">{review.user_name}</Text>
                      <Text className="text-slate-500">⭐ {review.rating}</Text>
                    </View>
                  </View>
                </View>
                {review.comment ? (
                  <Text className="text-slate-600 mt-3">{review.comment}</Text>
                ) : null}
              </View>
            ))
          ) : (
            <Text className="text-center text-slate-400 py-3">
              No reviews available for this product yet.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const MerchantPartnerSection = ({ product, router }: any) => (
  <View className="px-3 pb-4">
    <View className="border-2 border-blue rounded-xl p-4">
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center flex-1">
          <View
            style={{
              position: "relative",
              width: 45,
              height: 45,
              alignItems: "center",
            }}
          >
            <Image
              source={
                product.store.logo ? { uri: product.store.logo } : UserProfile
              }
              style={{ width: 45, height: 45, borderRadius: 100 }}
            />

            {product.store.is_official && (
              <View
                style={{
                  position: "absolute",
                  bottom: -4,
                  alignSelf: "center",
                  backgroundColor: "#D70127",
                  borderRadius: 3,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                }}
                className="w-full"
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "bold",
                    color: "#FFFFFF",
                    textAlign: "center",
                  }}
                >
                  Mall
                </Text>
              </View>
            )}
          </View>

          <View className="flex-1 ml-2 mr-3" style={{ minWidth: 0 }}>
            <Text
              className="text-primary text-xl font-semibold"
              style={{ lineHeight: 24 }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {product.store.name}
            </Text>

            <Text className="text-xs mt-1 text-slate-500" numberOfLines={1}>
              {product.store?.description}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            if (!product.store?.slug) return;
            router.push({
              pathname: "/store/[slug]",
              params: { slug: product.store.slug },
            });
          }}
        >
          <View className="bg-blue py-1 px-5 border border-primary rounded-lg">
            <Text className="text-primary font-semibold">Visit</Text>
          </View>
        </TouchableOpacity>
      </View>
      {/* <View className="flex-row justify-between mt-4">
        <View>
          <Text className="text-center font-semibold">
            {product.store?.rating ?? 0}
          </Text>
          <Text className="text-center text-xs text-slate-500">Rating</Text>
        </View>
        <View>
          <Text className="text-center font-semibold">Official</Text>
          <Text className="text-center text-xs text-slate-500">
            Store Status
          </Text>
        </View>
        <View>
          <Text className="text-center font-semibold">100%</Text>
          <Text className="text-center text-xs text-slate-500">
            Chat Response
          </Text>
        </View>
      </View> */}
    </View>
  </View>
);

const VariantPickerModal = ({
  modal,
  setModal,
  product,
  mainImage,
  fallbackImageUri,
  displayPrice,
  selectedAttributes,
  currentStock,
  groupedAttributes,
  quantity,
  setQuantity,
  submitting,
  modalAction,
  isOptionAvailable,
  handleAttributeSelect,
  handleConfirmAction,
  formatImageUrl,
}: any) => (
  <Modal
    visible={modal}
    transparent
    animationType="slide"
    statusBarTranslucent
    onRequestClose={() => setModal(false)}
  >
    <TouchableOpacity
      activeOpacity={1}
      style={styles.modalOverlay}
      onPress={() => setModal(false)}
    >
      <TouchableWithoutFeedback>
        <View className="bg-white rounded-t-3xl max-h-[85%] w-full flex-col">
          <View className="flex-row p-5 border-b border-slate-100">
            <Image
              source={{ uri: formatImageUrl(mainImage || fallbackImageUri) }}
              style={{ width: 90, height: 90 }}
              className="rounded-xl border border-slate-200"
            />
            <View className="ml-4 flex-1 justify-center">
              <Text
                className="text-lg font-bold text-slate-800"
                numberOfLines={1}
              >
                {product.name}
              </Text>
              <Text className="text-[#D70127] text-xl font-bold mt-1">
                ₱
                {Number(displayPrice).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </Text>
              <View className="flex-row items-center gap-1.5 mt-1 flex-wrap">
                <Text className="text-slate-500 text-xs">
                  Selected:{" "}
                  {Object.entries(selectedAttributes)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ") || "None"}
                </Text>
                <Text className="text-slate-300 text-xs">|</Text>
                <Text className="text-slate-500 text-xs font-medium">
                  Stock: {currentStock}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setModal(false)} className="p-1">
              <Ionicons name="close-circle" size={26} color="#cbd5e1" />
            </TouchableOpacity>
          </View>

          <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
            {Object.keys(groupedAttributes).map((attributeName) => (
              <View key={attributeName} className="mb-5">
                <Text className="font-bold text-slate-700 mb-2.5">
                  {attributeName}
                </Text>
                <View className="flex-row flex-wrap">
                  {groupedAttributes[attributeName].map(
                    (optionValue: string) => {
                      const isCurrentlySelected =
                        selectedAttributes[attributeName] === optionValue;
                      const isAvailable = isOptionAvailable(
                        attributeName,
                        optionValue,
                      );
                      return (
                        <TouchableOpacity
                          key={optionValue}
                          disabled={!isAvailable && !isCurrentlySelected}
                          onPress={() =>
                            handleAttributeSelect(attributeName, optionValue)
                          }
                          className={`flex-row items-center px-3 py-2 rounded-xl border mr-2 mb-2 ${
                            isCurrentlySelected
                              ? "bg-blue border-primary"
                              : !isAvailable
                                ? "border-slate-100 bg-slate-100 opacity-40"
                                : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <Text
                            className={`text-sm ${isCurrentlySelected ? "text-primary font-semibold" : !isAvailable ? "text-slate-400" : "text-slate-700"}`}
                          >
                            {optionValue}
                          </Text>
                        </TouchableOpacity>
                      );
                    },
                  )}
                </View>
              </View>
            ))}

            <View className="flex-row justify-between items-center pt-4 border-t border-slate-100">
              <Text className="font-bold text-slate-700">Quantity</Text>
              <View className="flex-row items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                <TouchableOpacity
                  onPress={() =>
                    setQuantity(
                      Math.max(currentStock > 0 ? 1 : 0, quantity - 1),
                    )
                  }
                  className="px-4 py-2 bg-slate-100 active:bg-slate-200"
                >
                  <Text className="text-lg font-bold text-slate-600">-</Text>
                </TouchableOpacity>
                <Text className="px-5 font-semibold text-base text-slate-800">
                  {quantity}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setQuantity(Math.min(currentStock, quantity + 1))
                  }
                  className="px-4 py-2 bg-slate-100 active:bg-slate-200"
                >
                  <Text className="text-lg font-bold text-slate-600">+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View className="w-full p-5 bg-white border-t border-slate-200">
            <TouchableOpacity
              onPress={handleConfirmAction}
              disabled={
                submitting ||
                currentStock === 0 ||
                quantity === 0 ||
                Object.keys(selectedAttributes).length !==
                  Object.keys(groupedAttributes).length
              }
              className={`h-16 rounded-2xl justify-center items-center ${
                submitting ||
                currentStock === 0 ||
                quantity === 0 ||
                Object.keys(selectedAttributes).length !==
                  Object.keys(groupedAttributes).length
                  ? "bg-slate-300"
                  : modalAction === "buy_now"
                    ? "bg-[#D70127]"
                    : "bg-primary"
              }`}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white font-bold text-lg">
                  {Object.keys(selectedAttributes).length !==
                  Object.keys(groupedAttributes).length
                    ? "Select Options"
                    : currentStock === 0
                      ? "Out of Stock"
                      : modalAction === "buy_now"
                        ? "Buy Now"
                        : "Add to Cart"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </TouchableOpacity>
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  animatedFlyer: {
    position: "absolute",
    top: SCREEN_HEIGHT / 2 - 30,
    left: SCREEN_WIDTH / 2 - 65,
    width: 70,
    height: 70,
    zIndex: 999,
    elevation: 11,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

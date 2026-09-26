// app/(store)/index.tsx
import { Feather, Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { COLORS, styles } from "@/components/chat-design";
import api from "@/services/api";
import {
  findConversationByShop,
  getShopConversation,
  getShopConversations,
  Message,
  sendShopMessage,
  ShopConversation,
  startShopConversation,
} from "@/services/chatShopService";
import echo from "@/services/echo";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Resolve the logged-in user's ID regardless of which response
 * shape /profile returns (plain object, { user: {...} }, or a
 * JSON:API envelope like { data: { id, attributes } }).
 */
function resolveUserId(payload: any): string | number | null {
  return (
    payload?.id ??
    payload?.data?.id ??
    payload?.user?.id ??
    payload?.data?.user?.id ??
    payload?.data?.attributes?.id ??
    null
  );
}

function ChatSellerPageInner() {
  const { storeId, storeName, productId } = useLocalSearchParams<{
    storeId: string;
    storeName: string;
    productId?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [conversation, setConversation] = useState<ShopConversation | null>(
    null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [userId, setUserId] = useState<string | number | null>(null);

  // ===== PAGINATION STATE (mirrors chat-intellectual.tsx) =====
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMorePages, setHasMorePages] = useState(true);

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(
    null,
  );
  const [imageRefresh, setImageRefresh] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const channelRef = useRef<any>(null);
  const conversationIdRef = useRef<number | null>(null);
  // Forces the composer TextInput to fully remount after every send.
  // This guarantees a genuinely empty native input, independent of
  // ref.clear() (which can silently no-op under some component
  // wrappers) or React state-update timing races.
  const [inputResetKey, setInputResetKey] = useState(0);

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => setImageRefresh((p) => p + 1), 500);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const normalizePath = useCallback((attachment: any): string => {
    const rawPath =
      attachment.path ||
      attachment.file_path ||
      attachment.url ||
      attachment.uri ||
      "";

    if (rawPath.startsWith("http")) return rawPath;
    if (rawPath.startsWith("file://")) return rawPath;

    const apiBaseUrl = api.defaults.baseURL || "";
    const domainUrl = apiBaseUrl.replace(/\/api\/?$/, "");
    return `${domainUrl}/storage/${rawPath.replace(/^\/+/, "")}`;
  }, []);

  const handleOpenImage = (uri: string) => {
    setViewerUri(uri);
    setViewerVisible(true);
  };

  const handleCloseViewer = () => {
    setViewerVisible(false);
    setViewerUri(null);
  };

  const handleDownloadFile = async (attachment: any) => {
    const finalUrl = normalizePath(attachment);
    const fileName =
      attachment.original_name || attachment.name || "downloaded-file";

    if (!finalUrl.startsWith("http")) {
      Alert.alert("Error", "Cannot download a local file.");
      return;
    }

    try {
      setDownloadingFileId(attachment.id);

      let baseDir: string | null =
        FileSystem.cacheDirectory ||
        FileSystem.documentDirectory ||
        FileSystem.temporaryDirectory ||
        null;

      if (!baseDir) {
        throw new Error("No writable directory available.");
      }
      if (!baseDir.endsWith("/")) baseDir += "/";

      const safeFileName = fileName
        .replace(/[^a-zA-Z0-9.-]/g, "_")
        .substring(0, 50);
      const localUri = `${baseDir}download_${Date.now()}_${safeFileName}`;

      const { uri } = await FileSystem.downloadAsync(finalUrl, localUri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: attachment.mime_type || "application/octet-stream",
          dialogTitle: `Share ${fileName}`,
        });
      } else {
        Alert.alert("Success", `${fileName} downloaded successfully`);
      }
      setDownloadingFileId(null);
    } catch (error) {
      console.error("Primary download failed:", error);
      try {
        const mediaPermission = await MediaLibrary.requestPermissionsAsync();
        if (mediaPermission.status !== "granted") {
          throw new Error("Media Library permission denied");
        }
        const tempUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}temp_${Date.now()}_${fileName}`;
        const downloadResult = await FileSystem.downloadAsync(
          finalUrl,
          tempUri,
        );
        if (downloadResult.status === 200) {
          const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
          await MediaLibrary.createAlbumAsync("Downloads", asset, false);
          Alert.alert("Success", `${fileName} saved to your gallery`);
          setDownloadingFileId(null);
          return;
        }
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
      }
      setDownloadingFileId(null);
      const msg =
        error instanceof Error ? error.message : "Unknown error occurred";
      Alert.alert("Download Error", "Could not download file. " + msg);
    }
  };

  // ===== INITIAL LOAD =====
  useEffect(() => {
    const init = async () => {
      try {
        try {
          const userRes = await api.get("/profile");
          setUserId(resolveUserId(userRes.data));
        } catch {
          setUserId(null);
        }

        if (!storeId) {
          setLoading(false);
          return;
        }

        const all = await getShopConversations();
        const existing = findConversationByShop(all, storeId);

        if (existing) {
          const full = await getShopConversation(existing.id, 1);
          setConversation(full.conversation);
          setMessages(full.messages ?? []);
          setCurrentPage(full.pagination.current_page);
          setLastPage(full.pagination.last_page);
          setHasMorePages(full.pagination.has_more);
          conversationIdRef.current = full.conversation.id;
        } else {
          setHasMorePages(false);
        }
      } catch (err) {
        console.error("Failed to initialize shop chat:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [storeId]);

  // ===== LOAD OLDER MESSAGES WHEN SCROLLING UP (REACHING END OF INVERTED LIST) =====
  const loadMoreMessages = useCallback(async () => {
    const activeId = conversation?.id ?? conversationIdRef.current;

    if (
      !activeId ||
      isLoadingMore ||
      !hasMorePages ||
      currentPage >= lastPage
    ) {
      return;
    }

    const nextPage = currentPage + 1;
    setIsLoadingMore(true);

    try {
      const full = await getShopConversation(activeId, nextPage);
      const newMessages = full.messages || [];

      if (newMessages.length > 0) {
        setMessages((prev) => {
          const combined = [...prev, ...newMessages];

          const seen = new Set<string | number>();
          return combined.filter((msg) => {
            const msgId = String(msg.id);
            if (seen.has(msgId)) return false;
            seen.add(msgId);
            return true;
          });
        });

        setCurrentPage(nextPage);
        setHasMorePages(full.pagination.has_more);
      }
    } catch (err) {
      console.error("Failed to load more shop messages:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversation?.id, currentPage, lastPage, isLoadingMore, hasMorePages]);

  // ===== ECHO PRESENCE CHANNEL — matches ShopMessageSent (PresenceChannel + 'shop.message.sent') =====
  useEffect(() => {
    if (!conversation?.id || !echo) return;

    const channelName = `shop-conversation.${conversation.id}`;

    try {
      channelRef.current = echo.join(channelName);

      channelRef.current.listen(".shop.message.sent", (e: any) => {
        const messageData = e.message || e;
        if (!messageData || !messageData.id) return;

        setMessages((prev) => {
          // Already present — either arrived via our own send response
          // already, or this is a duplicate broadcast. Skip either way.
          if (prev.some((m) => String(m.id) === String(messageData.id)))
            return prev;

          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

          // NOTE: we intentionally do NOT touch any "temp-*" placeholders
          // here. Each temp message is resolved deterministically by its
          // own sendShopMessage() response in deliverPayload — doing it
          // here too (by prefix match) would replace EVERY pending temp
          // with this one message when multiple sends are in flight,
          // producing duplicate keys.
          return [messageData, ...prev];
        });
      });
    } catch (err) {
      console.error("Failed to join shop conversation channel:", err);
    }

    return () => {
      if (!echo) return;
      channelRef.current?.stopListening(".shop.message.sent");
      echo.leave(channelName);
    };
  }, [conversation?.id]);

  const deliverPayload = async (
    payload: { body: string } | { body?: string; attachments: any[] },
    tempId: string,
  ) => {
    setSending(true);
    try {
      if (!conversation) {
        const created = await startShopConversation({
          shop_id: storeId,
          body: (payload as any).body || "",
          product_id: productId,
          attachments: (payload as any).attachments,
        });
        setConversation(created);
        conversationIdRef.current = created.id;

        const full = await getShopConversation(created.id, 1);
        setMessages(full.messages ?? []);
        setCurrentPage(full.pagination.current_page);
        setLastPage(full.pagination.last_page);
        setHasMorePages(full.pagination.has_more);
      } else {
        const message = await sendShopMessage(conversation.id, payload as any);

        // Replace ONLY this specific temp entry with the real message.
        // If the Echo broadcast for this same message already arrived
        // and got appended in the meantime, drop this temp instead of
        // creating a duplicate.
        setMessages((prev) => {
          const alreadyArrivedViaEcho = prev.some(
            (m) => String(m.id) === String(message.id),
          );

          if (alreadyArrivedViaEcho) {
            return prev.filter((m) => String(m.id) !== tempId);
          }

          return prev.map((m) =>
            String(m.id) === tempId ? { ...message } : m,
          );
        });
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      Alert.alert("Delivery Fail", "We couldn't deliver this message.");
      setMessages((prev) => prev.filter((m) => String(m.id) !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!draft.trim() || sending || !storeId) return;
    const textToSend = draft.trim();

    // Clear the React state AND force the TextInput to remount with a
    // fresh key. setDraft alone is async/batched — if you keep typing
    // immediately after tapping send, fast keystrokes can land on the
    // native buffer before React re-renders it as empty, merging with
    // the old text. Bumping the key unmounts the old native input and
    // mounts a brand new, guaranteed-empty one instead.
    setDraft("");
    setInputResetKey((k) => k + 1);

    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      shop_conversation_id: conversation?.id ?? 0,
      sender_id: userId as number,
      sender_type: "user",
      body: textToSend,
      context_type: null,
      context_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attachments: [],
    };

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMessages((prev) => [tempMessage, ...prev]);

    await deliverPayload({ body: textToSend }, tempId);
  };

  const buildTempAttachmentMessage = (
    tempId: string,
    bodyText: string,
    attachmentPreview: any,
  ): Message => ({
    id: tempId,
    shop_conversation_id: conversation?.id ?? 0,
    sender_id: userId as number,
    sender_type: "user",
    body: bodyText || null,
    context_type: null,
    context_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    attachments: [attachmentPreview],
  });

  const handlePickImage = async () => {
    if (sending) return;
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Denied", "We need access to add images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const bodyText = draft.trim();
      setDraft("");
      setInputResetKey((k) => k + 1);

      const filename =
        asset.fileName || asset.uri.split("/").pop() || "upload.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const mime = match ? `image/${match[1]}` : "image/jpeg";

      const attachmentFile = { uri: asset.uri, name: filename, type: mime };
      const tempId = `temp-${Date.now()}`;

      const tempMessage = buildTempAttachmentMessage(tempId, bodyText, {
        id: tempId,
        path: asset.uri,
        original_name: filename,
        mime_type: mime,
        size: asset.fileSize || 0,
      });

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setMessages((prev) => [tempMessage, ...prev]);

      await deliverPayload(
        { body: bodyText || undefined, attachments: [attachmentFile] },
        tempId,
      );
    }
  };

  const handlePickDocument = async () => {
    if (sending) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["*/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const bodyText = draft.trim();
        setDraft("");
        setInputResetKey((k) => k + 1);

        const filename = file.name || file.uri.split("/").pop() || "document";
        const mime = file.mimeType || "application/octet-stream";

        const attachmentFile = { uri: file.uri, name: filename, type: mime };
        const tempId = `temp-${Date.now()}`;

        const tempMessage = buildTempAttachmentMessage(tempId, bodyText, {
          id: tempId,
          path: file.uri,
          original_name: filename,
          mime_type: mime,
          size: file.size || 0,
        });

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setMessages((prev) => [tempMessage, ...prev]);

        await deliverPayload(
          { body: bodyText || undefined, attachments: [attachmentFile] },
          tempId,
        );
      }
    } catch (err) {
      console.error("Document selector failure", err);
    }
  };

  const handleAttachmentMenu = () => {
    Keyboard.dismiss();
    setTimeout(() => {
      Alert.alert(
        "Send Attachment",
        "Choose what kind of file you want to send.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Photo Gallery", onPress: handlePickImage },
          { text: "Document File", onPress: handlePickDocument },
        ],
      );
    }, 100);
  };

  const renderAttachment = useCallback(
    (attachment: any, isTemp: boolean, isMe: boolean) => {
      const finalPathValue = normalizePath(attachment);
      const mimeType = attachment.mime_type || attachment.type || "";
      const isImage =
        mimeType.startsWith("image/") ||
        /\.(jpg|jpeg|png|webp|gif)$/i.test(finalPathValue);
      const displayName =
        attachment.original_name || attachment.name || "Attachment File";

      if (isImage) {
        return (
          <TouchableOpacity
            key={`touch-${attachment.id}`}
            activeOpacity={0.9}
            onPress={() => finalPathValue && handleOpenImage(finalPathValue)}
            style={[styles.mediaBubbleBox, isTemp && { opacity: 0.7 }]}
          >
            <Image
              key={`img-${attachment.id}-${finalPathValue}`}
              source={{ uri: finalPathValue }}
              style={styles.media}
              resizeMode="cover"
            />
          </TouchableOpacity>
        );
      }

      const isDownloadingThis = downloadingFileId === attachment.id;
      return (
        <TouchableOpacity
          key={`doc-${attachment.id}`}
          activeOpacity={0.7}
          onPress={() => handleDownloadFile(attachment)}
          style={[
            styles.docContainer,
            isMe ? styles.docMe : styles.docThem,
            isTemp && { opacity: 0.6 },
          ]}
        >
          {isDownloadingThis ? (
            <ActivityIndicator
              size="small"
              color={isMe ? COLORS.bubbleOutText : COLORS.brand}
              style={{ marginRight: 8 }}
            />
          ) : (
            <Feather
              name="download-cloud"
              size={18}
              color={isMe ? COLORS.bubbleOutText : COLORS.brand}
              style={{ marginRight: 8 }}
            />
          )}
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.docName,
                { color: isMe ? COLORS.bubbleOutText : COLORS.ink },
              ]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [normalizePath, downloadingFileId, imageRefresh],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isTemp = String(item.id).startsWith("temp-");
      const isMe = item.sender_type === "user";

      let showDateHeader = false;
      let dateString = "";

      if (item.created_at) {
        const currentDate = new Date(item.created_at);
        dateString = currentDate.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          weekday: "long",
        });

        if (index === messages.length - 1) {
          showDateHeader = true;
        } else {
          const nextItem = messages[index + 1];
          if (nextItem?.created_at) {
            const nextDate = new Date(nextItem.created_at);
            if (currentDate.toDateString() !== nextDate.toDateString()) {
              showDateHeader = true;
            }
          }
        }
      }

      return (
        <View>
          {showDateHeader && (
            <View style={styles.dateHeaderContainer}>
              <View style={styles.dateDivider} />
              <Text style={styles.dateHeaderText}>{dateString}</Text>
              <View style={styles.dateDivider} />
            </View>
          )}

          <View style={[styles.row, isMe ? styles.rowOut : styles.rowIn]}>
            {!isMe && (
              <View style={styles.avatarMini}>
                <Text style={styles.avatarMiniText}>
                  {typeof storeName === "string"
                    ? storeName.substring(0, 2).toUpperCase()
                    : "SH"}
                </Text>
              </View>
            )}

            <View
              style={[styles.bubbleWrap, isMe && { alignItems: "flex-end" }]}
            >
              {!isMe && (
                <Text style={styles.senderLabel}>{storeName || "Seller"}</Text>
              )}

              <View
                style={[
                  styles.bubble,
                  isMe ? styles.bubbleOut : styles.bubbleIn,
                ]}
              >
                {item.attachments && item.attachments.length > 0
                  ? item.attachments.map((file) =>
                      renderAttachment(file, isTemp, isMe),
                    )
                  : null}

                {item.body ? (
                  <Text
                    style={isMe ? styles.bubbleOutText : styles.bubbleInText}
                  >
                    {item.body}
                  </Text>
                ) : null}
              </View>

              <View
                style={[
                  styles.metaLine,
                  isMe && { flexDirection: "row-reverse" },
                ]}
              >
                {isMe && (
                  <Feather
                    name={isTemp ? "clock" : "check"}
                    size={12}
                    color={isTemp ? COLORS.inkFaint : COLORS.brand}
                    style={{ marginRight: 4, marginLeft: 4 }}
                  />
                )}
                <Text style={styles.metaText}>
                  {item.created_at
                    ? new Date(item.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </Text>
              </View>
            </View>
          </View>
        </View>
      );
    },
    [messages, renderAttachment, storeName],
  );

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{ padding: 4 }}
          >
            <Feather
              name="chevron-left"
              size={22}
              color={COLORS.inkDim}
              style={{ marginRight: 4 }}
            />
          </TouchableOpacity>

          <View style={styles.avatarMain}>
            <Text style={styles.avatarMainText}>
              {typeof storeName === "string"
                ? storeName.substring(0, 2).toUpperCase()
                : "SH"}
            </Text>
            <View style={styles.avatarDot} />
          </View>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text numberOfLines={1} style={styles.headName}>
              {storeName || "Chat with Seller"}
            </Text>
            <View style={styles.headStatusRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.headStatus}>online — shop channel</Text>
            </View>
          </View>
        </View>

        {isLoadingMore && (
          <View style={{ padding: 12, alignItems: "center" }}>
            <ActivityIndicator size="small" color={COLORS.brand} />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.threadContent}
            inverted={true}
            onEndReached={loadMoreMessages}
            onEndReachedThreshold={0.15}
          />

          {messages.length === 0 && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                paddingTop: 60,
                alignItems: "center",
              }}
              pointerEvents="none"
            >
              <Text style={{ color: COLORS.inkFaint }}>
                No messages yet. Say hello!
              </Text>
            </View>
          )}
        </View>

        <View style={styles.composer}>
          <TouchableOpacity
            onPress={handleAttachmentMenu}
            style={{ paddingHorizontal: 4 }}
          >
            <Feather name="plus" size={20} color={COLORS.inkDim} />
          </TouchableOpacity>

          <View style={styles.compField}>
            <TextInput
              key={inputResetKey}
              placeholder={`Message...`}
              placeholderTextColor={COLORS.inkFaint}
              style={styles.compInput}
              value={draft}
              onChangeText={setDraft}
              multiline
            />
          </View>

          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!draft.trim() || sending) && { backgroundColor: COLORS.rail },
            ]}
            onPress={handleSend}
            disabled={!draft.trim() || sending}
            activeOpacity={0.8}
          >
            <Ionicons
              name="send"
              size={16}
              color={!draft.trim() || sending ? COLORS.inkFaint : "#ffffff"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={viewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseViewer}
      >
        <View
          style={[
            styles.viewerContainer,
            { backgroundColor: "#000000", opacity: 1 },
          ]}
        >
          <View style={[styles.viewerHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              onPress={handleCloseViewer}
              style={styles.viewerCloseBtn}
            >
              <Feather name="x" size={24} color="#ffffff" />
            </TouchableOpacity>
            <View style={{ width: 40 }} />
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.viewerMain}>
            {viewerUri ? (
              <Image
                key={viewerUri}
                source={{ uri: viewerUri }}
                style={styles.viewerFullImage}
                resizeMode="contain"
              />
            ) : (
              <ActivityIndicator size="large" color="#ffffff" />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function ChatSellerPage() {
  return (
    <SafeAreaProvider>
      <ChatSellerPageInner />
    </SafeAreaProvider>
  );
}

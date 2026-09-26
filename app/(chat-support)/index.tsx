// app/(chat-support)/index.tsx
import { Feather, Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { useRouter } from "expo-router";
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
  getConversation,
  getSupportConversation,
  Message,
  sendMessage,
  startSupportConversation,
} from "@/services/chatService";
import echo from "@/services/echo";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Phase = "checking" | "prompt" | "starting" | "chat";

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

function ChatSupportPageInner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<Phase>("checking");

  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [userId, setUserId] = useState<string | number | null>(null);

  // ===== PAGINATION STATE =====
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
  const [inputResetKey, setInputResetKey] = useState(0);

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        setImageRefresh((prev) => prev + 1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const requestFilePermissions = useCallback(async () => {
    if (Platform.OS !== "android") return true;
    try {
      const permission = await Promise.resolve(true);
      return permission;
    } catch (error) {
      console.warn("Permission request failed:", error);
      return false;
    }
  }, []);

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

  const handleOpenImage = (selectedUri: string) => {
    setViewerUri(selectedUri);
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

      const hasPermission = await requestFilePermissions();
      if (!hasPermission) {
        Alert.alert(
          "Permission Required",
          "File storage permission is required to download files.",
        );
        setDownloadingFileId(null);
        return;
      }

      let baseDir: string | null = null;

      if (FileSystem.cacheDirectory && FileSystem.cacheDirectory.length > 0) {
        baseDir = FileSystem.cacheDirectory;
      } else if (
        FileSystem.documentDirectory &&
        FileSystem.documentDirectory.length > 0
      ) {
        baseDir = FileSystem.documentDirectory;
      } else if (
        FileSystem.temporaryDirectory &&
        FileSystem.temporaryDirectory.length > 0
      ) {
        baseDir = FileSystem.temporaryDirectory;
      }

      if (!baseDir || baseDir.length === 0) {
        throw new Error(
          "No writable directory available. Try saving to gallery instead.",
        );
      }

      if (!baseDir.endsWith("/")) {
        baseDir = baseDir + "/";
      }

      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const safeFileName = fileName
        .replace(/[^a-zA-Z0-9.-]/g, "_")
        .substring(0, 50);
      const localUri = `${baseDir}download_${timestamp}_${randomSuffix}_${safeFileName}`;

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
        console.error("Fallback download failed:", fallbackError);
      }

      setDownloadingFileId(null);
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error occurred";
      Alert.alert("Download Error", "Could not download file. " + errorMsg);
    }
  };

  // ===== CHECK FOR EXISTING SUPPORT CONVERSATION ON MOUNT =====
  useEffect(() => {
    const init = async () => {
      try {
        try {
          const userRes = await api.get("/profile");
          const resolvedId = resolveUserId(userRes.data);
          console.log(
            "DEBUG /profile response:",
            userRes.data,
            "resolved:",
            resolvedId,
          );
          setUserId(resolvedId);
        } catch (userErr) {
          setUserId(null);
        }

        const res = await getSupportConversation();

        if (res.exists && res.conversation) {
          setConversationId(res.conversation.id);
          setMessages(res.messages || []);
          setCurrentPage(res.pagination?.current_page || 1);
          setLastPage(res.pagination?.last_page || 1);
          setHasMorePages(res.pagination?.has_more || false);
          setPhase("chat");
        } else {
          setPhase("prompt");
        }
      } catch (err) {
        console.error("Failed to check support conversation:", err);
        setPhase("prompt");
      }
    };

    init();
  }, []);

  const handleStartChat = async () => {
    setPhase("starting");
    try {
      const res = await startSupportConversation();

      if (res.conversation) {
        setConversationId(res.conversation.id);
        setMessages(res.messages || []);
        setCurrentPage(res.pagination?.current_page || 1);
        setLastPage(res.pagination?.last_page || 1);
        setHasMorePages(res.pagination?.has_more || false);
        setPhase("chat");
      } else {
        throw new Error("No conversation returned");
      }
    } catch (err) {
      console.error("Failed to start support conversation:", err);
      Alert.alert(
        "Error",
        "Could not start a chat with support. Please try again.",
      );
      setPhase("prompt");
    }
  };

  const handleDeclineChat = () => {
    router.back();
  };

  // ===== LOAD OLDER MESSAGES =====
  const loadMoreMessages = useCallback(async () => {
    if (
      !conversationId ||
      isLoadingMore ||
      !hasMorePages ||
      currentPage >= lastPage
    ) {
      return;
    }

    const nextPage = currentPage + 1;
    setIsLoadingMore(true);

    try {
      const conversationData = await getConversation(conversationId, nextPage);
      const newMessages = conversationData.messages || [];

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
        setHasMorePages(conversationData.pagination.has_more);
      }
    } catch (err) {
      console.error("Failed to load more messages:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversationId, currentPage, lastPage, isLoadingMore, hasMorePages]);

  // ===== ECHO LISTENER =====
  useEffect(() => {
    if (!conversationId || !echo || phase !== "chat") return;

    const channelName = `conversation.${conversationId}`;

    try {
      channelRef.current = echo.private(channelName);

      channelRef.current.listen(".message.sent", (e: any) => {
        const messageData = e.message || e;
        if (!messageData || !messageData.id) return;

        const processedMessage = {
          ...messageData,
          attachments:
            messageData.attachments?.map((att: any) => ({
              ...att,
              id: att.id || `att-${Date.now()}`,
            })) || [],
        };

        setMessages((prev) => {
          if (prev.some((m) => String(m.id) === String(messageData.id)))
            return prev;

          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          return [processedMessage, ...prev];
        });
      });
    } catch (err) {
      console.error("Failed to subscribe to channel:", err);
    }

    return () => {
      if (!echo) return;
      channelRef.current?.stopListening(".message.sent");
      echo.leave(channelName);
    };
  }, [conversationId, echo, phase]);

  const processMessagePayload = async (
    payload: FormData | { body: string },
    tempId: string,
  ) => {
    if (!conversationId) return;
    setSending(true);

    try {
      const savedMessage = await sendMessage(conversationId, payload);

      setMessages((prev) => {
        const alreadyArrivedViaEcho = prev.some(
          (m) => String(m.id) === String(savedMessage.id),
        );

        if (alreadyArrivedViaEcho) {
          return prev.filter((m) => String(m.id) !== tempId);
        }

        return prev.map((m) =>
          String(m.id) === tempId ? { ...savedMessage } : m,
        );
      });
    } catch (err) {
      console.error("Upload error details:", err);
      Alert.alert("Delivery Fail", "We couldn't deliver this message.");
      setMessages((prev) => prev.filter((m) => String(m.id) !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!draft.trim() || sending || !conversationId) return;
    const textToSend = draft.trim();

    setDraft("");
    setInputResetKey((k) => k + 1);

    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId as any,
      conversation_id: Number(conversationId),
      sender_id: userId as number,
      body: textToSend,
      created_at: new Date().toISOString(),
      attachments: [],
    };

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMessages((prev) => [tempMessage, ...prev]);

    await processMessagePayload({ body: textToSend }, tempId);
  };

  const handlePickImage = async () => {
    if (sending || !conversationId) return;
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
      const targetAsset = result.assets[0];
      const formData = new FormData();

      const bodyText = draft.trim();
      if (bodyText) {
        formData.append("body", bodyText);
      }
      setDraft("");
      setInputResetKey((k) => k + 1);

      const rawUri = targetAsset.uri;
      const filename =
        targetAsset.fileName || rawUri.split("/").pop() || "upload.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const mime = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append("attachments[]", {
        uri: rawUri,
        name: filename,
        type: mime,
      } as any);

      const tempId = `temp-${Date.now()}`;
      const tempMessage: Message = {
        id: tempId as any,
        conversation_id: Number(conversationId),
        sender_id: userId as number,
        body: bodyText || null,
        created_at: new Date().toISOString(),
        attachments: [
          {
            id: tempId as any,
            path: rawUri,
            original_name: filename,
            mime_type: mime,
            size: targetAsset.fileSize || 0,
          },
        ],
      };

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setMessages((prev) => [tempMessage, ...prev]);

      await processMessagePayload(formData, tempId);
    }
  };

  const handlePickDocument = async () => {
    if (sending || !conversationId) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["*/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const targetFile = result.assets[0];
        const formData = new FormData();

        const bodyText = draft.trim();
        if (bodyText) {
          formData.append("body", bodyText);
        }
        setDraft("");
        setInputResetKey((k) => k + 1);

        const rawUri = targetFile.uri;
        const filename =
          targetFile.name || rawUri.split("/").pop() || "document";
        const mime = targetFile.mimeType || "application/octet-stream";

        formData.append("attachments[]", {
          uri: rawUri,
          name: filename,
          type: mime,
        } as any);

        const tempId = `temp-${Date.now()}`;
        const tempMessage: Message = {
          id: tempId as any,
          conversation_id: Number(conversationId),
          sender_id: userId as number,
          body: bodyText || null,
          created_at: new Date().toISOString(),
          attachments: [
            {
              id: tempId as any,
              path: rawUri,
              original_name: filename,
              mime_type: mime,
              size: targetFile.size || 0,
            },
          ],
        };

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setMessages((prev) => [tempMessage, ...prev]);

        await processMessagePayload(formData, tempId);
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

      const isMe = isTemp
        ? true
        : userId !== null
          ? String(item.sender_id) === String(userId)
          : false;

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
          if (nextItem && nextItem.created_at) {
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
                  {item.sender?.name
                    ? item.sender.name.substring(0, 2).toUpperCase()
                    : "SP"}
                </Text>
              </View>
            )}

            <View
              style={[styles.bubbleWrap, isMe && { alignItems: "flex-end" }]}
            >
              {!isMe && item.sender?.name && (
                <Text style={styles.senderLabel}>{item.sender.name}</Text>
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
                    style={{ marginRight: 4, marginLeft: isTemp ? 4 : 4 }}
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
    [userId, messages, renderAttachment],
  );

  // ===== CHECKING PHASE =====
  if (phase === "checking") {
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

  // ===== PROMPT PHASE — no conversation yet =====
  if (phase === "prompt" || phase === "starting") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#FFFFFF",
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        <View style={[styles.header, { paddingTop: 8 }]}>
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
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text numberOfLines={1} style={styles.headName}>
              Chat Support
            </Text>
          </View>
        </View>

        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: COLORS.brand,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Feather name="message-circle" size={32} color="#ffffff" />
          </View>

          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: COLORS.ink,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Need help?
          </Text>

          <Text
            style={{
              fontSize: 14,
              color: COLORS.inkFaint,
              textAlign: "center",
              marginBottom: 28,
              lineHeight: 20,
            }}
          >
            You don't have an active conversation yet. Would you like to start a
            chat with our support team?
          </Text>

          <TouchableOpacity
            onPress={handleStartChat}
            disabled={phase === "starting"}
            activeOpacity={0.8}
            style={{
              backgroundColor: COLORS.brand,
              paddingVertical: 14,
              paddingHorizontal: 40,
              borderRadius: 12,
              width: "100%",
              alignItems: "center",
              marginBottom: 12,
              opacity: phase === "starting" ? 0.7 : 1,
            }}
          >
            {phase === "starting" ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text
                style={{ color: "#ffffff", fontWeight: "600", fontSize: 15 }}
              >
                Yes, start chat
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDeclineChat}
            disabled={phase === "starting"}
            activeOpacity={0.8}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 40,
              borderRadius: 12,
              width: "100%",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: COLORS.inkFaint,
                fontWeight: "600",
                fontSize: 15,
              }}
            >
              Not now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ===== CHAT PHASE =====
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
            <Text style={styles.avatarMainText}>SP</Text>
            <View style={styles.avatarDot} />
          </View>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text numberOfLines={1} style={styles.headName}>
              Chat Support
            </Text>
            <View style={styles.headStatusRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.headStatus}>online — active channel</Text>
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
              placeholder="Message support..."
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
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        // onRequestClose={() => handleCloseViewer(false)}
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

export default function ChatSupportPage() {
  return (
    <SafeAreaProvider>
      <ChatSupportPageInner />
    </SafeAreaProvider>
  );
}

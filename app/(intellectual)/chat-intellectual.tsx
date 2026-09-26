// app/(intellectual)/chat-intellectual.tsx
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  FileText,
  ImageIcon,
  Paperclip,
  Plus,
  Send,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import api from "@/services/api";
import { getConversation, Message, sendMessage } from "@/services/chatService";
import echo from "@/services/echo";

import "../../global.css";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ChatIntellectualPage() {
  const { conversationId, title } = useLocalSearchParams();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState("");
  const [userId, setUserId] = useState<string | number | null>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const channelRef = useRef<any>(null);

  // Keyboard Visibility Trackers
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const keyboardShowListener = Keyboard.addListener(showEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardVisible(true);
    });
    const keyboardHideListener = Keyboard.addListener(hideEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardVisible(false);
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  // Fetch Session Profile & Initial Messages
  useEffect(() => {
    const initChatSession = async () => {
      try {
        try {
          const userRes = await api.get("/profile");
          const resolvedId = userRes.data?.id || userRes.data?.user?.id || null;
          setUserId(resolvedId);
        } catch (userErr) {
          setUserId(null);
        }

        if (conversationId) {
          const conversationData = await getConversation(
            conversationId as string,
          );
          setMessages(conversationData.messages || []);
        }
      } catch (err) {
        console.error("Initialization of chat telemetry failed", err);
      } finally {
        setLoading(false);
      }
    };

    initChatSession();
  }, [conversationId]);

  // Echo Real-time channel integration
  useEffect(() => {
    if (!conversationId || !echo) return;

    const channelName = `conversation.${conversationId}`;
    try {
      channelRef.current = echo.private(channelName);
      channelRef.current.listen(".message.sent", (e: any) => {
        if (!e || !e.id) return;
        if (userId && String(e.sender_id) === String(userId)) return;

        const newMessage: Message = {
          id: e.id,
          conversation_id: Number(e.conversation_id),
          sender_id: e.sender_id,
          body: e.body,
          created_at: e.created_at || new Date().toISOString(),
          sender: e.sender,
          attachments: e.attachments || [],
        };

        setMessages((prev) => {
          const exists = prev.some(
            (m) => String(m.id) === String(newMessage.id),
          );
          if (exists) return prev;
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          return [...prev, newMessage];
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
  }, [conversationId, userId]);

  const processMessagePayload = async (
    payload: FormData | { body: string },
    tempId: string,
  ) => {
    if (!conversationId) return;
    setSending(true);

    try {
      const createdMessage = await sendMessage(
        conversationId as string,
        payload,
      );
      if (createdMessage) {
        setMessages((prev) =>
          prev.map((m) => (String(m.id) === tempId ? createdMessage : m)),
        );
      }
    } catch (err) {
      console.error("Upload error details:", err);
      Alert.alert("Delivery Fail", "We couldn't deliver this message.");
      setMessages((prev) => prev.filter((m) => String(m.id) !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleSendText = async () => {
    if (!inputText.trim() || sending) return;
    const textToSend = inputText.trim();
    setInputText("");

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
    setMessages((prev) => [...prev, tempMessage]);
    await processMessagePayload({ body: textToSend }, tempId);
  };

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
      const targetAsset = result.assets[0];
      const formData = new FormData();

      const bodyText = inputText.trim();
      formData.append("body", bodyText);
      setInputText("");

      const rawUri = targetAsset.uri;
      const filename =
        targetAsset.fileName || rawUri.split("/").pop() || "upload.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const mime = match ? `image/${match[1]}` : `image/jpeg`;
      const uploadUri =
        Platform.OS === "ios" ? rawUri.replace("file://", "") : rawUri;
      const finalFileUri =
        Platform.OS === "ios" ? `file://${uploadUri}` : uploadUri;

      formData.append("attachments[]", {
        uri: finalFileUri,
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
      setMessages((prev) => [...prev, tempMessage]);
      await processMessagePayload(formData, tempId);
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
        const targetFile = result.assets[0];
        const formData = new FormData();

        const bodyText = inputText.trim();
        formData.append("body", bodyText);
        setInputText("");

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
        setMessages((prev) => [...prev, tempMessage]);
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
          { text: "Photo", onPress: handlePickImage },
          { text: "Document", onPress: handlePickDocument },
        ],
      );
    }, 100);
  };

  // ADAPTIVE PRODUCTION RENDERER: Updates UI elements beautifully for outgoing vs incoming elements
  const renderAttachment = useCallback(
    (attachment: any, isTemp: boolean, isMe: boolean) => {
      const rawPath = attachment.path || "";
      const rawFilePath = attachment.file_path || "";
      const rawUrl = attachment.url || "";
      const rawUri = attachment.uri || "";

      let finalPathValue = rawPath || rawFilePath || rawUrl || rawUri;

      // Resolve URL exactly as before
      if (
        finalPathValue &&
        !finalPathValue.startsWith("http") &&
        !finalPathValue.startsWith("file://") &&
        !finalPathValue.startsWith("content://")
      ) {
        const baseUrl = api.defaults.baseURL?.replace(/\/api\/?$/, "") || "";
        const cleanPath = finalPathValue.startsWith("/")
          ? finalPathValue
          : `/${finalPathValue}`;
        finalPathValue = `${baseUrl}${cleanPath}`;
      }

      const mimeType = attachment.mime_type || attachment.type || "";
      const isImage =
        mimeType.startsWith("image/") ||
        /\.(jpg|jpeg|png|webp|gif)$/i.test(finalPathValue);

      if (isImage) {
        return (
          <View
            key={attachment.id || Math.random().toString()}
            className={`mb-2 overflow-hidden rounded-xl bg-slate-100 max-w-[240px] ${
              isTemp ? "opacity-60" : ""
            }`}
          >
            <Image
              source={{ uri: finalPathValue }}
              style={{ width: 240, height: 160, resizeMode: "cover" }}
            />
          </View>
        );
      }

      // Contextual UI Theme configuration depending on layout position
      const containerBg = isMe
        ? "bg-white/10 border-white/20"
        : "bg-slate-200/60 border-slate-300/40";
      const iconColor = isMe ? "#FFFFFF" : "#475569";
      const textColor = isMe ? "text-white" : "text-slate-800";
      const metaColor = isMe ? "text-white/70" : "text-slate-500";

      return (
        <View
          key={attachment.id || Math.random().toString()}
          className={`mb-2 p-3 rounded-xl flex-row items-center gap-2 max-w-[240px] border ${containerBg} ${
            isTemp ? "opacity-60" : ""
          }`}
        >
          <FileText size={24} color={iconColor} />
          <View className="flex-1">
            <Text
              className={`text-xs font-semibold ${textColor}`}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {attachment.original_name || attachment.name || "Document File"}
            </Text>
            {attachment.size ? (
              <Text className={`text-[10px] ${metaColor}`}>
                {(attachment.size / 1024).toFixed(1)} KB
              </Text>
            ) : null}
          </View>
        </View>
      );
    },
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      const isMe =
        userId !== null
          ? String(item.sender_id) === String(userId)
          : String(item.sender_id) === "14";
      const isTemp = String(item.id).startsWith("temp-");

      return (
        <View className={`flex-col mb-3 ${isMe ? "items-end" : "items-start"}`}>
          <View
            className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl ${
              isMe
                ? "bg-primary rounded-tr-sm"
                : "bg-[#F0F5FA] rounded-tl-sm border border-slate-100"
            }`}
          >
            {item.attachments && item.attachments.length > 0
              ? item.attachments.map((file) =>
                  renderAttachment(file, isTemp, isMe),
                )
              : null}

            {item.body ? (
              <Text
                className={`text-[15px] leading-5 ${isMe ? "text-white" : "text-slate-900"}`}
              >
                {item.body}
              </Text>
            ) : null}

            <View className="flex-row items-center justify-end gap-1 mt-1">
              <Text
                className={`text-[10px] text-right opacity-60 ${isMe ? "text-white" : "text-slate-500"}`}
              >
                {item.created_at
                  ? new Date(item.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </Text>
              {isTemp && (
                <ActivityIndicator
                  size="small"
                  color="white"
                  style={{ transform: [{ scale: 0.5 }] }}
                />
              )}
            </View>
          </View>

          {!isMe && item.sender?.name && (
            <Text className="text-[10px] text-slate-400 mt-1 ml-1 font-semibold">
              {item.sender.name}
            </Text>
          )}
        </View>
      );
    },
    [userId, renderAttachment],
  );

  const keyExtractor = useCallback((item: Message, index: number) => {
    return item.id ? String(item.id) : String(index);
  }, []);

  const handleContentSizeChange = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  const handleLayout = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: false });
  }, []);

  const listEmptyComponent = useMemo(
    () => (
      <View className="flex-1 items-center justify-center py-20">
        <Text className="text-slate-400 text-sm font-semibold">
          No conversation history found.
        </Text>
      </View>
    ),
    [],
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      {/* Header Bar */}
      <View className="flex-row items-center px-2 py-2 bg-white border-b border-slate-100 z-10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 rounded-full active:bg-slate-100 mr-1"
        >
          <ArrowLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text
            numberOfLines={1}
            className="text-slate-900 font-bold text-base tracking-tight"
          >
            {title}
          </Text>
          <Text className="text-emerald-500 text-[12px] font-medium">
            Active Now
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={handleContentSizeChange}
          onLayout={handleLayout}
          ListEmptyComponent={listEmptyComponent}
        />

        {/* Action Dock */}
        <View style={styles.inputContainer}>
          <View style={styles.leftActionContainer}>
            {isKeyboardVisible ? (
              <TouchableOpacity
                onPress={handleAttachmentMenu}
                style={styles.plusButton}
              >
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <View style={styles.iconRow}>
                <TouchableOpacity
                  onPress={handlePickImage}
                  style={styles.iconButton}
                >
                  <ImageIcon size={24} color="#64748B" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handlePickDocument}
                  style={styles.iconButton}
                >
                  <Paperclip size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TextInput
            style={styles.textInput}
            placeholder="Type Your Message"
            placeholderTextColor="#94A3B8"
            multiline
            value={inputText}
            onChangeText={setInputText}
          />

          <TouchableOpacity
            onPress={handleSendText}
            disabled={!inputText.trim() || sending}
            style={[
              styles.sendButton,
              inputText.trim() && !sending
                ? styles.sendButtonActive
                : styles.sendButtonInactive,
            ]}
          >
            <Send
              size={18}
              color={inputText.trim() && !sending ? "white" : "#94A3B8"}
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  leftActionContainer: {
    justifyContent: "flex-end",
    paddingBottom: 4,
    marginRight: 8,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    padding: 6,
    marginRight: 2,
  },
  plusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#034194",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 15,
    color: "#0F172A",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    marginBottom: 2,
  },
  sendButtonActive: {
    backgroundColor: "#034194",
  },
  sendButtonInactive: {
    backgroundColor: "#F1F5F9",
  },
});

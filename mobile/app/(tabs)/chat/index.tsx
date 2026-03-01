import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, fontSize, borderRadius } from "@/lib/theme";
import { api } from "@/lib/api";
import Badge from "@/components/Badge";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: {
    materia?: string | null;
    riesgo?: string | null;
    layerStats?: { a: number; b: number; c: number };
  };
}

const LEGAL_AREAS = [
  { key: "all", label: "Todas" },
  { key: "Penal", label: "Penal" },
  { key: "Civil", label: "Civil" },
  { key: "Laboral", label: "Laboral" },
  { key: "Comercial", label: "Comercial" },
  { key: "Constitucional", label: "Constitucional" },
  { key: "Administrativo", label: "Administrativo" },
  { key: "Tránsito", label: "Tránsito" },
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArea, setSelectedArea] = useState("all");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const materias =
        selectedArea !== "all" ? [selectedArea] : undefined;
      const res = await api.chat.sendMessage(prompt, conversationId || undefined, materias);

      if (res.conversationId && !conversationId) {
        setConversationId(res.conversationId);
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: res.response,
        meta: res.meta,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Error: ${err.message || "No se pudo obtener respuesta"}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, selectedArea, conversationId]);

  const resetConversation = () => {
    setMessages([]);
    setConversationId(null);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isUser ? styles.userText : styles.assistantText,
          ]}
          selectable
        >
          {item.content}
        </Text>
        {!isUser && item.meta?.materia && (
          <View style={styles.metaRow}>
            <Badge
              label={item.meta.materia}
              variant={
                (item.meta.materia?.toLowerCase() as any) || "default"
              }
            />
            {item.meta.riesgo && item.meta.riesgo !== "N/A" && item.meta.riesgo !== "N_A" && (
              <Badge
                label={`Riesgo: ${item.meta.riesgo}`}
                variant={
                  item.meta.riesgo === "ALTO"
                    ? "danger"
                    : item.meta.riesgo === "MEDIO"
                    ? "warning"
                    : "success"
                }
                style={{ marginLeft: 6 }}
              />
            )}
            {item.meta.layerStats && (
              <Badge
                label={`${item.meta.layerStats.a + item.meta.layerStats.b + item.meta.layerStats.c} fuentes`}
                variant="info"
                style={{ marginLeft: 6 }}
              />
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Consulta Legal IA</Text>
        {messages.length > 0 && (
          <TouchableOpacity onPress={resetConversation} style={styles.resetBtn}>
            <Text style={styles.resetText}>Nueva</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {LEGAL_AREAS.map((area) => (
          <TouchableOpacity
            key={area.key}
            onPress={() => setSelectedArea(area.key)}
            style={[
              styles.chip,
              selectedArea === area.key && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                selectedArea === area.key && styles.chipTextActive,
              ]}
            >
              {area.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⚖️</Text>
          <Text style={styles.emptyTitle}>Consulta Legal IA</Text>
          <Text style={styles.emptyDesc}>
            Pregunta sobre cualquier tema del derecho costarricense.
            Tengo acceso a 4,482 artículos de 8 códigos legales.
          </Text>
          <View style={styles.suggestions}>
            {[
              "¿Qué dice el artículo 112 del Código Penal?",
              "¿Requisitos para la prisión preventiva?",
              "¿Cómo constituir una sociedad anónima?",
            ].map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggestionBtn}
                onPress={() => setInput(s)}
              >
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListFooterComponent={
            isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.loadingText}>Analizando normativa...</Text>
              </View>
            ) : null
          }
        />
      )}

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TextInput
          style={styles.input}
          placeholder="Escribe tu consulta legal..."
          placeholderTextColor={colors.muted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!input.trim() || isLoading) && styles.sendBtnDisabled,
          ]}
          onPress={sendMessage}
          disabled={!input.trim() || isLoading}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: "700",
  },
  resetBtn: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  resetText: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  chipsContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: 8,
  },
  chip: {
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.muted,
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#ffffff",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  emptyDesc: {
    color: colors.muted,
    fontSize: fontSize.md,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  suggestions: {
    width: "100%",
    gap: 8,
  },
  suggestionBtn: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  messageList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  messageBubble: {
    maxWidth: "85%",
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.accent,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  userText: {
    color: "#ffffff",
  },
  assistantText: {
    color: colors.text,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.sm,
    gap: 4,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    gap: 8,
  },
  loadingText: {
    color: colors.muted,
    fontSize: fontSize.sm,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    backgroundColor: colors.accent,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
    marginBottom: 2,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendIcon: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
});

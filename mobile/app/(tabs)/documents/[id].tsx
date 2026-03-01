import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Share,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Download, Share2, FileText } from "lucide-react-native";
import { api, type DocumentData } from "../../../lib/api";
import { colors, spacing, fontSize, borderRadius } from "../../../lib/theme";
import Card from "../../../components/Card";
import Badge from "../../../components/Badge";

function getStatusVariant(estado: string): "info" | "warning" | "success" | "default" {
  switch (estado) {
    case "borrador":
      return "info";
    case "pendiente_firma":
      return "warning";
    case "firmado":
      return "success";
    default:
      return "default";
  }
}

function getStatusLabel(estado: string): string {
  switch (estado) {
    case "borrador":
      return "Borrador";
    case "pendiente_firma":
      return "Pendiente Firma";
    case "firmado":
      return "Firmado";
    default:
      return estado;
  }
}

function getTypeLabel(tipo: string): string {
  switch (tipo) {
    case "recurso":
      return "Recurso";
    case "contrato":
      return "Contrato";
    case "otro":
      return "Otro";
    default:
      return tipo;
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-CR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    data: document,
    isLoading,
  } = useQuery<DocumentData>({
    queryKey: ["documents", id],
    queryFn: () => api.documents.get(id!),
    enabled: !!id,
  });

  const handleShare = async () => {
    if (!document) return;
    try {
      await Share.share({
        title: document.titulo,
        message: `Documento: ${document.titulo}\n\n${stripHtml(document.contenidoHtml).substring(0, 500)}...`,
      });
    } catch {
      Alert.alert("Error", "No se pudo compartir el documento.");
    }
  };

  const handleDownload = () => {
    Alert.alert(
      "Descargar",
      "La descarga de documentos estara disponible proximamente.",
      [{ text: "OK" }]
    );
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!document) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: "center",
          alignItems: "center",
          padding: spacing.xl,
        }}
      >
        <FileText size={48} color={colors.muted} strokeWidth={1.5} />
        <Text
          style={{
            color: colors.text,
            fontSize: fontSize.lg,
            fontWeight: "600",
            marginTop: spacing.md,
          }}
        >
          Documento no encontrado
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xl,
          paddingBottom: spacing.md,
          gap: spacing.md,
        }}
      >
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text
          style={{
            color: colors.text,
            fontSize: fontSize.xl,
            fontWeight: "700",
            flex: 1,
          }}
          numberOfLines={1}
        >
          {document.titulo}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxl,
        }}
      >
        <Card style={{ marginBottom: spacing.lg }}>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: spacing.sm,
              marginBottom: spacing.md,
            }}
          >
            <Badge label={getTypeLabel(document.tipo)} variant="info" />
            <Badge
              label={getStatusLabel(document.estado)}
              variant={getStatusVariant(document.estado)}
            />
          </View>
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.muted, fontSize: fontSize.sm }}>
              Creado: {formatDate(document.createdAt)}
            </Text>
            <Text style={{ color: colors.muted, fontSize: fontSize.sm }}>
              Actualizado: {formatDate(document.updatedAt)}
            </Text>
          </View>
        </Card>

        <Card style={{ marginBottom: spacing.lg }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSize.sm,
              fontWeight: "600",
              marginBottom: spacing.sm,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Contenido
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: fontSize.md,
              lineHeight: 22,
            }}
          >
            {stripHtml(document.contenidoHtml) || "Sin contenido disponible."}
          </Text>
        </Card>

        <Card style={{ marginBottom: spacing.lg }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSize.sm,
              fontWeight: "600",
              marginBottom: spacing.md,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Estado de Firma
          </Text>
          {document.estado === "firmado" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: colors.success,
                }}
              />
              <Text style={{ color: colors.text, fontSize: fontSize.md }}>
                Documento firmado
              </Text>
            </View>
          ) : document.estado === "pendiente_firma" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: colors.warning,
                }}
              />
              <Text style={{ color: colors.text, fontSize: fontSize.md }}>
                Pendiente de firma
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: colors.muted,
                }}
              />
              <Text style={{ color: colors.text, fontSize: fontSize.md }}>
                Sin firma requerida
              </Text>
            </View>
          )}
        </Card>

        <View
          style={{
            flexDirection: "row",
            gap: spacing.md,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleDownload}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: spacing.sm,
              backgroundColor: colors.card,
              borderRadius: borderRadius.md,
              paddingVertical: spacing.md,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Download size={18} color={colors.accent} />
            <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "600" }}>
              Descargar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleShare}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: spacing.sm,
              backgroundColor: colors.card,
              borderRadius: borderRadius.md,
              paddingVertical: spacing.md,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Share2 size={18} color={colors.accent} />
            <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "600" }}>
              Compartir
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

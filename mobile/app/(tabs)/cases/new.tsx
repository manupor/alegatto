import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ArrowLeft, ChevronDown } from "lucide-react-native";
import { api, CaseData } from "../../../lib/api";
import { colors, spacing, fontSize, borderRadius } from "../../../lib/theme";
import Card from "../../../components/Card";

const legalAreas = [
  "Penal",
  "Civil",
  "Laboral",
  "Comercial",
  "Constitucional",
  "Administrativo",
  "Tránsito",
];

export default function NewCaseScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [legalArea, setLegalArea] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [showAreaPicker, setShowAreaPicker] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: Partial<CaseData>) => api.cases.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      router.back();
    },
    onError: (err: Error) => {
      Alert.alert("Error", err.message || "No se pudo crear el caso");
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert("Error", "El nombre del caso es obligatorio");
      return;
    }
    if (!client.trim()) {
      Alert.alert("Error", "El nombre del cliente es obligatorio");
      return;
    }
    if (!legalArea) {
      Alert.alert("Error", "Selecciona un área legal");
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      client: client.trim(),
      legalArea,
      caseNumber: caseNumber.trim() || null,
      notes: notes.trim() || null,
      status: "active",
    });
  };

  const isValid = name.trim() && client.trim() && legalArea;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.md,
          gap: spacing.md,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700" }}>
          Nuevo Caso
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={{ gap: spacing.lg }}>
            <View style={{ gap: spacing.xs }}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: "500" }}>
                Nombre del caso *
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ej: Demanda laboral García"
                placeholderTextColor={colors.muted}
                style={{
                  backgroundColor: colors.bg,
                  borderRadius: borderRadius.sm,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.md,
                  color: colors.text,
                  fontSize: fontSize.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              />
            </View>

            <View style={{ gap: spacing.xs }}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: "500" }}>
                Cliente *
              </Text>
              <TextInput
                value={client}
                onChangeText={setClient}
                placeholder="Nombre del cliente"
                placeholderTextColor={colors.muted}
                style={{
                  backgroundColor: colors.bg,
                  borderRadius: borderRadius.sm,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.md,
                  color: colors.text,
                  fontSize: fontSize.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              />
            </View>

            <View style={{ gap: spacing.xs }}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: "500" }}>
                Área legal *
              </Text>
              <TouchableOpacity
                onPress={() => setShowAreaPicker(!showAreaPicker)}
                activeOpacity={0.7}
                style={{
                  backgroundColor: colors.bg,
                  borderRadius: borderRadius.sm,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: legalArea ? colors.text : colors.muted,
                    fontSize: fontSize.md,
                  }}
                >
                  {legalArea || "Seleccionar área legal"}
                </Text>
                <ChevronDown size={18} color={colors.muted} />
              </TouchableOpacity>

              {showAreaPicker && (
                <View
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: borderRadius.sm,
                    borderWidth: 1,
                    borderColor: colors.border,
                    marginTop: spacing.xs,
                  }}
                >
                  {legalAreas.map((area) => (
                    <TouchableOpacity
                      key={area}
                      onPress={() => {
                        setLegalArea(area);
                        setShowAreaPicker(false);
                      }}
                      activeOpacity={0.7}
                      style={{
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.md,
                        backgroundColor: legalArea === area ? colors.accent + "20" : "transparent",
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <Text
                        style={{
                          color: legalArea === area ? colors.accent : colors.text,
                          fontSize: fontSize.md,
                          fontWeight: legalArea === area ? "600" : "400",
                        }}
                      >
                        {area}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={{ gap: spacing.xs }}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: "500" }}>
                Número de expediente
              </Text>
              <TextInput
                value={caseNumber}
                onChangeText={setCaseNumber}
                placeholder="Ej: 22-000123-0007-PE"
                placeholderTextColor={colors.muted}
                style={{
                  backgroundColor: colors.bg,
                  borderRadius: borderRadius.sm,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.md,
                  color: colors.text,
                  fontSize: fontSize.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              />
            </View>

            <View style={{ gap: spacing.xs }}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: "500" }}>
                Notas
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Notas adicionales..."
                placeholderTextColor={colors.muted}
                multiline
                style={{
                  backgroundColor: colors.bg,
                  borderRadius: borderRadius.sm,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.md,
                  color: colors.text,
                  fontSize: fontSize.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  minHeight: 100,
                  textAlignVertical: "top",
                }}
              />
            </View>
          </View>
        </Card>

        <TouchableOpacity
          onPress={handleSubmit}
          activeOpacity={0.7}
          disabled={!isValid || createMutation.isPending}
          style={{
            backgroundColor: isValid ? colors.accent : colors.border,
            borderRadius: borderRadius.md,
            paddingVertical: spacing.md,
            alignItems: "center",
          }}
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "600" }}>
              Crear Caso
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

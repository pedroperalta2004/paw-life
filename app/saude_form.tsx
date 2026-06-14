import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { supabase } from "../src/lib/supabase";

type Animal = {
  id_animal: string;
  nome: string;
  especie: string;
  fotografia_url?: string | null;
};

type HealthRecord = {
  id_registo_saude: string;
  id_animal: string;
  tipo_registo: string;
  titulo: string;
  descricao: string | null;
  data_registo: string;
  proxima_data: string | null;
  hora_registo: string | null;
  veterinario: string | null;
  ficheiro_url: string | null;
  data_criacao: string;
  estado: string | null;
  local: string | null;
};

const HEALTH_TYPES = ["Vacina", "Consulta", "Exame", "Medicamento"];
const STATUS_OPTIONS = ["Concluído", "Pendente"];

function formatInputDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function normalizeTypeLabel(type: string) {
  const lower = type.toLowerCase();

  if (lower.includes("vac")) return "Vacina";
  if (lower.includes("consult")) return "Consulta";
  if (lower.includes("exam")) return "Exame";
  if (lower.includes("medic")) return "Medicamento";

  return type;
}

export default function SaudeFormScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    mode?: string;
    t?: string;
  }>();

  const recordId =
    params.mode === "create"
      ? null
      : typeof params.id === "string"
        ? params.id
        : null;

  const isEditing = !!recordId;

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);

  const [formAnimalId, setFormAnimalId] = useState("");
  const [formType, setFormType] = useState("Vacina");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formNextDate, setFormNextDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formVeterinario, setFormVeterinario] = useState("");
  const [formLocal, setFormLocal] = useState("");
  const [formStatus, setFormStatus] = useState("Pendente");

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showNextDatePicker, setShowNextDatePicker] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const resetForm = () => {
    setEditingRecord(null);
    setFormAnimalId("");
    setFormType("Vacina");
    setFormTitle("");
    setFormDescription("");
    setFormDate("");
    setFormNextDate("");
    setFormTime("");
    setFormVeterinario("");
    setFormLocal("");
    setFormStatus("Pendente");
    setShowDatePicker(false);
    setShowNextDatePicker(false);
  };

  const goToSaude = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    resetForm();
    router.replace("/saude");
  };

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  useEffect(() => {
    resetForm();
    loadData(recordId);
  }, [recordId, params.t]);

  const loadData = async (id: string | null) => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Utilizador não autenticado.");

      const { data: animalsData, error: animalsError } = await supabase
        .from("animais")
        .select("id_animal, nome, especie, fotografia_url")
        .eq("id_utilizador", user.id)
        .order("nome", { ascending: true });

      if (animalsError) throw animalsError;

      const loadedAnimals = animalsData ?? [];
      setAnimals(loadedAnimals);

      if (loadedAnimals.length === 0) {
        Alert.alert(
          "Sem animais",
          "Primeiro precisa de registar pelo menos um animal.",
          [{ text: "OK", onPress: goToSaude }],
        );
        return;
      }

      if (!id) {
        setFormAnimalId(loadedAnimals[0].id_animal);
        return;
      }

      const { data: recordData, error: recordError } = await supabase
        .from("registos_saude")
        .select("*")
        .eq("id_registo_saude", id)
        .single();

      if (recordError) throw recordError;

      const ownedAnimalIds = new Set(
        loadedAnimals.map((animal) => animal.id_animal),
      );

      if (!ownedAnimalIds.has(recordData.id_animal)) {
        throw new Error("Registo não pertence aos seus animais.");
      }

      setEditingRecord(recordData);
      setFormAnimalId(recordData.id_animal);
      setFormType(normalizeTypeLabel(recordData.tipo_registo));
      setFormTitle(recordData.titulo ?? "");
      setFormDescription(recordData.descricao ?? "");
      setFormDate(recordData.data_registo ?? "");
      setFormNextDate(recordData.proxima_data ?? "");
      setFormTime(
        recordData.hora_registo ? recordData.hora_registo.slice(0, 5) : "",
      );
      setFormVeterinario(recordData.veterinario ?? "");
      setFormLocal(recordData.local ?? "");
      setFormStatus(recordData.estado ?? "Pendente");
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível carregar o formulário.",
      );
      router.replace("/saude");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecord = async () => {
    if (!formAnimalId || !formTitle.trim() || !formDate.trim()) {
      Alert.alert(
        "Campos obrigatórios",
        "Preencha o animal, o título e a data do registo.",
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        id_animal: formAnimalId,
        tipo_registo: formType,
        titulo: formTitle.trim(),
        descricao: formDescription.trim() || null,
        data_registo: formDate.trim(),
        proxima_data: formNextDate.trim() || null,
        hora_registo: formTime.trim() || null,
        veterinario: formVeterinario.trim() || null,
        local: formLocal.trim() || null,
        estado: formStatus,
      };

      if (isEditing && recordId) {
        const { error } = await supabase
          .from("registos_saude")
          .update(payload)
          .eq("id_registo_saude", recordId);

        if (error) throw error;

        Alert.alert("Sucesso", "Registo atualizado com sucesso.", [
          { text: "OK", onPress: goToSaude },
        ]);
      } else {
        const { error } = await supabase
          .from("registos_saude")
          .insert([payload]);

        if (error) throw error;

        Alert.alert("Sucesso", "Registo de saúde criado com sucesso.", [
          { text: "OK", onPress: goToSaude },
        ]);
      }
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível guardar o registo.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingWrapper}>
        <ActivityIndicator size="large" color="#0F9D92" />
        <Text style={styles.loadingText}>A carregar registo...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>
              {isEditing ? "Editar Registo de Saúde" : "Novo Registo de Saúde"}
            </Text>
            <Text style={styles.pageSubtitle}>
              {isEditing
                ? "Atualize a informação do registo selecionado."
                : "Preencha os dados principais do novo registo."}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.closePageButton,
              pressed && styles.whiteButtonPressed,
            ]}
            onPress={goToSaude}
          >
            <Ionicons name="close" size={22} color="#334155" />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Animal</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {animals.map((animal) => (
              <Pressable
                key={animal.id_animal}
                style={styles.animalAvatarWrapper}
                onPress={() => setFormAnimalId(animal.id_animal)}
              >
                <View
                  style={[
                    styles.animalAvatar,
                    formAnimalId === animal.id_animal &&
                      styles.animalAvatarActive,
                  ]}
                >
                  {animal.fotografia_url ? (
                    <Image
                      source={{ uri: animal.fotografia_url }}
                      style={styles.animalAvatarImage}
                    />
                  ) : (
                    <Ionicons name="paw-outline" size={24} color="#64748B" />
                  )}
                </View>

                <Text
                  style={[
                    styles.animalAvatarName,
                    formAnimalId === animal.id_animal &&
                      styles.animalAvatarNameActive,
                  ]}
                  numberOfLines={1}
                >
                  {animal.nome}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.fieldLabel}>Tipo de Registo</Text>
          <View style={styles.typeGrid}>
            {HEALTH_TYPES.map((type) => (
              <Pressable
                key={type}
                style={[
                  styles.typeCard,
                  formType === type && styles.typeCardActive,
                ]}
                onPress={() => setFormType(type)}
              >
                <Text
                  style={[
                    styles.typeCardText,
                    formType === type && styles.typeCardTextActive,
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Título</Text>
          <TextInput
            style={styles.input}
            value={formTitle}
            onChangeText={setFormTitle}
            placeholder="Insira o título do registo"
            placeholderTextColor="#94A3B8"
          />

          <Text style={styles.fieldLabel}>Descrição</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formDescription}
            onChangeText={setFormDescription}
            placeholder="Detalhes do registo"
            placeholderTextColor="#94A3B8"
            multiline
          />

          <Text style={styles.fieldLabel}>Data do Registo</Text>
          <Pressable
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={formDate ? styles.dateText : styles.datePlaceholder}>
              {formDate || "Selecionar data do registo"}
            </Text>
            <Ionicons name="calendar-outline" size={18} color="#64748B" />
          </Pressable>

          {showDatePicker && (
            <DateTimePicker
              value={formDate ? new Date(formDate) : new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setFormDate(formatInputDate(selectedDate));
              }}
            />
          )}

          <Text style={styles.fieldLabel}>Data da Marcação</Text>
          <Pressable
            style={styles.dateInput}
            onPress={() => setShowNextDatePicker(true)}
          >
            <Text
              style={formNextDate ? styles.dateText : styles.datePlaceholder}
            >
              {formNextDate || "Selecionar data da marcação"}
            </Text>
            <Ionicons name="calendar-outline" size={18} color="#64748B" />
          </Pressable>

          {showNextDatePicker && (
            <DateTimePicker
              value={formNextDate ? new Date(formNextDate) : new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowNextDatePicker(false);
                if (selectedDate)
                  setFormNextDate(formatInputDate(selectedDate));
              }}
            />
          )}

          <Text style={styles.fieldLabel}>Hora</Text>
          <TextInput
            style={styles.input}
            value={formTime}
            onChangeText={setFormTime}
            placeholder="Insira a hora do registo (HH:MM)"
            placeholderTextColor="#94A3B8"
            keyboardType="numbers-and-punctuation"
          />

          <Text style={styles.fieldLabel}>Veterinário / Médico</Text>
          <TextInput
            style={styles.input}
            value={formVeterinario}
            onChangeText={setFormVeterinario}
            placeholder="Insira o nome do veterinário ou médico"
            placeholderTextColor="#94A3B8"
          />

          <Text style={styles.fieldLabel}>Local</Text>
          <TextInput
            style={styles.input}
            value={formLocal}
            onChangeText={setFormLocal}
            placeholder="Insira o local do registo"
            placeholderTextColor="#94A3B8"
          />

          <Text style={styles.fieldLabel}>Estado</Text>
          <View style={styles.statusOptionsRow}>
            {STATUS_OPTIONS.map((status) => (
              <Pressable
                key={status}
                style={[
                  styles.optionChip,
                  formStatus === status && styles.optionChipActive,
                ]}
                onPress={() => setFormStatus(status)}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    formStatus === status && styles.optionChipTextActive,
                  ]}
                >
                  {status}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.separator} />

          <View style={styles.buttonsRow}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.whiteButtonPressed,
              ]}
              onPress={goToSaude}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.ButtonPressed,
              ]}
              onPress={handleSaveRecord}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {isEditing ? "Guardar Alterações" : "Guardar"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F3F4F6" },
  container: { padding: 18, paddingBottom: 40 },

  loadingWrapper: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
    maxWidth: 280,
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 22,
    maxWidth: 280,
  },
  closePageButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#0F172A",
  },
  textArea: { height: 90, textAlignVertical: "top", paddingTop: 14 },
  dateInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateText: { fontSize: 14, color: "#0F172A" },
  datePlaceholder: { fontSize: 14, color: "#94A3B8" },

  animalAvatarWrapper: {
    alignItems: "center",
    marginRight: 14,
    width: 74,
  },
  animalAvatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  animalAvatarActive: {
    borderColor: "#0F9D92",
    backgroundColor: "#DBF5F1",
  },
  animalAvatarImage: {
    width: "100%",
    height: "100%",
  },
  animalAvatarName: {
    marginTop: 6,
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    textAlign: "center",
  },
  animalAvatarNameActive: {
    color: "#0F9D92",
    fontWeight: "800",
  },

  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  typeCard: {
    width: "48%",
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  typeCardActive: {
    backgroundColor: "#DBF5F1",
    borderColor: "#0F9D92",
  },
  typeCardText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  typeCardTextActive: {
    color: "#0F9D92",
    fontWeight: "800",
  },

  optionChip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    marginBottom: 6,
  },
  optionChipActive: { backgroundColor: "#DBF5F1", borderColor: "#0F9D92" },
  optionChipText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  optionChipTextActive: { color: "#0F9D92" },
  statusOptionsRow: { flexDirection: "row", flexWrap: "wrap" },

  separator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 8,
    marginBottom: 18,
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
  },
  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#0F9D92",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },

  ButtonPressed: {
    backgroundColor: "#15968b",
    transform: [{ scale: 0.99 }],
  },
  whiteButtonPressed: {
    backgroundColor: "#f6f7f7",
    transform: [{ scale: 0.99 }],
  },
});

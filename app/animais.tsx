import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
  Feather,
  FontAwesome5,
} from "@expo/vector-icons";
import { supabase } from "../src/lib/supabase";
import { router, useFocusEffect } from "expo-router";

type Animal = {
  id_animal: string;
  id_utilizador: string;
  nome: string;
  especie: string;
  raca: string | null;
  idade: number | null;
  data_nascimento: string | null;
  peso: number | null;
  genero: string | null;
  tipo_sangue: string | null;
  fotografia_url: string | null;
  data_criacao: string;
};

type HealthRecord = {
  id_registo_saude: string;
  id_animal: string;
  tipo_registo: string;
  estado: string | null;
  proxima_data: string | null;
};

function isVaccineRecord(type: string | null) {
  if (!type) return false;
  return type.toLowerCase().includes("vac");
}

function isPastDate(dateString: string | null) {
  if (!dateString) return false;

  const today = new Date();
  const target = new Date(dateString);

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return target.getTime() < today.getTime();
}

function formatWeight(value: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  return `${Number(value).toFixed(1)} kg`;
}

function calculateAge(birthDate: string | null) {
  if (!birthDate) return null;

  const today = new Date();
  const birth = new Date(birthDate);

  if (Number.isNaN(birth.getTime())) return null;

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

export default function PetsScreen() {
  const [showWeightModal, setShowWeightModal] = useState(false);

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);

  const [loadingAnimals, setLoadingAnimals] = useState(true);
  const [savingWeight, setSavingWeight] = useState(false);

  const [selectedWeightAnimal, setSelectedWeightAnimal] =
    useState<Animal | null>(null);
  const [newWeight, setNewWeight] = useState("");

  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setAnimals([]);
      setLoadingAnimals(true);

      loadAnimals();
    }, []),
  );

  const loadAnimals = async () => {
    try {
      setLoadingAnimals(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setAnimals([]);
        setHealthRecords([]);
        return;
      }

      const { data: animalsData, error: animalsError } = await supabase
        .from("animais")
        .select("*")
        .eq("id_utilizador", user.id)
        .order("data_criacao", { ascending: false });

      if (animalsError) throw animalsError;

      const animalIds = (animalsData ?? []).map((animal) => animal.id_animal);

      let recordsData: HealthRecord[] = [];
      if (animalIds.length > 0) {
        const { data: healthData, error: healthError } = await supabase
          .from("registos_saude")
          .select(
            "id_registo_saude, id_animal, tipo_registo, estado, proxima_data",
          )
          .in("id_animal", animalIds);

        if (healthError) throw healthError;

        recordsData = healthData ?? [];
      }

      setAnimals(animalsData ?? []);
      setHealthRecords(recordsData);
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível carregar os animais.",
      );
    } finally {
      setLoadingAnimals(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnimals();
    setRefreshing(false);
  };

  const openCreateModal = () => {
    router.push({
      pathname: "/animal_form",
      params: { mode: "create", t: Date.now().toString() },
    });
  };

  const openEditModal = (animal: Animal) => {
    router.push({
      pathname: "/animal_form",
      params: {
        id: animal.id_animal,
        mode: "edit",
        t: Date.now().toString(),
      },
    });
  };

  const openWeightModal = (animal: Animal) => {
    setSelectedWeightAnimal(animal);
    setNewWeight(animal.peso !== null ? String(animal.peso) : "");
    setShowWeightModal(true);
  };

  const openWeightHistory = (animal: Animal) => {
    router.push(
      `/historico_peso?id=${animal.id_animal}&t=${Date.now().toString()}`,
    );
  };

  const getVaccineStatus = (animalId: string) => {
    const vaccines = healthRecords.filter(
      (record) =>
        record.id_animal === animalId && isVaccineRecord(record.tipo_registo),
    );

    if (vaccines.length === 0) {
      return {
        label: "Sem dados de vacinas",
        color: "#64748B",
        backgroundColor: "#F8FAFC",
        borderColor: "#e5e7eb7e",
        icon: "help-circle-outline" as const,
      };
    }

    const hasExpiredPendingVaccine = vaccines.some((record) => {
      const isDone = (record.estado ?? "").toLowerCase() === "concluído";
      const isExpired = isPastDate(record.proxima_data);

      return !isDone && isExpired;
    });

    if (hasExpiredPendingVaccine) {
      return {
        label: "Vacinas por atualizar",
        color: "#E11D48",
        backgroundColor: "#FFF1F2",
        borderColor: "#FECACA",
        icon: "alert-circle-outline" as const,
      };
    }

    return {
      label: "Vacinas em dia",
      color: "#10B981",
      backgroundColor: "#ECFDF5",
      borderColor: "#A7F3D0",
      icon: "checkmark-circle-outline" as const,
    };
  };

  const handleSaveWeight = async () => {
    if (!selectedWeightAnimal) return;

    const parsedWeight = Number(newWeight.replace(",", "."));

    if (Number.isNaN(parsedWeight) || parsedWeight <= 0) {
      Alert.alert("Peso inválido", "Introduza um peso válido.");
      return;
    }

    try {
      setSavingWeight(true);

      const today = new Date().toISOString().split("T")[0];

      const { data: insertedWeight, error: weightError } = await supabase
        .from("peso_animais")
        .insert([
          {
            id_animal: selectedWeightAnimal.id_animal,
            peso: parsedWeight,
            data_registo: today,
          },
        ])
        .select()
        .single();

      if (weightError) throw weightError;

      const { data: updatedAnimal, error: animalError } = await supabase
        .from("animais")
        .update({ peso: parsedWeight })
        .eq("id_animal", selectedWeightAnimal.id_animal)
        .select()
        .single();

      if (animalError) throw animalError;
      setAnimals((prev) =>
        prev.map((animal) =>
          animal.id_animal === selectedWeightAnimal.id_animal
            ? updatedAnimal
            : animal,
        ),
      );

      setShowWeightModal(false);
      setSelectedWeightAnimal(null);
      setNewWeight("");

      Alert.alert("Sucesso", "Peso registado com sucesso.");
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Não foi possível registar o peso.");
    } finally {
      setSavingWeight(false);
    }
  };

  const renderAnimalCard = (animal: Animal) => {
    const vaccineStatus = getVaccineStatus(animal.id_animal);

    return (
      <View key={animal.id_animal} style={styles.petCard}>
        <View style={styles.petImageWrapper}>
          {animal.fotografia_url ? (
            <Image
              source={{ uri: animal.fotografia_url }}
              style={styles.petImage}
            />
          ) : (
            <View style={styles.petImagePlaceholder}>
              <Ionicons name="paw-outline" size={48} color="#94A3B8" />
            </View>
          )}

          <View style={styles.petImageOverlay}>
            <View>
              <Text style={styles.petName}>{animal.nome}</Text>
              <Text style={styles.petBreed}>
                {animal.especie}
                {animal.raca ? ` • ${animal.raca}` : ""}
              </Text>
            </View>

            <Pressable
              style={styles.editImageButton}
              onPress={() => openEditModal(animal)}
            >
              <Feather name="edit-2" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <MaterialIcons name="cake" size={18} color="#F59E0B" />
            <Text style={styles.infoLabel}>IDADE</Text>
            <Text style={styles.infoValue}>
              {calculateAge(animal.data_nascimento) !== null
                ? `${calculateAge(animal.data_nascimento)} anos`
                : "--"}
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Feather name="activity" size={18} color="#3B82F6" />
            <Text style={styles.infoLabel}>PESO</Text>
            <Text style={styles.infoValue}>{formatWeight(animal.peso)}</Text>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="document-text-outline" size={18} color="#8B5CF6" />
            <Text style={styles.infoLabel}>SEXO</Text>
            <Text style={styles.infoValue}>{animal.genero || "--"}</Text>
          </View>

          <View style={styles.infoBox}>
            <FontAwesome5 name="tint" size={16} color="#EF4444" />
            <Text style={styles.infoLabel}>SANGUE</Text>
            <Text style={styles.infoValue}>{animal.tipo_sangue || "--"}</Text>
          </View>
        </View>

        <View
          style={[
            styles.vaccineStatusBox,
            {
              backgroundColor: vaccineStatus.backgroundColor,
              borderColor: vaccineStatus.borderColor,
            },
          ]}
        >
          <Ionicons
            name={vaccineStatus.icon}
            size={20}
            color={vaccineStatus.color}
          />
          <Text
            style={[styles.vaccineStatusText, { color: vaccineStatus.color }]}
          >
            {vaccineStatus.label}
          </Text>
        </View>

        <View style={styles.quickButtonsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.quickHistoryButton,
              pressed && styles.quickHistoryButtonPressed,
            ]}
            onPress={() => openWeightHistory(animal)}
          >
            <Feather name="bar-chart-2" size={15} color="#334155" />
            <Text style={styles.quickHistoryButtonText}>Histórico de peso</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.quickWeightButton,
              pressed && styles.quickWeightButtonPressed,
            ]}
            onPress={() => openWeightModal(animal)}
          >
            <Ionicons name="add-circle-outline" size={17} color="#0F9D92" />
            <Text style={styles.quickWeightButtonText}>Registar peso</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0F9D92"]}
            tintColor="#0F9D92"
          />
        }
      >
        <Text style={styles.pageTitle}>Os Meus Animais</Text>
        <Text style={styles.pageSubtitle}>
          Faça a gestão dos perfis e informações básicas dos seus animais.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.registerButton,
            pressed && styles.greenButtonPressed,
          ]}
          onPress={openCreateModal}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.registerButtonText}>Registar Novo Animal</Text>
        </Pressable>

        {loadingAnimals ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color="#0F9D92" />
            <Text style={styles.loadingText}>A carregar animais...</Text>
          </View>
        ) : animals.length === 0 ? (
          <>
            <View style={styles.emptyStateCard}>
              <Ionicons name="paw-outline" size={42} color="#94A3B8" />
              <Text style={styles.emptyStateTitle}>Ainda não tem animais</Text>
              <Text style={styles.emptyStateText}>
                Registe o seu primeiro animal para começar a gerir toda a
                informação no PawLife.
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.emptyStateButton,
                  pressed && styles.greenButtonPressed,
                ]}
                onPress={openCreateModal}
              >
                <Text style={styles.emptyStateButtonText}>
                  Registar Primeiro Animal
                </Text>
              </Pressable>
            </View>

            <View style={styles.emptyAdoptionCard}>
              <View style={styles.emptyAdoptionHeader}>
                <View style={styles.emptyAdoptionIcon}>
                  <Ionicons name="heart" size={22} color="#0F9D92" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.emptyAdoptionTitle}>
                    Procura um novo amigo?
                  </Text>
                  <Text style={styles.emptyAdoptionSubtitle}>Adoção</Text>
                </View>
              </View>

              <Text style={styles.emptyAdoptionText}>
                Descubra associações de adoção e ajude um animal a encontrar uma
                nova casa.
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.emptyAdoptionButton,
                  pressed && styles.adoptionButtonPressed,
                ]}
                onPress={() => router.push("/adocao")}
              >
                <Text style={styles.emptyAdoptionButtonText}>
                  Explorar Adoções
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#0F9D92" />
              </Pressable>
            </View>
          </>
        ) : (
          animals.map(renderAnimalCard)
        )}
      </ScrollView>

      <Modal visible={showWeightModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.weightModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registar Peso</Text>

              <Pressable
                onPress={() => {
                  setShowWeightModal(false);
                  setSelectedWeightAnimal(null);
                  setNewWeight("");
                }}
              >
                <Ionicons name="close" size={22} color="#94A3B8" />
              </Pressable>
            </View>

            <Text style={styles.weightModalSubtitle}>
              {selectedWeightAnimal?.nome}
            </Text>

            <Text style={styles.fieldLabel}>Novo peso (kg)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 12.4"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              value={newWeight}
              onChangeText={setNewWeight}
            />

            <View style={styles.modalSeparatorBottom} />

            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && styles.whiteButtonPressed,
                ]}
                onPress={() => {
                  setShowWeightModal(false);
                  setSelectedWeightAnimal(null);
                  setNewWeight("");
                }}
                disabled={savingWeight}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.greenButtonPressed,
                ]}
                onPress={handleSaveWeight}
                disabled={savingWeight}
              >
                {savingWeight ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar Peso</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  container: {
    padding: 18,
    paddingBottom: 40,
  },

  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },

  pageSubtitle: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 22,
    marginBottom: 18,
    maxWidth: 280,
  },

  registerButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#0F9D92",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
    marginBottom: 22,
  },

  registerButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  loadingWrapper: {
    paddingVertical: 50,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },

  emptyStateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 34,
    paddingHorizontal: 22,
    alignItems: "center",
  },

  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 14,
    marginBottom: 8,
  },

  emptyStateText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },

  emptyStateButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: "#0F9D92",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  emptyStateButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  petCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 18,
  },

  petImageWrapper: {
    position: "relative",
    height: 200,
  },

  petImage: {
    width: "100%",
    height: "100%",
  },

  petImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  petImageOverlay: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  petName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  petBreed: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  editImageButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 16,
  },

  infoBox: {
    width: "47.5%",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb7e",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginBottom: 12,
  },

  infoLabel: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 8,
    marginBottom: 4,
  },

  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },

  vaccineStatusBox: {
    marginHorizontal: 18,
    marginTop: 6,
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  vaccineStatusText: {
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 8,
  },

  quickButtonsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },

  quickHistoryButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  quickHistoryButtonText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800",
  },

  quickWeightButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#ECFEFF",
    borderWidth: 1,
    borderColor: "#BCE7DF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  quickWeightButtonText: {
    color: "#0F9D92",
    fontSize: 13,
    fontWeight: "800",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.25)",
    justifyContent: "center",
    padding: 18,
  },

  weightModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },

  modalSeparator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginBottom: 18,
  },

  modalSeparatorBottom: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 8,
    marginBottom: 18,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },

  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#0F172A",
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
  },

  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#0F9D92",
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  weightModalSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 18,
  },

  greenButtonPressed: {
    backgroundColor: "#15968b",
    transform: [{ scale: 0.99 }],
  },

  whiteButtonPressed: {
    backgroundColor: "#f1f1f1",
    transform: [{ scale: 0.99 }],
  },

  quickHistoryButtonPressed: {
    backgroundColor: "#f0f0f0",
    transform: [{ scale: 0.99 }],
  },

  quickWeightButtonPressed: {
    backgroundColor: "#dafdff",
    transform: [{ scale: 0.99 }],
  },

  emptyAdoptionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#BCE7DF",
    padding: 20,
    marginTop: 16,
  },

  emptyAdoptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  emptyAdoptionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  emptyAdoptionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },

  emptyAdoptionSubtitle: {
    fontSize: 13,
    color: "#0F9D92",
    fontWeight: "700",
  },

  emptyAdoptionText: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 22,
    marginBottom: 18,
  },

  emptyAdoptionButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#E8FFF7",
    borderWidth: 1,
    borderColor: "#BCE7DF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  emptyAdoptionButtonText: {
    color: "#0F9D92",
    fontSize: 14,
    fontWeight: "700",
  },

  adoptionButtonPressed: {
    backgroundColor: "rgb(229, 250, 248)",
    transform: [{ scale: 0.99 }],
  },
});

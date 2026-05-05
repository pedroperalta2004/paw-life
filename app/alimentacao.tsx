import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../src/lib/supabase";

type Animal = {
  id_animal: string;
  nome: string;
};

type FoodPlan = {
  id_alimentacao: string;
  id_animal: string;
  nome_racao: string;
  stock_atual: number;
  stock_total: number;
  porcao_diaria: number;
  link_compra: string | null;
  data_criacao: string;
};

export default function FoodScreen() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [foods, setFoods] = useState<FoodPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodPlan | null>(null);
  const [saving, setSaving] = useState(false);

  const [formAnimalId, setFormAnimalId] = useState("");
  const [formFoodName, setFormFoodName] = useState("");
  const [formStockAtual, setFormStockAtual] = useState("");
  const [formStockTotal, setFormStockTotal] = useState("");
  const [formPorcaoDiaria, setFormPorcaoDiaria] = useState("");
  const [formLinkCompra, setFormLinkCompra] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
        .select("id_animal, nome")
        .eq("id_utilizador", user.id)
        .order("nome", { ascending: true });

      if (animalsError) throw animalsError;

      const animalIds = (animalsData ?? []).map((animal) => animal.id_animal);

      if (animalIds.length === 0) {
        setAnimals([]);
        setFoods([]);
        return;
      }

      const { data: foodsData, error: foodsError } = await supabase
        .from("alimentacao")
        .select("*")
        .in("id_animal", animalIds)
        .order("data_criacao", { ascending: false });

      if (foodsError) throw foodsError;

      setAnimals(animalsData ?? []);
      setFoods(foodsData ?? []);

      if ((animalsData ?? []).length > 0) {
        setFormAnimalId(animalsData![0].id_animal);
      }
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível carregar a alimentação."
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const resetForm = () => {
    setEditingFood(null);
    setFormAnimalId(animals[0]?.id_animal ?? "");
    setFormFoodName("");
    setFormStockAtual("");
    setFormStockTotal("");
    setFormPorcaoDiaria("");
    setFormLinkCompra("");
  };

  const openCreateModal = () => {
    if (animals.length === 0) {
      Alert.alert(
        "Sem animais",
        "Primeiro precisa de registar pelo menos um animal."
      );
      return;
    }

    resetForm();
    setShowModal(true);
  };

  const openEditModal = (food: FoodPlan) => {
    setEditingFood(food);
    setFormAnimalId(food.id_animal);
    setFormFoodName(food.nome_racao);
    setFormStockAtual(String(food.stock_atual));
    setFormStockTotal(String(food.stock_total));
    setFormPorcaoDiaria(String(food.porcao_diaria));
    setFormLinkCompra(food.link_compra ?? "");
    setShowModal(true);
  };

  const getAnimalName = (id: string) => {
    return animals.find((animal) => animal.id_animal === id)?.nome ?? "--";
  };

  const getProgressPercent = (value: number, total: number) => {
    if (total <= 0) return 0;
    return Math.max(0, Math.min(100, (value / total) * 100));
  };

  const getEstimatedDays = (stockKg: number, dailyPortionGrams: number) => {
    if (dailyPortionGrams <= 0) return 0;

    const stockGrams = stockKg * 1000;
    return Math.floor(stockGrams / dailyPortionGrams);
  };

  const validateUrl = (url: string) => {
    if (!url.trim()) return null;

    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url.trim();
    }

    return `https://${url.trim()}`;
  };

  const handleFeedPet = async (food: FoodPlan) => {
    try {
      const stockAtual = Number(food.stock_atual);
      const porcaoKg = Number(food.porcao_diaria) / 1000;
      const newStock = Math.max(0, Number((stockAtual - porcaoKg).toFixed(3)));

      if (stockAtual <= 0) {
        Alert.alert("Stock vazio", "Já não existe stock disponível.");
        return;
      }

      const { data, error } = await supabase
        .from("alimentacao")
        .update({ stock_atual: newStock })
        .eq("id_alimentacao", food.id_alimentacao)
        .select()
        .single();

      if (error) throw error;

      setFoods((prev) =>
        prev.map((item) =>
          item.id_alimentacao === food.id_alimentacao ? data : item
        )
      );
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Não foi possível dar a porção.");
    }
  };

  const handleRefillStock = async (food: FoodPlan) => {
    try {
      const { data, error } = await supabase
        .from("alimentacao")
        .update({ stock_atual: food.stock_total })
        .eq("id_alimentacao", food.id_alimentacao)
        .select()
        .single();

      if (error) throw error;

      setFoods((prev) =>
        prev.map((item) =>
          item.id_alimentacao === food.id_alimentacao ? data : item
        )
      );

      Alert.alert("Stock reposto", "O stock foi atualizado para o saco completo.");
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Não foi possível repor o stock.");
    }
  };

  const handleSaveFood = async () => {
    if (
      !formAnimalId ||
      !formFoodName.trim() ||
      !formStockAtual.trim() ||
      !formStockTotal.trim() ||
      !formPorcaoDiaria.trim()
    ) {
      Alert.alert(
        "Campos obrigatórios",
        "Preencha o animal, nome da ração, stock atual, stock total e porção diária."
      );
      return;
    }

    const stockAtual = Number(formStockAtual.replace(",", "."));
    const stockTotal = Number(formStockTotal.replace(",", "."));
    const porcaoDiaria = Number(formPorcaoDiaria.replace(",", "."));

    if (
      Number.isNaN(stockAtual) ||
      Number.isNaN(stockTotal) ||
      Number.isNaN(porcaoDiaria)
    ) {
      Alert.alert("Valores inválidos", "Os campos numéricos devem conter números.");
      return;
    }

    if (stockAtual < 0 || stockTotal <= 0 || porcaoDiaria <= 0) {
      Alert.alert(
        "Valores inválidos",
        "O stock total e a porção diária devem ser superiores a 0."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        id_animal: formAnimalId,
        nome_racao: formFoodName.trim(),
        stock_atual: stockAtual,
        stock_total: stockTotal,
        porcao_diaria: porcaoDiaria,
        link_compra: validateUrl(formLinkCompra),
      };

      if (editingFood) {
        const { data, error } = await supabase
          .from("alimentacao")
          .update(payload)
          .eq("id_alimentacao", editingFood.id_alimentacao)
          .select()
          .single();

        if (error) throw error;

        setFoods((prev) =>
          prev.map((item) =>
            item.id_alimentacao === editingFood.id_alimentacao ? data : item
          )
        );

        Alert.alert("Sucesso", "Plano de alimentação atualizado.");
      } else {
        const { data, error } = await supabase
          .from("alimentacao")
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        setFoods((prev) => [data, ...prev]);
        Alert.alert("Sucesso", "Plano de alimentação criado.");
      }

      setShowModal(false);
      resetForm();
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível guardar o plano."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFood = (food: FoodPlan) => {
    Alert.alert(
      "Eliminar plano",
      `Tem a certeza que pretende eliminar "${food.nome_racao}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("alimentacao")
                .delete()
                .eq("id_alimentacao", food.id_alimentacao);

              if (error) throw error;

              setFoods((prev) =>
                prev.filter(
                  (item) => item.id_alimentacao !== food.id_alimentacao
                )
              );

              Alert.alert("Sucesso", "Plano eliminado.");
            } catch (error: any) {
              Alert.alert(
                "Erro",
                error.message || "Não foi possível eliminar o plano."
              );
            }
          },
        },
      ]
    );
  };

  const handleBuy = async (url: string | null) => {
    if (!url) {
      Alert.alert(
        "Sem link",
        "Este plano ainda não tem um link de compra associado."
      );
      return;
    }

    const finalUrl = validateUrl(url);

    if (!finalUrl) return;

    const canOpen = await Linking.canOpenURL(finalUrl);

    if (!canOpen) {
      Alert.alert("Erro", "Não foi possível abrir o link de compra.");
      return;
    }

    await Linking.openURL(finalUrl);
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
        <Text style={styles.pageTitle}>Gestão de Alimentação</Text>
        <Text style={styles.pageSubtitle}>
          Controle o stock de ração e receba alertas antes que acabe.
        </Text>

        <Pressable style={styles.addButton} onPress={openCreateModal}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Novo Saco de Ração</Text>
        </Pressable>

        {loading ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color="#0F9D92" />
          </View>
        ) : foods.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Sem planos de alimentação</Text>
            <Text style={styles.emptyText}>
              Ainda não criou nenhum saco de ração. Toque em “Novo Saco de
              Ração” para começar.
            </Text>
          </View>
        ) : (
          foods.map((item) => {
            const progress = getProgressPercent(
              Number(item.stock_atual),
              Number(item.stock_total)
            );

            const estimatedDays = getEstimatedDays(
              Number(item.stock_atual),
              Number(item.porcao_diaria)
            );

            const critical = estimatedDays <= 7;

            return (
              <View key={item.id_alimentacao} style={styles.foodCard}>
                <View style={styles.petBadge}>
                  <Text style={styles.petBadgeText}>
                    Para: {getAnimalName(item.id_animal)}
                  </Text>
                </View>

                <View style={styles.imagePlaceholder}>
                  <MaterialCommunityIcons
                    name="package-variant-closed"
                    size={44}
                    color="#CBD5E1"
                  />
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.foodName}>{item.nome_racao}</Text>

                  <View style={styles.stockRow}>
                    <Text style={styles.stockLabel}>Stock atual</Text>
                    <Text
                      style={[
                        styles.stockValue,
                        !critical && styles.stockValueNormal,
                      ]}
                    >
                      {Number(item.stock_atual).toFixed(2)} kg de{" "}
                      {item.stock_total} kg
                    </Text>
                  </View>

                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${progress}%` },
                        critical
                          ? styles.progressFillCritical
                          : styles.progressFillNormal,
                      ]}
                    />
                  </View>

                  <View style={styles.metricsRow}>
                    <View style={styles.metricBox}>
                      <Text style={styles.metricLabel}>PORÇÃO DIÁRIA</Text>
                      <Text style={styles.metricValue}>
                        {item.porcao_diaria}g
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.metricBox,
                        critical && styles.metricBoxAlert,
                      ]}
                    >
                      <Text
                        style={[
                          styles.metricLabel,
                          critical && styles.metricLabelAlert,
                        ]}
                      >
                        DURAÇÃO EST.
                      </Text>
                      <Text
                        style={[
                          styles.metricValue,
                          critical && styles.metricValueAlert,
                        ]}
                      >
                        ~{estimatedDays} dias
                      </Text>
                    </View>
                  </View>

                  {critical ? (
                    <View style={styles.alertBox}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={18}
                        color="#F43F5E"
                        style={{ marginRight: 8 }}
                      />

                      <Text style={styles.alertText}>
                        Stock crítico! Recomendamos a compra de um novo saco em breve.
                      </Text>

                      <Pressable
                        style={styles.refillButton}
                        onPress={() => handleRefillStock(item)}
                      >
                        <Text style={styles.refillButtonText}>Repor</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.okBox}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="#10B981"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.okText}>
                        Stock suficiente para os próximos dias.
                      </Text>
                    </View>
                  )}

                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.feedButton}
                      onPress={() => handleFeedPet(item)}
                    >
                      <MaterialCommunityIcons
                        name="food-drumstick"
                        size={16}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.feedButtonText}>Dar porção</Text>
                    </Pressable>

                    <Pressable
                      style={styles.iconButton}
                      onPress={() => openEditModal(item)}
                    >
                      <Feather name="edit-2" size={16} color="#0F9D92" />
                    </Pressable>

                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => handleDeleteFood(item)}
                    >
                      <Feather name="trash-2" size={15} color="#DC2626" />
                    </Pressable>

                    <Pressable
                      style={styles.buyButton}
                      onPress={() => handleBuy(item.link_compra)}
                    >
                      <Feather
                        name="shopping-cart"
                        size={16}
                        color="#FFFFFF"
                      />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingFood ? "Editar Plano" : "Novo Saco de Ração"}
                </Text>

                <Pressable
                  onPress={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  <Ionicons name="close" size={22} color="#94A3B8" />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>Animal</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {animals.map((animal) => (
                  <Pressable
                    key={animal.id_animal}
                    style={[
                      styles.optionChip,
                      formAnimalId === animal.id_animal &&
                        styles.optionChipActive,
                    ]}
                    onPress={() => setFormAnimalId(animal.id_animal)}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        formAnimalId === animal.id_animal &&
                          styles.optionChipTextActive,
                      ]}
                    >
                      {animal.nome}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Nome da Ração</Text>
              <TextInput
                style={styles.input}
                value={formFoodName}
                onChangeText={setFormFoodName}
                placeholder="Ex: Royal Canin Medium"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.fieldLabel}>Stock Atual (kg)</Text>
              <TextInput
                style={styles.input}
                value={formStockAtual}
                onChangeText={setFormStockAtual}
                placeholder="Ex: 2.1"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
              />

              <Text style={styles.fieldLabel}>Stock Total do Saco (kg)</Text>
              <TextInput
                style={styles.input}
                value={formStockTotal}
                onChangeText={setFormStockTotal}
                placeholder="Ex: 15"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
              />

              <Text style={styles.fieldLabel}>Porção Diária (g)</Text>
              <TextInput
                style={styles.input}
                value={formPorcaoDiaria}
                onChangeText={setFormPorcaoDiaria}
                placeholder="Ex: 300"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
              />

              <Text style={styles.fieldLabel}>Link de Compra</Text>
              <TextInput
                style={styles.input}
                value={formLinkCompra}
                onChangeText={setFormLinkCompra}
                placeholder="Ex: https://www.zooplus.pt/..."
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                keyboardType="url"
              />

              <View style={styles.modalButtons}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>

                <Pressable
                  style={styles.saveButton}
                  onPress={handleSaveFood}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingFood ? "Guardar" : "Criar"}
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
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
    fontSize: 23,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },

  pageSubtitle: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 22,
    marginBottom: 18,
    maxWidth: 290,
  },

  addButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#0F9D92",
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    marginBottom: 22,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
  },

  loadingWrapper: {
    paddingVertical: 40,
    alignItems: "center",
  },

  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 22,
  },

  foodCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 18,
    overflow: "hidden",
  },

  petBadge: {
    alignSelf: "flex-start",
    marginTop: 12,
    marginLeft: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 2,
  },

  petBadgeText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },

  imagePlaceholder: {
    height: 115,
    backgroundColor: "#EEF2F7",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    padding: 14,
  },

  infoSection: {
    padding: 18,
  },

  foodName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 14,
  },

  stockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  stockLabel: {
    fontSize: 13,
    color: "#64748B",
  },

  stockValue: {
    fontSize: 14,
    color: "#E11D48",
    fontWeight: "700",
  },

  stockValueNormal: {
    color: "#0F172A",
  },

  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 16,
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
  },

  progressFillCritical: {
    backgroundColor: "#F43F5E",
  },

  progressFillNormal: {
    backgroundColor: "#10B981",
  },

  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },

  metricBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },

  metricBoxAlert: {
    backgroundColor: "#FFF5F5",
    borderColor: "#FAD2D8",
  },

  metricLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
    marginBottom: 6,
  },

  metricLabelAlert: {
    color: "#F43F5E",
  },

  metricValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },

  metricValueAlert: {
    color: "#E11D48",
  },

  alertBox: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F8B4C0",
    backgroundColor: "#FFF1F2",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 18,
  },

  alertText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#E11D48",
    fontWeight: "500",
  },

  okBox: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 18,
  },

  okText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#15803D",
    fontWeight: "500",
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
  },

  feedButton: {
    flex: 1.4,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#0F9D92",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  feedButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BCE7DF",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
  },

  buyButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#1E2F4F",
    alignItems: "center",
    justifyContent: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.25)",
    justifyContent: "center",
    padding: 18,
  },

  modalCard: {
    maxHeight: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
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

  optionChipActive: {
    backgroundColor: "#DBF5F1",
    borderColor: "#0F9D92",
  },

  optionChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },

  optionChipTextActive: {
    color: "#0F9D92",
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
  },

  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
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
    marginLeft: 8,
  },

  saveButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  refillButton: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F43F5E",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

refillButtonText: {
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: "800",
},
});
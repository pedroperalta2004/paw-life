import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  RefreshControl,
  Image,
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../src/lib/supabase";
import { router, useFocusEffect } from "expo-router";

const BUCKET_NAME = "food-images";

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
  foto_url: string | null;
  data_criacao: string;
};

export default function FoodScreen() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [foods, setFoods] = useState<FoodPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setAnimals([]);
      setFoods([]);
      setLoading(true);

      loadData();
    }, []),
  );

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
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível carregar a alimentação.",
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

  const openCreateForm = () => {
    if (animals.length === 0) {
      Alert.alert(
        "Sem animais",
        "Primeiro precisa de registar pelo menos um animal.",
      );
      return;
    }

    router.push({
      pathname: "/alimentacao_form",
      params: { mode: "create", t: Date.now().toString() },
    });
  };

  const openEditForm = (food: FoodPlan) => {
    router.push({
      pathname: "/alimentacao_form",
      params: {
        id: food.id_alimentacao,
        mode: "edit",
        t: Date.now().toString(),
      },
    });
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

  const getStoragePathFromPublicUrl = (url: string | null) => {
    if (!url) return null;

    const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
    const index = url.indexOf(marker);

    if (index === -1) return null;

    return url.substring(index + marker.length);
  };

  const deleteFoodImageFromStorage = async (publicUrl: string | null) => {
    const path = getStoragePathFromPublicUrl(publicUrl);
    if (!path) return;

    const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

    if (error) {
      console.log("Erro ao apagar imagem da ração:", error.message);
    }
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
          item.id_alimentacao === food.id_alimentacao ? data : item,
        ),
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
          item.id_alimentacao === food.id_alimentacao ? data : item,
        ),
      );

      Alert.alert(
        "Stock reposto",
        "O stock foi atualizado para o saco completo.",
      );
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Não foi possível repor o stock.");
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

              if (food.foto_url) {
                await deleteFoodImageFromStorage(food.foto_url);
              }

              setFoods((prev) =>
                prev.filter(
                  (item) => item.id_alimentacao !== food.id_alimentacao,
                ),
              );

              Alert.alert("Sucesso", "Plano eliminado.");
            } catch (error: any) {
              Alert.alert(
                "Erro",
                error.message || "Não foi possível eliminar o plano.",
              );
            }
          },
        },
      ],
    );
  };

  const handleBuy = async (url: string | null) => {
    if (!url) {
      Alert.alert(
        "Sem link",
        "Este plano ainda não tem um link de compra associado.",
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

        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.greenButtonPressed,
          ]}
          onPress={openCreateForm}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Novo Saco de Ração</Text>
        </Pressable>

        {loading ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color="#0F9D92" />
          </View>
        ) : foods.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Feather name="package" size={34} color="#0F9D92" />
            </View>

            <Text style={styles.emptyTitle}>Ainda não tem ração registada</Text>

            <Text style={styles.emptyText}>
              Registe o primeiro saco de ração para acompanhar o stock e receber
              alertas antes de acabar.
            </Text>
          </View>
        ) : (
          foods.map((item) => {
            const progress = getProgressPercent(
              Number(item.stock_atual),
              Number(item.stock_total),
            );

            const estimatedDays = getEstimatedDays(
              Number(item.stock_atual),
              Number(item.porcao_diaria),
            );

            const critical = estimatedDays <= 7;

            return (
              <View key={item.id_alimentacao} style={styles.foodCard}>
                <View style={styles.petBadgeArea}>
                  <View style={styles.petBadge}>
                    <Text style={styles.petBadgeText}>
                      Para: {getAnimalName(item.id_animal)}
                    </Text>
                  </View>
                </View>

                {item.foto_url ? (
                  <Image
                    source={{ uri: item.foto_url }}
                    style={styles.foodImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <MaterialCommunityIcons
                      name="package-variant-closed"
                      size={50}
                      color="#CBD5E1"
                    />
                    <Text style={styles.placeholderText}>
                      Sem foto da ração
                    </Text>
                  </View>
                )}

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
                        Stock crítico! Recomendamos a compra de um novo saco em
                        breve.
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
                      style={({ pressed }) => [
                        styles.feedButton,
                        pressed && styles.greenButtonPressed,
                      ]}
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
                      style={({ pressed }) => [
                        styles.iconButton,
                        pressed && styles.iconButtonPressed,
                      ]}
                      onPress={() => openEditForm(item)}
                    >
                      <Feather name="edit-2" size={16} color="#475569" />
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.deleteButton,
                        pressed && styles.deleteButtonPressed,
                      ]}
                      onPress={() => handleDeleteFood(item)}
                    >
                      <Feather name="trash-2" size={15} color="#DC2626" />
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.buyButton,
                        pressed && styles.buyButtonPressed,
                      ]}
                      onPress={() => handleBuy(item.link_compra)}
                    >
                      <Feather name="shopping-cart" size={16} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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

  foodCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 18,
    overflow: "hidden",
  },

  petBadgeArea: {
    height: 58,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: 10,
  },

  petBadge: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  petBadgeText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "800",
  },

  foodImage: {
    width: "100%",
    height: 210,
    backgroundColor: "#EEF2F7",
  },

  imagePlaceholder: {
    height: 210,
    backgroundColor: "#EEF2F7",
    alignItems: "center",
    justifyContent: "center",
  },

  placeholderText: {
    marginTop: 10,
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "700",
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
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
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

  greenButtonPressed: {
    backgroundColor: "#15968b",
    transform: [{ scale: 0.99 }],
  },

  iconButtonPressed: {
    backgroundColor: "#f3f4f4",
    transform: [{ scale: 0.99 }],
  },

  deleteButtonPressed: {
    backgroundColor: "#fddbdb",
    transform: [{ scale: 0.99 }],
  },

  buyButtonPressed: {
    backgroundColor: "#354769",
    transform: [{ scale: 0.99 }],
  },

  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 24,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 10,
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 24,
    color: "#64748B",
    textAlign: "center",
    maxWidth: 280,
  },
});

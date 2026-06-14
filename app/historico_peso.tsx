import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { supabase } from "../src/lib/supabase";

type Animal = {
  id_animal: string;
  nome: string;
  especie: string;
  raca: string | null;
  fotografia_url: string | null;
};

type WeightRecord = {
  id_peso: string;
  id_animal: string;
  peso: number;
  data_registo: string;
  data_criacao: string;
};

function formatChartDate(dateString: string) {
  const date = new Date(dateString);

  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
  });
}

function formatWeight(value: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  return `${Number(value).toFixed(1)} kg`;
}

export default function PesoHistoricoScreen() {
  const params = useLocalSearchParams<{ id?: string; t?: string }>();
  const animalId = typeof params.id === "string" ? params.id : null;

  const scrollRef = useRef<ScrollView>(null);

  const [animal, setAnimal] = useState<Animal | null>(null);
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      loadData();
    }, [animalId, params.t]),
  );

  const loadData = async () => {
    if (!animalId) {
      Alert.alert("Erro", "Animal não encontrado.");
      router.replace("/animais");
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Utilizador não autenticado.");

      const { data: animalData, error: animalError } = await supabase
        .from("animais")
        .select("id_animal, nome, especie, raca, fotografia_url")
        .eq("id_animal", animalId)
        .eq("id_utilizador", user.id)
        .single();

      if (animalError) throw animalError;

      const { data: weightData, error: weightError } = await supabase
        .from("peso_animais")
        .select("*")
        .eq("id_animal", animalId)
        .order("data_registo", { ascending: true });

      if (weightError) throw weightError;

      setAnimal(animalData);
      setWeights(weightData ?? []);
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível carregar o histórico de peso.",
      );
      router.replace("/animais");
    } finally {
      setLoading(false);
    }
  };

  const recentWeights = useMemo(() => weights.slice(-6), [weights]);

  const chartValues = useMemo(() => {
    return recentWeights.map((item) => Number(item.peso));
  }, [recentWeights]);

  const max = Math.max(...chartValues, 1);
  const min = chartValues.length > 0 ? Math.min(...chartValues) : 0;
  const range = max - min || 1;

  const reversedWeights = useMemo(() => weights.slice().reverse(), [weights]);

  const renderWeightChart = () => {
    if (recentWeights.length === 0) {
      return (
        <View style={styles.emptyChartBox}>
          <Ionicons name="bar-chart-outline" size={30} color="#94A3B8" />
          <Text style={styles.emptyChartText}>
            Sem dados suficientes para gráfico
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.chartBox}>
        {recentWeights.map((record) => {
          const barHeight = 24 + ((Number(record.peso) - min) / range) * 56;

          return (
            <View key={record.id_peso} style={styles.chartItem}>
              <View style={styles.chartBarWrapper}>
                <View style={[styles.chartBar, { height: barHeight }]} />
              </View>

              <Text style={styles.chartWeightLabel}>
                {Number(record.peso).toFixed(1)}
              </Text>
              <Text style={styles.chartDateLabel}>
                {formatChartDate(record.data_registo)}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderWeightHistoryList = () => {
    if (reversedWeights.length === 0) {
      return (
        <View style={styles.emptyWeightBox}>
          <Ionicons name="analytics-outline" size={42} color="#94A3B8" />
          <Text style={styles.emptyWeightTitle}>Sem histórico de peso</Text>
          <Text style={styles.emptyWeightText}>
            Ainda não existem registos de peso para este animal.
          </Text>
        </View>
      );
    }

    return reversedWeights.map((record, index) => {
      const previousRecord = reversedWeights[index + 1];
      const difference = previousRecord
        ? Number(record.peso) - Number(previousRecord.peso)
        : null;
      const isCurrent = index === 0;

      let variationText = "--";
      let variationColor = "#64748B";
      let variationIcon: keyof typeof Ionicons.glyphMap = "remove-outline";

      if (difference !== null) {
        if (Math.abs(difference) < 0.05) {
          variationText = "0.0 kg";
        } else if (difference > 0) {
          variationText = `+${difference.toFixed(1)} kg`;
          variationColor = "#0F9D92";
          variationIcon = "arrow-up-outline";
        } else {
          variationText = `${difference.toFixed(1)} kg`;
          variationColor = "#E11D48";
          variationIcon = "arrow-down-outline";
        }
      }

      return (
        <View key={record.id_peso} style={styles.weightHistoryCard}>
          <View style={styles.weightHistoryDateBox}>
            <Ionicons name="calendar-outline" size={17} color="#0F9D92" />
            <Text style={styles.weightHistoryDate}>
              {formatChartDate(record.data_registo)}
            </Text>
          </View>

          <View style={styles.weightHistoryMiddle}>
            <Text style={styles.weightHistoryValue}>
              {formatWeight(record.peso)}
            </Text>
            {isCurrent ? (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Atual</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.weightHistoryVariationBox}>
            <Text
              style={[styles.weightHistoryVariation, { color: variationColor }]}
            >
              {variationText}
            </Text>
            <Ionicons name={variationIcon} size={16} color={variationColor} />
          </View>
        </View>
      );
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingWrapper}>
        <ActivityIndicator size="large" color="#0F9D92" />
        <Text style={styles.loadingText}>A carregar histórico...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Histórico de Peso</Text>
            <Text style={styles.pageSubtitle}>
              Acompanhe a evolução do peso do animal.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.closePageButton,
              pressed && styles.whiteButtonPressed,
            ]}
            onPress={() => router.replace("/animais")}
          >
            <Ionicons name="close" size={22} color="#334155" />
          </Pressable>
        </View>

        {animal ? (
          <View style={styles.animalCard}>
            <View style={styles.animalPhotoBox}>
              {animal.fotografia_url ? (
                <Image
                  source={{ uri: animal.fotografia_url }}
                  style={styles.animalPhoto}
                />
              ) : (
                <Ionicons name="paw-outline" size={30} color="#94A3B8" />
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.animalName}>{animal.nome}</Text>
              <Text style={styles.animalInfo}>
                {animal.especie}
                {animal.raca ? ` • ${animal.raca}` : ""}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Evolução</Text>
              <Text style={styles.cardSubtitle}>Últimos registos de peso</Text>
            </View>

            <View style={styles.cardIconBox}>
              <Feather name="bar-chart-2" size={20} color="#0F9D92" />
            </View>
          </View>

          {renderWeightChart()}
        </View>

        <View style={styles.card}>
          <View style={styles.recordsHeader}>
            <Text style={styles.recordsTitle}>Registos</Text>
            <Text style={styles.recordsHint}>Mais recente primeiro</Text>
          </View>

          {renderWeightHistoryList()}
        </View>
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

  animalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  animalPhotoBox: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 14,
  },

  animalPhoto: {
    width: "100%",
    height: "100%",
  },

  animalName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },

  animalInfo: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 19,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    marginBottom: 18,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },

  cardSubtitle: {
    fontSize: 13,
    color: "#64748B",
  },

  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BCE7DF",
    alignItems: "center",
    justifyContent: "center",
  },

  chartBox: {
    height: 150,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 12,
    overflow: "hidden",
  },

  chartItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    minWidth: 34,
  },

  chartBarWrapper: {
    height: 86,
    justifyContent: "flex-end",
    alignItems: "center",
    overflow: "hidden",
  },

  chartBar: {
    width: 18,
    maxHeight: 86,
    borderRadius: 999,
    backgroundColor: "#0F9D92",
  },

  chartWeightLabel: {
    fontSize: 10,
    color: "#0F172A",
    fontWeight: "800",
    marginTop: 6,
  },

  chartDateLabel: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },

  emptyChartBox: {
    height: 130,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyChartText: {
    marginTop: 8,
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "700",
  },

  recordsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  recordsTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },

  recordsHint: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },

  weightHistoryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  weightHistoryDateBox: {
    flex: 1.1,
    flexDirection: "row",
    alignItems: "center",
  },

  weightHistoryDate: {
    fontSize: 12,
    color: "#475569",
    marginLeft: 6,
    fontWeight: "600",
  },

  weightHistoryMiddle: {
    flex: 0.9,
    alignItems: "center",
    justifyContent: "center",
  },

  weightHistoryValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },

  currentBadge: {
    marginTop: 4,
    backgroundColor: "#0F9D92",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  currentBadgeText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "800",
  },

  weightHistoryVariationBox: {
    flex: 0.8,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },

  weightHistoryVariation: {
    fontSize: 12,
    fontWeight: "800",
    marginRight: 4,
  },

  emptyWeightBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 34,
  },

  emptyWeightTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 14,
    marginBottom: 8,
  },

  emptyWeightText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },

  whiteButtonPressed: {
    backgroundColor: "#f1f1f1",
    transform: [{ scale: 0.99 }],
  },
});

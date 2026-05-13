import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import {
  Ionicons,
  Feather,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import MapView, { Marker, Polyline } from "react-native-maps";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "../src/lib/supabase";

type Animal = {
  id_animal: string;
  nome: string;
  especie: string;
  peso: number | null;
};

type HealthRecord = {
  id_registo_saude: string;
  id_animal: string;
  tipo_registo: string;
  titulo: string;
  data_registo: string;
  proxima_data: string | null;
  estado: string | null;
};

type FoodPlan = {
  id_alimentacao: string;
  id_animal: string;
  nome_racao: string;
  stock_atual: number;
  stock_total: number;
  porcao_diaria: number;
};

type WeightRecord = {
  id_peso: string;
  id_animal: string;
  peso: number;
  data_registo: string;
};

type RoutePoint = {
  latitude: number;
  longitude: number;
  timestamp: number;
};

type Activity = {
  id_atividade: string;
  id_animal: string;
  tipo: string;
  titulo: string;
  data_inicio: string;
  data_fim: string | null;
  duracao_min: number | null;
  distancia_km: number | null;
  local: string | null;
  rota: RoutePoint[] | null;
};

function formatDate(dateString: string | null) {
  if (!dateString) return "--";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatRelativeDays(dateString: string | null) {
  if (!dateString) return "--";

  const today = new Date();
  const target = new Date(dateString);

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) return `Faltam ${diffDays} dias`;
  if (diffDays === 0) return "Hoje";
  return `Atrasado há ${Math.abs(diffDays)} dias`;
}

function formatDuration(minutes: number | null) {
  if (!minutes) return "0 min";

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function isDone(status: string | null) {
  return (status ?? "").toLowerCase() === "concluído";
}

function isConsultation(type: string) {
  return type.toLowerCase().includes("consult");
}

function getEstimatedDays(stockKg: number, dailyPortionGrams: number) {
  if (!dailyPortionGrams || dailyPortionGrams <= 0) return 0;

  return Math.floor((stockKg * 1000) / dailyPortionGrams);
}

function getEventLabel(type: string) {
  const lower = type.toLowerCase();

  if (lower.includes("vac")) return "Vacina Próxima:";
  if (lower.includes("consult")) return "Consulta Próxima:";
  if (lower.includes("exam")) return "Exame Próximo:";
  if (lower.includes("medic")) return "Medicação Próxima:";

  return "Evento Próximo:";
}

function getRecordIcon(type: string) {
  const lower = type.toLowerCase();

  if (lower.includes("vac")) {
    return <FontAwesome5 name="syringe" size={18} color="#10B981" />;
  }

  if (lower.includes("consult")) {
    return <Ionicons name="calendar-outline" size={18} color="#3B82F6" />;
  }

  if (lower.includes("exam")) {
    return <Ionicons name="document-text-outline" size={18} color="#8B5CF6" />;
  }

  if (lower.includes("medic")) {
    return <MaterialCommunityIcons name="pill" size={18} color="#D97706" />;
  }

  return <Ionicons name="document-text-outline" size={18} color="#64748B" />;
}

function getRecordIconStyle(type: string) {
  const lower = type.toLowerCase();

  if (lower.includes("vac")) return styles.iconPinkLight;
  if (lower.includes("consult")) return styles.iconBlueLight;
  if (lower.includes("exam")) return styles.iconPurpleLight;
  if (lower.includes("medic")) return styles.iconOrangeLight;

  return styles.iconGrayLight;
}

export default function DashboardScreen() {
  const [userName, setUserName] = useState("");
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [foods, setFoods] = useState<FoodPlan[]>([]);
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedChartAnimalId, setSelectedChartAnimalId] =
    useState<string>("");
  const [showChartDropdown, setShowChartDropdown] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setUserName("");
      setAnimals([]);
      setHealthRecords([]);
      setFoods([]);
      setWeights([]);
      setLoading(true);

      loadDashboard();
    }, []),
  );

  useEffect(() => {
    if (!selectedChartAnimalId && animals.length > 0) {
      setSelectedChartAnimalId(animals[0].id_animal);
    }
  }, [animals, selectedChartAnimalId]);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Utilizador não autenticado.");

      const { data: profileData } = await supabase
        .from("utilizadores")
        .select("nome")
        .eq("id_utilizador", user.id)
        .single();

      setUserName(profileData?.nome ?? "");

      const { data: animalsData, error: animalsError } = await supabase
        .from("animais")
        .select("id_animal, nome, especie, peso")
        .eq("id_utilizador", user.id)
        .order("data_criacao", { ascending: false });

      if (animalsError) throw animalsError;

      const animalList = animalsData ?? [];
      const animalIds = animalList.map((animal) => animal.id_animal);

      let healthData: HealthRecord[] = [];
      let foodData: FoodPlan[] = [];
      let weightData: WeightRecord[] = [];
      let activityData: Activity[] = [];

      if (animalIds.length > 0) {
        const { data: healthResult, error: healthError } = await supabase
          .from("registos_saude")
          .select(
            "id_registo_saude, id_animal, tipo_registo, titulo, data_registo, proxima_data, estado",
          )
          .in("id_animal", animalIds)
          .order("data_registo", { ascending: false });

        if (healthError) throw healthError;
        healthData = healthResult ?? [];

        const { data: foodResult, error: foodError } = await supabase
          .from("alimentacao")
          .select(
            "id_alimentacao, id_animal, nome_racao, stock_atual, stock_total, porcao_diaria",
          )
          .in("id_animal", animalIds);

        if (foodError) throw foodError;
        foodData = foodResult ?? [];

        const { data: weightResult, error: weightError } = await supabase
          .from("peso_animais")
          .select("id_peso, id_animal, peso, data_registo")
          .in("id_animal", animalIds)
          .order("data_registo", { ascending: true });

        if (!weightError) {
          weightData = weightResult ?? [];
        }

        const { data: activitiesResult, error: activitiesError } =
          await supabase
            .from("atividades")
            .select(
              "id_atividade, id_animal, tipo, titulo, data_inicio, data_fim, duracao_min, distancia_km, local, rota",
            )
            .in("id_animal", animalIds)
            .not("rota", "is", null)
            .order("data_inicio", { ascending: false })
            .limit(1);

        if (!activitiesError) {
          activityData = activitiesResult ?? [];
        }
      }

      setAnimals(animalList);
      setHealthRecords(healthData);
      setFoods(foodData);
      setWeights(weightData);
      setActivities(activityData);
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível carregar o dashboard.",
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const getAnimalName = (id: string) => {
    return animals.find((animal) => animal.id_animal === id)?.nome ?? "Animal";
  };

  const todayKey = new Date().toISOString().split("T")[0];

  const upcomingRecords = useMemo(() => {
    return healthRecords
      .filter((record) => record.proxima_data && !isDone(record.estado))
      .filter((record) => String(record.proxima_data) >= todayKey)
      .sort(
        (a, b) =>
          new Date(a.proxima_data as string).getTime() -
          new Date(b.proxima_data as string).getTime(),
      );
  }, [healthRecords, todayKey]);

  const overdueRecords = useMemo(() => {
    return healthRecords
      .filter((record) => record.proxima_data && !isDone(record.estado))
      .filter((record) => String(record.proxima_data) < todayKey);
  }, [healthRecords, todayKey]);

  const nextHealthEvent = upcomingRecords[0] ?? null;

  const criticalFood = useMemo(() => {
    return foods.find((food) => {
      const days = getEstimatedDays(
        Number(food.stock_atual),
        Number(food.porcao_diaria),
      );

      return days <= 7;
    });
  }, [foods]);

  const latestWeight = useMemo(() => {
    if (weights.length === 0) return null;
    return weights[weights.length - 1];
  }, [weights]);

  const consultationsThisYear = useMemo(() => {
    const year = new Date().getFullYear();

    return healthRecords.filter((record) => {
      const date = new Date(record.data_registo);
      return isConsultation(record.tipo_registo) && date.getFullYear() === year;
    }).length;
  }, [healthRecords]);

  const recentRecords = useMemo(() => {
    return [...healthRecords]
      .sort(
        (a, b) =>
          new Date(b.proxima_data || b.data_registo).getTime() -
          new Date(a.proxima_data || a.data_registo).getTime(),
      )
      .slice(0, 4);
  }, [healthRecords]);

  const selectedChartAnimalName =
    animals.find((animal) => animal.id_animal === selectedChartAnimalId)
      ?.nome ??
    animals[0]?.nome ??
    "Animal";

  const filteredChartWeights = useMemo(() => {
    const animalId = selectedChartAnimalId || animals[0]?.id_animal;

    if (!animalId) return [];

    return weights.filter((weight) => weight.id_animal === animalId);
  }, [weights, selectedChartAnimalId, animals]);

  const weightChartPoints = useMemo(() => {
    const points = filteredChartWeights
      .slice(-7)
      .map((item) => Number(item.peso));

    if (points.length === 0) return [0, 0, 0, 0, 0, 0, 0];

    while (points.length < 7) {
      points.unshift(points[0]);
    }

    return points;
  }, [filteredChartWeights]);

  const maxValue = Math.max(...weightChartPoints, 1);
  const minValue = Math.min(...weightChartPoints);
  const range = maxValue - minValue || 1;

  const chartWidth = 260;
  const chartHeight = 140;
  const stepX = chartWidth / (weightChartPoints.length - 1);

  const points = weightChartPoints.map((value, index) => {
    const x = index * stepX;
    const y = chartHeight - ((value - minValue) / range) * chartHeight;
    return { x, y };
  });

  const latestWalk = activities[0] ?? null;
  const latestRoute = latestWalk?.rota ?? [];

  const latestWalkRegion =
    latestRoute.length > 0
      ? {
          latitude: latestRoute[0].latitude,
          longitude: latestRoute[0].longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }
      : {
          latitude: 40.2033,
          longitude: -8.4103,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#0F9D92" />
        <Text style={styles.loadingText}>A carregar dashboard...</Text>
      </View>
    );
  }

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
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>
            Olá, {userName || "Tutor"}! <Text style={styles.wave}>👋🏻</Text>
          </Text>
        </View>

        <Text style={styles.subtitle}>
          Aqui está o resumo dos seus animais hoje.
        </Text>

        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryAction,
              pressed && styles.whiteButtonPressed,
            ]}
            onPress={() => router.push("/atividade")}
          >
            <Ionicons name="add" size={18} color="#0F172A" />
            <Text style={styles.secondaryActionText}>Nova Atividade</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.primaryAction,
              pressed && styles.greenButtonPressed,
            ]}
            onPress={() => router.push("/saude")}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Registo Médico</Text>
          </Pressable>
        </View>
        <View style={styles.alertCard}>
          <View style={styles.alertLeftBar} />

          <View style={styles.alertContent}>
            <View style={styles.alertHeader}>
              <Ionicons
                name="notifications-outline"
                size={20}
                color="#B45309"
              />
              <Text style={styles.alertTitle}>Avisos Importantes</Text>
            </View>

            {criticalFood ? (
              <View style={styles.alertItem}>
                <Text style={styles.alertLabel}>Stock Crítico:</Text>
                <Text style={styles.alertText}>
                  {criticalFood.nome_racao} de{" "}
                  {getAnimalName(criticalFood.id_animal)} deve acabar em aprox.{" "}
                  {getEstimatedDays(
                    Number(criticalFood.stock_atual),
                    Number(criticalFood.porcao_diaria),
                  )}{" "}
                  dias.
                </Text>
              </View>
            ) : (
              <View style={styles.alertItem}>
                <Text style={styles.alertLabel}>Alimentação:</Text>
                <Text style={styles.alertText}>
                  Sem stocks críticos neste momento.
                </Text>
              </View>
            )}

            {nextHealthEvent ? (
              <View style={styles.alertItem}>
                <Text style={styles.alertLabel}>
                  {getEventLabel(nextHealthEvent.tipo_registo)}
                </Text>
                <Text style={styles.alertText}>
                  {nextHealthEvent.titulo} de{" "}
                  {getAnimalName(nextHealthEvent.id_animal)} —{" "}
                  {formatRelativeDays(nextHealthEvent.proxima_data)}.
                </Text>
              </View>
            ) : overdueRecords.length > 0 ? (
              <View style={styles.alertItem}>
                <Text style={styles.alertLabel}>Atrasado:</Text>
                <Text style={styles.alertText}>
                  Existem {overdueRecords.length} registos vencidos por
                  concluir.
                </Text>
              </View>
            ) : (
              <View style={styles.alertItem}>
                <Text style={styles.alertLabel}>Saúde:</Text>
                <Text style={styles.alertText}>
                  Sem vacinas, consultas ou exames urgentes.
                </Text>
              </View>
            )}

            <Pressable onPress={() => router.push("/calendario")}>
              <Text style={styles.manageAlerts}>Ver Calendário</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoTextBlock}>
            <Text style={styles.infoLabel}>Animais Registados</Text>
            <Text style={styles.infoMainValue}>{animals.length}</Text>
            <Text style={styles.infoSubMuted}>
              {animals.length === 1
                ? "1 perfil ativo"
                : `${animals.length} perfis ativos`}
            </Text>
          </View>

          <View style={[styles.infoIconBox, styles.iconOrangeLight]}>
            <Ionicons name="paw-outline" size={22} color="#ca9a14" />
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoTextBlock}>
            <Text style={styles.infoLabel}>Próximo Evento</Text>
            <Text style={styles.infoMainValue}>
              {nextHealthEvent
                ? getAnimalName(nextHealthEvent.id_animal)
                : "--"}
            </Text>
            <Text style={styles.infoSubMuted}>
              {nextHealthEvent
                ? `${nextHealthEvent.titulo} • ${formatRelativeDays(
                    nextHealthEvent.proxima_data,
                  )}`
                : "Sem próximos eventos"}
            </Text>
          </View>

          <View
            style={[
              styles.infoIconBox,
              nextHealthEvent
                ? getRecordIconStyle(nextHealthEvent.tipo_registo)
                : styles.iconGrayLight,
            ]}
          >
            {nextHealthEvent ? (
              getRecordIcon(nextHealthEvent.tipo_registo)
            ) : (
              <Ionicons name="calendar-outline" size={20} color="#64748B" />
            )}
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoTextBlock}>
            <Text style={styles.infoLabel}>Último Peso</Text>
            <Text style={styles.infoMainValue}>
              {latestWeight
                ? `${Number(latestWeight.peso).toFixed(1)} kg`
                : "--"}
            </Text>
            <Text style={styles.infoSubMuted}>
              {latestWeight
                ? `${getAnimalName(latestWeight.id_animal)} • ${formatDate(
                    latestWeight.data_registo,
                  )}`
                : "Sem histórico de peso"}
            </Text>
          </View>

          <View style={[styles.infoIconBox, styles.iconPurpleLight]}>
            <Feather name="activity" size={22} color="#8B5CF6" />
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoTextBlock}>
            <Text style={styles.infoLabel}>Consultas no Ano</Text>
            <Text style={styles.infoMainValue}>{consultationsThisYear}</Text>
            <Text style={styles.infoSubMuted}>Registos do ano atual</Text>
          </View>

          <View style={[styles.infoIconBox, styles.iconBlueLight]}>
            <Ionicons name="calendar-outline" size={22} color="#3B82F6" />
          </View>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Evolução de Peso</Text>
              <Text style={styles.chartSubtitle}>
                Últimos registos de peso dos animais
              </Text>
            </View>

            <View style={styles.chartDropdownWrapper}>
              <Pressable
                style={styles.chartFilter}
                onPress={() => setShowChartDropdown((prev) => !prev)}
              >
                <Text style={styles.chartFilterText}>
                  {selectedChartAnimalName}
                </Text>

                <Ionicons
                  name={showChartDropdown ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#94A3B8"
                />
              </Pressable>

              {showChartDropdown && (
                <View style={styles.chartDropdownMenu}>
                  {animals.map((animal) => (
                    <Pressable
                      key={animal.id_animal}
                      style={styles.chartDropdownItem}
                      onPress={() => {
                        setSelectedChartAnimalId(animal.id_animal);
                        setShowChartDropdown(false);
                      }}
                    >
                      <Text style={styles.chartDropdownText}>
                        {animal.nome}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.chartArea}>
            <View style={styles.yAxis}>
              <Text style={styles.axisText}>{maxValue.toFixed(1)}</Text>
              <Text style={styles.axisText}>
                {((maxValue + minValue) / 2).toFixed(1)}
              </Text>
              <Text style={styles.axisText}>{minValue.toFixed(1)}</Text>
            </View>

            <View style={styles.chartCanvas}>
              <View style={styles.gridLineTop} />
              <View style={styles.gridLineMiddle} />
              <View style={styles.gridLineBottom} />

              <View style={styles.fakeChartWrapper}>
                <View style={styles.fakeAreaBackground} />

                {points.map((point, index) => (
                  <View
                    key={index}
                    style={[
                      styles.chartDot,
                      {
                        left: point.x - 4,
                        top: point.y - 4,
                      },
                    ]}
                  />
                ))}

                {points.slice(0, -1).map((point, index) => {
                  const next = points[index + 1];
                  const dx = next.x - point.x;
                  const dy = next.y - point.y;
                  const length = Math.sqrt(dx * dx + dy * dy);
                  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

                  return (
                    <View
                      key={`line-${index}`}
                      style={[
                        styles.chartSegment,
                        {
                          width: length,
                          left: point.x,
                          top: point.y,
                          transform: [{ rotate: `${angle}deg` }],
                        },
                      ]}
                    />
                  );
                })}
              </View>

              <View style={styles.xAxis}>
                {["1", "2", "3", "4", "5", "6", "7"].map((day) => (
                  <Text key={day} style={styles.axisText}>
                    {day}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </View>

        {latestWalk && latestRoute.length > 0 ? (
          <View style={styles.walkCard}>
            <View style={styles.walkHeader}>
              <View>
                <Text style={styles.walkTitle}>Último Passeio</Text>
                <Text style={styles.walkSubtitle}>
                  {getAnimalName(latestWalk.id_animal)} •{" "}
                  {formatDate(latestWalk.data_inicio)}
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.walkButton,
                  pressed && styles.walkButtonPressed,
                ]}
                onPress={() => router.push("/atividade")}
              >
                <Text style={styles.walkButtonText}>Ver</Text>
              </Pressable>
            </View>

            <View style={styles.walkMapWrapper}>
              <MapView
                style={styles.walkMap}
                initialRegion={latestWalkRegion}
                scrollEnabled={true}
                zoomEnabled={true}
                rotateEnabled={true}
                pitchEnabled={true}
              >
                <Polyline
                  coordinates={latestRoute.map((point) => ({
                    latitude: point.latitude,
                    longitude: point.longitude,
                  }))}
                  strokeWidth={5}
                  strokeColor="#0F9D92"
                />

                <Marker
                  coordinate={{
                    latitude: latestRoute[0].latitude,
                    longitude: latestRoute[0].longitude,
                  }}
                  title="Início"
                />

                <Marker
                  coordinate={{
                    latitude: latestRoute[latestRoute.length - 1].latitude,
                    longitude: latestRoute[latestRoute.length - 1].longitude,
                  }}
                  title="Fim"
                />
              </MapView>
            </View>

            <View style={styles.walkStatsRow}>
              <View style={styles.walkStatBox}>
                <Text style={styles.walkStatLabel}>Distância</Text>
                <Text style={styles.walkStatValue}>
                  {Number(latestWalk.distancia_km ?? 0).toFixed(1)} km
                </Text>
              </View>

              <View style={styles.walkStatBox}>
                <Text style={styles.walkStatLabel}>Duração</Text>
                <Text style={styles.walkStatValue}>
                  {formatDuration(latestWalk.duracao_min)}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.recordsCard}>
          <View style={styles.recordsHeader}>
            <Text style={styles.recordsTitle}>Últimos Registos</Text>
            <Pressable onPress={() => router.push("/saude")}>
              <Text style={styles.viewAll}>Ver todos</Text>
            </Pressable>
          </View>

          {recentRecords.length === 0 ? (
            <Text style={styles.emptyText}>Ainda não existem registos.</Text>
          ) : (
            recentRecords.map((record) => (
              <View key={record.id_registo_saude} style={styles.recordItem}>
                <View
                  style={[
                    styles.recordIconCircle,
                    getRecordIconStyle(record.tipo_registo),
                  ]}
                >
                  {getRecordIcon(record.tipo_registo)}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.recordTitle}>{record.titulo}</Text>
                  <Text style={styles.recordSubtitle}>
                    {formatDate(record.proxima_data || record.data_registo)} -{" "}
                    {getAnimalName(record.id_animal)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F3F4F6" },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { marginTop: 12, fontSize: 14, color: "#64748B" },
  container: { padding: 18, paddingBottom: 40 },
  greetingRow: { marginBottom: 8 },
  greeting: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 32,
  },
  wave: { fontSize: 22 },
  subtitle: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
    maxWidth: 280,
    marginBottom: 20,
  },
  actionRow: { flexDirection: "row", gap: 12, marginBottom: 22 },
  secondaryAction: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  primaryAction: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#0F9D92",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  alertCard: {
    backgroundColor: "#FFFBEA",
    borderRadius: 20,
    marginBottom: 22,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  alertLeftBar: { width: 5, backgroundColor: "#F59E0B" },
  alertContent: { flex: 1, padding: 16 },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 8,
  },
  alertTitle: { fontSize: 16, fontWeight: "800", color: "#92400E" },
  alertItem: { flexDirection: "row", marginBottom: 10 },
  alertLabel: {
    width: 105,
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#78350F",
  },
  manageAlerts: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  infoTextBlock: { flex: 1, paddingRight: 12 },
  infoLabel: { fontSize: 14, color: "#64748B", marginBottom: 6 },
  infoMainValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  infoSubMuted: { fontSize: 13, color: "#64748B", lineHeight: 20 },
  infoIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    marginBottom: 22,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    gap: 10,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 20,
    maxWidth: 180,
  },
  chartFilter: {
    minWidth: 98,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  chartFilterText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "600",
  },
  chartArea: { flexDirection: "row" },
  yAxis: {
    width: 34,
    height: 170,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    marginRight: 6,
  },
  axisText: { fontSize: 11, color: "#94A3B8" },
  chartCanvas: { flex: 1, height: 170, justifyContent: "space-between" },
  gridLineTop: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  gridLineMiddle: {
    position: "absolute",
    top: 65,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  gridLineBottom: {
    position: "absolute",
    top: 120,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  fakeChartWrapper: { height: 140, position: "relative", marginTop: 6 },
  fakeAreaBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 15,
    bottom: 0,
    backgroundColor: "#EAF7DB",
    borderRadius: 16,
    opacity: 0.8,
  },
  chartSegment: {
    position: "absolute",
    height: 3,
    backgroundColor: "#0F9D92",
    transformOrigin: "left center",
  },
  chartDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0F9D92",
  },
  xAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 2,
  },
  walkCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    marginBottom: 22,
  },
  walkHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  walkTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  walkSubtitle: { fontSize: 13, color: "#64748B" },
  walkButton: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BCE7DF",
    alignItems: "center",
    justifyContent: "center",
  },
  walkButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F9D92",
  },
  walkMapWrapper: {
    height: 190,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  walkMap: { width: "100%", height: "100%" },
  walkStatsRow: { flexDirection: "row", gap: 12 },
  walkStatBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 14,
    alignItems: "center",
  },
  walkStatLabel: { fontSize: 12, color: "#64748B", marginBottom: 6 },
  walkStatValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  recordsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
  },
  recordsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  recordsTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  viewAll: { fontSize: 14, color: "#0F9D92", fontWeight: "700" },
  emptyText: { fontSize: 14, color: "#64748B" },
  recordItem: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  recordIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  recordTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  recordSubtitle: { fontSize: 13, color: "#94A3B8" },
  chartDropdownWrapper: { position: "relative", zIndex: 10 },
  chartDropdownMenu: {
    position: "absolute",
    top: 44,
    right: 0,
    minWidth: 130,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  chartDropdownItem: { paddingVertical: 10, paddingHorizontal: 14 },
  chartDropdownText: { fontSize: 13, fontWeight: "700", color: "#334155" },
  iconBlueLight: { backgroundColor: "#EAF2FF" },
  iconPinkLight: { backgroundColor: "#E9F9F1" },
  iconPurpleLight: { backgroundColor: "#F3E8FF" },
  iconOrangeLight: { backgroundColor: "#FEF3C7" },
  iconGrayLight: { backgroundColor: "#F1F5F9" },

  greenButtonPressed: {
    backgroundColor: "#15968b",
    transform: [{ scale: 0.99 }],
  },

  whiteButtonPressed: {
    backgroundColor: "#f1f1f1",
    transform: [{ scale: 0.99 }],
  },

  walkButtonPressed: {
    backgroundColor: "#d3fae8",
    transform: [{ scale: 0.99 }],
  },
});

import React, { useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import MapView, { Marker, Polyline } from "react-native-maps";
import { supabase } from "../src/lib/supabase";
import { useFocusEffect } from "expo-router";

type Animal = {
  id_animal: string;
  nome: string;
  fotografia_url: string | null;
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

function calculateDistanceKm(pointA: RoutePoint, pointB: RoutePoint) {
  const R = 6371;
  const dLat = ((pointB.latitude - pointA.latitude) * Math.PI) / 180;
  const dLon = ((pointB.longitude - pointA.longitude) * Math.PI) / 180;

  const lat1 = (pointA.latitude * Math.PI) / 180;
  const lat2 = (pointB.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function formatDuration(minutes: number | null) {
  if (!minutes) return "0 min";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);

  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
  });
}

function formatTime(dateString: string) {
  const date = new Date(dateString);

  return date.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AtividadeScreen() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isTracking, setIsTracking] = useState(false);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [distanceKm, setDistanceKm] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [saving, setSaving] = useState(false);

  const startTimeRef = useRef<Date | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(
    null,
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(
    useCallback(() => {
      setAnimals([]);
      setActivities([]);
      setSelectedAnimalId("");
      setLoading(true);

      loadData();

      return () => {
        stopLocationWatchOnly();
      };
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
        .select("id_animal, nome, fotografia_url")
        .eq("id_utilizador", user.id)
        .order("nome", { ascending: true });

      if (animalsError) throw animalsError;

      const { data: activitiesData, error: activitiesError } = await supabase
        .from("atividades")
        .select("*")
        .eq("id_utilizador", user.id)
        .order("data_inicio", { ascending: false });

      if (activitiesError) throw activitiesError;

      setAnimals(animalsData ?? []);
      setActivities(activitiesData ?? []);

      if (!selectedAnimalId && (animalsData ?? []).length > 0) {
        setSelectedAnimalId(animalsData![0].id_animal);
      }
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível carregar as atividades.",
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

  const stopLocationWatchOnly = () => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startWalk = async () => {
    if (!selectedAnimalId) {
      Alert.alert("Sem animal", "Selecione primeiro um animal.");
      return;
    }

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permissão necessária",
          "É necessário permitir acesso à localização.",
        );
        return;
      }

      setRoutePoints([]);
      setDistanceKm(0);
      setElapsedSeconds(0);
      setIsTracking(true);

      startTimeRef.current = new Date();

      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,
          timeInterval: 3000,
        },
        (location) => {
          const point: RoutePoint = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
          };

          setRoutePoints((prev) => {
            if (prev.length > 0) {
              const lastPoint = prev[prev.length - 1];
              const addedDistance = calculateDistanceKm(lastPoint, point);

              if (addedDistance < 0.2) {
                setDistanceKm((current) => current + addedDistance);
              }
            }

            return [...prev, point];
          });
        },
      );

      locationSubscriptionRef.current = subscription;
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível iniciar o passeio.",
      );
      setIsTracking(false);
      stopLocationWatchOnly();
    }
  };

  const stopWalk = async () => {
    try {
      setSaving(true);
      stopLocationWatchOnly();

      const endTime = new Date();
      const startTime = startTimeRef.current;

      if (!startTime) {
        throw new Error("Não foi possível calcular o início do passeio.");
      }

      const durationMin = Math.max(
        1,
        Math.round((endTime.getTime() - startTime.getTime()) / 60000),
      );

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Utilizador não autenticado.");

      const { data, error } = await supabase
        .from("atividades")
        .insert([
          {
            id_utilizador: user.id,
            id_animal: selectedAnimalId,
            tipo: "Passeio",
            titulo: "Passeio",
            data_inicio: startTime.toISOString(),
            data_fim: endTime.toISOString(),
            duracao_min: durationMin,
            distancia_km: Number(distanceKm.toFixed(2)),
            local: "Percurso registado por GPS",
            rota: routePoints,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setActivities((prev) => [data, ...prev]);

      setIsTracking(false);
      setRoutePoints([]);
      setDistanceKm(0);
      setElapsedSeconds(0);
      startTimeRef.current = null;

      Alert.alert("Sucesso", "Passeio guardado com sucesso.");
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível guardar o passeio.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    Alert.alert(
      "Eliminar passeio",
      "Tem a certeza que pretende eliminar esta atividade?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("atividades")
                .delete()
                .eq("id_atividade", activityId);

              if (error) throw error;

              setActivities((prev) =>
                prev.filter((item) => item.id_atividade !== activityId),
              );

              Alert.alert("Sucesso", "Atividade eliminada com sucesso.");
            } catch (error: any) {
              Alert.alert(
                "Erro",
                error.message || "Não foi possível eliminar a atividade.",
              );
            }
          },
        },
      ],
    );
  };

  const getAnimalName = (id: string) => {
    return animals.find((animal) => animal.id_animal === id)?.nome ?? "--";
  };

  const getActivityTitle = (activity: Activity) => {
    if (activity.tipo.toLowerCase().includes("passeio")) {
      return `Passeio de ${getAnimalName(activity.id_animal)}`;
    }

    return activity.titulo;
  };

  const totalMinutes = useMemo(() => {
    return activities.reduce((sum, item) => sum + (item.duracao_min ?? 0), 0);
  }, [activities]);

  const totalDistance = useMemo(() => {
    return activities.reduce(
      (sum, item) => sum + Number(item.distancia_km ?? 0),
      0,
    );
  }, [activities]);

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const elapsedDisplay =
    elapsedSeconds < 60
      ? `${elapsedSeconds}s`
      : `${elapsedMinutes} min ${elapsedSeconds % 60}s`;

  const latestActivity = activities.find(
    (activity) => activity.rota && activity.rota.length > 0,
  );

  const latestRoute = latestActivity?.rota ?? [];

  const mapRegion =
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
        <Text style={styles.pageTitle}>Atividades da Aplicação</Text>
        <Text style={styles.pageSubtitle}>
          Registe passeios, acompanhe distância e guarde o percurso do animal.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.animalsScroll}
        >
          {animals.map((animal) => (
            <Pressable
              key={animal.id_animal}
              style={styles.animalAvatarWrapper}
              onPress={() => setSelectedAnimalId(animal.id_animal)}
            >
              <View
                style={[
                  styles.animalAvatar,
                  selectedAnimalId === animal.id_animal &&
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
                  selectedAnimalId === animal.id_animal &&
                    styles.animalAvatarNameActive,
                ]}
                numberOfLines={1}
              >
                {animal.nome}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.actionRow}>
          <View style={styles.syncBox}>
            <Ionicons name="phone-portrait-outline" size={15} color="#0F9D92" />
            <Text style={styles.syncText}>
              {isTracking ? "A registar..." : "Sincronizado"}
            </Text>
          </View>

          <Pressable
            style={[
              styles.mainButton,
              isTracking && styles.stopButton,
              saving && styles.buttonDisabled,
            ]}
            onPress={isTracking ? stopWalk : startWalk}
            disabled={saving || loading}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name={isTracking ? "stop-outline" : "add-outline"}
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.mainButtonText}>
                  {isTracking ? "Terminar" : "Iniciar Passeio"}
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {isTracking ? (
          <View style={styles.trackingCard}>
            <Text style={styles.trackingTitle}>Passeio em curso</Text>

            {routePoints.length > 0 ? (
              <MapView
                style={styles.liveMap}
                region={{
                  latitude: routePoints[routePoints.length - 1].latitude,
                  longitude: routePoints[routePoints.length - 1].longitude,
                  latitudeDelta: 0.008,
                  longitudeDelta: 0.008,
                }}
              >
                <Polyline
                  coordinates={routePoints.map((point) => ({
                    latitude: point.latitude,
                    longitude: point.longitude,
                  }))}
                  strokeWidth={5}
                  strokeColor="#0F9D92"
                />

                <Marker
                  coordinate={{
                    latitude: routePoints[0].latitude,
                    longitude: routePoints[0].longitude,
                  }}
                  title="Início"
                />

                <Marker
                  coordinate={{
                    latitude: routePoints[routePoints.length - 1].latitude,
                    longitude: routePoints[routePoints.length - 1].longitude,
                  }}
                  title="Atual"
                />
              </MapView>
            ) : (
              <View style={styles.waitingGpsBox}>
                <ActivityIndicator color="#0F9D92" />
                <Text style={styles.waitingGpsText}>
                  A obter localização...
                </Text>
              </View>
            )}

            <View style={styles.trackingStatsRow}>
              <View style={styles.trackingStat}>
                <Text style={styles.trackingLabel}>Tempo</Text>
                <Text style={styles.trackingValue}>{elapsedDisplay}</Text>
              </View>

              <View style={styles.trackingStat}>
                <Text style={styles.trackingLabel}>Distância</Text>
                <Text style={styles.trackingValue}>
                  {distanceKm.toFixed(2)} km
                </Text>
              </View>

              <View style={styles.trackingStat}>
                <Text style={styles.trackingLabel}>Pontos GPS</Text>
                <Text style={styles.trackingValue}>{routePoints.length}</Text>
              </View>
            </View>
          </View>
        ) : latestActivity ? (
          <View style={styles.mapCard}>
            <MapView style={styles.map} initialRegion={mapRegion}>
              {latestRoute.length > 0 && (
                <>
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
                </>
              )}
            </MapView>

            <View style={styles.mapPreviewOverlay}>
              <View style={styles.eventDateDot} />
              <Text style={styles.mapSmallLabel}>
                ÚLTIMA ROTA ({getAnimalName(latestActivity.id_animal)})
              </Text>
              <Text style={styles.mapTitle}>
                {getActivityTitle(latestActivity)}
              </Text>

              <View style={styles.mapStatsRow}>
                <View>
                  <Text style={styles.mapStatLabel}>Distância</Text>
                  <Text style={styles.mapStatValue}>
                    {Number(latestActivity.distancia_km ?? 0).toFixed(1)} km
                  </Text>
                </View>

                <View>
                  <Text style={styles.mapStatLabel}>Duração</Text>
                  <Text style={styles.mapStatValue}>
                    {formatDuration(latestActivity.duracao_min)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Ionicons name="pulse-outline" size={20} color="#0F9D92" />
          <Text style={styles.sectionTitle}>Estatísticas da Aplicação</Text>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsTopRow}>
            <Text style={styles.statsLabel}>Tempo Total Ativo</Text>
            <Text style={styles.statsMainValue}>
              {formatDuration(totalMinutes)}
            </Text>
          </View>
          <View style={styles.statsBottomRow}>
            <View>
              <Text style={styles.smallMetricLabel}>Atividades</Text>
              <Text style={styles.smallMetricValue}>{activities.length}</Text>
            </View>

            <View>
              <Text style={styles.smallMetricLabel}>Distância</Text>
              <Text style={styles.smallMetricValue}>
                {totalDistance.toFixed(1)} km
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>Histórico de Movimento</Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color="#0F9D92" />
          </View>
        ) : activities.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="walk-outline" size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Sem atividades</Text>
            <Text style={styles.emptyText}>
              Inicie um passeio para começar a criar o histórico do animal.
            </Text>
          </View>
        ) : (
          activities.map((activity) => (
            <View key={activity.id_atividade} style={styles.activityCard}>
              <View style={styles.activityIconBox}>
                <Ionicons name="walk-outline" size={26} color="#0F9D92" />
              </View>

              <View style={styles.activityContent}>
                <View style={styles.activityTopRow}>
                  <Text style={styles.activityTitle}>
                    {getActivityTitle(activity)}
                  </Text>

                  <Pressable
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed && styles.deleteButtonPressed,
                    ]}
                    onPress={() => handleDeleteActivity(activity.id_atividade)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </Pressable>
                </View>

                <View style={styles.petBadge}>
                  <Text style={styles.petBadgeText}>
                    {getAnimalName(activity.id_animal)}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={14} color="#64748B" />
                  <Text style={styles.metaText}>
                    {formatDate(activity.data_inicio)},{" "}
                    {formatTime(activity.data_inicio)}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={14} color="#64748B" />
                  <Text style={styles.metaText}>
                    {activity.local || "Local não definido"}
                  </Text>
                </View>

                {activity.rota && activity.rota.length > 0 && (
                  <View style={styles.historyMapBox}>
                    <MapView
                      style={styles.historyMap}
                      initialRegion={{
                        latitude: activity.rota[0].latitude,
                        longitude: activity.rota[0].longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }}
                      scrollEnabled={true}
                      zoomEnabled={true}
                      rotateEnabled={true}
                      pitchEnabled={true}
                    >
                      <Polyline
                        coordinates={activity.rota.map((point) => ({
                          latitude: point.latitude,
                          longitude: point.longitude,
                        }))}
                        strokeWidth={4}
                        strokeColor="#0F9D92"
                      />

                      <Marker
                        coordinate={{
                          latitude: activity.rota[0].latitude,
                          longitude: activity.rota[0].longitude,
                        }}
                        title="Início"
                      />

                      <Marker
                        coordinate={{
                          latitude:
                            activity.rota[activity.rota.length - 1].latitude,
                          longitude:
                            activity.rota[activity.rota.length - 1].longitude,
                        }}
                        title="Fim"
                      />
                    </MapView>
                  </View>
                )}

                <View style={styles.activityMetrics}>
                  <View>
                    <Text style={styles.metricLabel}>DURAÇÃO</Text>
                    <Text style={styles.metricValue}>
                      {formatDuration(activity.duracao_min)}
                    </Text>
                  </View>

                  <View>
                    <Text style={styles.metricLabel}>DISTÂNCIA</Text>
                    <Text style={styles.metricValue}>
                      {Number(activity.distancia_km ?? 0).toFixed(1)} km
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F3F4F6" },
  container: { padding: 18, paddingBottom: 40 },
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
  },
  animalsScroll: { marginBottom: 16 },
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
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  syncBox: {
    width: "42%",
    height: 54,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  syncText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F9D92",
  },
  mainButton: {
    width: "54%",
    height: 54,
    borderRadius: 14,
    backgroundColor: "#0F9D92",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  stopButton: { backgroundColor: "#E11D48" },
  buttonDisabled: { opacity: 0.7 },
  mainButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  trackingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 22,
  },
  trackingTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  liveMap: {
    width: "100%",
    height: 210,
    borderRadius: 16,
    marginBottom: 14,
  },
  waitingGpsBox: {
    height: 210,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  waitingGpsText: {
    marginTop: 10,
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  trackingStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  trackingStat: {
    width: "31%",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
  },
  trackingLabel: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 6,
  },
  trackingValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  mapCard: {
    height: 230,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  map: { width: "100%", height: "100%" },
  mapPreviewOverlay: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    width: 190,
    zIndex: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  eventDateDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#F43F5E",
    marginBottom: 8,
  },
  mapSmallLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    marginBottom: 8,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  mapStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  mapStatLabel: { fontSize: 11, color: "#64748B" },
  mapStatValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    marginLeft: 8,
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  statsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    marginBottom: 24,
  },
  statsTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsLabel: { fontSize: 13, color: "#64748B" },
  statsMainValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },

  statsBottomRow: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 14,
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  smallMetricLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 6,
    textAlign: "center",
  },
  smallMetricValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  historyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  loadingWrapper: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 26,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },
  activityCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 14,
  },
  activityIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#DDFBF0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  activityContent: { flex: 1 },
  activityTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  activityTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginRight: 8,
  },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  petBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  petBadgeText: {
    fontSize: 11,
    color: "#2563EB",
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  metaText: {
    marginLeft: 6,
    fontSize: 12,
    color: "#64748B",
  },
  activityMetrics: {
    marginTop: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  metricLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "800",
    textAlign: "center",
  },

  historyMapBox: {
    height: 150,
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
  },

  historyMap: {
    width: "100%",
    height: "100%",
  },
});

import {
  Ionicons,
  MaterialCommunityIcons,
  Feather,
  Octicons,
} from "@expo/vector-icons";
import { Tabs } from "expo-router";
import {
  Pressable,
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  DeviceEventEmitter,
  Modal,
  ScrollView,
} from "react-native";
import { useFonts, Pacifico_400Regular } from "@expo-google-fonts/pacifico";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { router, usePathname } from "expo-router";
import { supabase } from "../src/lib/supabase";

const ACTIVE_GREEN = "#06afa1";

const PUBLIC_ROUTES = [
  "index",
  "login",
  "registar",
  "esqueceu_password",
  "reset_password",
];

const HIDDEN_TAB_ROUTES = [
  "index",
  "login",
  "registar",
  "esqueceu_password",
  "reset_password",
  "animal_form",
  "saude_form",
  "alimentacao_form",
  "historico_peso",
];

type AlertItem = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
};

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "U";

  const parts = trimmed.split(" ").filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getProfilePublicUrl(path: string | null) {
  if (!path) return null;

  if (path.startsWith("http")) {
    return path;
  }

  const { data } = supabase.storage.from("profile-images").getPublicUrl(path);
  return data.publicUrl;
}

function getEstimatedDays(stockKg: number, dailyPortionGrams: number) {
  if (!dailyPortionGrams || dailyPortionGrams <= 0) return 0;
  return Math.floor((stockKg * 1000) / dailyPortionGrams);
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

function getEventLabel(type: string) {
  const lower = type.toLowerCase();

  if (lower.includes("vac")) return "Vacina próxima";
  if (lower.includes("consult")) return "Consulta próxima";
  if (lower.includes("exam")) return "Exame próximo";
  if (lower.includes("medic")) return "Medicação próxima";

  return "Evento próximo";
}

export default function RootLayout() {
  const pathname = usePathname();
  const isProfileActive = pathname === "/perfil";

  const [fontsLoaded] = useFonts({
    Pacifico_400Regular,
  });

  const [fullName, setFullName] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [photoVersion, setPhotoVersion] = useState(Date.now());

  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [importantAlerts, setImportantAlerts] = useState<AlertItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  const loadProfile = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoadingProfile(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setFullName("");
        setProfilePhotoUrl(null);
        setLoadingProfile(false);
        return;
      }

      const { data, error } = await supabase
        .from("utilizadores")
        .select("nome, foto_perfil_url")
        .eq("id_utilizador", user.id)
        .single();

      if (error) {
        console.log("Erro ao carregar perfil:", error.message);
        setFullName("");
        setProfilePhotoUrl(null);
        return;
      }

      setFullName(data?.nome ?? "");
      setProfilePhotoUrl(data?.foto_perfil_url ?? null);
      setPhotoVersion(Date.now());
    } catch (error) {
      console.log("Erro inesperado ao carregar perfil:", error);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const loadImportantAlerts = useCallback(async () => {
    try {
      setLoadingAlerts(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setImportantAlerts([]);
        return;
      }

      const { data: animalsData } = await supabase
        .from("animais")
        .select("id_animal, nome")
        .eq("id_utilizador", user.id);

      const animals = animalsData ?? [];
      const animalIds = animals.map((animal) => animal.id_animal);

      if (animalIds.length === 0) {
        setImportantAlerts([]);
        return;
      }

      const getAnimalName = (id: string) => {
        return (
          animals.find((animal) => animal.id_animal === id)?.nome ?? "Animal"
        );
      };

      const todayKey = new Date().toISOString().split("T")[0];
      const alerts: AlertItem[] = [];

      const { data: foodData } = await supabase
        .from("alimentacao")
        .select(
          "id_alimentacao, id_animal, nome_racao, stock_atual, porcao_diaria",
        )
        .in("id_animal", animalIds);

      (foodData ?? []).forEach((food: any) => {
        const days = getEstimatedDays(
          Number(food.stock_atual),
          Number(food.porcao_diaria),
        );

        if (days <= 7) {
          alerts.push({
            id: `food-${food.id_alimentacao}`,
            title: "Stock crítico",
            description: `${food.nome_racao} de ${getAnimalName(
              food.id_animal,
            )} deve acabar em aproximadamente ${days} dias.`,
            icon: "restaurant-outline",
            color: "#B45309",
            backgroundColor: "#FEF3C7",
          });
        }
      });

      const { data: healthData } = await supabase
        .from("registos_saude")
        .select(
          "id_registo_saude, id_animal, tipo_registo, titulo, proxima_data, estado",
        )
        .in("id_animal", animalIds)
        .not("proxima_data", "is", null)
        .neq("estado", "Concluído")
        .order("proxima_data", { ascending: true });

      (healthData ?? []).forEach((record: any) => {
        const targetDate = new Date(record.proxima_data);
        const today = new Date();

        today.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);

        const diffDays = Math.round(
          (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (diffDays >= 0 && diffDays <= 7) {
          alerts.push({
            id: `health-${record.id_registo_saude}`,
            title: getEventLabel(record.tipo_registo),
            description: `${record.titulo} de ${getAnimalName(
              record.id_animal,
            )} — ${formatRelativeDays(record.proxima_data)}.`,
            icon: "calendar-outline",
            color: "#0F9D92",
            backgroundColor: "#DBF5F1",
          });
        } else if (diffDays < 0) {
          alerts.push({
            id: `overdue-${record.id_registo_saude}`,
            title: "Registo em atraso",
            description: `${record.titulo} de ${getAnimalName(
              record.id_animal,
            )} está ${formatRelativeDays(record.proxima_data).toLowerCase()}.`,
            icon: "alert-circle-outline",
            color: "#DC2626",
            backgroundColor: "#FEF2F2",
          });
        }
      });

      setImportantAlerts(alerts);
    } catch (error) {
      console.log("Erro ao carregar avisos:", error);
      setImportantAlerts([]);
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  useEffect(() => {
    let profileChannel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      profileChannel = supabase
        .channel(`utilizadores-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "utilizadores",
            filter: `id_utilizador=eq.${user.id}`,
          },
          (payload) => {
            const newRow = payload.new as {
              nome?: string;
              foto_perfil_url?: string | null;
            };

            setFullName(newRow.nome ?? "");
            setProfilePhotoUrl(newRow.foto_perfil_url ?? null);
            setPhotoVersion(Date.now());
            setLoadingProfile(false);
          },
        )
        .subscribe();
    };

    const profileUpdateListener = DeviceEventEmitter.addListener(
      "profileUpdated",
      (data: { nome?: string; foto_perfil_url?: string | null }) => {
        setFullName(data.nome ?? "");
        setProfilePhotoUrl(data.foto_perfil_url ?? null);
        setPhotoVersion(Date.now());
        setLoadingProfile(false);
      },
    );

    loadProfile(true);
    loadImportantAlerts();
    setupRealtime();

    const authSubscription = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          setFullName("");
          setProfilePhotoUrl(null);
          setImportantAlerts([]);
          setLoadingProfile(false);

          if (profileChannel) {
            supabase.removeChannel(profileChannel);
            profileChannel = null;
          }

          router.replace("/");
          return;
        }

        setTimeout(() => {
          loadProfile(true);
          loadImportantAlerts();
        }, 0);
      },
    );

    return () => {
      profileUpdateListener.remove();
      authSubscription.data.subscription.unsubscribe();

      if (profileChannel) {
        supabase.removeChannel(profileChannel);
      }
    };
  }, [loadProfile, loadImportantAlerts]);

  const initials = useMemo(() => getInitials(fullName), [fullName]);

  const resolvedPhoto = useMemo(() => {
    const url = getProfilePublicUrl(profilePhotoUrl);
    return url ? `${url}?t=${photoVersion}` : null;
  }, [profilePhotoUrl, photoVersion]);

  const hasImportantAlerts = importantAlerts.length > 0;

  if (!fontsLoaded) {
    return null;
  }

  const commonHeaderOptions = {
    headerShown: true,
    headerTitleAlign: "left" as const,
    headerStyle: {
      backgroundColor: "#FFFFFF",
      borderBottomWidth: 1,
      borderBottomColor: "#E5E7EB",
    },
    headerShadowVisible: false,
    headerTitle: () => (
      <View style={styles.topBarBrand}>
        <View style={styles.topBarLogoBox}>
          <Image
            source={require("../assets/images/pawlife_logo.png")}
            style={styles.topBarLogoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.topBarAppName}>PawLife</Text>
      </View>
    ),
    headerRight: () => (
      <View style={styles.headerRightWrap}>
        <Pressable
          style={styles.notificationButton}
          onPress={() => {
            setShowAlertsModal(true);
            setTimeout(() => {
              loadImportantAlerts();
            }, 300);
          }}
        >
          <Ionicons name="notifications-outline" size={20} color="#64748B" />
          {hasImportantAlerts && <View style={styles.notificationDot} />}
        </Pressable>

        <Pressable
          onPress={async () => {
            const {
              data: { session },
            } = await supabase.auth.getSession();

            if (!session) {
              router.replace("/");
              return;
            }

            router.push("/perfil");
          }}
        >
          <View
            style={[
              styles.profileButtonRing,
              isProfileActive && styles.profileButtonRingActive,
            ]}
          >
            <View style={styles.profileButton}>
              {loadingProfile ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : resolvedPhoto ? (
                <Image
                  key={resolvedPhoto}
                  source={{ uri: resolvedPhoto }}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.profileInitials}>{initials}</Text>
              )}
            </View>
          </View>
        </Pressable>
      </View>
    ),
  };

  return (
    <>
      <Tabs
        initialRouteName="index"
        screenListeners={({ route }) => ({
          focus: async () => {
            if (PUBLIC_ROUTES.includes(route.name)) {
              return;
            }

            const {
              data: { session },
            } = await supabase.auth.getSession();

            if (!session) {
              setFullName("");
              setProfilePhotoUrl(null);
              setImportantAlerts([]);
              setLoadingProfile(false);
              router.replace("/");
              return;
            }

            await loadImportantAlerts();
          },
        })}
        screenOptions={{
          ...commonHeaderOptions,
          tabBarActiveTintColor: ACTIVE_GREEN,
          tabBarInactiveTintColor: "#94A3B8",
          tabBarShowLabel: false,
          tabBarStyle: {
            height: 66,
            paddingTop: 8,
            paddingBottom: 10,
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#E5E7EB",
          },
          tabBarItemStyle: {
            paddingVertical: 4,
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "",
            tabBarIcon: ({ color, focused }) => (
              <Octicons
                name={focused ? "apps" : "apps"}
                size={24}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="saude"
          options={{
            title: "",
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons
                name="heart-plus-outline"
                size={27}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="animais"
          options={{
            title: "",
            tabBarIcon: ({ focused }) => (
              <View
                style={{
                  width: 55,
                  height: 55,
                  borderRadius: 35,
                  backgroundColor: focused ? "#f0fdfa" : "#FFFFFF",
                  borderWidth: 3,
                  borderColor: focused ? "#06afa1" : "#94A3B8",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 25,
                  shadowColor: "#000",
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  elevation: 3,
                }}
              >
                <Ionicons
                  name="paw"
                  size={32}
                  color={focused ? "#06afa1" : "#94A3B8"}
                />
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="alimentacao"
          options={{
            title: "",
            tabBarIcon: ({ color }) => (
              <Feather name="package" size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="atividade"
          options={{
            title: "Atividade",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "pulse" : "pulse-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="perfil"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="adocao"
          options={{
            href: null,
            title: "Adoção",
          }}
        />

        <Tabs.Screen
          name="calendario"
          options={{
            href: null,
            title: "",
          }}
        />

        {HIDDEN_TAB_ROUTES.map((routeName) => (
          <Tabs.Screen
            key={routeName}
            name={routeName}
            options={{
              href: null,
              title: "",
              headerShown: PUBLIC_ROUTES.includes(routeName) ? false : true,
              tabBarStyle: { display: "none" },
            }}
          />
        ))}
      </Tabs>

      <Modal visible={showAlertsModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.alertsModalCard}>
            <View style={styles.alertsModalHeader}>
              <View>
                <Text style={styles.alertsModalTitle}>Avisos Importantes</Text>
                <Text style={styles.alertsModalSubtitle}>
                  Resumo dos alertas atuais dos seus animais.
                </Text>
              </View>

              <Pressable
                style={styles.closeModalButton}
                onPress={() => setShowAlertsModal(false)}
              >
                <Ionicons name="close" size={22} color="#94A3B8" />
              </Pressable>
            </View>

            {loadingAlerts ? (
              <View style={styles.alertsLoadingBox}>
                <ActivityIndicator size="large" color="#0F9D92" />
              </View>
            ) : importantAlerts.length === 0 ? (
              <View style={styles.emptyAlertsBox}>
                <View style={styles.emptyAlertsIcon}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={34}
                    color="#0F9D92"
                  />
                </View>

                <Text style={styles.emptyAlertsTitle}>Sem avisos urgentes</Text>
                <Text style={styles.emptyAlertsText}>
                  Não existem vacinas, consultas, exames ou stocks críticos
                  neste momento.
                </Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.alertsList}
              >
                {importantAlerts.map((alert) => (
                  <View key={alert.id} style={styles.alertModalItem}>
                    <View
                      style={[
                        styles.alertModalIconBox,
                        { backgroundColor: alert.backgroundColor },
                      ]}
                    >
                      <Ionicons
                        name={alert.icon}
                        size={21}
                        color={alert.color}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.alertModalItemTitle}>
                        {alert.title}
                      </Text>
                      <Text style={styles.alertModalItemDescription}>
                        {alert.description}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            <Pressable
              style={styles.modalDashboardButton}
              onPress={() => {
                setShowAlertsModal(false);
                router.push("/dashboard");
              }}
            >
              <Text style={styles.modalDashboardButtonText}>
                Ver no Dashboard
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  topBarBrand: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: -6,
  },

  topBarLogoBox: {
    width: 27,
    height: 27,
    borderRadius: 6,
    backgroundColor: "#14B8A6",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    marginRight: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  topBarLogoImage: {
    width: 23,
    height: 23,
  },

  topBarAppName: {
    fontSize: 19,
    fontFamily: "Pacifico_400Regular",
    color: "#0F172A",
  },

  headerRightWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 14,
  },

  notificationButton: {
    marginRight: 14,
    position: "relative",
  },

  notificationDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#F43F5E",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },

  profileButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#14B8A6",
    alignItems: "center",
    justifyContent: "center",
  },

  profileImage: {
    width: "100%",
    height: "100%",
  },

  profileInitials: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "center",
    padding: 18,
  },

  alertsModalCard: {
    maxHeight: "78%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  alertsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },

  alertsModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },

  alertsModalSubtitle: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 19,
    maxWidth: 240,
  },

  closeModalButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },

  alertsLoadingBox: {
    paddingVertical: 45,
    alignItems: "center",
  },

  alertsList: {
    paddingBottom: 4,
  },

  alertModalItem: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  alertModalIconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  alertModalItemTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },

  alertModalItemDescription: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 19,
  },

  emptyAlertsBox: {
    paddingVertical: 35,
    alignItems: "center",
    paddingHorizontal: 18,
  },

  emptyAlertsIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#DBF5F1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyAlertsTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },

  emptyAlertsText: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },

  modalDashboardButton: {
    height: 48,
    borderRadius: 15,
    backgroundColor: "#0F9D92",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  modalDashboardButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  profileButtonRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    padding: 3,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },

  profileButtonRingActive: {
    borderColor: "#0F9D92",
  },
});

import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  Feather,
  Octicons,
} from "@expo/vector-icons";
import { Drawer } from "expo-router/drawer";
import { DrawerContentScrollView } from "@react-navigation/drawer";
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
import { router } from "expo-router";
import { supabase } from "../src/lib/supabase";

const ACTIVE_GREEN = "#06afa1";

const PUBLIC_ROUTES = [
  "index",
  "login",
  "registar",
  "esqueceu_password",
  "reset_password",
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

function MenuItem({
  label,
  route,
  currentRoute,
  onPress,
  icon,
}: {
  label: string;
  route: string;
  currentRoute: string;
  onPress: () => void;
  icon: React.ReactNode;
}) {
  const isActive = currentRoute === route;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.item, isActive && styles.activeItem]}
    >
      <View style={styles.itemContent}>
        <View style={styles.iconWrap}>{icon}</View>
        <Text style={[styles.label, isActive && styles.activeLabel]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function CustomDrawerContent(props: any) {
  const currentRoute = props.state.routes[props.state.index]?.name ?? "";
  const { onLogoutClear } = props;

  const handleLogout = async () => {
    try {
      onLogoutClear?.();

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.log("Erro ao terminar sessão:", error.message);
        return;
      }

      router.replace("/");
    } catch (error) {
      console.log("Erro inesperado ao terminar sessão:", error);
    }
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={styles.drawerContainer}
      scrollEnabled={false}
    >
      <View>
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Image
              source={require("../assets/images/pawlife_logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.appName}>PawLife</Text>
        </View>

        <View style={styles.separator} />

        <MenuItem
          label="Dashboard"
          route="dashboard"
          currentRoute={currentRoute}
          onPress={() => props.navigation.navigate("dashboard")}
          icon={
            <Octicons
              name="apps"
              size={17}
              color={currentRoute === "dashboard" ? ACTIVE_GREEN : "#64748B"}
            />
          }
        />

        <MenuItem
          label="Os Meus Animais"
          route="animais"
          currentRoute={currentRoute}
          onPress={() => props.navigation.navigate("animais")}
          icon={
            <Ionicons
              name="paw-outline"
              size={17}
              color={currentRoute === "animais" ? ACTIVE_GREEN : "#64748B"}
            />
          }
        />

        <MenuItem
          label="Registos de Saúde"
          route="saude"
          currentRoute={currentRoute}
          onPress={() => props.navigation.navigate("saude")}
          icon={
            <MaterialCommunityIcons
              name="heart-plus-outline"
              size={17}
              color={currentRoute === "saude" ? ACTIVE_GREEN : "#64748B"}
            />
          }
        />

        <MenuItem
          label="Calendário"
          route="calendario"
          currentRoute={currentRoute}
          onPress={() => props.navigation.navigate("calendario")}
          icon={
            <Ionicons
              name="calendar-outline"
              size={17}
              color={currentRoute === "calendario" ? ACTIVE_GREEN : "#64748B"}
            />
          }
        />

        <MenuItem
          label="Atividades"
          route="atividade"
          currentRoute={currentRoute}
          onPress={() => props.navigation.navigate("atividade")}
          icon={
            <Ionicons
              name="pulse-outline"
              size={17}
              color={currentRoute === "atividade" ? ACTIVE_GREEN : "#64748B"}
            />
          }
        />

        <MenuItem
          label="Stock de Alimentação"
          route="alimentacao"
          currentRoute={currentRoute}
          onPress={() => props.navigation.navigate("alimentacao")}
          icon={
            <Feather
              name="package"
              size={17}
              color={currentRoute === "alimentacao" ? ACTIVE_GREEN : "#64748B"}
            />
          }
        />

        <MenuItem
          label="Associações de Adoção"
          route="adocao"
          currentRoute={currentRoute}
          onPress={() => props.navigation.navigate("adocao")}
          icon={
            <MaterialCommunityIcons
              name="handshake-outline"
              size={17}
              color={currentRoute === "adocao" ? ACTIVE_GREEN : "#64748B"}
            />
          }
        />
      </View>

      <View>
        <View style={styles.separator} />

        <Pressable onPress={handleLogout} style={styles.footerItem}>
          <View style={styles.itemContent}>
            <View style={styles.iconWrap}>
              <MaterialIcons name="logout" size={17} color="#64748B" />
            </View>

            <Text style={styles.footerLabel}>Terminar Sessão</Text>
          </View>
        </Pressable>
      </View>
    </DrawerContentScrollView>
  );
}

export default function RootLayout() {
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

  const clearUserState = () => {
    setFullName("");
    setProfilePhotoUrl(null);
    setImportantAlerts([]);
  };

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
        if (String(record.proxima_data) >= todayKey) {
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
        } else {
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

  return (
    <>
      <Drawer
        initialRouteName="index"
        drawerContent={(props) => (
          <CustomDrawerContent {...props} onLogoutClear={clearUserState} />
        )}
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
        screenOptions={({ navigation }) => ({
          headerShown: true,
          overlayColor: "rgba(0,0,0,0.25)",
          drawerStyle: {
            width: 270,
            borderTopRightRadius: 28,
            borderBottomRightRadius: 28,
            backgroundColor: "#FFFFFF",
          },
          sceneStyle: {
            backgroundColor: "#F8FAFC",
          },
          headerStyle: {
            backgroundColor: "#FFFFFF",
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
          },
          headerShadowVisible: false,

          headerLeft: () => (
            <Pressable
              onPress={async () => {
                const {
                  data: { session },
                } = await supabase.auth.getSession();

                if (!session) {
                  router.replace("/");
                  return;
                }

                navigation.openDrawer();
              }}
              style={styles.headerLeftButton}
            >
              <MaterialIcons name="menu" size={22} color="#64748B" />
            </Pressable>
          ),

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
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color="#64748B"
                />

                {hasImportantAlerts && <View style={styles.notificationDot} />}
              </Pressable>

              <Pressable
                style={styles.profileButton}
                onPress={async () => {
                  const {
                    data: { session },
                  } = await supabase.auth.getSession();

                  if (!session) {
                    router.replace("/");
                    return;
                  }

                  navigation.navigate("profile");
                }}
              >
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
              </Pressable>
            </View>
          ),

          drawerType: "front",
        })}
      >
        <Drawer.Screen name="dashboard" options={{ title: "" }} />
        <Drawer.Screen name="animais" options={{ title: "" }} />
        <Drawer.Screen name="alimentacao" options={{ title: "" }} />
        <Drawer.Screen name="atividade" options={{ title: "" }} />
        <Drawer.Screen name="adocao" options={{ title: "" }} />
        <Drawer.Screen name="profile" options={{ title: "" }} />
        <Drawer.Screen name="saude" options={{ title: "" }} />
        <Drawer.Screen name="calendario" options={{ title: "" }} />

        <Drawer.Screen
          name="index"
          options={{ drawerItemStyle: { display: "none" }, headerShown: false }}
        />

        <Drawer.Screen
          name="login"
          options={{ drawerItemStyle: { display: "none" }, headerShown: false }}
        />

        <Drawer.Screen
          name="registar"
          options={{ drawerItemStyle: { display: "none" }, headerShown: false }}
        />

        <Drawer.Screen
          name="esqueceu_password"
          options={{ drawerItemStyle: { display: "none" }, headerShown: false }}
        />

        <Drawer.Screen
          name="reset_password"
          options={{ drawerItemStyle: { display: "none" }, headerShown: false }}
        />
      </Drawer>

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
  drawerContainer: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 18,
  },

  logoBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#14B8A6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  logoImage: {
    width: 24,
    height: 24,
  },

  appName: {
    fontSize: 22,
    fontFamily: "Pacifico_400Regular",
    color: "#0F172A",
  },

  separator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 20,
    marginBottom: 12,
  },

  item: {
    marginHorizontal: 18,
    borderRadius: 11,
    marginBottom: 4,
    backgroundColor: "transparent",
    minHeight: 42,
    justifyContent: "center",
  },

  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  iconWrap: {
    width: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  activeItem: {
    backgroundColor: "#f2fcf7",
    borderWidth: 1,
    borderColor: "#d2efe9",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  label: {
    fontSize: 14,
    color: "#7c8a9e",
    lineHeight: 20,
    flexShrink: 1,
  },

  activeLabel: {
    color: ACTIVE_GREEN,
    fontWeight: "600",
  },

  footerItem: {
    marginHorizontal: 18,
    borderRadius: 14,
    minHeight: 42,
    justifyContent: "center",
  },

  footerLabel: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },

  headerLeftButton: {
    marginLeft: 16,
    marginRight: 8,
  },

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
});

import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { Drawer } from "expo-router/drawer";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { Pressable, View, Text, StyleSheet, Image } from "react-native";
import { useFonts, Pacifico_400Regular } from "@expo-google-fonts/pacifico";
import { BlurView } from "expo-blur";

const ACTIVE_GREEN = "#06afa1";

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

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={styles.drawerContainer}
      scrollEnabled={false}
    >
      <View>
        {/* Logo menu lateral */}
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
            <Feather
              name="grid"
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
          label="Saúde"
          route="saude"
          currentRoute={currentRoute}
          onPress={() => props.navigation.navigate("saude")}
          icon={
            <Ionicons
              name="heart-outline"
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
          route="walks"
          currentRoute={currentRoute}
          onPress={() => props.navigation.navigate("walks")}
          icon={
            <Ionicons
              name="pulse-outline"
              size={17}
              color={currentRoute === "walks" ? ACTIVE_GREEN : "#64748B"}
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
              name="box"
              size={17}
              color={currentRoute === "alimentacao" ? ACTIVE_GREEN : "#64748B"}
            />
          }
        />

        <MenuItem
          label="Emergência"
          route="emergencia"
          currentRoute={currentRoute}
          onPress={() => props.navigation.navigate("emergencia")}
          icon={
            <Feather
              name="phone-call"
              size={17}
              color={currentRoute === "emergencia" ? ACTIVE_GREEN : "#64748B"}
            />
          }
        />

        <MenuItem
          label={"Associações\nde Adoção"}
          route="adoption"
          currentRoute={currentRoute}
          onPress={() => props.navigation.navigate("adoption")}
          icon={
            <Ionicons
              name="heart-outline"
              size={17}
              color={currentRoute === "adoption" ? ACTIVE_GREEN : "#64748B"}
            />
          }
        />
      </View>

      {/* Footer */}
      <View>
        <View style={styles.separator} />
        <Pressable
          onPress={() => props.navigation.navigate("login")}
          style={styles.footerItem}
        >
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

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerShown: true,
        overlayColor: "rgba(0,0,0,0.25)",
        drawerStyle: {
          width: 255,
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
            onPress={() => navigation.openDrawer()}
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
            <Pressable style={styles.notificationButton}>
              <Ionicons
                name="notifications-outline"
                size={20}
                color="#64748B"
              />
              <View style={styles.notificationDot} />
            </Pressable>

            <Pressable style={styles.profileButton}>
              <Image
                source={require("../assets/images/profile_placeholder.png")}
                style={styles.profileImage}
                resizeMode="cover"
              />
            </Pressable>
          </View>
        ),

        drawerType: "front",
      })}
    >
      <Drawer.Screen name="dashboard" options={{ title: "" }} />
      <Drawer.Screen name="animais" options={{ title: "" }} />
      <Drawer.Screen name="alimentacao" options={{ title: "" }} />
      <Drawer.Screen name="walks" options={{ title: "" }} />
      <Drawer.Screen name="adoption" options={{ title: "" }} />
      <Drawer.Screen name="profile" options={{ title: "" }} />

      <Drawer.Screen name="saude" options={{ title: "" }} />
      <Drawer.Screen name="calendario" options={{ title: "" }} />
      <Drawer.Screen name="emergencia" options={{ title: "" }} />

      <Drawer.Screen
        name="login"
        options={{ drawerItemStyle: { display: "none" }, headerShown: false }}
      />
      <Drawer.Screen
        name="register"
        options={{ drawerItemStyle: { display: "none" }, headerShown: false }}
      />
      <Drawer.Screen
        name="index"
        options={{ drawerItemStyle: { display: "none" }, headerShown: false }}
      />
      <Drawer.Screen
        name="modal"
        options={{ drawerItemStyle: { display: "none" } }}
      />
    </Drawer>
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

  /* HEADER GLOBAL */
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
    width: 24,
    height: 24,
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
    width: 22,
    height: 22,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },

  profileImage: {
    width: "100%",
    height: "100%",
  },
});
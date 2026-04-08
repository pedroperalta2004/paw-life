import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
  Alert,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";

type Contact = {
  id: string;
  type: "emergency" | "specialist" | "shop";
  name: string;
  phone: string;
  displayPhone: string;
  address: string;
  distance: string;
  rating: string;
  open: boolean;
};

export default function EmergenciaScreen() {
  const contacts: Contact[] = [
    {
      id: "1",
      type: "emergency",
      name: "Hospital Veterinário 24h PetVida",
      phone: "11987654321",
      displayPhone: "(11) 98765-4321",
      address: "Av. Paulista, 1000 - Bela Vista",
      distance: "2.3 km de distância",
      rating: "4.9",
      open: true,
    },
    {
      id: "2",
      type: "specialist",
      name: "Dr. Carlos Andrade (Veterinário)",
      phone: "11912345678",
      displayPhone: "(11) 91234-5678",
      address: "Rua Augusta, 500 - Consolação",
      distance: "1.5 km de distância",
      rating: "4.8",
      open: true,
    },
    {
      id: "3",
      type: "shop",
      name: "Pet Shop Banhos e Cia",
      phone: "11955554444",
      displayPhone: "(11) 95555-4444",
      address: "Rua Oscar Freire, 200 - Jardins",
      distance: "0.8 km de distância",
      rating: "4.6",
      open: false,
    },
  ];

  const handleCall = async (phoneNumber: string) => {
  try {
    const cleanedNumber = phoneNumber.replace(/\D/g, "");
    await Linking.openURL(`tel:${cleanedNumber}`);
  } catch (error) {
    Alert.alert(
      "Erro",
      "Não foi possível abrir a app de chamadas."
    );
  }
};

  const getTypeColor = (type: string) => {
    if (type === "emergency") return "#F43F5E";
    if (type === "specialist") return "#3B82F6";
    return "#F59E0B";
  };

  const getTypeLabel = (type: string) => {
    if (type === "emergency") return "EMERGÊNCIA";
    if (type === "specialist") return "ESPECIALISTA";
    return "COMÉRCIO";
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Contactos de Emergência</Text>
        <Text style={styles.pageSubtitle}>
          Tenha sempre à mão os números do seu veterinário, hospitais e lojas.
        </Text>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            placeholder="Pesquisar clínicas, profissionais..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />
        </View>

        {contacts.map((item) => (
          <View
            key={item.id}
            style={[
              styles.card,
              { borderLeftColor: getTypeColor(item.type) },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Ionicons
                  name={
                    item.type === "emergency"
                      ? "medical-outline"
                      : item.type === "specialist"
                      ? "star-outline"
                      : "storefront-outline"
                  }
                  size={20}
                  color={getTypeColor(item.type)}
                />
              </View>

              <View style={styles.headerRight}>
                <View
                  style={[
                    styles.statusBadge,
                    item.open ? styles.openBadge : styles.closedBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      item.open ? styles.openText : styles.closedText,
                    ]}
                  >
                    {item.open ? "Aberto Agora" : "Fechado"}
                  </Text>
                </View>

                <View style={styles.rating}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.ratingText}>{item.rating}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.typeLabel}>{getTypeLabel(item.type)}</Text>
            <Text style={styles.name}>{item.name}</Text>

            <View style={styles.infoRow}>
              <Feather name="phone" size={14} color="#F43F5E" />
              <Text style={styles.infoText}>{item.displayPhone}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={14} color="#64748B" />
              <View>
                <Text style={styles.infoText}>{item.address}</Text>
                <Text style={styles.distance}>{item.distance}</Text>
              </View>
            </View>

            <Pressable
              style={styles.callButton}
              onPress={() => handleCall(item.phone)}
            >
              <Feather name="phone" size={16} color="#334155" />
              <Text style={styles.callButtonText}>Ligar Agora</Text>
            </Pressable>
          </View>
        ))}
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
    maxWidth: 300,
  },

  searchBox: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 18,
  },

  searchInput: {
    marginLeft: 10,
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderLeftWidth: 5,
    padding: 16,
    marginBottom: 16,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  headerRight: {
    alignItems: "flex-end",
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },

  openBadge: {
    backgroundColor: "#DCFCE7",
  },

  closedBadge: {
    backgroundColor: "#E5E7EB",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },

  openText: {
    color: "#15803D",
  },

  closedText: {
    color: "#475569",
  },

  rating: {
    flexDirection: "row",
    alignItems: "center",
  },

  ratingText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },

  typeLabel: {
    fontSize: 11,
    color: "#94A3B8",
    marginBottom: 4,
    marginTop: 4,
  },

  name: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },

  infoText: {
    fontSize: 13,
    color: "#334155",
  },

  distance: {
    fontSize: 12,
    color: "#94A3B8",
  },

  callButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 10,
  },

  callButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
});
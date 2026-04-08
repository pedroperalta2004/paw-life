import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";

type FoodCard = {
  id: string;
  petName: string;
  foodName: string;
  stockText: string;
  stockValueKg: number;
  stockTotalKg: number;
  dailyPortion: string;
  estimatedDays: string;
  critical: boolean;
};

export default function FoodScreen() {
  const foods: FoodCard[] = [
    {
      id: "1",
      petName: "Max",
      foodName: "Ração Premier Golden (Adultos)",
      stockText: "2.1 kg de 15 kg",
      stockValueKg: 2.1,
      stockTotalKg: 15,
      dailyPortion: "300g",
      estimatedDays: "~ 7 dias",
      critical: true,
    },
    {
      id: "2",
      petName: "Luna",
      foodName: "Royal Canin Medium Puppy",
      stockText: "5.4 kg de 12 kg",
      stockValueKg: 5.4,
      stockTotalKg: 12,
      dailyPortion: "220g",
      estimatedDays: "~ 24 dias",
      critical: false,
    },
  ];

  const getProgressPercent = (value: number, total: number) => {
    if (total <= 0) return 0;
    return Math.max(0, Math.min(100, (value / total) * 100));
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Gestão de Alimentação</Text>
        <Text style={styles.pageSubtitle}>
          Controle o stock de ração e receba alertas antes que acabe.
        </Text>

        <Pressable style={styles.addButton}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Novo Saco de Ração</Text>
        </Pressable>

        {foods.map((item) => {
          const progress = getProgressPercent(
            item.stockValueKg,
            item.stockTotalKg
          );

          return (
            <View key={item.id} style={styles.foodCard}>
              <View style={styles.petBadge}>
                <Text style={styles.petBadgeText}>Para: {item.petName}</Text>
              </View>

              <View style={styles.imagePlaceholder}>
                <MaterialCommunityIcons
                  name="package-variant-closed"
                  size={44}
                  color="#CBD5E1"
                />
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.foodName}>{item.foodName}</Text>

                <View style={styles.stockRow}>
                  <Text style={styles.stockLabel}>Stock atual</Text>
                  <Text style={styles.stockValue}>{item.stockText}</Text>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progress}%` },
                      item.critical
                        ? styles.progressFillCritical
                        : styles.progressFillNormal,
                    ]}
                  />
                </View>

                <View style={styles.metricsRow}>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>PORÇÃO DIÁRIA</Text>
                    <Text style={styles.metricValue}>{item.dailyPortion}</Text>
                  </View>

                  <View style={[styles.metricBox, styles.metricBoxAlert]}>
                    <Text style={[styles.metricLabel, styles.metricLabelAlert]}>
                      DURAÇÃO EST.
                    </Text>
                    <Text style={[styles.metricValue, styles.metricValueAlert]}>
                      {item.estimatedDays}
                    </Text>
                  </View>
                </View>

                {item.critical ? (
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
                  <Pressable style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Editar Porção</Text>
                  </Pressable>

                  <Pressable style={styles.buyButton}>
                    <Feather
                      name="shopping-cart"
                      size={16}
                      color="#FFFFFF"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.buyButtonText}>Comprar</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
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
    gap: 12,
  },

  secondaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
  },

  buyButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#1E2F4F",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  buyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
}); 
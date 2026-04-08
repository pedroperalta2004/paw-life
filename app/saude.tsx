import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from "react-native";
import {
  Ionicons,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

type HealthRecord = {
  id: string;
  type: "vacina" | "consulta" | "medicacao" | "exame";
  title: string;
  date: string;
  petName: string;
  doctor: string;
  place: string;
  status: "Concluído" | "Pendente";
};

const recordsData: HealthRecord[] = [
  {
    id: "1",
    type: "vacina",
    title: "Antirrábica Anual",
    date: "10 de Março, 2024",
    petName: "Max",
    doctor: "Dra. Juliana Mendes",
    place: "Clínica PetVida",
    status: "Concluído",
  },
  {
    id: "2",
    type: "consulta",
    title: "Check-up Geral",
    date: "05 de Março, 2024",
    petName: "Luna",
    doctor: "Dr. Carlos Andrade",
    place: "Hospital Veterinário Central",
    status: "Concluído",
  },
  {
    id: "3",
    type: "medicacao",
    title: "Vermífugo Plus",
    date: "15 de Março, 2024",
    petName: "Max",
    doctor: "Prescrito",
    place: "Em Casa",
    status: "Pendente",
  },
  {
    id: "4",
    type: "exame",
    title: "Exame de Sangue",
    date: "12 de Fevereiro, 2024",
    petName: "Luna",
    doctor: "Laboratório VetLab",
    place: "Clínica PetVida",
    status: "Concluído",
  },
];

export default function SaudeScreen() {
  const [activeTab, setActiveTab] = useState<
    "todos" | "vacinas" | "consultas"
  >("todos");
  const [search, setSearch] = useState("");

  const filteredRecords = useMemo(() => {
    return recordsData.filter((record) => {
      const matchesTab =
        activeTab === "todos" ||
        (activeTab === "vacinas" && record.type === "vacina") ||
        (activeTab === "consultas" && record.type === "consulta");

      const searchLower = search.toLowerCase();
      const matchesSearch =
        record.title.toLowerCase().includes(searchLower) ||
        record.petName.toLowerCase().includes(searchLower) ||
        record.doctor.toLowerCase().includes(searchLower) ||
        record.place.toLowerCase().includes(searchLower);

      return matchesTab && matchesSearch;
    });
  }, [activeTab, search]);

  const getRecordIcon = (type: HealthRecord["type"]) => {
    if (type === "vacina") {
      return (
        <MaterialCommunityIcons
          name="needle"
          size={20}
          color="#10B981"
        />
      );
    }

    if (type === "consulta") {
      return <Feather name="activity" size={20} color="#3B82F6" />;
    }

    if (type === "medicacao") {
      return <Feather name="paperclip" size={20} color="#F59E0B" />;
    }

    return (
      <Ionicons
        name="document-text-outline"
        size={20}
        color="#A855F7"
      />
    );
  };

  const getRecordIconBox = (type: HealthRecord["type"]) => {
    if (type === "vacina") return styles.iconBoxGreen;
    if (type === "consulta") return styles.iconBoxBlue;
    if (type === "medicacao") return styles.iconBoxYellow;
    return styles.iconBoxPurple;
  };

  const getStatusStyle = (status: HealthRecord["status"]) => {
    return status === "Concluído"
      ? {
          badge: styles.statusDone,
          text: styles.statusDoneText,
        }
      : {
          badge: styles.statusPending,
          text: styles.statusPendingText,
        };
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Histórico de Saúde</Text>
        <Text style={styles.pageSubtitle}>
          Acompanhe vacinas, consultas, exames e medicamentos.
        </Text>

        <View style={styles.topButtonsRow}>
          <Pressable style={styles.filterButton}>
            <Feather name="filter" size={16} color="#334155" />
            <Text style={styles.filterButtonText}>Filtrar</Text>
          </Pressable>

          <Pressable style={styles.newButton}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.newButtonText}>Novo Registo</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          <Pressable
            style={[
              styles.tabButton,
              activeTab === "todos" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("todos")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "todos" && styles.tabButtonTextActive,
              ]}
            >
              Todos os Registos
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tabButton,
              activeTab === "vacinas" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("vacinas")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "vacinas" && styles.tabButtonTextActive,
              ]}
            >
              Vacinas
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tabButton,
              activeTab === "consultas" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("consultas")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "consultas" && styles.tabButtonTextActive,
              ]}
            >
              Consultas
            </Text>
          </Pressable>
        </ScrollView>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryIconBox, styles.iconBoxGreen]}>
              <MaterialCommunityIcons
                name="needle"
                size={20}
                color="#10B981"
              />
            </View>
            <View>
              <Text style={styles.summaryLabel}>Vacinas em Dia</Text>
              <Text style={styles.summaryValue}>85%</Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryIconBox, styles.iconBoxPink]}>
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color="#F43F5E"
              />
            </View>
            <View>
              <Text style={styles.summaryLabel}>Próximo Vencimento</Text>
              <Text style={styles.summaryValue}>Max (Antirrábica)</Text>
              <Text style={styles.summarySubValue}>Em 5 dias</Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryIconBox, styles.iconBoxBlue]}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color="#3B82F6"
              />
            </View>
            <View>
              <Text style={styles.summaryLabel}>Última Consulta</Text>
              <Text style={styles.summaryValue}>Luna</Text>
              <Text style={styles.summarySubValue}>Há 10 dias</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchSortCard}>
          <View style={styles.searchSortRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar histórico..."
                placeholderTextColor="#94A3B8"
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <Pressable style={styles.sortButton}>
              <Text style={styles.sortButtonText}>Mais Recente</Text>
              <Ionicons name="chevron-down" size={16} color="#94A3B8" />
            </Pressable>
          </View>

          {filteredRecords.map((record, index) => {
            const statusStyles = getStatusStyle(record.status);

            return (
              <View
                key={record.id}
                style={[
                  styles.recordItem,
                  index !== filteredRecords.length - 1 && styles.recordDivider,
                ]}
              >
                <View style={styles.recordRow}>
                  <View
                    style={[
                      styles.recordIconBox,
                      getRecordIconBox(record.type),
                    ]}
                  >
                    {getRecordIcon(record.type)}
                  </View>

                  <View style={styles.recordContent}>
                    <View style={styles.recordHeader}>
                      <Text style={styles.recordTitle}>{record.title}</Text>

                      <View style={[styles.statusBadge, statusStyles.badge]}>
                        <Text style={[styles.statusText, statusStyles.text]}>
                          {record.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.recordMetaRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={13}
                        color="#94A3B8"
                      />
                      <Text style={styles.recordMetaText}>{record.date}</Text>
                      <Text style={styles.recordMetaText}>{record.petName}</Text>
                    </View>

                    <Text style={styles.recordPlace}>
                      {record.doctor} | {record.place}
                    </Text>

                    <Pressable style={styles.detailsButton}>
                      <Text style={styles.detailsButtonText}>Ver Detalhes</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}

          <Pressable style={styles.loadMoreButton}>
            <Text style={styles.loadMoreText}>Carregar mais registos</Text>
          </Pressable>
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
    maxWidth: 300,
  },

  topButtonsRow: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 10,
  },

  filterButton: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },

  newButton: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "#0F9D92",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  newButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  tabsRow: {
    paddingBottom: 14,
  },

  tabButton: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  tabButtonActive: {
    backgroundColor: "#1E2F4F",
    borderColor: "#1E2F4F",
  },

  tabButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },

  tabButtonTextActive: {
    color: "#FFFFFF",
  },

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 14,
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  summaryIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  iconBoxGreen: {
    backgroundColor: "#E8F8F1",
  },

  iconBoxPink: {
    backgroundColor: "#FFF1F2",
  },

  iconBoxBlue: {
    backgroundColor: "#EFF6FF",
  },

  iconBoxYellow: {
    backgroundColor: "#FEF3C7",
  },

  iconBoxPurple: {
    backgroundColor: "#F3E8FF",
  },

  summaryLabel: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 4,
  },

  summaryValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },

  summarySubValue: {
    fontSize: 13,
    color: "#E11D48",
    marginTop: 2,
  },

  searchSortCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 6,
    overflow: "hidden",
  },

  searchSortRow: {
    flexDirection: "row",
    padding: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  searchBox: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#0F172A",
  },

  sortButton: {
    minWidth: 106,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    gap: 4,
  },

  sortButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },

  recordItem: {
    padding: 16,
  },

  recordDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  recordRow: {
    flexDirection: "row",
  },

  recordIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  recordContent: {
    flex: 1,
  },

  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
    gap: 8,
  },

  recordTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  statusDone: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },

  statusDoneText: {
    color: "#15803D",
  },

  statusPending: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FCD34D",
  },

  statusPendingText: {
    color: "#D97706",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },

  recordMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    flexWrap: "wrap",
    gap: 6,
  },

  recordMetaText: {
    fontSize: 13,
    color: "#64748B",
  },

  recordPlace: {
    fontSize: 13,
    lineHeight: 20,
    color: "#475569",
    marginBottom: 12,
  },

  detailsButton: {
    alignSelf: "flex-start",
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  detailsButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },

  loadMoreButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  loadMoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F9D92",
  },
});
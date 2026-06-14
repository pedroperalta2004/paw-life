import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import {
  Ionicons,
  Feather,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { supabase } from "../src/lib/supabase";
import { router, useFocusEffect } from "expo-router";

type Animal = {
  id_animal: string;
  nome: string;
  especie: string;
  fotografia_url?: string | null;
};

type HealthRecord = {
  id_registo_saude: string;
  id_animal: string;
  tipo_registo: string;
  titulo: string;
  descricao: string | null;
  data_registo: string;
  proxima_data: string | null;
  hora_registo: string | null;
  veterinario: string | null;
  ficheiro_url: string | null;
  data_criacao: string;
  estado: string | null;
  local: string | null;
};

const HEALTH_TYPES = ["Todos", "Vacina", "Consulta", "Exame", "Medicamento"];

function formatDate(dateString: string | null) {
  if (!dateString) return "--";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(time: string | null) {
  if (!time) return "--";
  return time.slice(0, 5);
}

function formatRelativeDays(dateString: string | null) {
  if (!dateString) return "--";

  const today = new Date();
  const target = new Date(dateString);

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) return `Em ${diffDays} dias`;
  if (diffDays === 0) return "Hoje";
  return `Há ${Math.abs(diffDays)} dias`;
}

function normalizeTypeLabel(type: string) {
  const lower = type.toLowerCase();

  if (lower.includes("vac")) return "Vacina";
  if (lower.includes("consult")) return "Consulta";
  if (lower.includes("exam")) return "Exame";
  if (lower.includes("medic")) return "Medicamento";

  return type;
}

function getRecordIcon(type: string) {
  const normalized = normalizeTypeLabel(type);

  switch (normalized) {
    case "Vacina":
      return <FontAwesome5 name="syringe" size={20} color="#10B981" />;
    case "Consulta":
      return <Ionicons name="calendar-outline" size={20} color="#3B82F6" />;
    case "Exame":
      return (
        <Ionicons name="document-text-outline" size={20} color="#A855F7" />
      );
    case "Medicamento":
      return <MaterialCommunityIcons name="pill" size={18} color="#D97706" />;
    default:
      return <Feather name="activity" size={18} color="#64748B" />;
  }
}

function getIconBoxStyle(type: string) {
  const normalized = normalizeTypeLabel(type);

  switch (normalized) {
    case "Vacina":
      return { backgroundColor: "#E9F9F1" };
    case "Consulta":
      return { backgroundColor: "#EAF2FF" };
    case "Exame":
      return { backgroundColor: "#F3E8FF" };
    case "Medicamento":
      return { backgroundColor: "#FEF3C7" };
    default:
      return { backgroundColor: "#F1F5F9" };
  }
}

function getLastLabel(type: string) {
  switch (type) {
    case "Vacina":
      return "Última Vacina";
    case "Consulta":
      return "Última Consulta";
    case "Exame":
      return "Último Exame";
    case "Medicamento":
      return "Último Medicamento";
    default:
      return "Último Registo";
  }
}
const isPastDate = (dateString: string | null) => {
  if (!dateString) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);

  return date < today;
};
export default function SaudeScreen() {
  const scrollRef = useRef<ScrollView>(null);

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedAnimalId, setSelectedAnimalId] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("Todos");
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState<"recent" | "oldest">("recent");

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(
    null,
  );

  const [visibleCount, setVisibleCount] = useState(5);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });

      setAnimals([]);
      setRecords([]);
      setSelectedAnimalId("all");
      setSearchText("");
      setVisibleCount(5);
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
        .select("id_animal, nome, especie, fotografia_url")
        .eq("id_utilizador", user.id)
        .order("nome", { ascending: true });

      if (animalsError) throw animalsError;

      const { data: recordsData, error: recordsError } = await supabase
        .from("registos_saude")
        .select("*")
        .order("data_registo", { ascending: false });

      if (recordsError) throw recordsError;

      const ownedAnimalIds = new Set(
        (animalsData ?? []).map((a) => a.id_animal),
      );
      const filteredRecords = (recordsData ?? []).filter((r) =>
        ownedAnimalIds.has(r.id_animal),
      );

      setAnimals(animalsData ?? []);
      setRecords(filteredRecords);
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível carregar a área de saúde.",
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

  const handleOpenCreate = () => {
    if (animals.length === 0) {
      Alert.alert(
        "Sem animais",
        "Primeiro precisa de registar pelo menos um animal.",
      );
      return;
    }

    router.push({
      pathname: "/saude_form",
      params: { mode: "create", t: Date.now().toString() },
    });
  };

  const handleOpenEdit = (record: HealthRecord) => {
    setShowDetailsModal(false);

    router.push({
      pathname: "/saude_form",
      params: {
        id: record.id_registo_saude,
        mode: "edit",
        t: Date.now().toString(),
      },
    });
  };

  const updateRecordStatus = async (record: HealthRecord, status: string) => {
    try {
      const { data, error } = await supabase
        .from("registos_saude")
        .update({ estado: status })
        .eq("id_registo_saude", record.id_registo_saude)
        .select()
        .single();

      if (error) throw error;

      setRecords((prev) =>
        prev.map((item) =>
          item.id_registo_saude === record.id_registo_saude ? data : item,
        ),
      );

      setSelectedRecord(data);
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível alterar o estado.",
      );
    }
  };

  const handleCompleteRecord = (record: HealthRecord) => {
    updateRecordStatus(record, "Concluído");
  };

  const handleToggleStatus = async (record: HealthRecord) => {
    const newStatus =
      record.estado?.toLowerCase() === "pendente" ? "Concluído" : "Pendente";

    await updateRecordStatus(record, newStatus);
  };

  const handleDeleteRecord = async (record: HealthRecord) => {
    Alert.alert(
      "Eliminar registo",
      `Tem a certeza que pretende eliminar "${record.titulo}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("registos_saude")
                .delete()
                .eq("id_registo_saude", record.id_registo_saude);

              if (error) throw error;

              setRecords((prev) =>
                prev.filter(
                  (item) => item.id_registo_saude !== record.id_registo_saude,
                ),
              );

              setSelectedRecord(null);
              setShowDetailsModal(false);
              Alert.alert("Sucesso", "Registo eliminado com sucesso.");
            } catch (error: any) {
              Alert.alert(
                "Erro",
                error.message || "Não foi possível eliminar o registo.",
              );
            }
          },
        },
      ],
    );
  };

  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (selectedAnimalId !== "all") {
      result = result.filter((r) => r.id_animal === selectedAnimalId);
    }

    if (selectedType !== "Todos") {
      result = result.filter(
        (r) => normalizeTypeLabel(r.tipo_registo) === selectedType,
      );
    }

    if (searchText.trim()) {
      const term = searchText.toLowerCase();

      result = result.filter((r) => {
        const animalName =
          animals
            .find((a) => a.id_animal === r.id_animal)
            ?.nome?.toLowerCase() ?? "";

        return (
          r.titulo?.toLowerCase().includes(term) ||
          r.descricao?.toLowerCase().includes(term) ||
          r.veterinario?.toLowerCase().includes(term) ||
          r.local?.toLowerCase().includes(term) ||
          animalName.includes(term)
        );
      });
    }

    result.sort((a, b) => {
      const aDate = new Date(a.proxima_data || a.data_registo).getTime();
      const bDate = new Date(b.proxima_data || b.data_registo).getTime();

      return sortOrder === "recent" ? bDate - aDate : aDate - bDate;
    });

    return result;
  }, [records, selectedAnimalId, selectedType, searchText, sortOrder, animals]);

  useEffect(() => {
    setVisibleCount(5);
  }, [selectedAnimalId, selectedType, searchText, sortOrder]);

  const visibleRecords = filteredRecords.slice(0, visibleCount);

  const vaccineRecords = filteredRecords.filter(
    (r) => normalizeTypeLabel(r.tipo_registo) === "Vacina",
  );

  const vaccinesToEvaluate = vaccineRecords.filter((r) => {
    if (!r.proxima_data) return true;

    return isPastDate(r.proxima_data);
  });

  const completedVaccines = vaccinesToEvaluate.filter(
    (r) => (r.estado ?? "").toLowerCase() === "concluído",
  ).length;

  const vaccinePercent =
    vaccinesToEvaluate.length > 0
      ? Math.round((completedVaccines / vaccinesToEvaluate.length) * 100)
      : 100;

  const upcomingRecord = useMemo(() => {
    const futureRecords = filteredRecords
      .filter((r) => r.proxima_data)
      .filter((r) => (r.estado ?? "").toLowerCase() !== "concluído")
      .sort(
        (a, b) =>
          new Date(a.proxima_data as string).getTime() -
          new Date(b.proxima_data as string).getTime(),
      );

    return futureRecords[0] ?? null;
  }, [filteredRecords]);

  const lastRecordByType = useMemo(() => {
    const getDateValue = (record: HealthRecord) => {
      return new Date(record.proxima_data || record.data_registo).getTime();
    };

    if (selectedType === "Todos") {
      const consultations = filteredRecords
        .filter(
          (r) =>
            normalizeTypeLabel(r.tipo_registo) === "Consulta" &&
            (r.estado ?? "").toLowerCase() === "concluído",
        )
        .sort((a, b) => getDateValue(b) - getDateValue(a));

      return consultations[0] ?? null;
    }

    const recordsOfType = filteredRecords
      .filter(
        (r) =>
          normalizeTypeLabel(r.tipo_registo) === selectedType &&
          (r.estado ?? "").toLowerCase() === "concluído",
      )
      .sort((a, b) => getDateValue(b) - getDateValue(a));

    return recordsOfType[0] ?? null;
  }, [filteredRecords, selectedType]);

  const getAnimalName = (id: string) => {
    return animals.find((a) => a.id_animal === id)?.nome ?? "--";
  };

  const renderSummaryCards = () => {
    const showVaccines = selectedType === "Todos" || selectedType === "Vacina";
    const showUpcoming = true;
    const showLast =
      selectedType === "Todos" ||
      selectedType === "Vacina" ||
      selectedType === "Consulta" ||
      selectedType === "Exame" ||
      selectedType === "Medicamento";

    return (
      <>
        {showVaccines && (
          <View style={styles.summaryCard}>
            <View
              style={[styles.summaryIconBox, { backgroundColor: "#EAF8F0" }]}
            >
              <FontAwesome5 name="syringe" size={20} color="#10B981" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>Vacinas em Dia</Text>
              <Text style={styles.summaryValue}>{vaccinePercent}%</Text>
            </View>
          </View>
        )}

        {showUpcoming && (
          <View style={styles.summaryCard}>
            <View
              style={[styles.summaryIconBox, { backgroundColor: "#FCEAEC" }]}
            >
              <Ionicons name="alert-circle-outline" size={22} color="#E11D48" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>Próximo Vencimento</Text>

              <Text style={styles.summaryMainText}>
                {upcomingRecord
                  ? `${getAnimalName(
                      upcomingRecord.id_animal,
                    )} (${upcomingRecord.titulo})`
                  : "--"}
              </Text>

              <Text style={styles.summaryDangerText}>
                {upcomingRecord
                  ? formatRelativeDays(upcomingRecord.proxima_data)
                  : "--"}
              </Text>
            </View>
          </View>
        )}

        {showLast && (
          <View style={styles.summaryCard}>
            <View
              style={[styles.summaryIconBox, { backgroundColor: "#EAF1FE" }]}
            >
              <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>
                {selectedType === "Todos"
                  ? "Última Consulta"
                  : getLastLabel(selectedType)}
              </Text>

              <Text style={styles.summaryMainText}>
                {lastRecordByType
                  ? getAnimalName(lastRecordByType.id_animal)
                  : "--"}
              </Text>

              <Text style={styles.summaryDangerText}>
                {lastRecordByType
                  ? formatRelativeDays(
                      lastRecordByType.proxima_data ||
                        lastRecordByType.data_registo,
                    )
                  : "--"}
              </Text>
            </View>
          </View>
        )}
      </>
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
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
        <Text style={styles.pageTitle}>Histórico de Saúde</Text>
        <Text style={styles.pageSubtitle}>
          Acompanhe vacinas, consultas, exames e medicamentos.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.animalsScroll}
        >
          <Pressable
            style={styles.animalAvatarWrapper}
            onPress={() => setSelectedAnimalId("all")}
          >
            <View
              style={[
                styles.animalAvatar,
                selectedAnimalId === "all" && styles.animalAvatarActive,
              ]}
            >
              <Ionicons
                name="paw"
                size={26}
                color={selectedAnimalId === "all" ? "#0F9D92" : "#b5b5b6"}
              />
            </View>

            <Text
              style={[
                styles.animalAvatarName,
                selectedAnimalId === "all" && styles.animalAvatarNameActive,
              ]}
            >
              Todos
            </Text>
          </Pressable>

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

        <View style={styles.topButtonsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.newRecordButton,
              pressed && styles.ButtonPressed,
            ]}
            onPress={handleOpenCreate}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.newRecordButtonText}>Novo Registo</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
        >
          {HEALTH_TYPES.map((tab) => (
            <Pressable
              key={tab}
              style={[
                styles.tabButton,
                selectedType === tab && styles.tabButtonActive,
              ]}
              onPress={() => setSelectedType(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedType === tab && styles.tabTextActive,
                ]}
              >
                {tab === "Todos" ? "Todos os Registos" : tab + "s"}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {renderSummaryCards()}

        <Pressable
          style={({ pressed }) => [
            styles.calendarShortcutCard,
            pressed && styles.whiteButtonPressed,
          ]}
          onPress={() => router.push("/calendario")}
        >
          <View style={styles.calendarShortcutIcon}>
            <MaterialCommunityIcons
              name="calendar-clock-outline"
              size={23}
              color="#0F9D92"
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.calendarShortcutTitle}>Ver calendário</Text>
            <Text style={styles.calendarShortcutText}>
              Consulte todos os eventos de saúde por data.
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color="#0F9D92" />
        </Pressable>

        <View style={styles.searchCard}>
          <View style={styles.searchSortRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={20} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar histórico..."
                placeholderTextColor="#94A3B8"
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.sortButton,
                pressed && styles.whiteButtonPressed,
              ]}
              onPress={() =>
                setSortOrder((prev) =>
                  prev === "recent" ? "oldest" : "recent",
                )
              }
            >
              <Text style={styles.sortButtonText}>
                {sortOrder === "recent" ? "Mais Recente" : "Mais Antigo"}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#64748B" />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="large" color="#0F9D92" />
            </View>
          ) : visibleRecords.length === 0 ? (
            <View style={styles.emptyWrapper}>
              <Text style={styles.emptyTitle}>Sem registos de saúde</Text>
              <Text style={styles.emptyText}>
                Ainda não existem registos para este animal ou filtro.
              </Text>
            </View>
          ) : (
            visibleRecords.map((record) => {
              const isDone =
                (record.estado ?? "").toLowerCase() === "concluído";

              return (
                <View key={record.id_registo_saude} style={styles.recordCard}>
                  <View
                    style={[
                      styles.recordIconBox,
                      getIconBoxStyle(record.tipo_registo),
                    ]}
                  >
                    {getRecordIcon(record.tipo_registo)}
                  </View>

                  <View style={styles.recordContent}>
                    <View style={styles.recordTopRow}>
                      <Text style={styles.recordTitle}>{record.titulo}</Text>

                      <View
                        style={[
                          styles.statusBadge,
                          isDone
                            ? styles.statusBadgeDone
                            : styles.statusBadgePending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            isDone
                              ? styles.statusTextDone
                              : styles.statusTextPending,
                          ]}
                        >
                          {record.estado ?? "Pendente"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.recordMetaRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color="#94A3B8"
                      />
                      <Text style={styles.recordMetaText}>
                        {formatDate(record.proxima_data || record.data_registo)}{" "}
                        • {getAnimalName(record.id_animal)}
                      </Text>
                    </View>

                    <View style={styles.recordMetaRow}>
                      <Ionicons name="time-outline" size={16} color="#94A3B8" />
                      <Text style={styles.recordMetaText}>
                        {formatTime(record.hora_registo)}
                      </Text>
                    </View>

                    <Text style={styles.recordDescription}>
                      {[record.veterinario, record.local]
                        .filter(Boolean)
                        .join(" | ") || "--"}
                    </Text>

                    <View style={styles.cardActionRow}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.detailsButton,
                          pressed && styles.whiteButtonPressed,
                        ]}
                        onPress={() => {
                          setSelectedRecord(record);
                          setShowDetailsModal(true);
                        }}
                      >
                        <Text style={styles.detailsButtonText}>
                          Ver Detalhes
                        </Text>
                      </Pressable>

                      <Pressable
                        style={({ pressed }) => [
                          styles.editSmallButton,
                          pressed && styles.editButtonPressed,
                        ]}
                        onPress={() => handleOpenEdit(record)}
                      >
                        <Feather name="edit-2" size={15} color="#475569" />
                      </Pressable>

                      {!isDone && (
                        <Pressable
                          style={({ pressed }) => [
                            styles.completeSmallButton,
                            pressed && styles.completeButtonPressed,
                          ]}
                          onPress={() => handleCompleteRecord(record)}
                        >
                          <Feather name="check" size={17} color="#0F9D92" />
                        </Pressable>
                      )}

                      <Pressable
                        style={({ pressed }) => [
                          styles.deleteSmallButton,
                          pressed && styles.deleteButtonPressed,
                        ]}
                        onPress={() => handleDeleteRecord(record)}
                      >
                        <Feather name="trash-2" size={15} color="#DC2626" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {visibleCount < filteredRecords.length && (
            <Pressable
              style={styles.loadMoreButton}
              onPress={() => setVisibleCount((prev) => prev + 5)}
            >
              <Text style={styles.loadMoreText}>Carregar mais registos</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <Modal visible={showDetailsModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.detailsModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes do Registo</Text>
              <Pressable onPress={() => setShowDetailsModal(false)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </Pressable>
            </View>

            {selectedRecord && (
              <>
                <Text style={styles.detailTitle}>{selectedRecord.titulo}</Text>

                <Text style={styles.detailLine}>
                  <Text style={styles.detailLabel}>Animal: </Text>
                  {getAnimalName(selectedRecord.id_animal)}
                </Text>
                <Text style={styles.detailLine}>
                  <Text style={styles.detailLabel}>Tipo: </Text>
                  {normalizeTypeLabel(selectedRecord.tipo_registo)}
                </Text>
                <Text style={styles.detailLine}>
                  <Text style={styles.detailLabel}>Data do registo: </Text>
                  {formatDate(selectedRecord.data_registo)}
                </Text>
                <Text style={styles.detailLine}>
                  <Text style={styles.detailLabel}>Data da marcação: </Text>
                  {formatDate(selectedRecord.proxima_data)}
                </Text>
                <Text style={styles.detailLine}>
                  <Text style={styles.detailLabel}>Hora: </Text>
                  {formatTime(selectedRecord.hora_registo)}
                </Text>
                <Text style={styles.detailLine}>
                  <Text style={styles.detailLabel}>Veterinário: </Text>
                  {selectedRecord.veterinario || "--"}
                </Text>
                <Text style={styles.detailLine}>
                  <Text style={styles.detailLabel}>Local: </Text>
                  {selectedRecord.local || "--"}
                </Text>
                <Text style={styles.detailLine}>
                  <Text style={styles.detailLabel}>Estado: </Text>
                  {selectedRecord.estado || "--"}
                </Text>
                <Text style={styles.detailLine}>
                  <Text style={styles.detailLabel}>Descrição: </Text>
                  {selectedRecord.descricao || "--"}
                </Text>

                <View style={styles.detailActionsRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.detailEditButton,
                      pressed && styles.editButtonPressed,
                    ]}
                    onPress={() => handleOpenEdit(selectedRecord)}
                  >
                    <Text style={styles.detailEditButtonText}>Editar</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.detailStatusButton,
                      pressed && styles.completeButtonPressed,
                    ]}
                    onPress={() => handleToggleStatus(selectedRecord)}
                  >
                    <Text style={styles.detailStatusButtonText}>
                      {selectedRecord.estado?.toLowerCase() === "pendente"
                        ? "Concluir"
                        : "Marcar Pendente"}
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.detailDeleteButton,
                    pressed && styles.deleteButtonPressed,
                  ]}
                  onPress={() => handleDeleteRecord(selectedRecord)}
                >
                  <Text style={styles.detailDeleteButtonText}>
                    Eliminar Registo
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    maxWidth: 300,
  },

  animalsScroll: { marginBottom: 18 },

  topButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  newRecordButton: {
    width: "63%",
    height: 46,
    backgroundColor: "#0F9D92",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  newRecordButtonText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },

  tabsScroll: { marginBottom: 18 },
  tabButton: {
    paddingHorizontal: 18,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  tabButtonActive: { backgroundColor: "#172554", borderColor: "#172554" },
  tabText: { fontSize: 14, fontWeight: "700", color: "#334155" },
  tabTextActive: { color: "#FFFFFF" },

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  summaryIconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  summaryLabel: { fontSize: 14, color: "#64748B", marginBottom: 6 },
  summaryValue: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  summaryMainText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  summaryDangerText: { fontSize: 15, color: "#E11D48", fontWeight: "700" },

  searchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    marginTop: 8,
  },
  searchSortRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchBox: {
    width: "55%",
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: "#0F172A" },

  sortButton: {
    width: "42%",
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  sortButtonText: { fontSize: 14, fontWeight: "700", color: "#334155" },

  loadingWrapper: { paddingVertical: 40, alignItems: "center" },
  emptyWrapper: {
    paddingVertical: 40,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },

  recordCard: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  recordIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    marginTop: 2,
  },
  recordContent: { flex: 1 },
  recordTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  recordTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginRight: 10,
  },

  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusBadgeDone: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
  statusBadgePending: { backgroundColor: "#FEF3C7", borderColor: "#FCD34D" },
  statusText: { fontSize: 13, fontWeight: "700" },
  statusTextDone: { color: "#15803D" },
  statusTextPending: { color: "#B45309" },

  recordMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  recordMetaText: { marginLeft: 8, fontSize: 14, color: "#64748B" },
  recordDescription: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 24,
    marginBottom: 16,
  },

  cardActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  detailsButton: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  detailsButtonText: { fontSize: 13, fontWeight: "800", color: "#334155" },
  editSmallButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  completeSmallButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BCE7DF",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteSmallButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
  },

  loadMoreButton: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreText: { fontSize: 15, fontWeight: "800", color: "#0F9D92" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.25)",
    justifyContent: "center",
    padding: 18,
  },

  detailsModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },

  detailTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 16,
  },
  detailLine: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 24,
    marginBottom: 8,
  },
  detailLabel: { fontWeight: "800", color: "#0F172A" },

  detailActionsRow: { flexDirection: "row", gap: 8, marginTop: 18 },
  detailEditButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  detailEditButtonText: { color: "#475569", fontSize: 14, fontWeight: "800" },
  detailStatusButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BCE7DF",
    alignItems: "center",
    justifyContent: "center",
  },
  detailStatusButtonText: { color: "#0F9D92", fontSize: 13, fontWeight: "800" },
  detailDeleteButton: {
    marginTop: 10,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
  },
  detailDeleteButtonText: { color: "#DC2626", fontSize: 14, fontWeight: "800" },

  ButtonPressed: {
    backgroundColor: "#15968b",
    transform: [{ scale: 0.99 }],
  },

  whiteButtonPressed: {
    backgroundColor: "#f6f7f7",
    transform: [{ scale: 0.99 }],
  },

  editButtonPressed: {
    backgroundColor: "#f3f4f4",
    transform: [{ scale: 0.99 }],
  },

  deleteButtonPressed: {
    backgroundColor: "#fddbdb",
    transform: [{ scale: 0.99 }],
  },

  completeButtonPressed: {
    backgroundColor: "#d3fae8",
    transform: [{ scale: 0.99 }],
  },

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

  calendarShortcutCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#0F9D92",
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  calendarShortcutIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: "#E8FFF7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  calendarShortcutTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },

  calendarShortcutText: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 19,
  },
});

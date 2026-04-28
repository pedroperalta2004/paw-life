import React, { useEffect, useMemo, useState } from "react";
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
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
  Feather,
  FontAwesome5,
} from "@expo/vector-icons";
import { supabase } from "../src/lib/supabase";

type Animal = {
  id_animal: string;
  nome: string;
  especie: string;
};

type HealthRecord = {
  id_registo_saude: string;
  id_animal: string;
  tipo_registo: string;
  titulo: string;
  descricao: string | null;
  data_registo: string;
  proxima_data: string | null;
  veterinario: string | null;
  ficheiro_url: string | null;
  data_criacao: string;
  estado: string | null;
  local: string | null;
};

const HEALTH_TYPES = [
  "Todos",
  "Vacina",
  "Consulta",
  "Exame",
  "Medicamento",
];

const STATUS_OPTIONS = ["Concluído", "Pendente"];

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
      return <FontAwesome5 name="syringe" size={18} color="#10B981" />;
    case "Consulta":
      return <Ionicons name="calendar-outline" size={20} color="#3B82F6" />;
    case "Exame":
      return <Ionicons name="document-text-outline" size={20} color="#A855F7" />;
    case "Medicamento":
      return <Feather name="paperclip" size={18} color="#D97706" />;
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

export default function SaudeScreen() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedAnimalId, setSelectedAnimalId] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("Todos");
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState<"recent" | "oldest">("recent");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const [formAnimalId, setFormAnimalId] = useState("");
  const [formType, setFormType] = useState("Vacina");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formNextDate, setFormNextDate] = useState("");
  const [formVeterinario, setFormVeterinario] = useState("");
  const [formLocal, setFormLocal] = useState("");
  const [formStatus, setFormStatus] = useState("Concluído");

  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    loadData();
  }, []);

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
        .select("id_animal, nome, especie")
        .eq("id_utilizador", user.id)
        .order("nome", { ascending: true });

      if (animalsError) throw animalsError;

      const { data: recordsData, error: recordsError } = await supabase
        .from("registos_saude")
        .select("*")
        .order("data_registo", { ascending: false });

      if (recordsError) throw recordsError;

      const ownedAnimalIds = new Set((animalsData ?? []).map((a) => a.id_animal));
      const filteredRecords = (recordsData ?? []).filter((r) =>
        ownedAnimalIds.has(r.id_animal)
      );

      setAnimals(animalsData ?? []);
      setRecords(filteredRecords);

      if ((animalsData ?? []).length > 0) {
        setFormAnimalId(animalsData![0].id_animal);
      }
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Não foi possível carregar a área de saúde.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormAnimalId(animals[0]?.id_animal ?? "");
    setFormType("Vacina");
    setFormTitle("");
    setFormDescription("");
    setFormDate("");
    setFormNextDate("");
    setFormVeterinario("");
    setFormLocal("");
    setFormStatus("Concluído");
  };

  const handleOpenCreate = () => {
    if (animals.length === 0) {
      Alert.alert(
        "Sem animais",
        "Primeiro precisa de registar pelo menos um animal."
      );
      return;
    }

    resetForm();
    setShowCreateModal(true);
  };

  const handleSaveRecord = async () => {
    if (!formAnimalId || !formTitle.trim() || !formDate.trim()) {
      Alert.alert(
        "Campos obrigatórios",
        "Preencha o animal, o título e a data do registo."
      );
      return;
    }

    try {
      setSaving(true);

      const { data, error } = await supabase
        .from("registos_saude")
        .insert([
          {
            id_animal: formAnimalId,
            tipo_registo: formType,
            titulo: formTitle.trim(),
            descricao: formDescription.trim() || null,
            data_registo: formDate.trim(),
            proxima_data: formNextDate.trim() || null,
            veterinario: formVeterinario.trim() || null,
            local: formLocal.trim() || null,
            estado: formStatus,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setRecords((prev) => [data, ...prev]);
      setShowCreateModal(false);
      resetForm();

      Alert.alert("Sucesso", "Registo de saúde criado com sucesso.");
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível guardar o registo."
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (selectedAnimalId !== "all") {
      result = result.filter((r) => r.id_animal === selectedAnimalId);
    }

    if (selectedType !== "Todos") {
      result = result.filter(
        (r) => normalizeTypeLabel(r.tipo_registo) === selectedType
      );
    }

    if (searchText.trim()) {
      const term = searchText.toLowerCase();

      result = result.filter((r) => {
        const animalName =
          animals.find((a) => a.id_animal === r.id_animal)?.nome?.toLowerCase() ?? "";

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
      const aDate = new Date(a.data_registo).getTime();
      const bDate = new Date(b.data_registo).getTime();

      return sortOrder === "recent" ? bDate - aDate : aDate - bDate;
    });

    return result;
  }, [records, selectedAnimalId, selectedType, searchText, sortOrder, animals]);

  useEffect(() => {
    setVisibleCount(5);
  }, [selectedAnimalId, selectedType, searchText, sortOrder]);

  const visibleRecords = filteredRecords.slice(0, visibleCount);

  const vaccineRecords = filteredRecords.filter(
    (r) => normalizeTypeLabel(r.tipo_registo) === "Vacina"
  );

  const completedVaccines = vaccineRecords.filter(
    (r) => (r.estado ?? "").toLowerCase() === "concluído"
  ).length;

  const vaccinePercent =
    vaccineRecords.length > 0
      ? Math.round((completedVaccines / vaccineRecords.length) * 100)
      : 0;

  const upcomingRecord = useMemo(() => {
    const futureRecords = filteredRecords
      .filter((r) => r.proxima_data)
      .sort(
        (a, b) =>
          new Date(a.proxima_data as string).getTime() -
          new Date(b.proxima_data as string).getTime()
      );

    return futureRecords[0] ?? null;
  }, [filteredRecords]);

  const lastConsultation = useMemo(() => {
    const consultations = filteredRecords
      .filter((r) => normalizeTypeLabel(r.tipo_registo) === "Consulta")
      .sort(
        (a, b) =>
          new Date(b.data_registo).getTime() - new Date(a.data_registo).getTime()
      );

    return consultations[0] ?? null;
  }, [filteredRecords]);

  const getAnimalName = (id: string) => {
    return animals.find((a) => a.id_animal === id)?.nome ?? "--";
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
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
            style={[
              styles.animalChip,
              selectedAnimalId === "all" && styles.animalChipActive,
            ]}
            onPress={() => setSelectedAnimalId("all")}
          >
            <Text
              style={[
                styles.animalChipText,
                selectedAnimalId === "all" && styles.animalChipTextActive,
              ]}
            >
              Todos
            </Text>
          </Pressable>

          {animals.map((animal) => (
            <Pressable
              key={animal.id_animal}
              style={[
                styles.animalChip,
                selectedAnimalId === animal.id_animal && styles.animalChipActive,
              ]}
              onPress={() => setSelectedAnimalId(animal.id_animal)}
            >
              <Text
                style={[
                  styles.animalChipText,
                  selectedAnimalId === animal.id_animal &&
                    styles.animalChipTextActive,
                ]}
              >
                {animal.nome}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.topButtonsRow}>
          <Pressable
            style={styles.filterButton}
            onPress={() =>
              setSortOrder((prev) => (prev === "recent" ? "oldest" : "recent"))
            }
          >
            <Feather name="filter" size={18} color="#475569" />
            <Text style={styles.filterButtonText}>Filtrar</Text>
          </Pressable>

          <Pressable style={styles.newRecordButton} onPress={handleOpenCreate}>
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

        <View style={styles.summaryCard}>
          <View style={[styles.summaryIconBox, { backgroundColor: "#EAF8F0" }]}>
            <FontAwesome5 name="syringe" size={18} color="#10B981" />
          </View>
          <View>
            <Text style={styles.summaryLabel}>Vacinas em Dia</Text>
            <Text style={styles.summaryValue}>{vaccinePercent}%</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={[styles.summaryIconBox, { backgroundColor: "#FCEAEC" }]}>
            <Ionicons name="alert-circle-outline" size={22} color="#E11D48" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>Próximo Vencimento</Text>
            <Text style={styles.summaryMainText}>
              {upcomingRecord
                ? `${getAnimalName(upcomingRecord.id_animal)} (${upcomingRecord.titulo})`
                : "--"}
            </Text>
            <Text style={styles.summaryDangerText}>
              {upcomingRecord ? formatRelativeDays(upcomingRecord.proxima_data) : "--"}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={[styles.summaryIconBox, { backgroundColor: "#EAF1FE" }]}>
            <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>Última Consulta</Text>
            <Text style={styles.summaryMainText}>
              {lastConsultation ? getAnimalName(lastConsultation.id_animal) : "--"}
            </Text>
            <Text style={styles.summaryDangerTextAlt}>
              {lastConsultation ? formatRelativeDays(lastConsultation.data_registo) : "--"}
            </Text>
          </View>
        </View>

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
              style={styles.sortButton}
              onPress={() =>
                setSortOrder((prev) => (prev === "recent" ? "oldest" : "recent"))
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
            visibleRecords.map((record) => (
              <View key={record.id_registo_saude} style={styles.recordCard}>
                <View style={[styles.recordIconBox, getIconBoxStyle(record.tipo_registo)]}>
                  {getRecordIcon(record.tipo_registo)}
                </View>

                <View style={styles.recordContent}>
                  <View style={styles.recordTopRow}>
                    <Text style={styles.recordTitle}>{record.titulo}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        (record.estado ?? "").toLowerCase() === "pendente"
                          ? styles.statusBadgePending
                          : styles.statusBadgeDone,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          (record.estado ?? "").toLowerCase() === "pendente"
                            ? styles.statusTextPending
                            : styles.statusTextDone,
                        ]}
                      >
                        {record.estado ?? "Concluído"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.recordMetaRow}>
                    <Ionicons name="calendar-outline" size={16} color="#94A3B8" />
                    <Text style={styles.recordMetaText}>
                      {formatDate(record.data_registo)} {getAnimalName(record.id_animal)}
                    </Text>
                  </View>

                  <Text style={styles.recordDescription}>
                    {[record.veterinario, record.local].filter(Boolean).join(" | ") || "--"}
                  </Text>

                  <Pressable
                    style={styles.detailsButton}
                    onPress={() => {
                      setSelectedRecord(record);
                      setShowDetailsModal(true);
                    }}
                  >
                    <Text style={styles.detailsButtonText}>Ver Detalhes</Text>
                  </Pressable>
                </View>
              </View>
            ))
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

      {/* MODAL NOVO REGISTO */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Novo Registo de Saúde</Text>
                <Pressable onPress={() => setShowCreateModal(false)}>
                  <Ionicons name="close" size={22} color="#94A3B8" />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>Animal</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {animals.map((animal) => (
                  <Pressable
                    key={animal.id_animal}
                    style={[
                      styles.optionChip,
                      formAnimalId === animal.id_animal && styles.optionChipActive,
                    ]}
                    onPress={() => setFormAnimalId(animal.id_animal)}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        formAnimalId === animal.id_animal &&
                          styles.optionChipTextActive,
                      ]}
                    >
                      {animal.nome}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Tipo de Registo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {HEALTH_TYPES.filter((t) => t !== "Todos").map((type) => (
                  <Pressable
                    key={type}
                    style={[
                      styles.optionChip,
                      formType === type && styles.optionChipActive,
                    ]}
                    onPress={() => setFormType(type)}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        formType === type && styles.optionChipTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Título</Text>
              <TextInput
                style={styles.input}
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="Ex: Antirrábica Anual"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.fieldLabel}>Descrição</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Detalhes do registo"
                placeholderTextColor="#94A3B8"
                multiline
              />

              <Text style={styles.fieldLabel}>Data do Registo</Text>
              <TextInput
                style={styles.input}
                value={formDate}
                onChangeText={setFormDate}
                placeholder="2026-04-21"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.fieldLabel}>Próxima Data</Text>
              <TextInput
                style={styles.input}
                value={formNextDate}
                onChangeText={setFormNextDate}
                placeholder="2026-10-21"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.fieldLabel}>Veterinário / Médico</Text>
              <TextInput
                style={styles.input}
                value={formVeterinario}
                onChangeText={setFormVeterinario}
                placeholder="Ex: Dra. Juliana Mendes"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.fieldLabel}>Local</Text>
              <TextInput
                style={styles.input}
                value={formLocal}
                onChangeText={setFormLocal}
                placeholder="Ex: Clínica PetVida"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.fieldLabel}>Estado</Text>
              <View style={styles.statusOptionsRow}>
                {STATUS_OPTIONS.map((status) => (
                  <Pressable
                    key={status}
                    style={[
                      styles.optionChip,
                      formStatus === status && styles.optionChipActive,
                    ]}
                    onPress={() => setFormStatus(status)}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        formStatus === status && styles.optionChipTextActive,
                      ]}
                    >
                      {status}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>

                <Pressable
                  style={styles.saveButton}
                  onPress={handleSaveRecord}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Guardar</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL DETALHES */}
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
                  <Text style={styles.detailLabel}>Data: </Text>
                  {formatDate(selectedRecord.data_registo)}
                </Text>
                <Text style={styles.detailLine}>
                  <Text style={styles.detailLabel}>Próxima data: </Text>
                  {formatDate(selectedRecord.proxima_data)}
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
              </>
            )}
          </View>
        </View>
      </Modal>
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

  animalsScroll: {
    marginBottom: 14,
  },

  animalChip: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  animalChipActive: {
    backgroundColor: "#DBF5F1",
    borderColor: "#0F9D92",
  },

  animalChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },

  animalChipTextActive: {
    color: "#0F9D92",
  },

  topButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  filterButton: {
    width: "28%",
    height: 52,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  filterButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
  },

  newRecordButton: {
    width: "68%",
    height: 52,
    backgroundColor: "#0F9D92",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  newRecordButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  tabsScroll: {
    marginBottom: 18,
  },

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

  tabButtonActive: {
    backgroundColor: "#172554",
    borderColor: "#172554",
  },

  tabText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },

  tabTextActive: {
    color: "#FFFFFF",
  },

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

  summaryLabel: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 6,
  },

  summaryValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },

  summaryMainText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },

  summaryDangerText: {
    fontSize: 15,
    color: "#E11D48",
    fontWeight: "700",
  },

  summaryDangerTextAlt: {
    fontSize: 15,
    color: "#E11D48",
    fontWeight: "700",
  },

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
    width: "58%",
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#0F172A",
  },

  sortButton: {
    width: "38%",
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

  sortButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },

  loadingWrapper: {
    paddingVertical: 40,
    alignItems: "center",
  },

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
    marginRight: 16,
    marginTop: 2,
  },

  recordContent: {
    flex: 1,
  },

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
    marginRight: 12,
  },

  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },

  statusBadgeDone: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },

  statusBadgePending: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FCD34D",
  },

  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },

  statusTextDone: {
    color: "#15803D",
  },

  statusTextPending: {
    color: "#B45309",
  },

  recordMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  recordMetaText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#64748B",
  },

  recordDescription: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 24,
    marginBottom: 16,
  },

  detailsButton: {
    alignSelf: "flex-start",
    height: 46,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  detailsButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
  },

  loadMoreButton: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  loadMoreText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F9D92",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.25)",
    justifyContent: "center",
    padding: 18,
  },

  modalCard: {
    maxHeight: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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

  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    marginTop: 10,
  },

  input: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#0F172A",
  },

  textArea: {
    height: 90,
    textAlignVertical: "top",
    paddingTop: 14,
  },

  optionChip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    marginBottom: 6,
  },

  optionChipActive: {
    backgroundColor: "#DBF5F1",
    borderColor: "#0F9D92",
  },

  optionChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },

  optionChipTextActive: {
    color: "#0F9D92",
  },

  statusOptionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
  },

  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  cancelButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
  },

  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#0F9D92",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  saveButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

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

  detailLabel: {
    fontWeight: "800",
    color: "#0F172A",
  },
});
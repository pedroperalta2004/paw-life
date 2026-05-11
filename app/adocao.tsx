import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../src/lib/supabase";

type Association = {
  id_associacao: string;
  nome: string;
  descricao: string | null;
  morada: string | null;
  cidade: string;
  distrito: string | null;
  codigo_postal: string | null;
  telefone: string | null;
  email: string | null;
  website: string | null;
  aprovado: boolean;
  data_criacao: string;
};

export default function AdoptionScreen() {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const hasSearch = searchText.trim().length > 0;

  useEffect(() => {
    loadAssociations();
  }, []);

  const loadAssociations = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("associacoes_adocao")
        .select("*")
        .eq("aprovado", true)
        .order("nome", { ascending: true });

      if (error) throw error;

      setAssociations(data ?? []);
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível carregar as associações."
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAssociations();
    setRefreshing(false);
  };

  const filteredAssociations = useMemo(() => {
    const term = searchText.trim().toLowerCase();

    if (!term) return [];

    return associations.filter((item) => {
      return (
        item.cidade?.toLowerCase().includes(term) ||
        item.distrito?.toLowerCase().includes(term)
      );
    });
  }, [associations, searchText]);

  const handleCall = async (phone: string | null) => {
    if (!phone) {
      Alert.alert("Sem telefone", "Esta associação não tem telefone registado.");
      return;
    }

    await Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = async (email: string | null) => {
    if (!email) {
      Alert.alert("Sem email", "Esta associação não tem email registado.");
      return;
    }

    await Linking.openURL(`mailto:${email}`);
  };

  const handleWebsite = async (url: string | null) => {
    if (!url) {
      Alert.alert("Sem website", "Esta associação não tem website.");
      return;
    }

    let finalUrl = url;

    if (!url.startsWith("http")) {
      finalUrl = `https://${url}`;
    }

    await Linking.openURL(finalUrl);
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
        <Text style={styles.pageTitle}>
          Associações de Adoção{"\n"}Perto de Mim
        </Text>

        <Text style={styles.pageSubtitle}>
          Encontre associações de adoção próximas e dê{"\n"}um lar a um animal
          necessitado.
        </Text>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#94A3B8" />

          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar por cidade ou distrito..."
            placeholderTextColor="#94A3B8"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        <LinearGradient
          colors={["#D7FFF2", "#EEF7FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mapCard}
        >
          <View style={styles.mapIconMain}>
            <Feather name="navigation" size={42} color="#0F9D92" />
          </View>

          <View style={[styles.mapPin, styles.mapPinOne]}>
            <Ionicons name="location-outline" size={20} color="#FFFFFF" />
          </View>

          <View style={[styles.mapPin, styles.mapPinTwo]}>
            <Ionicons name="location-outline" size={20} color="#FFFFFF" />
          </View>

          <View style={[styles.mapPin, styles.mapPinThree]}>
            <Ionicons name="location-outline" size={20} color="#FFFFFF" />
          </View>
        </LinearGradient>

        <Text style={styles.searchHint}>
          {!hasSearch
            ? "Insira a cidade ou distrito para encontrar as associações"
            : `${filteredAssociations.length} associações encontradas`}
        </Text>

        {loading ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color="#0F9D92" />
          </View>
        ) : !hasSearch ? null : filteredAssociations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="heart-outline" size={38} color="#94A3B8" />

            <Text style={styles.emptyTitle}>
              Sem associações encontradas
            </Text>

            <Text style={styles.emptyText}>
              Tente pesquisar por outra cidade ou distrito.
            </Text>
          </View>
        ) : (
          filteredAssociations.map((item) => (
            <View key={item.id_associacao} style={styles.associationCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.associationName}>{item.nome}</Text>

                <View style={styles.ratingBadge}>
                  <Ionicons name="paw" size={14} color="#F59E0B" />
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons
                  name="location-outline"
                  size={16}
                  color="#64748B"
                />

                <Text style={styles.infoText}>
                  {[item.cidade, item.distrito]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="pin-outline" size={16} color="#64748B" />

                <Text style={styles.infoText}>
                  {[item.morada, item.codigo_postal]
                    .filter(Boolean)
                    .join(", ") || "Morada não definida"}
                </Text>
              </View>

              {item.descricao ? (
                <Text style={styles.description}>{item.descricao}</Text>
              ) : null}

              <View style={styles.tagsRow}>
                <View style={styles.availableBox}>
                  <Text style={styles.availableLabel}>Associação</Text>
                  <Text style={styles.availableValue}>Ativa</Text>
                </View>

                <View style={styles.tag}>
                  <Text style={styles.tagText}>Cães</Text>
                </View>

                <View style={styles.tag}>
                  <Text style={styles.tagText}>Gatos</Text>
                </View>
              </View>

              <View style={styles.separator} />

              <View style={styles.buttonsRow}>
                <Pressable
                  style={styles.callButton}
                  onPress={() => handleCall(item.telefone)}
                >
                  <Ionicons
                    name="call-outline"
                    size={15}
                    color="#FFFFFF"
                    style={{ marginRight: 6 }}
                  />

                  <Text style={styles.callButtonText}>Ligar</Text>
                </Pressable>

                <Pressable
                  style={styles.emailButton}
                  onPress={() => handleEmail(item.email)}
                >
                  <Ionicons
                    name="mail-outline"
                    size={15}
                    color="#334155"
                    style={{ marginRight: 6 }}
                  />

                  <Text style={styles.emailButtonText}>Email</Text>
                </Pressable>

                <Pressable
                  style={styles.websiteButton}
                  onPress={() => handleWebsite(item.website)}
                >
                  <Ionicons
                    name="globe-outline"
                    size={15}
                    color="#FFFFFF"
                    style={{ marginRight: 6 }}
                  />

                  <Text style={styles.websiteButtonText}>Site</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={styles.infoIcon}>
              <Ionicons name="heart-outline" size={22} color="#FFFFFF" />
            </View>

            <Text style={styles.infoTitle}>Adotar é um Ato de Amor</Text>
          </View>

          <Text style={styles.infoDescription}>
            Ao adotar um animal, está a dar uma segunda oportunidade e a ganhar
            um companheiro leal. Entre em contacto com as associações para
            conhecer os animais disponíveis e encontrar o seu novo melhor amigo.
          </Text>

          <View style={styles.infoList}>
            <View style={styles.infoItemRow}>
              <View style={styles.dot} />
              <Text style={styles.infoItemText}>Visite as instalações</Text>
            </View>

            <View style={styles.infoItemRow}>
              <View style={styles.dot} />
              <Text style={styles.infoItemText}>Conheça os animais</Text>
            </View>

            <View style={styles.infoItemRow}>
              <View style={styles.dot} />
              <Text style={styles.infoItemText}>
                Adote com responsabilidade
              </Text>
            </View>
          </View>
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
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 32,
    marginBottom: 8,
  },

  pageSubtitle: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
    marginBottom: 22,
  },

  searchBox: {
    height: 50,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#0F172A",
  },

  mapCard: {
    height: 230,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CFF7EA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },

  mapIconMain: {
    marginBottom: 14,
  },

  mapPin: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#0F9D92",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  mapPinOne: {
    top: 76,
    left: 70,
  },

  mapPinTwo: {
    top: 40,
    right: 60,
  },

  mapPinThree: {
    bottom: 42,
    right: 120,
  },

  searchHint: {
    fontSize: 14,
    color: "#0F9D92",
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 22,
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
    padding: 28,
    alignItems: "center",
    marginBottom: 18,
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

  associationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },

  associationName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 26,
    marginRight: 10,
  },

  ratingBadge: {
    height: 32,
    borderRadius: 12,
    backgroundColor: "#FFF7E6",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
  },

  ratingText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#F59E0B",
    marginLeft: 4,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },

  infoText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },

  description: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 20,
    marginTop: 2,
    marginBottom: 14,
  },

  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },

  availableBox: {
    minWidth: 130,
    backgroundColor: "#EAFBF7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 4,
  },

  availableLabel: {
    fontSize: 12,
    color: "#0F9D92",
    fontWeight: "700",
    marginBottom: 4,
  },

  availableValue: {
    fontSize: 18,
    color: "#0F9D92",
    fontWeight: "800",
  },

  tag: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  tagText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
  },

  separator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 18,
  },

  buttonsRow: {
    flexDirection: "row",
    gap: 8,
  },

  callButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#0F9D92",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  callButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  emailButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EEF2F7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  emailButtonText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
  },

  websiteButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#1E2F4F",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  websiteButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  infoCard: {
    backgroundColor: "#E8FFF7",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 18,
    marginTop: 10,
  },

  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0F9D92",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  infoTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },

  infoDescription: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 21,
    marginBottom: 14,
  },

  infoList: {
    gap: 8,
  },

  infoItemRow: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#0F9D92",
    marginRight: 8,
  },

  infoItemText: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "600",
  },
});
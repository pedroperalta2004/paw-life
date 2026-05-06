import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
  Feather,
  FontAwesome5,
} from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "../src/lib/supabase";

type Animal = {
  id_animal: string;
  id_utilizador: string;
  nome: string;
  especie: string;
  raca: string | null;
  idade: number | null;
  peso: number | null;
  genero: string | null;
  tipo_sangue: string | null;
  fotografia_url: string | null;
  data_criacao: string;
};

const BUCKET_NAME = "pet-images";

export default function PetsScreen() {
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [petImage, setPetImage] = useState<string | null>(null);

  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState("Cão");
  const [breed, setBreed] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState("");
  const [weight, setWeight] = useState("");
  const [bloodType, setBloodType] = useState("");

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loadingAnimals, setLoadingAnimals] = useState(true);
  const [savingAnimal, setSavingAnimal] = useState(false);

  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnimals();
  }, []);

  const loadAnimals = async () => {
    try {
      setLoadingAnimals(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setAnimals([]);
        return;
      }

      const { data, error } = await supabase
        .from("animais")
        .select("*")
        .eq("id_utilizador", user.id)
        .order("data_criacao", { ascending: false });

      if (error) throw error;

      setAnimals(data ?? []);
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível carregar os animais."
      );
    } finally {
      setLoadingAnimals(false);
    }
  };

  const resetForm = () => {
    setEditingAnimal(null);
    setPetImage(null);
    setPetName("");
    setSpecies("Cão");
    setBreed("");
    setBirthDate("");
    setSex("");
    setWeight("");
    setBloodType("");
  };

  const openCreateModal = () => {
    resetForm();
    setShowRegisterModal(true);
  };

  const openEditModal = (animal: Animal) => {
    setEditingAnimal(animal);
    setPetImage(animal.fotografia_url || null);
    setPetName(animal.nome || "");
    setSpecies(animal.especie || "Cão");
    setBreed(animal.raca || "");
    setBirthDate(animal.idade !== null ? String(animal.idade) : "");
    setSex(animal.genero || "");
    setWeight(animal.peso !== null ? String(animal.peso) : "");
    setBloodType(animal.tipo_sangue || "");
    setShowRegisterModal(true);
  };

  const pickImageFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permissão necessária",
        "É necessário permitir acesso à galeria."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      setPetImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permissão necessária",
        "É necessário permitir acesso à câmara."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      setPetImage(result.assets[0].uri);
    }
  };

  const openPhotoMenu = () => {
    Alert.alert("Adicionar Foto", "Escolha uma opção", [
      { text: "Tirar Foto", onPress: takePhoto },
      { text: "Escolher da Galeria", onPress: pickImageFromGallery },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const getStoragePathFromPublicUrl = (url: string | null) => {
    if (!url) return null;
    const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
    const index = url.indexOf(marker);
    if (index === -1) return null;
    return url.substring(index + marker.length);
  };

  const uploadPetImage = async (
    imageUri: string,
    userId: string,
    animalId: string
  ) => {
    const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${userId}/${animalId}-${Date.now()}.${fileExt}`;

    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const arrayBuffer = decode(base64);

    const contentType =
      fileExt === "png"
        ? "image/png"
        : fileExt === "webp"
        ? "image/webp"
        : "image/jpeg";

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    return data.publicUrl;
  };

  const deletePetImageFromStorage = async (publicUrl: string | null) => {
    const path = getStoragePathFromPublicUrl(publicUrl);
    if (!path) return;

    const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);
    if (error) {
      console.log("Erro ao apagar imagem da storage:", error.message);
    }
  };

  const handleSave = async () => {
    if (!petName.trim()) {
      Alert.alert("Campo obrigatório", "Introduza o nome do animal.");
      return;
    }

    if (!species.trim()) {
      Alert.alert("Campo obrigatório", "Introduza a espécie do animal.");
      return;
    }

    try {
      setSavingAnimal(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("Não existe utilizador autenticado.");
      }

      const parsedAge =
        birthDate.trim() !== "" && !isNaN(Number(birthDate))
          ? Number(birthDate)
          : null;

      const parsedWeight =
        weight.trim() !== "" && !isNaN(Number(weight))
          ? Number(weight)
          : null;

      if (editingAnimal) {
        let photoUrl = editingAnimal.fotografia_url;

        const pickedNewLocalImage =
          petImage &&
          (petImage.startsWith("file://") || petImage.startsWith("content://"));

        if (pickedNewLocalImage) {
          if (editingAnimal.fotografia_url) {
            await deletePetImageFromStorage(editingAnimal.fotografia_url);
          }
          photoUrl = await uploadPetImage(petImage, user.id, editingAnimal.id_animal);
        }

        const { data, error } = await supabase
          .from("animais")
          .update({
            nome: petName.trim(),
            especie: species.trim(),
            raca: breed.trim() || null,
            idade: parsedAge,
            peso: parsedWeight,
            genero: sex.trim() || null,
            tipo_sangue: bloodType.trim() || null,
            fotografia_url: photoUrl,
          })
          .eq("id_animal", editingAnimal.id_animal)
          .eq("id_utilizador", user.id)
          .select()
          .single();

        if (error) throw error;

        setAnimals((prev) =>
          prev.map((animal) =>
            animal.id_animal === editingAnimal.id_animal ? data : animal
          )
        );

        Alert.alert("Sucesso", "Animal atualizado com sucesso.");
      } else {
        const { data: insertedAnimal, error: insertError } = await supabase
          .from("animais")
          .insert([
            {
              id_utilizador: user.id,
              nome: petName.trim(),
              especie: species.trim(),
              raca: breed.trim() || null,
              idade: parsedAge,
              peso: parsedWeight,
              genero: sex.trim() || null,
              tipo_sangue: bloodType.trim() || null,
              fotografia_url: null,
            },
          ])
          .select()
          .single();

        if (insertError) throw insertError;

        let finalAnimal = insertedAnimal;

        const pickedNewLocalImage =
          petImage &&
          (petImage.startsWith("file://") || petImage.startsWith("content://"));

        if (pickedNewLocalImage) {
          const publicUrl = await uploadPetImage(
            petImage,
            user.id,
            insertedAnimal.id_animal
          );

          const { data: updatedAnimal, error: updatePhotoError } = await supabase
            .from("animais")
            .update({ fotografia_url: publicUrl })
            .eq("id_animal", insertedAnimal.id_animal)
            .eq("id_utilizador", user.id)
            .select()
            .single();

          if (updatePhotoError) throw updatePhotoError;

          finalAnimal = updatedAnimal;
        }

        setAnimals((prev) => [finalAnimal, ...prev]);

        Alert.alert("Sucesso", "Animal registado com sucesso.");
      }

      setShowRegisterModal(false);
      resetForm();
    } catch (error: any) {
      Alert.alert(
        "Erro ao guardar",
        error.message || "Não foi possível guardar o animal."
      );
    } finally {
      setSavingAnimal(false);
    }
  };

  const handleDeleteAnimal = async (animal: Animal) => {
    Alert.alert(
      "Eliminar animal",
      `Tem a certeza que pretende eliminar ${animal.nome}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const {
                data: { user },
                error: userError,
              } = await supabase.auth.getUser();

              if (userError) throw userError;
              if (!user) throw new Error("Utilizador não autenticado.");

              const { error } = await supabase
                .from("animais")
                .delete()
                .eq("id_animal", animal.id_animal)
                .eq("id_utilizador", user.id);

              if (error) throw error;

              if (animal.fotografia_url) {
                await deletePetImageFromStorage(animal.fotografia_url);
              }

              setAnimals((prev) =>
                prev.filter((item) => item.id_animal !== animal.id_animal)
              );

              Alert.alert("Sucesso", "Animal eliminado com sucesso.");
            } catch (error: any) {
              Alert.alert(
                "Erro ao eliminar",
                error.message || "Não foi possível eliminar o animal."
              );
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnimals();
    setRefreshing(false);
  };

  const renderAnimalCard = (animal: Animal) => {
    return (
      <View key={animal.id_animal} style={styles.petCard}>
        <View style={styles.petImageWrapper}>
          {animal.fotografia_url ? (
            <Image
              source={{ uri: animal.fotografia_url }}
              style={styles.petImage}
            />
          ) : (
            <View style={styles.petImagePlaceholder}>
              <Ionicons name="paw-outline" size={48} color="#94A3B8" />
            </View>
          )}

          <View style={styles.petImageOverlay}>
            <View>
              <Text style={styles.petName}>{animal.nome}</Text>
              <Text style={styles.petBreed}>
                {animal.raca ? `${animal.raca} • ` : ""}
                {animal.especie}
              </Text>
            </View>

            <Pressable
              style={styles.editImageButton}
              onPress={() => openEditModal(animal)}
            >
              <Feather name="edit-2" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <MaterialIcons name="cake" size={18} color="#F59E0B" />
            <Text style={styles.infoLabel}>IDADE</Text>
            <Text style={styles.infoValue}>
              {animal.idade !== null ? `${animal.idade} anos` : "--"}
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Feather name="activity" size={18} color="#3B82F6" />
            <Text style={styles.infoLabel}>PESO</Text>
            <Text style={styles.infoValue}>
              {animal.peso !== null ? `${animal.peso} kg` : "--"}
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Ionicons
              name="document-text-outline"
              size={18}
              color="#8B5CF6"
            />
            <Text style={styles.infoLabel}>SEXO</Text>
            <Text style={styles.infoValue}>{animal.genero || "--"}</Text>
          </View>

          <View style={styles.infoBox}>
            <FontAwesome5 name="tint" size={16} color="#EF4444" />
            <Text style={styles.infoLabel}>SANGUE</Text>
            <Text style={styles.infoValue}>{animal.tipo_sangue || "--"}</Text>
          </View>
        </View>

        <View style={styles.bottomStats}>
          <View>
            <Text style={styles.statLabel}>Passeios</Text>
            <Text style={styles.statValue}>--</Text>
          </View>

          <View>
            <Text style={styles.statLabel}>Veterinário</Text>
            <Text style={styles.statValue}>--</Text>
          </View>

          <View>
            <Text style={styles.statLabel}>Vacinas</Text>
            <Text style={[styles.statValue, { color: "#10B981" }]}>--</Text>
          </View>
        </View>

        <View style={styles.cardButtons}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => openEditModal(animal)}
          >
            <Text style={styles.secondaryButtonText}>Editar</Text>
          </Pressable>

          <Pressable
            style={styles.deleteButton}
            onPress={() => handleDeleteAnimal(animal)}
          >
            <Text style={styles.deleteButtonText}>Eliminar</Text>
          </Pressable>
        </View>
      </View>
    );
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
        <Text style={styles.pageTitle}>Os Meus Animais</Text>
        <Text style={styles.pageSubtitle}>
          Faça a gestão dos perfis e informações básicas dos seus animais.
        </Text>

        <Pressable style={styles.registerButton} onPress={openCreateModal}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.registerButtonText}>Registar Novo Animal</Text>
        </Pressable>

        {loadingAnimals ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color="#0F9D92" />
            <Text style={styles.loadingText}>A carregar animais...</Text>
          </View>
        ) : animals.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <Ionicons name="paw-outline" size={42} color="#94A3B8" />
            <Text style={styles.emptyStateTitle}>Ainda não tem animais</Text>
            <Text style={styles.emptyStateText}>
              Registe o seu primeiro animal para começar a gerir toda a
              informação no PawLife.
            </Text>

            <Pressable
              style={styles.emptyStateButton}
              onPress={openCreateModal}
            >
              <Text style={styles.emptyStateButtonText}>
                Registar Primeiro Animal
              </Text>
            </Pressable>
          </View>
        ) : (
          animals.map(renderAnimalCard)
        )}
      </ScrollView>

      <Modal visible={showRegisterModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingAnimal ? "Editar Animal" : "Ficha de Registo"}
                </Text>
                <Pressable
                  onPress={() => {
                    setShowRegisterModal(false);
                    resetForm();
                  }}
                >
                  <Ionicons name="close" size={22} color="#94A3B8" />
                </Pressable>
              </View>

              <View style={styles.modalSeparator} />

              <View style={styles.photoWrapper}>
                <Pressable style={styles.photoCircle} onPress={openPhotoMenu}>
                  {petImage ? (
                    <Image source={{ uri: petImage }} style={styles.photoPreview} />
                  ) : (
                    <Ionicons name="paw-outline" size={38} color="#94A3B8" />
                  )}
                </Pressable>

                <Pressable style={styles.cameraBadge} onPress={openPhotoMenu}>
                  <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
                </Pressable>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Nome do Animal</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Bob, Mel..."
                  placeholderTextColor="#94A3B8"
                  value={petName}
                  onChangeText={setPetName}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Espécie</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Cão, Gato..."
                  placeholderTextColor="#94A3B8"
                  value={species}
                  onChangeText={setSpecies}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Raça</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Labrador, Rafeiro..."
                  placeholderTextColor="#94A3B8"
                  value={breed}
                  onChangeText={setBreed}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Idade Aproximada (anos)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 3"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={birthDate}
                  onChangeText={setBirthDate}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Sexo</Text>
                <View style={styles.radioRow}>
                  <Pressable
                    style={styles.radioOption}
                    onPress={() => setSex("Macho")}
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        sex === "Macho" && styles.radioCircleActive,
                      ]}
                    />
                    <Text style={styles.radioText}>Macho</Text>
                  </Pressable>

                  <Pressable
                    style={styles.radioOption}
                    onPress={() => setSex("Fêmea")}
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        sex === "Fêmea" && styles.radioCircleActive,
                      ]}
                    />
                    <Text style={styles.radioText}>Fêmea</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Peso Atual (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Tipo Sanguíneo (Se souber)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: DEA 1.1+"
                  placeholderTextColor="#94A3B8"
                  value={bloodType}
                  onChangeText={setBloodType}
                />
              </View>

              <View style={styles.modalSeparatorBottom} />

              <View style={styles.modalButtons}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowRegisterModal(false);
                    resetForm();
                  }}
                  disabled={savingAnimal}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>

                <Pressable
                  style={styles.saveButton}
                  onPress={handleSave}
                  disabled={savingAnimal}
                >
                  {savingAnimal ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingAnimal ? "Guardar Alterações" : "Guardar Registo"}
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
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
    maxWidth: 280,
  },

  registerButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#0F9D92",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
    marginBottom: 22,
  },

  registerButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  loadingWrapper: {
    paddingVertical: 50,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },

  emptyStateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 34,
    paddingHorizontal: 22,
    alignItems: "center",
  },

  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 14,
    marginBottom: 8,
  },

  emptyStateText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },

  emptyStateButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: "#0F9D92",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  emptyStateButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  petCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 18,
  },

  petImageWrapper: {
    position: "relative",
    height: 180,
  },

  petImage: {
    width: "100%",
    height: "100%",
  },

  petImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  petImageOverlay: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  petName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  petBreed: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  editImageButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 16,
  },

  infoBox: {
    width: "47.5%",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginBottom: 12,
  },

  infoLabel: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 8,
    marginBottom: 4,
  },

  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },

  bottomStats: {
    marginHorizontal: 18,
    marginTop: 6,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  statLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
    textAlign: "center",
  },

  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },

  cardButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },

  secondaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  secondaryButtonText: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "700",
  },

  deleteButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  deleteButtonText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "700",
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
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },

  modalSeparator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginBottom: 18,
  },

  photoText: {
    marginTop: 8,
    fontSize: 12,
    color: "#94A3B8",
  },

  fieldBlock: {
    marginBottom: 16,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },

  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#0F172A",
  },

  radioRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },

  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#94A3B8",
    marginRight: 8,
  },

  radioCircleActive: {
    borderColor: "#0F9D92",
    backgroundColor: "#0F9D92",
  },

  radioText: {
    fontSize: 14,
    color: "#0F172A",
  },

  modalSeparatorBottom: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 8,
    marginBottom: 18,
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  cancelButtonText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
  },

  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#0F9D92",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  photoWrapper: {
  alignSelf: "center",
  position: "relative",
  marginBottom: 22,
},

photoCircle: {
  width: 120,
  height: 120,
  borderRadius: 60,
  backgroundColor: "#F1F5F9",
  borderWidth: 1,
  borderColor: "#E5E7EB",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
},

photoPreview: {
  width: "100%",
  height: "100%",
},

cameraBadge: {
  position: "absolute",
  bottom: 1,
  right: 4,
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: "#0F9D92",
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 2,
  borderColor: "#FFFFFF",
},
});
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { supabase } from "../src/lib/supabase";
import { DOG_BREEDS, CAT_BREEDS } from "../src/data/racas";

type Animal = {
  id_animal: string;
  id_utilizador: string;
  nome: string;
  especie: string;
  raca: string | null;
  idade: number | null;
  data_nascimento: string | null;
  peso: number | null;
  genero: string | null;
  tipo_sangue: string | null;
  fotografia_url: string | null;
  data_criacao: string;
};

const BUCKET_NAME = "pet-images";

function calculateAge(birthDate: string | null) {
  if (!birthDate) return null;

  const today = new Date();
  const birth = new Date(birthDate);

  if (Number.isNaN(birth.getTime())) return null;

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

export default function AnimalFormScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    mode?: string;
    t?: string;
  }>();

  const animalId =
    params.mode === "create"
      ? null
      : typeof params.id === "string"
        ? params.id
        : null;

  const isEditing = !!animalId;

  const [loading, setLoading] = useState(isEditing);
  const [savingAnimal, setSavingAnimal] = useState(false);

  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
  const [petImage, setPetImage] = useState<string | null>(null);
  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [sex, setSex] = useState("");
  const [weight, setWeight] = useState("");
  const [bloodType, setBloodType] = useState("");

  const [showSpeciesOptions, setShowSpeciesOptions] = useState(false);
  const [showBreedOptions, setShowBreedOptions] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const resetForm = () => {
    setEditingAnimal(null);
    setPetImage(null);
    setPetName("");
    setSpecies("");
    setBreed("");
    setBirthDate("");
    setSex("");
    setWeight("");
    setBloodType("");
    setShowSpeciesOptions(false);
    setShowBreedOptions(false);
  };

  const goToAnimals = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    resetForm();
    router.replace("/animais");
  };

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      setShowSpeciesOptions(false);
      setShowBreedOptions(false);
    }, []),
  );

  const availableBreeds = useMemo(() => {
    if (species === "Cão") return DOG_BREEDS;
    if (species === "Gato") return CAT_BREEDS;
    return [];
  }, [species]);

  useEffect(() => {
    if (animalId) {
      loadAnimal(animalId);
    } else {
      resetForm();
      setLoading(false);
    }
  }, [animalId, params.t]);

  const loadAnimal = async (id: string) => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Utilizador não autenticado.");

      const { data, error } = await supabase
        .from("animais")
        .select("*")
        .eq("id_animal", id)
        .eq("id_utilizador", user.id)
        .single();

      if (error) throw error;

      setEditingAnimal(data);
      setPetImage(data.fotografia_url || null);
      setPetName(data.nome || "");
      setSpecies(data.especie || "");
      setBreed(data.raca || "");
      setBirthDate(data.data_nascimento || "");
      setSex(data.genero || "");
      setWeight(data.peso !== null ? String(data.peso) : "");
      setBloodType(data.tipo_sangue || "");
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível carregar o animal.",
      );
      router.back();
    } finally {
      setLoading(false);
    }
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
    targetAnimalId: string,
  ) => {
    const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${userId}/${targetAnimalId}-${Date.now()}.${fileExt}`;

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

    if (uploadError) throw uploadError;

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

  const pickImageFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permissão necessária",
        "É necessário permitir acesso à galeria.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 9],
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
        "É necessário permitir acesso à câmara.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 9],
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

  const handleSave = async () => {
    if (!petName.trim()) {
      Alert.alert("Campo obrigatório", "Introduza o nome do animal.");
      return;
    }

    if (!species.trim()) {
      Alert.alert("Campo obrigatório", "Selecione a espécie do animal.");
      return;
    }

    try {
      setSavingAnimal(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Não existe utilizador autenticado.");

      const parsedWeight =
        weight.trim() !== "" && !isNaN(Number(weight.replace(",", ".")))
          ? Number(weight.replace(",", "."))
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

          photoUrl = await uploadPetImage(
            petImage,
            user.id,
            editingAnimal.id_animal,
          );
        }

        const { error } = await supabase
          .from("animais")
          .update({
            nome: petName.trim(),
            especie: species.trim(),
            raca: breed.trim() || null,
            data_nascimento: birthDate.trim() || null,
            idade: calculateAge(birthDate.trim()),
            peso: editingAnimal.peso,
            genero: sex.trim() || null,
            tipo_sangue: bloodType.trim() || null,
            fotografia_url: photoUrl,
          })
          .eq("id_animal", editingAnimal.id_animal)
          .eq("id_utilizador", user.id);

        if (error) throw error;

        Alert.alert("Sucesso", "Animal atualizado com sucesso.", [
          { text: "OK", onPress: goToAnimals },
        ]);
      } else {
        const { data: insertedAnimal, error: insertError } = await supabase
          .from("animais")
          .insert([
            {
              id_utilizador: user.id,
              nome: petName.trim(),
              especie: species.trim(),
              raca: breed.trim() || null,
              data_nascimento: birthDate.trim() || null,
              idade: calculateAge(birthDate.trim()),
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
            insertedAnimal.id_animal,
          );

          const { data: updatedAnimal, error: updatePhotoError } =
            await supabase
              .from("animais")
              .update({ fotografia_url: publicUrl })
              .eq("id_animal", insertedAnimal.id_animal)
              .eq("id_utilizador", user.id)
              .select()
              .single();

          if (updatePhotoError) throw updatePhotoError;

          finalAnimal = updatedAnimal;
        }

        if (parsedWeight !== null) {
          const today = new Date().toISOString().split("T")[0];

          await supabase.from("peso_animais").insert([
            {
              id_animal: finalAnimal.id_animal,
              peso: parsedWeight,
              data_registo: today,
            },
          ]);
        }

        Alert.alert("Sucesso", "Animal registado com sucesso.", [
          { text: "OK", onPress: goToAnimals },
        ]);
      }
    } catch (error: any) {
      Alert.alert(
        "Erro ao guardar",
        error.message || "Não foi possível guardar o animal.",
      );
    } finally {
      setSavingAnimal(false);
    }
  };

  const handleDeleteAnimal = async () => {
    if (!editingAnimal) return;

    Alert.alert(
      "Eliminar animal",
      `Tem a certeza que pretende eliminar ${editingAnimal.nome}?`,
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
                .eq("id_animal", editingAnimal.id_animal)
                .eq("id_utilizador", user.id);

              if (error) throw error;

              if (editingAnimal.fotografia_url) {
                await deletePetImageFromStorage(editingAnimal.fotografia_url);
              }

              Alert.alert("Sucesso", "Animal eliminado com sucesso.", [
                { text: "OK", onPress: goToAnimals },
              ]);
            } catch (error: any) {
              Alert.alert(
                "Erro ao eliminar",
                error.message || "Não foi possível eliminar o animal.",
              );
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingWrapper}>
        <ActivityIndicator size="large" color="#0F9D92" />
        <Text style={styles.loadingText}>A carregar animal...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>
              {isEditing ? "Editar Animal" : "Ficha de Registo"}
            </Text>
            <Text style={styles.pageSubtitle}>
              {isEditing
                ? "Atualize a informação básica do animal."
                : "Preencha os dados principais do novo animal."}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.closePageButton,
              pressed && styles.whiteButtonPressed,
            ]}
            onPress={goToAnimals}
          >
            <Ionicons name="close" size={22} color="#334155" />
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.photoWrapper}>
            <Pressable style={styles.photoPreviewBox} onPress={openPhotoMenu}>
              {petImage ? (
                <Image source={{ uri: petImage }} style={styles.photoPreview} />
              ) : (
                <>
                  <Ionicons name="paw-outline" size={42} color="#94A3B8" />
                  <Text style={styles.photoText}>Adicionar foto do animal</Text>
                </>
              )}

              <View style={styles.cameraBadge}>
                <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
              </View>
            </Pressable>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Nome do Animal</Text>
            <TextInput
              style={styles.input}
              placeholder="Introduza o nome do animal"
              placeholderTextColor="#94A3B8"
              value={petName}
              onChangeText={setPetName}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Espécie</Text>
            <Pressable
              style={styles.dropdownInput}
              onPress={() => {
                setShowSpeciesOptions((prev) => !prev);
                setShowBreedOptions(false);
              }}
            >
              <Text
                style={
                  species ? styles.dropdownText : styles.dropdownPlaceholder
                }
              >
                {species || "Selecionar espécie"}
              </Text>
              <Ionicons
                name={showSpeciesOptions ? "chevron-up" : "chevron-down"}
                size={18}
                color="#64748B"
              />
            </Pressable>

            {showSpeciesOptions ? (
              <View style={styles.dropdownList}>
                {["Cão", "Gato"].map((item) => (
                  <Pressable
                    key={item}
                    style={[
                      styles.dropdownOption,
                      species === item && styles.dropdownOptionSelected,
                    ]}
                    onPress={() => {
                      setSpecies(item);
                      setBreed("");
                      setShowSpeciesOptions(false);
                    }}
                  >
                    <Text style={styles.dropdownOptionText}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Raça</Text>
            <Pressable
              style={[
                styles.dropdownInput,
                !species && styles.dropdownInputDisabled,
              ]}
              onPress={() => {
                if (!species) {
                  Alert.alert(
                    "Espécie em falta",
                    "Selecione primeiro se é cão ou gato.",
                  );
                  return;
                }

                setShowBreedOptions((prev) => !prev);
                setShowSpeciesOptions(false);
              }}
            >
              <Text
                style={breed ? styles.dropdownText : styles.dropdownPlaceholder}
              >
                {breed || "Selecionar raça"}
              </Text>
              <Ionicons
                name={showBreedOptions ? "chevron-up" : "chevron-down"}
                size={18}
                color="#64748B"
              />
            </Pressable>

            {showBreedOptions ? (
              <View style={styles.dropdownListLarge}>
                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                >
                  {availableBreeds.map((item) => (
                    <Pressable
                      key={item}
                      style={[
                        styles.dropdownOption,
                        breed === item && styles.dropdownOptionSelected,
                      ]}
                      onPress={() => {
                        setBreed(item);
                        setShowBreedOptions(false);
                      }}
                    >
                      <Text style={styles.dropdownOptionText}>{item}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Data de nascimento aproximada</Text>
            <Pressable
              style={styles.dateInput}
              onPress={() => setShowBirthDatePicker(true)}
            >
              <Text
                style={birthDate ? styles.dateText : styles.datePlaceholder}
              >
                {birthDate || "Selecionar data"}
              </Text>

              <Ionicons name="calendar-outline" size={18} color="#64748B" />
            </Pressable>

            {showBirthDatePicker && (
              <DateTimePicker
                value={birthDate ? new Date(birthDate) : new Date()}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowBirthDatePicker(false);

                  if (selectedDate) {
                    setBirthDate(selectedDate.toISOString().split("T")[0]);
                  }
                }}
              />
            )}
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

          {!isEditing ? (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Peso Atual (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="Introduza o peso atual do animal"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={setWeight}
              />
            </View>
          ) : null}

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Tipo Sanguíneo (Se souber)</Text>
            <TextInput
              style={styles.input}
              placeholder="Introduza o tipo sanguíneo"
              placeholderTextColor="#94A3B8"
              value={bloodType}
              onChangeText={setBloodType}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.buttonsRow}>
            {isEditing ? (
              <Pressable
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && styles.deleteButtonPressed,
                ]}
                onPress={handleDeleteAnimal}
                disabled={savingAnimal}
              >
                <Feather name="trash-2" size={16} color="#DC2626" />
              </Pressable>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.whiteButtonPressed,
              ]}
              onPress={goToAnimals}
              disabled={savingAnimal}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.greenButtonPressed,
              ]}
              onPress={handleSave}
              disabled={savingAnimal}
            >
              {savingAnimal ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {isEditing ? "Guardar Alterações" : "Guardar Registo"}
                </Text>
              )}
            </Pressable>
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

  loadingWrapper: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
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
    maxWidth: 280,
  },

  closePageButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  photoWrapper: {
    width: "100%",
    marginBottom: 22,
  },

  photoPreviewBox: {
    width: "100%",
    height: 180,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },

  photoPreview: {
    width: "100%",
    height: "100%",
  },

  photoText: {
    marginTop: 8,
    fontSize: 12,
    color: "#94A3B8",
  },

  cameraBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#0F9D92",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
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

  dropdownInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  dropdownInputDisabled: {
    opacity: 0.65,
  },

  dropdownText: {
    fontSize: 14,
    color: "#0F172A",
  },

  dropdownPlaceholder: {
    fontSize: 14,
    color: "#94A3B8",
  },

  dropdownList: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },

  dropdownListLarge: {
    maxHeight: 230,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },

  dropdownOption: {
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  dropdownOptionText: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "600",
  },

  dateInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  dateText: {
    fontSize: 14,
    color: "#0F172A",
  },

  datePlaceholder: {
    fontSize: 14,
    color: "#94A3B8",
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

  separator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 8,
    marginBottom: 18,
  },

  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  deleteButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
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
  },

  cancelButtonText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
  },

  saveButton: {
    flex: 1.25,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#0F9D92",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  greenButtonPressed: {
    backgroundColor: "#15968b",
    transform: [{ scale: 0.99 }],
  },

  whiteButtonPressed: {
    backgroundColor: "#f1f1f1",
    transform: [{ scale: 0.99 }],
  },

  deleteButtonPressed: {
    backgroundColor: "#fddbdb",
    transform: [{ scale: 0.99 }],
  },

  dropdownOptionSelected: {
    backgroundColor: "#DBF5F1",
  },
});

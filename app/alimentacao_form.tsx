import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { supabase } from "../src/lib/supabase";

const BUCKET_NAME = "food-images";

type Animal = {
  id_animal: string;
  nome: string;
  fotografia_url: string | null;
};

type FoodPlan = {
  id_alimentacao: string;
  id_animal: string;
  nome_racao: string;
  stock_atual: number;
  stock_total: number;
  porcao_diaria: number;
  link_compra: string | null;
  foto_url: string | null;
  data_criacao: string;
};

export default function AlimentacaoFormScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    mode?: string;
    t?: string;
  }>();

  const foodId =
    params.mode === "create"
      ? null
      : typeof params.id === "string"
        ? params.id
        : null;

  const isEditing = !!foodId;

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [editingFood, setEditingFood] = useState<FoodPlan | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formAnimalId, setFormAnimalId] = useState("");
  const [formFoodName, setFormFoodName] = useState("");
  const [formStockAtual, setFormStockAtual] = useState("");
  const [formStockTotal, setFormStockTotal] = useState("");
  const [formPorcaoDiaria, setFormPorcaoDiaria] = useState("");
  const [formLinkCompra, setFormLinkCompra] = useState("");
  const [formFoodImage, setFormFoodImage] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  const resetForm = () => {
    setEditingFood(null);
    setFormAnimalId("");
    setFormFoodName("");
    setFormStockAtual("");
    setFormStockTotal("");
    setFormPorcaoDiaria("");
    setFormLinkCompra("");
    setFormFoodImage(null);
  };

  const goToFood = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    resetForm();
    router.replace("/alimentacao");
  };

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  useEffect(() => {
    loadInitialData();
  }, [foodId, params.t]);

  const loadInitialData = async () => {
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
        .select("id_animal, nome, fotografia_url")
        .eq("id_utilizador", user.id)
        .order("nome", { ascending: true });

      if (animalsError) throw animalsError;

      const userAnimals = animalsData ?? [];
      setAnimals(userAnimals);

      if (userAnimals.length === 0) {
        Alert.alert(
          "Sem animais",
          "Primeiro precisa de registar pelo menos um animal.",
          [{ text: "OK", onPress: goToFood }],
        );
        return;
      }

      if (foodId) {
        const animalIds = userAnimals.map((animal) => animal.id_animal);

        const { data: foodData, error: foodError } = await supabase
          .from("alimentacao")
          .select("*")
          .eq("id_alimentacao", foodId)
          .in("id_animal", animalIds)
          .single();

        if (foodError) throw foodError;

        setEditingFood(foodData);
        setFormAnimalId(foodData.id_animal);
        setFormFoodName(foodData.nome_racao ?? "");
        setFormStockAtual(String(foodData.stock_atual ?? ""));
        setFormStockTotal(String(foodData.stock_total ?? ""));
        setFormPorcaoDiaria(String(foodData.porcao_diaria ?? ""));
        setFormLinkCompra(foodData.link_compra ?? "");
        setFormFoodImage(foodData.foto_url ?? null);
      } else {
        resetForm();
        setFormAnimalId(userAnimals[0]?.id_animal ?? "");
      }
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível carregar o plano de alimentação.",
      );
      router.replace("/alimentacao");
    } finally {
      setLoading(false);
    }
  };

  const validateUrl = (url: string) => {
    if (!url.trim()) return null;

    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url.trim();
    }

    return `https://${url.trim()}`;
  };

  const getStoragePathFromPublicUrl = (url: string | null) => {
    if (!url) return null;

    const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
    const index = url.indexOf(marker);

    if (index === -1) return null;

    return url.substring(index + marker.length);
  };

  const deleteFoodImageFromStorage = async (publicUrl: string | null) => {
    const path = getStoragePathFromPublicUrl(publicUrl);
    if (!path) return;

    const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

    if (error) {
      console.log("Erro ao apagar imagem da ração:", error.message);
    }
  };

  const uploadFoodImage = async (
    imageUri: string,
    userId: string,
    targetFoodId: string,
  ) => {
    const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${userId}/${targetFoodId}-${Date.now()}.${fileExt}`;

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
      aspect: [4, 3],
    });

    if (!result.canceled) {
      setFormFoodImage(result.assets[0].uri);
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
      aspect: [4, 3],
    });

    if (!result.canceled) {
      setFormFoodImage(result.assets[0].uri);
    }
  };

  const openPhotoMenu = () => {
    Alert.alert("Foto da Ração", "Escolha uma opção", [
      { text: "Tirar Foto", onPress: takePhoto },
      { text: "Escolher da Galeria", onPress: pickImageFromGallery },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const handleSaveFood = async () => {
    if (
      !formAnimalId ||
      !formFoodName.trim() ||
      !formStockAtual.trim() ||
      !formStockTotal.trim() ||
      !formPorcaoDiaria.trim()
    ) {
      Alert.alert(
        "Campos obrigatórios",
        "Preencha o animal, nome da ração, stock atual, stock total e porção diária.",
      );
      return;
    }

    const stockAtual = Number(formStockAtual.replace(",", "."));
    const stockTotal = Number(formStockTotal.replace(",", "."));
    const porcaoDiaria = Number(formPorcaoDiaria.replace(",", "."));

    if (
      Number.isNaN(stockAtual) ||
      Number.isNaN(stockTotal) ||
      Number.isNaN(porcaoDiaria)
    ) {
      Alert.alert(
        "Valores inválidos",
        "Os campos numéricos devem conter números.",
      );
      return;
    }

    if (stockAtual < 0 || stockTotal <= 0 || porcaoDiaria <= 0) {
      Alert.alert(
        "Valores inválidos",
        "O stock total e a porção diária devem ser superiores a 0.",
      );
      return;
    }

    if (stockTotal < stockAtual) {
      Alert.alert(
        "Stock inválido",
        "O stock total não pode ser inferior ao stock atual.",
      );
      return;
    }

    try {
      setSaving(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Utilizador não autenticado.");

      const pickedNewLocalImage =
        formFoodImage &&
        (formFoodImage.startsWith("file://") ||
          formFoodImage.startsWith("content://"));

      const basePayload = {
        id_animal: formAnimalId,
        nome_racao: formFoodName.trim(),
        stock_atual: stockAtual,
        stock_total: stockTotal,
        porcao_diaria: porcaoDiaria,
        link_compra: validateUrl(formLinkCompra),
      };

      if (foodId && editingFood) {
        let finalPhotoUrl = editingFood.foto_url;

        if (pickedNewLocalImage) {
          if (editingFood.foto_url) {
            await deleteFoodImageFromStorage(editingFood.foto_url);
          }

          finalPhotoUrl = await uploadFoodImage(
            formFoodImage,
            user.id,
            editingFood.id_alimentacao,
          );
        }

        const { error } = await supabase
          .from("alimentacao")
          .update({
            ...basePayload,
            foto_url: finalPhotoUrl,
          })
          .eq("id_alimentacao", editingFood.id_alimentacao);

        if (error) throw error;

        Alert.alert("Sucesso", "Plano de alimentação atualizado.", [
          { text: "OK", onPress: goToFood },
        ]);
      } else {
        const { data: insertedFood, error: insertError } = await supabase
          .from("alimentacao")
          .insert([
            {
              ...basePayload,
              foto_url: null,
            },
          ])
          .select()
          .single();

        if (insertError) throw insertError;

        if (pickedNewLocalImage) {
          const publicUrl = await uploadFoodImage(
            formFoodImage,
            user.id,
            insertedFood.id_alimentacao,
          );

          const { error: updatePhotoError } = await supabase
            .from("alimentacao")
            .update({ foto_url: publicUrl })
            .eq("id_alimentacao", insertedFood.id_alimentacao);

          if (updatePhotoError) throw updatePhotoError;
        }

        Alert.alert("Sucesso", "Plano de alimentação criado.", [
          { text: "OK", onPress: goToFood },
        ]);
      }
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Não foi possível guardar o plano.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingWrapper}>
        <ActivityIndicator size="large" color="#0F9D92" />
        <Text style={styles.loadingText}>A carregar plano...</Text>
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
              {isEditing ? "Editar Plano" : "Novo Saco de Ração"}
            </Text>
            <Text style={styles.pageSubtitle}>
              {isEditing
                ? "Atualize os dados do plano de alimentação."
                : "Preencha os dados principais do saco de ração."}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.closePageButton,
              pressed && styles.whiteButtonPressed,
            ]}
            onPress={goToFood}
          >
            <Ionicons name="close" size={22} color="#334155" />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Foto da Ração</Text>

          <Pressable style={styles.photoPicker} onPress={openPhotoMenu}>
            {formFoodImage ? (
              <Image
                source={{ uri: formFoodImage }}
                style={styles.photoPreview}
                resizeMode="cover"
              />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="package-variant-closed"
                  size={34}
                  color="#94A3B8"
                />
                <Text style={styles.photoPickerText}>
                  Adicionar foto do saco
                </Text>
              </>
            )}

            <View style={styles.photoCameraBadge}>
              <Ionicons name="camera-outline" size={15} color="#FFFFFF" />
            </View>
          </Pressable>

          <Text style={styles.fieldLabel}>Animal</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {animals.map((animal) => (
              <Pressable
                key={animal.id_animal}
                style={styles.animalAvatarWrapper}
                onPress={() => setFormAnimalId(animal.id_animal)}
              >
                <View
                  style={[
                    styles.animalAvatar,
                    formAnimalId === animal.id_animal &&
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
                    formAnimalId === animal.id_animal &&
                      styles.animalAvatarNameActive,
                  ]}
                  numberOfLines={1}
                >
                  {animal.nome}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.fieldLabel}>Nome da Ração</Text>
          <TextInput
            style={styles.input}
            value={formFoodName}
            onChangeText={setFormFoodName}
            placeholder="Introduza o nome da ração"
            placeholderTextColor="#94A3B8"
          />

          <Text style={styles.fieldLabel}>Stock Atual (kg)</Text>
          <TextInput
            style={styles.input}
            value={formStockAtual}
            onChangeText={setFormStockAtual}
            placeholder="Introduza o stock atual"
            placeholderTextColor="#94A3B8"
            keyboardType="decimal-pad"
          />

          <Text style={styles.fieldLabel}>Stock Total do Saco (kg)</Text>
          <TextInput
            style={styles.input}
            value={formStockTotal}
            onChangeText={setFormStockTotal}
            placeholder="Introduza o stock total do saco"
            placeholderTextColor="#94A3B8"
            keyboardType="decimal-pad"
          />

          <Text style={styles.fieldLabel}>Porção Diária (g)</Text>
          <TextInput
            style={styles.input}
            value={formPorcaoDiaria}
            onChangeText={setFormPorcaoDiaria}
            placeholder="Introduza a porção diária"
            placeholderTextColor="#94A3B8"
            keyboardType="decimal-pad"
          />

          <Text style={styles.fieldLabel}>Link de Compra</Text>
          <TextInput
            style={styles.input}
            value={formLinkCompra}
            onChangeText={setFormLinkCompra}
            placeholder="Introduza o link de compra"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            keyboardType="url"
          />

          <View style={styles.separator} />

          <View style={styles.buttonsRow}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.whiteButtonPressed,
              ]}
              onPress={goToFood}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.greenButtonPressed,
              ]}
              onPress={handleSaveFood}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {isEditing ? "Guardar" : "Criar"}
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

  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    marginTop: 10,
  },

  photoPicker: {
    height: 190,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
    position: "relative",
  },

  photoPreview: {
    width: "100%",
    height: "100%",
  },

  photoPickerText: {
    marginTop: 8,
    fontSize: 13,
    color: "#64748B",
    fontWeight: "700",
  },

  photoCameraBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0F9D92",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
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

  separator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 22,
    marginBottom: 18,
  },

  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
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
  },

  saveButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  greenButtonPressed: {
    backgroundColor: "#15968b",
    transform: [{ scale: 0.99 }],
  },

  whiteButtonPressed: {
    backgroundColor: "#eff0f0",
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
});

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
import DateTimePicker from "@react-native-community/datetimepicker";

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

type HealthRecord = {
  id_registo_saude: string;
  id_animal: string;
  tipo_registo: string;
  estado: string | null;
  proxima_data: string | null;
};

type WeightRecord = {
  id_peso: string;
  id_animal: string;
  peso: number;
  data_registo: string;
  data_criacao: string;
};

const BUCKET_NAME = "pet-images";

function isVaccineRecord(type: string | null) {
  if (!type) return false;
  return type.toLowerCase().includes("vac");
}

function isPastDate(dateString: string | null) {
  if (!dateString) return false;

  const today = new Date();
  const target = new Date(dateString);

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return target.getTime() < today.getTime();
}

function formatChartDate(dateString: string) {
  const date = new Date(dateString);

  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
  });
}

function formatWeight(value: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  return `${Number(value).toFixed(1)} kg`;
}

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

export default function PetsScreen() {
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showWeightHistoryModal, setShowWeightHistoryModal] = useState(false);

  const [petImage, setPetImage] = useState<string | null>(null);

  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [sex, setSex] = useState("");
  const [weight, setWeight] = useState("");
  const [bloodType, setBloodType] = useState("");

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([]);

  const [loadingAnimals, setLoadingAnimals] = useState(true);
  const [savingAnimal, setSavingAnimal] = useState(false);
  const [savingWeight, setSavingWeight] = useState(false);

  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
  const [selectedWeightAnimal, setSelectedWeightAnimal] =
    useState<Animal | null>(null);
  const [newWeight, setNewWeight] = useState("");

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
        setHealthRecords([]);
        setWeightRecords([]);
        return;
      }

      const { data: animalsData, error: animalsError } = await supabase
        .from("animais")
        .select("*")
        .eq("id_utilizador", user.id)
        .order("data_criacao", { ascending: false });

      if (animalsError) throw animalsError;

      const animalIds = (animalsData ?? []).map((animal) => animal.id_animal);

      let recordsData: HealthRecord[] = [];
      let weightsData: WeightRecord[] = [];

      if (animalIds.length > 0) {
        const { data: healthData, error: healthError } = await supabase
          .from("registos_saude")
          .select(
            "id_registo_saude, id_animal, tipo_registo, estado, proxima_data",
          )
          .in("id_animal", animalIds);

        if (healthError) throw healthError;

        recordsData = healthData ?? [];

        const { data: weightData, error: weightError } = await supabase
          .from("peso_animais")
          .select("*")
          .in("id_animal", animalIds)
          .order("data_registo", { ascending: true });

        if (weightError) throw weightError;

        weightsData = weightData ?? [];
      }

      setAnimals(animalsData ?? []);
      setHealthRecords(recordsData);
      setWeightRecords(weightsData);
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível carregar os animais.",
      );
    } finally {
      setLoadingAnimals(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnimals();
    setRefreshing(false);
  };

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
    setBirthDate(animal.data_nascimento || "");
    setSex(animal.genero || "");
    setWeight(animal.peso !== null ? String(animal.peso) : "");
    setBloodType(animal.tipo_sangue || "");
    setShowRegisterModal(true);
  };

  const openWeightModal = (animal: Animal) => {
    setSelectedWeightAnimal(animal);
    setNewWeight(animal.peso !== null ? String(animal.peso) : "");
    setShowWeightModal(true);
  };

  const openWeightHistoryModal = (animal: Animal) => {
    setSelectedWeightAnimal(animal);
    setShowWeightHistoryModal(true);
  };

  const getAnimalWeights = (animalId: string) => {
    return weightRecords.filter((record) => record.id_animal === animalId);
  };

  const getVaccineStatus = (animalId: string) => {
    const vaccines = healthRecords.filter(
      (record) =>
        record.id_animal === animalId && isVaccineRecord(record.tipo_registo),
    );

    if (vaccines.length === 0) {
      return {
        label: "Sem dados de vacinas",
        color: "#64748B",
        backgroundColor: "#F8FAFC",
        borderColor: "#e5e7eb7e",
        icon: "help-circle-outline" as const,
      };
    }

    const hasPendingOrExpired = vaccines.some((record) => {
      const isPending = (record.estado ?? "").toLowerCase() === "pendente";
      const isExpired = isPastDate(record.proxima_data);

      return isPending || isExpired;
    });

    if (hasPendingOrExpired) {
      return {
        label: "Vacinas por atualizar",
        color: "#E11D48",
        backgroundColor: "#FFF1F2",
        borderColor: "#FECACA",
        icon: "alert-circle-outline" as const,
      };
    }

    return {
      label: "Vacinas em dia",
      color: "#10B981",
      backgroundColor: "#ECFDF5",
      borderColor: "#A7F3D0",
      icon: "checkmark-circle-outline" as const,
    };
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
    animalId: string,
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

  const handleSaveWeight = async () => {
    if (!selectedWeightAnimal) return;

    const parsedWeight = Number(newWeight.replace(",", "."));

    if (Number.isNaN(parsedWeight) || parsedWeight <= 0) {
      Alert.alert("Peso inválido", "Introduza um peso válido.");
      return;
    }

    try {
      setSavingWeight(true);

      const today = new Date().toISOString().split("T")[0];

      const { data: insertedWeight, error: weightError } = await supabase
        .from("peso_animais")
        .insert([
          {
            id_animal: selectedWeightAnimal.id_animal,
            peso: parsedWeight,
            data_registo: today,
          },
        ])
        .select()
        .single();

      if (weightError) throw weightError;

      const { data: updatedAnimal, error: animalError } = await supabase
        .from("animais")
        .update({ peso: parsedWeight })
        .eq("id_animal", selectedWeightAnimal.id_animal)
        .select()
        .single();

      if (animalError) throw animalError;

      setWeightRecords((prev) => [...prev, insertedWeight]);
      setAnimals((prev) =>
        prev.map((animal) =>
          animal.id_animal === selectedWeightAnimal.id_animal
            ? updatedAnimal
            : animal,
        ),
      );

      setShowWeightModal(false);
      setSelectedWeightAnimal(null);
      setNewWeight("");

      Alert.alert("Sucesso", "Peso registado com sucesso.");
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Não foi possível registar o peso.");
    } finally {
      setSavingWeight(false);
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

        const { data, error } = await supabase
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
          .eq("id_utilizador", user.id)
          .select()
          .single();

        if (error) throw error;

        setAnimals((prev) =>
          prev.map((animal) =>
            animal.id_animal === editingAnimal.id_animal ? data : animal,
          ),
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

          const { data: insertedWeight, error: weightError } = await supabase
            .from("peso_animais")
            .insert([
              {
                id_animal: finalAnimal.id_animal,
                peso: parsedWeight,
                data_registo: today,
              },
            ])
            .select()
            .single();

          if (!weightError && insertedWeight) {
            setWeightRecords((prev) => [...prev, insertedWeight]);
          }
        }

        setAnimals((prev) => [finalAnimal, ...prev]);

        Alert.alert("Sucesso", "Animal registado com sucesso.");
      }

      setShowRegisterModal(false);
      resetForm();
    } catch (error: any) {
      Alert.alert(
        "Erro ao guardar",
        error.message || "Não foi possível guardar o animal.",
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
                prev.filter((item) => item.id_animal !== animal.id_animal),
              );

              setWeightRecords((prev) =>
                prev.filter((item) => item.id_animal !== animal.id_animal),
              );

              setShowRegisterModal(false);
              resetForm();

              Alert.alert("Sucesso", "Animal eliminado com sucesso.");
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

  const renderWeightChart = (weights: WeightRecord[]) => {
    const recentWeights = weights.slice(-6);

    if (recentWeights.length === 0) {
      return (
        <View style={styles.emptyChartBox}>
          <Ionicons name="bar-chart-outline" size={30} color="#94A3B8" />
          <Text style={styles.emptyChartText}>
            Sem dados suficientes para gráfico
          </Text>
        </View>
      );
    }

    const values = recentWeights.map((item) => Number(item.peso));
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    return (
      <View style={styles.chartBox}>
        {recentWeights.map((record) => {
          const barHeight = 24 + ((Number(record.peso) - min) / range) * 56;

          return (
            <View key={record.id_peso} style={styles.chartItem}>
              <View style={styles.chartBarWrapper}>
                <View style={[styles.chartBar, { height: barHeight }]} />
              </View>

              <Text style={styles.chartWeightLabel}>
                {Number(record.peso).toFixed(1)}
              </Text>
              <Text style={styles.chartDateLabel}>
                {formatChartDate(record.data_registo)}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderWeightHistoryList = (weights: WeightRecord[]) => {
    const reversedWeights = weights.slice().reverse();

    return reversedWeights.map((record, index) => {
      const previousRecord = reversedWeights[index + 1];
      const difference = previousRecord
        ? Number(record.peso) - Number(previousRecord.peso)
        : null;
      const isCurrent = index === 0;

      let variationText = "--";
      let variationColor = "#64748B";
      let variationIcon: keyof typeof Ionicons.glyphMap = "remove-outline";

      if (difference !== null) {
        if (Math.abs(difference) < 0.05) {
          variationText = "0.0 kg";
        } else if (difference > 0) {
          variationText = `+${difference.toFixed(1)} kg`;
          variationColor = "#0F9D92";
          variationIcon = "arrow-up-outline";
        } else {
          variationText = `${difference.toFixed(1)} kg`;
          variationColor = "#E11D48";
          variationIcon = "arrow-down-outline";
        }
      }

      return (
        <View key={record.id_peso} style={styles.weightHistoryCard}>
          <View style={styles.weightHistoryDateBox}>
            <Ionicons name="calendar-outline" size={17} color="#0F9D92" />
            <Text style={styles.weightHistoryDate}>
              {formatChartDate(record.data_registo)}
            </Text>
          </View>

          <View style={styles.weightHistoryMiddle}>
            <Text style={styles.weightHistoryValue}>
              {formatWeight(record.peso)}
            </Text>
            {isCurrent ? (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Atual</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.weightHistoryVariationBox}>
            <Text
              style={[styles.weightHistoryVariation, { color: variationColor }]}
            >
              {variationText}
            </Text>
            <Ionicons name={variationIcon} size={16} color={variationColor} />
          </View>
        </View>
      );
    });
  };

  const renderAnimalCard = (animal: Animal) => {
    const vaccineStatus = getVaccineStatus(animal.id_animal);

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
              {calculateAge(animal.data_nascimento) !== null
                ? `${calculateAge(animal.data_nascimento)} anos`
                : "--"}
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Feather name="activity" size={18} color="#3B82F6" />
            <Text style={styles.infoLabel}>PESO</Text>
            <Text style={styles.infoValue}>{formatWeight(animal.peso)}</Text>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="document-text-outline" size={18} color="#8B5CF6" />
            <Text style={styles.infoLabel}>SEXO</Text>
            <Text style={styles.infoValue}>{animal.genero || "--"}</Text>
          </View>

          <View style={styles.infoBox}>
            <FontAwesome5 name="tint" size={16} color="#EF4444" />
            <Text style={styles.infoLabel}>SANGUE</Text>
            <Text style={styles.infoValue}>{animal.tipo_sangue || "--"}</Text>
          </View>
        </View>

        <View
          style={[
            styles.vaccineStatusBox,
            {
              backgroundColor: vaccineStatus.backgroundColor,
              borderColor: vaccineStatus.borderColor,
            },
          ]}
        >
          <Ionicons
            name={vaccineStatus.icon}
            size={20}
            color={vaccineStatus.color}
          />
          <Text
            style={[styles.vaccineStatusText, { color: vaccineStatus.color }]}
          >
            {vaccineStatus.label}
          </Text>
        </View>

        <View style={styles.quickButtonsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.quickHistoryButton,
              pressed && styles.quickHistoryButtonPressed,
            ]}
            onPress={() => openWeightHistoryModal(animal)}
          >
            <Feather name="bar-chart-2" size={15} color="#334155" />
            <Text style={styles.quickHistoryButtonText}>Histórico de peso</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.quickWeightButton,
              pressed && styles.quickWeightButtonPressed,
            ]}
            onPress={() => openWeightModal(animal)}
          >
            <Ionicons name="add-circle-outline" size={17} color="#0F9D92" />
            <Text style={styles.quickWeightButtonText}>Registar peso</Text>
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

        <Pressable
          style={({ pressed }) => [
            styles.registerButton,
            pressed && styles.greenButtonPressed,
          ]}
          onPress={openCreateModal}
        >
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
              style={({ pressed }) => [
                styles.emptyStateButton,
                pressed && styles.greenButtonPressed,
              ]}
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
                <Pressable
                  style={styles.photoPreviewBox}
                  onPress={openPhotoMenu}
                >
                  {petImage ? (
                    <Image
                      source={{ uri: petImage }}
                      style={styles.photoPreview}
                    />
                  ) : (
                    <>
                      <Ionicons name="paw-outline" size={42} color="#94A3B8" />
                      <Text style={styles.photoText}>
                        Adicionar foto do animal
                      </Text>
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
                <Text style={styles.fieldLabel}>
                  Data de nascimento aproximada
                </Text>
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

              {!editingAnimal ? (
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>Peso Atual (kg)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                    value={weight}
                    onChangeText={setWeight}
                  />
                </View>
              ) : null}

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>
                  Tipo Sanguíneo (Se souber)
                </Text>
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
                {editingAnimal ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.modalDeleteButton,
                      pressed && styles.modalDeleteButtonPressed,
                    ]}
                    onPress={() => handleDeleteAnimal(editingAnimal)}
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
                  onPress={() => {
                    setShowRegisterModal(false);
                    resetForm();
                  }}
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
                      {editingAnimal ? "Guardar Alterações" : "Guardar Registo"}
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showWeightModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.weightModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registar Peso</Text>

              <Pressable
                onPress={() => {
                  setShowWeightModal(false);
                  setSelectedWeightAnimal(null);
                  setNewWeight("");
                }}
              >
                <Ionicons name="close" size={22} color="#94A3B8" />
              </Pressable>
            </View>

            <Text style={styles.weightModalSubtitle}>
              {selectedWeightAnimal?.nome}
            </Text>

            <Text style={styles.fieldLabel}>Novo peso (kg)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 12.4"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              value={newWeight}
              onChangeText={setNewWeight}
            />

            <View style={styles.modalSeparatorBottom} />

            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && styles.whiteButtonPressed,
                ]}
                onPress={() => {
                  setShowWeightModal(false);
                  setSelectedWeightAnimal(null);
                  setNewWeight("");
                }}
                disabled={savingWeight}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.greenButtonPressed,
                ]}
                onPress={handleSaveWeight}
                disabled={savingWeight}
              >
                {savingWeight ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar Peso</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showWeightHistoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.historyModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Histórico de Peso</Text>

              <Pressable
                onPress={() => {
                  setShowWeightHistoryModal(false);
                  setSelectedWeightAnimal(null);
                }}
              >
                <Ionicons name="close" size={22} color="#94A3B8" />
              </Pressable>
            </View>

            <Text style={styles.weightModalSubtitle}>
              {selectedWeightAnimal?.nome}
            </Text>

            {selectedWeightAnimal
              ? renderWeightChart(
                  getAnimalWeights(selectedWeightAnimal.id_animal),
                )
              : null}

            <View style={styles.recordsHeader}>
              <Text style={styles.recordsTitle}>Registos</Text>
              <Text style={styles.recordsHint}>Mais recente primeiro</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedWeightAnimal &&
              getAnimalWeights(selectedWeightAnimal.id_animal).length > 0 ? (
                renderWeightHistoryList(
                  getAnimalWeights(selectedWeightAnimal.id_animal),
                )
              ) : (
                <View style={styles.emptyWeightBox}>
                  <Ionicons
                    name="analytics-outline"
                    size={42}
                    color="#94A3B8"
                  />
                  <Text style={styles.emptyWeightTitle}>
                    Sem histórico de peso
                  </Text>
                  <Text style={styles.emptyWeightText}>
                    Ainda não existem registos de peso para este animal.
                  </Text>
                </View>
              )}
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
    height: 200,
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
    borderColor: "#e5e7eb7e",
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

  vaccineStatusBox: {
    marginHorizontal: 18,
    marginTop: 6,
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  vaccineStatusText: {
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 8,
  },

  quickButtonsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },

  quickHistoryButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  quickHistoryButtonText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800",
  },

  quickWeightButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#ECFEFF",
    borderWidth: 1,
    borderColor: "#99F6E4",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  quickWeightButtonText: {
    color: "#0F766E",
    fontSize: 13,
    fontWeight: "800",
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

  weightModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  historyModalCard: {
    maxHeight: "86%",
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

  modalSeparatorBottom: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 8,
    marginBottom: 18,
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

  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  modalDeleteButton: {
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
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#0F9D92",
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  weightModalSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 18,
  },

  chartBox: {
    height: 150,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 12,
    marginBottom: 16,
    overflow: "hidden",
  },

  chartItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    minWidth: 34,
  },

  chartBarWrapper: {
    height: 86,
    justifyContent: "flex-end",
    alignItems: "center",
    overflow: "hidden",
  },

  chartBar: {
    width: 18,
    maxHeight: 86,
    borderRadius: 999,
    backgroundColor: "#0F9D92",
  },

  chartWeightLabel: {
    fontSize: 10,
    color: "#0F172A",
    fontWeight: "800",
    marginTop: 6,
  },

  chartDateLabel: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },

  emptyChartBox: {
    height: 130,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  emptyChartText: {
    marginTop: 8,
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "700",
  },

  recordsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  recordsTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },

  recordsHint: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },

  weightHistoryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  weightHistoryDateBox: {
    flex: 1.1,
    flexDirection: "row",
    alignItems: "center",
  },

  weightHistoryDate: {
    fontSize: 12,
    color: "#475569",
    marginLeft: 6,
    fontWeight: "600",
  },

  weightHistoryMiddle: {
    flex: 0.9,
    alignItems: "center",
    justifyContent: "center",
  },

  weightHistoryValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },

  currentBadge: {
    marginTop: 4,
    backgroundColor: "#0F9D92",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  currentBadgeText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "800",
  },

  weightHistoryVariationBox: {
    flex: 0.8,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },

  weightHistoryVariation: {
    fontSize: 12,
    fontWeight: "800",
    marginRight: 4,
  },

  emptyWeightBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 34,
  },

  emptyWeightTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 14,
    marginBottom: 8,
  },

  emptyWeightText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
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

  greenButtonPressed: {
    backgroundColor: "#15968b",
    transform: [{ scale: 0.99 }],
  },

  whiteButtonPressed: {
    backgroundColor: "#f1f1f1",
    transform: [{ scale: 0.99 }],
  },

  modalDeleteButtonPressed: {
    backgroundColor: "#fddbdb",
    transform: [{ scale: 0.99 }],
  },

  quickHistoryButtonPressed: {
    backgroundColor: "#f0f0f0",
    transform: [{ scale: 0.99 }],
  },

  quickWeightButtonPressed: {
    backgroundColor: "#dafdff",
    transform: [{ scale: 0.99 }],
  },
});

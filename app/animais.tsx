import React, { useState } from "react";
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
} from "react-native";
import { Ionicons, MaterialIcons, Feather, FontAwesome5 } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

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

  const pickImageFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permissão necessária", "É necessário permitir acesso à galeria.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
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
      Alert.alert("Permissão necessária", "É necessário permitir acesso à câmara.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 1,
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

  const handleSave = () => {
    Alert.alert("Sucesso", "Registo guardado com sucesso.");
    setShowRegisterModal(false);

    // Limpar formulário
    setPetImage(null);
    setPetName("");
    setSpecies("Cão");
    setBreed("");
    setBirthDate("");
    setSex("");
    setWeight("");
    setBloodType("");
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>Os Meus Animais</Text>
        <Text style={styles.pageSubtitle}>
          Faça a gestão dos perfis e informações básicas dos seus animais.
        </Text>

        <Pressable
          style={styles.registerButton}
          onPress={() => setShowRegisterModal(true)}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.registerButtonText}>Registar Novo Animal</Text>
        </Pressable>

        {/* Card Exemplo Animal */}
        <View style={styles.petCard}>
          <View style={styles.petImageWrapper}>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=1200&auto=format&fit=crop",
              }}
              style={styles.petImage}
            />

            <View style={styles.petImageOverlay}>
              <View>
                <Text style={styles.petName}>Max</Text>
                <Text style={styles.petBreed}>Golden Retriever • Cão</Text>
              </View>

              <Pressable style={styles.editImageButton}>
                <Feather name="edit-2" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <MaterialIcons name="cake" size={18} color="#F59E0B" />
              <Text style={styles.infoLabel}>IDADE</Text>
              <Text style={styles.infoValue}>3 anos</Text>
            </View>

            <View style={styles.infoBox}>
              <Feather name="activity" size={18} color="#3B82F6" />
              <Text style={styles.infoLabel}>PESO</Text>
              <Text style={styles.infoValue}>28 kg</Text>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="document-text-outline" size={18} color="#8B5CF6" />
              <Text style={styles.infoLabel}>SEXO</Text>
              <Text style={styles.infoValue}>Macho</Text>
            </View>

            <View style={styles.infoBox}>
              <FontAwesome5 name="tint" size={16} color="#EF4444" />
              <Text style={styles.infoLabel}>SANGUE</Text>
              <Text style={styles.infoValue}>DEA 1.1+</Text>
            </View>
          </View>

          <View style={styles.bottomStats}>
            <View>
              <Text style={styles.statLabel}>Passeios</Text>
              <Text style={styles.statValue}>15/mês</Text>
            </View>

            <View>
              <Text style={styles.statLabel}>Veterinário</Text>
              <Text style={styles.statValue}>2x/ano</Text>
            </View>

            <View>
              <Text style={styles.statLabel}>Vacinas</Text>
              <Text style={[styles.statValue, { color: "#10B981" }]}>Em dia</Text>
            </View>
          </View>

          <View style={styles.cardButtons}>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Ver Histórico</Text>
            </Pressable>

            <Pressable style={styles.primarySoftButton}>
              <Text style={styles.primarySoftButtonText}>Registar Peso</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Modal Registo */}
      <Modal visible={showRegisterModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Ficha de Registo</Text>
                <Pressable onPress={() => setShowRegisterModal(false)}>
                  <Ionicons name="close" size={22} color="#94A3B8" />
                </Pressable>
              </View>

              <View style={styles.modalSeparator} />

              <Pressable style={styles.photoCircle} onPress={openPhotoMenu}>
                {petImage ? (
                  <Image source={{ uri: petImage }} style={styles.photoPreview} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={28} color="#94A3B8" />
                    <Text style={styles.photoText}>Adicionar Foto</Text>
                  </>
                )}
              </Pressable>

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
                <View style={styles.selectBox}>
                  <Text style={styles.selectText}>{species}</Text>
                  <Ionicons name="chevron-down" size={18} color="#64748B" />
                </View>
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
                <Text style={styles.fieldLabel}>Data de Nascimento (ou Idade Aprox.)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="dd/mm/aaaa"
                  placeholderTextColor="#94A3B8"
                  value={birthDate}
                  onChangeText={setBirthDate}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Sexo</Text>
                <View style={styles.radioRow}>
                  <Pressable style={styles.radioOption} onPress={() => setSex("Macho")}>
                    <View style={[styles.radioCircle, sex === "Macho" && styles.radioCircleActive]} />
                    <Text style={styles.radioText}>Macho</Text>
                  </Pressable>

                  <Pressable style={styles.radioOption} onPress={() => setSex("Fêmea")}>
                    <View style={[styles.radioCircle, sex === "Fêmea" && styles.radioCircleActive]} />
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
                  onPress={() => setShowRegisterModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>

                <Pressable style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>Guardar Registo</Text>
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

  petCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  petImageWrapper: {
    position: "relative",
    height: 180,
  },

  petImage: {
    width: "100%",
    height: "100%",
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

  primarySoftButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BCE7DF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  primarySoftButtonText: {
    color: "#0F9D92",
    fontSize: 14,
    fontWeight: "700",
  },

  /* MODAL */
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

  photoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
    overflow: "hidden",
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

  selectBox: {
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

  selectText: {
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
});
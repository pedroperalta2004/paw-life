import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Pressable,
  Image,
  Alert,
  ScrollView,
  RefreshControl,
  DeviceEventEmitter,
  Modal,
  TextInput,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "../src/lib/supabase";

const BUCKET_NAME = "profile-images";

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

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

function getPublicUrlFromPath(path: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
}

export default function ProfileScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [petCount, setPetCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPasswordConfirm, setEditPasswordConfirm] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditPasswordConfirm, setShowEditPasswordConfirm] = useState(false);

  const photoUrl = useMemo(() => {
    const url = getPublicUrlFromPath(photoPath);
    return url ? `${url}?t=${Date.now()}` : null;
  }, [photoPath]);

  useFocusEffect(
    useCallback(() => {
      setFullName("");
      setEmail("");
      setPhotoPath(null);
      setMemberSince(null);
      setPetCount(0);
      setLoading(true);
      loadProfile();
    }, []),
  );

  const loadProfile = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profileData, error: profileError } = await supabase
        .from("utilizadores")
        .select("nome, email, data_registo, foto_perfil_url")
        .eq("id_utilizador", user.id)
        .single();

      if (profileError) throw profileError;

      const { count, error: countError } = await supabase
        .from("animais")
        .select("*", { count: "exact", head: true })
        .eq("id_utilizador", user.id);

      if (countError) throw countError;

      setFullName(profileData?.nome ?? "");
      setEmail(profileData?.email ?? user.email ?? "");
      setMemberSince(profileData?.data_registo ?? null);
      setPhotoPath(profileData?.foto_perfil_url ?? null);
      setPetCount(count ?? 0);
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível carregar o perfil.",
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const deleteOldProfileImage = async (path: string | null) => {
    if (!path) return;

    let finalPath = path;

    if (path.startsWith("http")) {
      const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
      const index = path.indexOf(marker);

      if (index !== -1) {
        finalPath = path.substring(index + marker.length);
      } else {
        return;
      }
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([finalPath]);

    if (error) console.log("Erro ao remover foto antiga:", error.message);
  };

  const uploadProfilePhoto = async (imageUri: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Utilizador não autenticado.");

    const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${user.id}/profile-${Date.now()}.${fileExt}`;

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

    return filePath;
  };

  const saveProfilePhoto = async (newUri: string) => {
    try {
      setUploadingPhoto(true);

      const uploadedPath = await uploadProfilePhoto(newUri);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Utilizador não autenticado.");

      const oldPhotoPath = photoPath;

      const { error } = await supabase
        .from("utilizadores")
        .update({ foto_perfil_url: uploadedPath })
        .eq("id_utilizador", user.id);

      if (error) throw error;

      setPhotoPath(uploadedPath);

      DeviceEventEmitter.emit("profileUpdated", {
        nome: fullName,
        foto_perfil_url: uploadedPath,
      });

      if (oldPhotoPath) await deleteOldProfileImage(oldPhotoPath);

      Alert.alert("Sucesso", "Foto de perfil atualizada com sucesso.");
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível atualizar a foto.",
      );
    } finally {
      setUploadingPhoto(false);
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
      aspect: [1, 1],
    });

    if (!result.canceled) await saveProfilePhoto(result.assets[0].uri);
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
      aspect: [1, 1],
    });

    if (!result.canceled) await saveProfilePhoto(result.assets[0].uri);
  };

  const openPhotoMenu = () => {
    Alert.alert("Alterar Foto", "Escolha uma opção", [
      { text: "Tirar Foto", onPress: takePhoto },
      { text: "Escolher da Galeria", onPress: pickImageFromGallery },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const openEditProfile = () => {
    setEditName(fullName);
    setEditPassword("");
    setEditPasswordConfirm("");
    setShowEditModal(true);
    setShowEditPassword(false);
    setShowEditPasswordConfirm(false);
  };

  const saveProfileData = async () => {
    if (!editName.trim()) {
      Alert.alert("Campo obrigatório", "O nome não pode estar vazio.");
      return;
    }

    if (editPassword || editPasswordConfirm) {
      if (editPassword.length < 6) {
        Alert.alert(
          "Password inválida",
          "A nova password deve ter pelo menos 6 caracteres.",
        );
        return;
      }

      if (editPassword !== editPasswordConfirm) {
        Alert.alert("Erro", "As passwords não coincidem.");
        return;
      }
    }

    try {
      setSavingProfile(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Utilizador não autenticado.");

      const { error: profileError } = await supabase
        .from("utilizadores")
        .update({ nome: editName.trim() })
        .eq("id_utilizador", user.id);

      if (profileError) throw profileError;

      if (editPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: editPassword,
        });

        if (passwordError) throw passwordError;
      }

      setFullName(editName.trim());

      DeviceEventEmitter.emit("profileUpdated", {
        nome: editName.trim(),
        foto_perfil_url: photoPath,
      });

      setShowEditModal(false);
      Alert.alert("Sucesso", "Perfil atualizado com sucesso.");
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível atualizar o perfil.",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Terminar sessão", "Tem a certeza que pretende sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          try {
            setFullName("");
            setEmail("");
            setPhotoPath(null);
            setMemberSince(null);
            setPetCount(0);

            const { error } = await supabase.auth.signOut();

            if (error) throw error;

            router.replace("/");
          } catch (error: any) {
            Alert.alert(
              "Erro",
              error.message || "Não foi possível terminar sessão.",
            );
          }
        },
      },
    ]);
  };

  const initials = useMemo(() => getInitials(fullName), [fullName]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0F9D92"]}
            tintColor="#0F9D92"
          />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color="#0F9D92" />
        ) : (
          <>
            <Pressable
              style={styles.avatar}
              onPress={openPhotoMenu}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}

              <View style={styles.editBadge}>
                <Ionicons name="camera-outline" size={15} color="#FFFFFF" />
              </View>
            </Pressable>

            <Text style={styles.title}>{fullName || "O Meu Perfil"}</Text>

            <View style={styles.card}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{email || "Sem email"}</Text>

              <View style={styles.separator} />

              <Text style={styles.label}>Animais registados</Text>
              <Text style={styles.value}>{petCount}</Text>

              <View style={styles.separator} />

              <Text style={styles.label}>Membro desde</Text>
              <Text style={styles.value}>{formatDate(memberSince)}</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{petCount}</Text>
                <Text style={styles.statLabel}>Animais</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statNumber}>
                  {memberSince ? new Date(memberSince).getFullYear() : "--"}
                </Text>
                <Text style={styles.statLabel}>Ano de registo</Text>
              </View>
            </View>

            <View style={styles.actionsCard}>
              <Pressable
                style={({ pressed }) => [
                  styles.editProfileButton,
                  pressed && styles.editProfileButtonPressed,
                ]}
                onPress={openEditProfile}
              >
                <Ionicons name="create-outline" size={19} color="#FFFFFF" />
                <Text style={styles.editProfileButtonText}>Editar Perfil</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.logoutButton,
                  pressed && styles.logoutButtonPressed,
                ]}
                onPress={handleLogout}
              >
                <MaterialIcons name="logout" size={19} color="#DC2626" />
                <Text style={styles.logoutButtonText}>Terminar Sessão</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={showEditModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Perfil</Text>

              <Pressable onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Nome</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Introduza o seu nome"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.fieldLabel}>Nova Password</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={editPassword}
                onChangeText={setEditPassword}
                placeholder="Deixe vazio para não alterar"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showEditPassword}
              />

              <Pressable onPress={() => setShowEditPassword((prev) => !prev)}>
                <Ionicons
                  name={showEditPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#64748B"
                />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Confirmar Password</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={editPasswordConfirm}
                onChangeText={setEditPasswordConfirm}
                placeholder="Confirmar nova password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showEditPasswordConfirm}
              />

              <Pressable
                onPress={() => setShowEditPasswordConfirm((prev) => !prev)}
              >
                <Ionicons
                  name={
                    showEditPasswordConfirm ? "eye-off-outline" : "eye-outline"
                  }
                  size={20}
                  color="#64748B"
                />
              </Pressable>
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && styles.cancelButtonPressed,
                ]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.saveButtonPressed,
                ]}
                onPress={saveProfileData}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 20,
  },

  avatar: {
    width: 114,
    height: 114,
    borderRadius: 57,
    backgroundColor: "#14B8A6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    position: "relative",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 57,
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
  },

  editBadge: {
    position: "absolute",
    right: 3,
    bottom: 3,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#0F9D92",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  title: {
    fontSize: 25,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 14,
    textAlign: "center",
  },

  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 18,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 6,
  },

  value: {
    fontSize: 16,
    color: "#0F172A",
    fontWeight: "600",
  },

  separator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 18,
  },

  statsRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  statBox: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },

  statLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },

  actionsCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },

  editProfileButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#0F9D92",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  editProfileButtonPressed: {
    backgroundColor: "#15968b",
    transform: [{ scale: 0.99 }],
  },

  editProfileButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  logoutButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  logoutButtonPressed: {
    backgroundColor: "#fddbdb",
    transform: [{ scale: 0.99 }],
  },

  logoutButtonText: {
    color: "#DC2626",
    fontSize: 15,
    fontWeight: "800",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.25)",
    justifyContent: "center",
    padding: 18,
  },

  modalCard: {
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

  cancelButtonPressed: {
    backgroundColor: "#eff0f0",
    transform: [{ scale: 0.99 }],
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

  saveButtonPressed: {
    backgroundColor: "#15968b",
    transform: [{ scale: 0.99 }],
  },

  saveButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  passwordInputWrapper: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  passwordInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    paddingRight: 10,
  },
});

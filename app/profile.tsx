import React, { useEffect, useMemo, useState } from "react";
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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../src/lib/supabase";

const BUCKET_NAME = "profile-images";

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "U";

  const parts = trimmed.split(" ").filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

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

  if (path.startsWith("http")) {
    return path;
  }

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

  const photoUrl = useMemo(() => {
    const url = getPublicUrlFromPath(photoPath);
    return url ? `${url}?t=${Date.now()}` : null;
  }, [photoPath]);

  useEffect(() => {
    loadProfile();
  }, []);

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

      if (profileError) {
        throw profileError;
      }

      const { count, error: countError } = await supabase
        .from("animais")
        .select("*", { count: "exact", head: true })
        .eq("id_utilizador", user.id);

      if (countError) {
        throw countError;
      }

      setFullName(profileData?.nome ?? "");
      setEmail(profileData?.email ?? user.email ?? "");
      setMemberSince(profileData?.data_registo ?? null);
      setPhotoPath(profileData?.foto_perfil_url ?? null);
      setPetCount(count ?? 0);
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível carregar o perfil."
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

    const { error } = await supabase.storage.from(BUCKET_NAME).remove([finalPath]);

    if (error) {
      console.log("Erro ao remover foto antiga:", error.message);
    }
  };

  const uploadProfilePhoto = async (imageUri: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Utilizador não autenticado.");
    }

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

    if (uploadError) {
      throw uploadError;
    }

    return filePath;
  };

  const saveProfilePhoto = async (newUri: string) => {
    try {
      setUploadingPhoto(true);

      const uploadedPath = await uploadProfilePhoto(newUri);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Utilizador não autenticado.");
      }

      const oldPhotoPath = photoPath;

      const { data: updatedUser, error } = await supabase
        .from("utilizadores")
        .update({ foto_perfil_url: uploadedPath })
        .eq("id_utilizador", user.id)
        .select("id_utilizador, foto_perfil_url")
        .single();

      if (error) throw error;

      if (!updatedUser) {
        throw new Error("Não foi possível atualizar a fotografia do utilizador.");
      }

      setPhotoPath(uploadedPath);

      DeviceEventEmitter.emit("profileUpdated", {
        nome: fullName,
        foto_perfil_url: uploadedPath,
      });

      if (oldPhotoPath) {
        await deleteOldProfileImage(oldPhotoPath);
      }

      Alert.alert("Sucesso", "Foto de perfil atualizada com sucesso.");
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível atualizar a foto."
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

    if (result.canceled) return;

    await saveProfilePhoto(result.assets[0].uri);
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

    if (result.canceled) return;

    await saveProfilePhoto(result.assets[0].uri);
  };

  const openPhotoMenu = () => {
    Alert.alert("Alterar Foto", "Escolha uma opção", [
      { text: "Tirar Foto", onPress: takePhoto },
      { text: "Escolher da Galeria", onPress: pickImageFromGallery },
      { text: "Cancelar", style: "cancel" },
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
                <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
              </View>
            </Pressable>

            <Text style={styles.title}>O Meu Perfil</Text>

            <View style={styles.card}>
              <Text style={styles.label}>Nome</Text>
              <Text style={styles.value}>{fullName || "Sem nome"}</Text>

              <View style={styles.separator} />

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
          </>
        )}
      </ScrollView>
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
    paddingTop: 40,
    paddingBottom: 40,
  },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#14B8A6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    position: "relative",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 48,
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },

  editBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#0F9D92",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 14,
  },

  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
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
});
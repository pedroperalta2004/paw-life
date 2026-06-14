import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  BackHandler,
} from "react-native";
import { supabase } from "../src/lib/supabase";

export default function RegisterScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Campos em falta", "Preencha nome, email e palavra-passe.");
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Palavra-passe inválida",
        "A palavra-passe deve ter pelo menos 6 caracteres.",
      );
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nome: fullName.trim(),
          },
        },
      });

      if (error) throw error;

      const user = data.user;

      if (!user) {
        throw new Error("Não foi possível obter o utilizador após o registo.");
      }

      resetForm();
      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert("Erro no registo", error.message || "Ocorreu um erro.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessContinue = () => {
    setShowSuccessModal(false);
    resetForm();
    router.replace("/login");
  };

  useFocusEffect(
    useCallback(() => {
      resetForm();

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        () => true,
      );

      return () => backHandler.remove();
    }, []),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : -50}
      >
        <View style={styles.container}>
          <View style={styles.topSection}>
            <View style={styles.logoBox}>
              <Image
                source={require("../assets/images/pawlife_logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.appName}>PawLife</Text>
            <Text style={styles.subtitle}>
              A plataforma completa para o bem-estar do seu melhor amigo.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Criar nova conta</Text>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Nome completo</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color="#94A3B8"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor="#94A3B8"
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color="#94A3B8"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="user@exemplo.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Palavra-passe</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color="#94A3B8"
                  style={styles.inputIcon}
                />

                <TextInput
                  style={styles.input}
                  placeholder="••••••••••••"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />

                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  hitSlop={10}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#64748B"
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={[styles.registerButton, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.registerButtonText}>Registar</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Já tem conta? </Text>
            <Pressable onPress={() => router.push("/login")}>
              <Text style={styles.footerLink}>Iniciar sessão</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleSuccessContinue}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="checkmark" size={34} color="#FFFFFF" />
            </View>

            <Text style={styles.modalTitle}>Conta criada com sucesso!</Text>
            <Text style={styles.modalDescription}>
              A sua conta foi registada com sucesso. Já pode iniciar sessão no
              PawLife.
            </Text>

            <Pressable
              style={styles.modalButton}
              onPress={handleSuccessContinue}
            >
              <Text style={styles.modalButtonText}>Continuar</Text>
            </Pressable>
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

  keyboardView: {
    flex: 1,
  },

  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 90,
    paddingBottom: 24,
  },

  topSection: {
    alignItems: "center",
    marginBottom: 22,
  },

  logoBox: {
    width: 62,
    height: 62,
    borderRadius: 16,
    backgroundColor: "#10B3A3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  logoImage: {
    width: 50,
    height: 50,
  },

  appName: {
    fontSize: 28,
    marginBottom: 8,
    fontFamily: "Pacifico_400Regular",
    color: "#0F172A",
  },

  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 290,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 26,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  cardTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 22,
  },

  fieldBlock: {
    marginBottom: 18,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },

  inputWrapper: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  inputIcon: {
    marginRight: 8,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },

  registerButton: {
    marginTop: 12,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#0F9D92",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  registerButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  footer: {
    marginTop: 26,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  footerText: {
    fontSize: 14,
    color: "#475569",
  },

  footerLink: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F9D92",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  modalIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 10,
  },

  modalDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 22,
  },

  modalButton: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    backgroundColor: "#0F9D92",
    alignItems: "center",
    justifyContent: "center",
  },

  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});

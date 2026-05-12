import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useState, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  BackHandler,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { supabase } from "../src/lib/supabase";

const REMEMBER_EMAIL_KEY = "pawlife_remember_email";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    loadRememberedEmail();
    checkBiometricAvailability();
  }, []);

  const loadRememberedEmail = async () => {
    const savedEmail = await AsyncStorage.getItem(REMEMBER_EMAIL_KEY);

    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  };

  const checkBiometricAvailability = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    setBiometricAvailable(hasHardware && isEnrolled);
  };

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password.trim()) {
      Alert.alert("Campos em falta", "Preencha o email e a palavra-passe.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) throw error;

      if (rememberEmail) {
        await AsyncStorage.setItem(REMEMBER_EMAIL_KEY, cleanEmail);
      } else {
        await AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      router.replace("/dashboard");
    } catch (error: any) {
      Alert.alert(
        "Erro no login",
        error.message || "Não foi possível iniciar sessão.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      setBiometricLoading(true);

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          "Biometria indisponível",
          "Configure impressão digital ou Face ID no telemóvel.",
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Entrar no PawLife",
        fallbackLabel: "Usar código",
        cancelLabel: "Cancelar",
      });

      if (!result.success) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert(
          "Sessão expirada",
          "Faça login novamente com email e palavra-passe.",
        );
        return;
      }

      router.replace("/dashboard");
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível iniciar sessão com biometria.",
      );
    } finally {
      setBiometricLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        () => true,
      );

      return () => backHandler.remove();
    }, []),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
              <Text style={styles.cardTitle}>Aceda à sua conta</Text>

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
                <View style={styles.passwordHeader}>
                  <Text style={styles.label}>Palavra-passe</Text>
                  <Pressable onPress={() => router.push("/esqueceu_password")}>
                    <Text style={styles.forgotPassword}>
                      Esqueceu-se da palavra-passe?
                    </Text>
                  </Pressable>
                </View>

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
                    hitSlop={10}
                    disabled={loading}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#94A3B8"
                    />
                  </Pressable>
                </View>
              </View>

              <Pressable
                style={styles.rememberRow}
                onPress={() => setRememberEmail((prev) => !prev)}
                disabled={loading}
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberEmail && styles.checkboxActive,
                  ]}
                >
                  {rememberEmail && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>

                <Text style={styles.rememberText}>Lembrar email</Text>
              </Pressable>

              <Pressable
                style={[styles.loginButton, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading || biometricLoading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.loginButtonText}>Entrar</Text>
                )}
              </Pressable>

              {biometricAvailable && (
                <Pressable
                  style={[
                    styles.biometricButton,
                    biometricLoading && styles.buttonDisabled,
                  ]}
                  onPress={handleBiometricLogin}
                  disabled={loading || biometricLoading}
                >
                  {biometricLoading ? (
                    <ActivityIndicator color="#0F9D92" />
                  ) : (
                    <>
                      <Ionicons
                        name="finger-print-outline"
                        size={22}
                        color="#0F9D92"
                      />
                      <Text style={styles.biometricButtonText}>
                        Entrar com biometria
                      </Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Ainda não tem conta? </Text>
              <Pressable onPress={() => router.push("/registar")}>
                <Text style={styles.footerLink}>Criar agora</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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

  scrollContainer: {
    flexGrow: 1,
  },

  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
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

  passwordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  forgotPassword: {
    fontSize: 11,
    fontWeight: "600",
    color: "#10B3A3",
    marginBottom: 6,
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

  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -2,
    marginBottom: 16,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  checkboxActive: {
    backgroundColor: "#0F9D92",
    borderColor: "#0F9D92",
  },

  rememberText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
  },

  loginButton: {
    marginTop: 4,
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

  biometricButton: {
    marginTop: 12,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BCE7DF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  biometricButtonText: {
    color: "#0F9D92",
    fontSize: 14,
    fontWeight: "800",
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  loginButtonText: {
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
});

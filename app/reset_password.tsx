import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../src/lib/supabase";
import { router, useLocalSearchParams } from "expo-router";

function withTimeout<T>(promise: Promise<T>, ms = 12000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error("Tempo limite excedido. Tente novamente.")),
        ms,
      ),
    ),
  ]);
}

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState("");
  const [codeVerified, setCodeVerified] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleVerifyCode = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (!cleanEmail || !cleanCode) {
      Alert.alert("Erro", "Preencha o email e o código recebido.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await withTimeout(
        supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: "recovery",
        }),
      );

      if (error) throw error;

      setCodeVerified(true);
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Código inválido.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (password.length < 6) {
      Alert.alert("Erro", "A palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Erro", "As palavras-passe não coincidem.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await withTimeout(
        supabase.auth.updateUser({
          password,
        }),
      );

      if (error) throw error;

      setLoading(false);

      Alert.alert("Sucesso", "Palavra-passe alterada com sucesso.", [
        {
          text: "OK",
          onPress: () => router.replace("/login"),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error.message || "Não foi possível alterar a palavra-passe.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>
          {codeVerified ? "Nova Palavra-passe" : "Verificar Código"}
        </Text>

        <Text style={styles.subtitle}>
          {codeVerified
            ? "Defina uma nova palavra-passe para a sua conta."
            : "Introduza o email e o código recebido para continuar."}
        </Text>

        {!codeVerified ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />

            <TextInput
              style={styles.input}
              placeholder="Código recebido"
              placeholderTextColor="#94A3B8"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              editable={!loading}
            />

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerifyCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Verificar Código</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.verifiedBox}>
              <Ionicons name="checkmark-circle" size={20} color="#0F9D92" />
              <Text style={styles.verifiedText}>Código verificado</Text>
            </View>

            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Nova palavra-passe"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />

              <Pressable
                style={styles.eyeButton}
                onPress={() => setShowPassword((prev) => !prev)}
                disabled={loading}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#64748B"
                />
              </Pressable>
            </View>

            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirmar palavra-passe"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading}
              />

              <Pressable
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword((prev) => !prev)}
                disabled={loading}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#64748B"
                />
              </Pressable>
            </View>

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleUpdatePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Guardar Palavra-passe</Text>
              )}
            </Pressable>
          </>
        )}
      </View>

      <Pressable
        style={styles.backButton}
        onPress={() => router.replace("/login")}
        disabled={loading}
      >
        <Text style={styles.backButtonText}>Voltar para o Login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 90,
    paddingBottom: 40,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 15,
    color: "#64748B",
    lineHeight: 23,
    marginBottom: 28,
  },

  input: {
    height: 54,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },

  verifiedBox: {
    height: 46,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 18,
  },

  verifiedText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "700",
    color: "#0F9D92",
  },

  passwordWrapper: {
    height: 54,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 8,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
  },

  passwordInput: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
    height: "100%",
  },

  eyeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  button: {
    height: 54,
    backgroundColor: "#0F9D92",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },

  backButton: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F9D92",
  },
});

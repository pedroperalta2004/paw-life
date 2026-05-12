import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import { supabase } from "../src/lib/supabase";
import { useFocusEffect, router } from "expo-router";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert("Erro", "Introduza o seu email.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);

      if (error) throw error;

      Alert.alert(
        "Código enviado",
        "Verifique o seu email e introduza o código recebido para redefinir a palavra-passe.",
        [
          {
            text: "Continuar",
            onPress: () =>
              router.push({
                pathname: "/reset_password",
                params: { email: cleanEmail },
              }),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Não foi possível enviar o email.");
    } finally {
      setLoading(false);
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
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>Recuperar Palavra-passe</Text>

        <Text style={styles.subtitle}>
          Introduza o email associado à sua conta. Vamos enviar um código de
          recuperação.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#94A3B8"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleResetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Enviar Código</Text>
          )}
        </Pressable>
      </View>

      <Pressable
        style={styles.backButton}
        onPress={() => router.replace("/login")}
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
    paddingTop: 120,
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
    marginBottom: 22,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },

  button: {
    height: 54,
    backgroundColor: "#0F9D92",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
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

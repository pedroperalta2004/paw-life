import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "pawlife_session_email";

export async function getSession() {
  return AsyncStorage.getItem(KEY);
}

export async function signIn(email: string) {
  await AsyncStorage.setItem(KEY, email);
}

export async function signOut() {
  await AsyncStorage.removeItem(KEY);
}
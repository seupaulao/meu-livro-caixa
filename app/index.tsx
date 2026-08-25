import { Redirect } from "expo-router";

export default function Index() {
  // Redireciona diretamente para a aba inicial
  return <Redirect href="/(tabs)" />;
}
import { AuthProvider } from "./AuthContext";
import { MainView } from "./pages/MainView";

export default function App() {
  return (
    <AuthProvider>
      <MainView />
    </AuthProvider>
  );
}

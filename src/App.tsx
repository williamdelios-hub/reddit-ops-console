import { useEffect, useState } from "react";
import { api } from "./lib/api";
import { DispatchConsole } from "./features/queue/DispatchConsole";
import { SetupLanding } from "./features/setup/SetupLanding";

export default function App() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    api<{ authenticated: boolean }>("session")
      .then((result) => setAuthenticated(result.authenticated))
      .catch(() => setAuthenticated(false))
      .finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession) {
    return (
      <main className="loading-screen">
        <span>Dispatch</span>
        <small>Checking private session</small>
      </main>
    );
  }

  if (!authenticated) return <SetupLanding onLogin={() => setAuthenticated(true)} />;
  return <DispatchConsole onLogout={() => setAuthenticated(false)} />;
}

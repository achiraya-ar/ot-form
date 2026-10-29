import { useState } from "react";
import type { AppRoute, DocumentSet, StepId } from "./types";
import { useApp } from "./lib/store";
import { AppShell } from "./components/AppShell";
import { LoginScreen } from "./screens/LoginScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { CreateSetScreen } from "./screens/CreateSetScreen";
import { SetWorkspace } from "./screens/SetWorkspace";
import { SettingsScreen } from "./screens/SettingsScreen";

function firstOpenStep(set: DocumentSet): StepId {
  for (const step of [1, 2, 3, 4, 5] as StepId[]) {
    if (!set.completedSteps.includes(step)) return step;
  }
  return 5;
}

export default function App() {
  const { state, logout } = useApp();
  const [route, setRoute] = useState<AppRoute>({ name: "dashboard" });

  if (!state.session) {
    return <LoginScreen />;
  }

  const home = () => setRoute({ name: "dashboard" });
  const openSettings = () => setRoute({ name: "settings" });
  const openSet = (set: DocumentSet) =>
    setRoute({ name: "set", setId: set.id, step: firstOpenStep(set) });

  return (
    <AppShell
      onHome={home}
      onSettings={openSettings}
      onLogout={() => {
        logout();
        home();
      }}
    >
      {route.name === "dashboard" && (
        <DashboardScreen
          onCreate={() => setRoute({ name: "create" })}
          onOpenSet={openSet}
        />
      )}
      {route.name === "create" && (
        <CreateSetScreen
          onBack={home}
          onCreated={(set) => setRoute({ name: "set", setId: set.id, step: 1 })}
        />
      )}
      {route.name === "set" && (
        <SetWorkspace
          setId={route.setId}
          step={route.step}
          onStepChange={(step) =>
            setRoute({ name: "set", setId: route.setId, step })
          }
          onBack={home}
        />
      )}
      {route.name === "settings" && <SettingsScreen onBack={home} />}
    </AppShell>
  );
}

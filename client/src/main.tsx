import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Route, Switch } from "wouter";
import { Toaster } from "./components/ui/sonner";
import HomePage from "./pages/HomePage";
import SafetyLab from "./App";
import TeacherDashboard from "./pages/TeacherDashboard";
import PRDGenerator from "./pages/PRDGenerator";
import PrecisionRecallGame from "./pages/PrecisionRecallGame";
import RegisterForClass from "./pages/RegisterForClass";
import EvaluationGridPage from "./pages/EvaluationGridPage";
import "./index.css";

function RootApp() {
  return (
    <>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/register" component={RegisterForClass} />
        <Route path="/safety-lab" component={SafetyLab} />
        <Route path="/teacher" component={TeacherDashboard} />
        <Route path="/prd-generator" component={PRDGenerator} />
        <Route path="/precision-recall" component={PrecisionRecallGame} />
        <Route path="/evaluation-grid" component={EvaluationGridPage} />
        <Route>
          <div className="min-h-screen flex items-center justify-center">
            <p>Page not found</p>
          </div>
        </Route>
      </Switch>
      <Toaster position="top-center" richColors />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>
);

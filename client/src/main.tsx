import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Route, Switch } from "wouter";
import HomePage from "./pages/HomePage";
import SafetyLab from "./App";
import TeacherDashboard from "./pages/TeacherDashboard";
import PRDGenerator from "./pages/PRDGenerator";
import "./index.css";

function RootApp() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/safety-lab" component={SafetyLab} />
      <Route path="/teacher" component={TeacherDashboard} />
      <Route path="/prd-generator" component={PRDGenerator} />
      <Route>
        <div className="min-h-screen flex items-center justify-center">
          <p>Page not found</p>
        </div>
      </Route>
    </Switch>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>
);

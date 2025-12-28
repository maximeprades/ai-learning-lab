import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Route, Switch } from "wouter";
import HomePage from "./pages/HomePage";
import SafetyLab from "./App";
import "./index.css";

function RootApp() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/safety-lab" component={SafetyLab} />
      <Route path="/precision-recall">
        <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-teal-900 flex items-center justify-center p-8">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-4">Precision and Recall Game</h1>
            <p className="text-xl text-emerald-200">Coming Soon!</p>
            <a href="/" className="mt-8 inline-block px-6 py-3 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
              ← Back to Home
            </a>
          </div>
        </div>
      </Route>
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

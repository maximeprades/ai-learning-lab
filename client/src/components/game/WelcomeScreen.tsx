import { useState } from "react";
import { usePrecisionRecall } from "@/lib/stores/usePrecisionRecall";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2 } from "lucide-react";

export function WelcomeScreen() {
  const { startGame, setEmail } = usePrecisionRecall();
  const [emailInput, setEmailInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim());

  const handleStart = async () => {
    if (!isValidEmail) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/pr/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to login");
      }

      setEmail(emailInput.trim().toLowerCase());
      startGame();
    } catch (err) {
      setError("Failed to start game. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <a href="/" className="absolute left-4 top-4 text-gray-600 hover:text-gray-800">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <CardTitle className="text-3xl font-bold text-indigo-800">
            Precision & Recall Challenge
          </CardTitle>
          <CardDescription className="text-lg">
            Learn how Machine Learning models are evaluated!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-indigo-50 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-indigo-800 text-lg">How to Play:</h3>
            <p className="text-gray-700">
              Imagine you have a machine learning model that tries to identify <strong>dogs</strong> from a group of animal pictures.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <h4 className="font-semibold text-green-700 flex items-center gap-2">
                  <span className="text-xl">🎯</span> Precision
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  Of all the animals the model <strong>predicted as dogs</strong>, how many are <strong>actually dogs</strong>?
                </p>
                <div className="mt-2 p-2 bg-green-50 rounded text-xs font-mono text-center">
                  Precision = TP / (TP + FP)
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <h4 className="font-semibold text-blue-700 flex items-center gap-2">
                  <span className="text-xl">🔍</span> Recall
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  Of all the <strong>actual dogs</strong>, how many did the model <strong>correctly find</strong>?
                </p>
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs font-mono text-center">
                  Recall = TP / (TP + FN)
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <h4 className="font-semibold text-gray-700">What do TP, FP, FN mean?</h4>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li><strong>TP (True Positive):</strong> Model said "dog" and it IS a dog</li>
                <li><strong>FP (False Positive):</strong> Model said "dog" but it's NOT a dog</li>
                <li><strong>FN (False Negative):</strong> Model said "not dog" but it IS a dog</li>
                <li><strong>TN (True Negative):</strong> Model said "not dog" and it's NOT a dog</li>
              </ul>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Enter your email to start:</label>
              <Input
                type="email"
                placeholder="your.email@school.edu"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isValidEmail) {
                    handleStart();
                  }
                }}
                className="text-center"
              />
              {error && <p className="text-red-600 text-sm text-center">{error}</p>}
            </div>
            
            <div className="text-center">
              <Button 
                size="lg" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 text-lg"
                onClick={handleStart}
                disabled={!isValidEmail || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  "Start Game"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

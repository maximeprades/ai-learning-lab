import { useState, useMemo } from "react";
import { usePrecisionRecall } from "@/lib/stores/usePrecisionRecall";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export function GameScreen() {
  const { 
    animals, 
    currentRound, 
    totalRounds, 
    score, 
    submitAnswer,
    inputMode,
    setInputMode 
  } = usePrecisionRecall();
  
  const [precisionInput, setPrecisionInput] = useState("");
  const [recallInput, setRecallInput] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [showModeWarning, setShowModeWarning] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  const detectMismatch = useMemo(() => {
    const precision = parseFloat(precisionInput);
    const recall = parseFloat(recallInput);
    
    if (inputMode === "percentage") {
      const precisionLooksDecimal = !isNaN(precision) && precision > 0 && precision <= 1 && precisionInput.includes(".");
      const recallLooksDecimal = !isNaN(recall) && recall > 0 && recall <= 1 && recallInput.includes(".");
      
      if (precisionLooksDecimal || recallLooksDecimal) {
        return {
          detected: true,
          message: "It looks like you entered decimal values (like 0.75) but you're in Percentage mode. Did you mean to use Decimal mode?",
          suggestedMode: "fraction" as const
        };
      }
    } else {
      const precisionLooksPercentage = !isNaN(precision) && precision > 1 && precision <= 100;
      const recallLooksPercentage = !isNaN(recall) && recall > 1 && recall <= 100;
      
      if (precisionLooksPercentage || recallLooksPercentage) {
        return {
          detected: true,
          message: "It looks like you entered percentage values (like 75) but you're in Decimal mode. Did you mean to use Percentage mode?",
          suggestedMode: "percentage" as const
        };
      }
    }
    
    return { detected: false, message: "", suggestedMode: null };
  }, [precisionInput, recallInput, inputMode]);

  const handleSubmit = () => {
    if (detectMismatch.detected && !pendingSubmit) {
      setShowModeWarning(true);
      return;
    }
    
    const precision = parseFloat(precisionInput) || 0;
    const recall = parseFloat(recallInput) || 0;
    submitAnswer(precision, recall);
  };

  const handleSwitchMode = () => {
    if (detectMismatch.suggestedMode) {
      setInputMode(detectMismatch.suggestedMode);
    }
    setShowModeWarning(false);
    setPendingSubmit(false);
  };

  const handleKeepMode = () => {
    setShowModeWarning(false);
    setPendingSubmit(true);
    const precision = parseFloat(precisionInput) || 0;
    const recall = parseFloat(recallInput) || 0;
    submitAnswer(precision, recall);
  };

  const handleDismissWarning = () => {
    setShowModeWarning(false);
  };

  const predictedAsDog = animals.filter(a => a.predictedAsDog);
  const actualDogs = animals.filter(a => a.type === "dog");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <a href="/" className="text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-5 h-5" />
            </a>
            <div className="text-lg font-semibold text-indigo-800">
              Round {currentRound} of {totalRounds}
            </div>
          </div>
          <div className="text-lg font-semibold text-green-700">
            Score: {score}
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-center">
              The ML model is trying to identify DOGS
            </CardTitle>
            <p className="text-center text-gray-600 text-sm">
              Green border = Model predicted as DOG | The actual animal type is shown inside
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-3 max-w-xl mx-auto">
              {animals.map((animal) => (
                <div
                  key={animal.id}
                  className={cn(
                    "aspect-square rounded-lg flex flex-col items-center justify-center text-4xl transition-all",
                    animal.predictedAsDog
                      ? "border-4 border-green-500 bg-green-50"
                      : "border-2 border-gray-300 bg-gray-50"
                  )}
                >
                  <span className="text-5xl">{animal.emoji}</span>
                  <span className="text-xs mt-1 text-gray-600 capitalize">
                    {animal.type}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-4 border-green-500 rounded"></div>
                <span>Predicted as Dog</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-300 rounded"></div>
                <span>Predicted as NOT Dog</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Calculate Precision & Recall</h3>
              <div className="flex gap-2">
                <Button
                  variant={inputMode === "percentage" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInputMode("percentage")}
                >
                  Percentage %
                </Button>
                <Button
                  variant={inputMode === "fraction" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInputMode("fraction")}
                >
                  Decimal
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHint(!showHint)}
              className="mb-4"
            >
              {showHint ? "Hide Hint" : "Show Hint"}
            </Button>

            {showHint && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm">
                <p className="mb-2">
                  <strong>Count from the grid above:</strong>
                </p>
                <ul className="space-y-1 text-gray-700">
                  <li>
                    <strong>Model predicted as dog:</strong> {predictedAsDog.length} animals 
                    ({predictedAsDog.map(a => a.emoji).join(" ")})
                  </li>
                  <li>
                    <strong>Actual dogs in the grid:</strong> {actualDogs.length} animals
                  </li>
                </ul>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="bg-green-100 p-2 rounded">
                    <p className="font-semibold">Precision = TP / (TP + FP)</p>
                    <p className="text-xs">True dogs among predicted dogs</p>
                  </div>
                  <div className="bg-blue-100 p-2 rounded">
                    <p className="font-semibold">Recall = TP / (TP + FN)</p>
                    <p className="text-xs">Found dogs among all actual dogs</p>
                  </div>
                </div>
              </div>
            )}

            {showModeWarning && (
              <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-orange-800 font-medium mb-3">
                      {detectMismatch.message}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={handleSwitchMode}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        Switch to {detectMismatch.suggestedMode === "percentage" ? "Percentage" : "Decimal"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleKeepMode}
                      >
                        Keep {inputMode === "percentage" ? "Percentage" : "Decimal"} & Submit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleDismissWarning}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="precision" className="text-green-700 font-medium">
                  Precision {inputMode === "percentage" ? "(0-100%)" : "(0.00-1.00)"}
                </Label>
                <Input
                  id="precision"
                  type="number"
                  placeholder={inputMode === "percentage" ? "e.g., 75" : "e.g., 0.75"}
                  value={precisionInput}
                  onChange={(e) => {
                    setPrecisionInput(e.target.value);
                    setPendingSubmit(false);
                  }}
                  min="0"
                  max={inputMode === "percentage" ? "100" : "1"}
                  step={inputMode === "percentage" ? "1" : "0.01"}
                  className="text-lg"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="recall" className="text-blue-700 font-medium">
                  Recall {inputMode === "percentage" ? "(0-100%)" : "(0.00-1.00)"}
                </Label>
                <Input
                  id="recall"
                  type="number"
                  placeholder={inputMode === "percentage" ? "e.g., 80" : "e.g., 0.80"}
                  value={recallInput}
                  onChange={(e) => {
                    setRecallInput(e.target.value);
                    setPendingSubmit(false);
                  }}
                  min="0"
                  max={inputMode === "percentage" ? "100" : "1"}
                  step={inputMode === "percentage" ? "1" : "0.01"}
                  className="text-lg"
                />
              </div>
            </div>

            <Button 
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700"
              size="lg"
              onClick={handleSubmit}
              disabled={!precisionInput || !recallInput}
            >
              Submit Answer
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

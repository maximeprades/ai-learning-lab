import { usePrecisionRecall } from "@/lib/stores/usePrecisionRecall";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, ArrowLeft } from "lucide-react";

export function FeedbackScreen() {
  const { 
    animals, 
    roundResults, 
    currentRound, 
    totalRounds, 
    score,
    nextRound,
    inputMode
  } = usePrecisionRecall();

  const lastResult = roundResults[roundResults.length - 1];
  if (!lastResult) return null;

  const formatValue = (value: number) => {
    if (inputMode === "percentage") {
      return `${(value * 100).toFixed(0)}%`;
    }
    return value.toFixed(2);
  };

  const bothCorrect = lastResult.precisionCorrect && lastResult.recallCorrect;
  const oneCorrect = lastResult.precisionCorrect || lastResult.recallCorrect;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <a href="/" className="text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-5 h-5" />
            </a>
            <div className="text-lg font-semibold text-indigo-800">
              Round {currentRound} of {totalRounds} - Results
            </div>
          </div>
          <div className="text-lg font-semibold text-green-700">
            Score: {score}
          </div>
        </div>

        <Card className={cn(
          "border-4",
          bothCorrect ? "border-green-400 bg-green-50" : 
          oneCorrect ? "border-yellow-400 bg-yellow-50" : 
          "border-red-400 bg-red-50"
        )}>
          <CardHeader className="text-center pb-2">
            <CardTitle className={cn(
              "text-2xl",
              bothCorrect ? "text-green-700" : 
              oneCorrect ? "text-yellow-700" : 
              "text-red-700"
            )}>
              {bothCorrect ? "Excellent! Both correct!" : 
               oneCorrect ? "Good try! One correct!" : 
               "Keep learning! Let's review..."}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2 max-w-xl mx-auto mb-6">
              {animals.map((animal) => {
                const isActuallyDog = animal.type === "dog";
                const predictedDog = animal.predictedAsDog;
                
                let category = "";
                if (isActuallyDog && predictedDog) category = "TP";
                else if (!isActuallyDog && predictedDog) category = "FP";
                else if (isActuallyDog && !predictedDog) category = "FN";
                else category = "TN";

                return (
                  <div
                    key={animal.id}
                    className={cn(
                      "aspect-square rounded-lg flex flex-col items-center justify-center relative",
                      category === "TP" && "bg-green-200 border-2 border-green-600",
                      category === "FP" && "bg-red-200 border-2 border-red-600",
                      category === "FN" && "bg-orange-200 border-2 border-orange-600",
                      category === "TN" && "bg-gray-100 border border-gray-300"
                    )}
                  >
                    <span className="text-3xl">{animal.emoji}</span>
                    <span className={cn(
                      "text-xs font-bold mt-1",
                      category === "TP" && "text-green-800",
                      category === "FP" && "text-red-800",
                      category === "FN" && "text-orange-800",
                      category === "TN" && "text-gray-600"
                    )}>
                      {category}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                <div className="bg-green-100 p-2 rounded">
                  <div className="text-2xl font-bold text-green-700">{lastResult.tp}</div>
                  <div className="text-xs text-green-600">True Positive (TP)</div>
                </div>
                <div className="bg-red-100 p-2 rounded">
                  <div className="text-2xl font-bold text-red-700">{lastResult.fp}</div>
                  <div className="text-xs text-red-600">False Positive (FP)</div>
                </div>
                <div className="bg-orange-100 p-2 rounded">
                  <div className="text-2xl font-bold text-orange-700">{lastResult.fn}</div>
                  <div className="text-xs text-orange-600">False Negative (FN)</div>
                </div>
                <div className="bg-gray-100 p-2 rounded">
                  <div className="text-2xl font-bold text-gray-700">{lastResult.tn}</div>
                  <div className="text-xs text-gray-600">True Negative (TN)</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className={cn(
                  "p-4 rounded-lg border-2",
                  lastResult.precisionCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    {lastResult.precisionCorrect ? 
                      <CheckCircle className="text-green-600" /> : 
                      <XCircle className="text-red-600" />
                    }
                    <span className="font-semibold text-lg">Precision</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Formula:</strong> TP / (TP + FP) = {lastResult.tp} / ({lastResult.tp} + {lastResult.fp})
                    </p>
                    <p>
                      <strong>Your answer:</strong> {formatValue(lastResult.userPrecision)}
                    </p>
                    <p>
                      <strong>Correct answer:</strong> {formatValue(lastResult.actualPrecision)}
                    </p>
                  </div>
                </div>

                <div className={cn(
                  "p-4 rounded-lg border-2",
                  lastResult.recallCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    {lastResult.recallCorrect ? 
                      <CheckCircle className="text-green-600" /> : 
                      <XCircle className="text-red-600" />
                    }
                    <span className="font-semibold text-lg">Recall</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Formula:</strong> TP / (TP + FN) = {lastResult.tp} / ({lastResult.tp} + {lastResult.fn})
                    </p>
                    <p>
                      <strong>Your answer:</strong> {formatValue(lastResult.userRecall)}
                    </p>
                    <p>
                      <strong>Correct answer:</strong> {formatValue(lastResult.actualRecall)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 rounded-lg p-3 mt-4">
                <h4 className="font-semibold text-indigo-800 mb-2">Understanding the Results:</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>
                    <strong className="text-green-700">Precision {formatValue(lastResult.actualPrecision)}:</strong> Out of {lastResult.tp + lastResult.fp} predictions as "dog", {lastResult.tp} were actually dogs.
                  </li>
                  <li>
                    <strong className="text-blue-700">Recall {formatValue(lastResult.actualRecall)}:</strong> Out of {lastResult.tp + lastResult.fn} actual dogs, the model found {lastResult.tp} of them.
                  </li>
                </ul>
              </div>
            </div>

            <Button 
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700"
              size="lg"
              onClick={nextRound}
            >
              {currentRound >= totalRounds ? "See Final Results" : "Next Round"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

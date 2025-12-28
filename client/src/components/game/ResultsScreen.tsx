import { useEffect, useRef } from "react";
import { usePrecisionRecall } from "@/lib/stores/usePrecisionRecall";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Trophy, ArrowLeft } from "lucide-react";

export function ResultsScreen() {
  const { roundResults, score, totalRounds, resetGame, inputMode, email } = usePrecisionRecall();
  const hasSubmittedRef = useRef(false);

  const maxScore = totalRounds * 20;
  const percentage = Math.round((score / maxScore) * 100);

  useEffect(() => {
    if (email && !hasSubmittedRef.current) {
      hasSubmittedRef.current = true;
      fetch("/api/pr/submit-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, score }),
      }).catch(console.error);
    }
  }, [email, score]);

  const formatValue = (value: number) => {
    if (inputMode === "percentage") {
      return `${(value * 100).toFixed(0)}%`;
    }
    return value.toFixed(2);
  };

  let grade = "";
  let gradeColor = "";
  let message = "";

  if (percentage >= 90) {
    grade = "A+";
    gradeColor = "text-green-600";
    message = "Outstanding! You've mastered precision and recall!";
  } else if (percentage >= 80) {
    grade = "A";
    gradeColor = "text-green-600";
    message = "Excellent work! You understand these concepts well!";
  } else if (percentage >= 70) {
    grade = "B";
    gradeColor = "text-blue-600";
    message = "Good job! Keep practicing to improve!";
  } else if (percentage >= 60) {
    grade = "C";
    gradeColor = "text-yellow-600";
    message = "You're getting there! Review the formulas and try again!";
  } else {
    grade = "Keep Learning!";
    gradeColor = "text-orange-600";
    message = "Don't give up! Practice makes perfect!";
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="border-4 border-indigo-400">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <Trophy className="w-16 h-16 text-yellow-500" />
            </div>
            <CardTitle className="text-3xl font-bold text-indigo-800">
              Game Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className={cn("text-6xl font-bold", gradeColor)}>
                {grade}
              </div>
              <div className="text-2xl font-semibold mt-2">
                {score} / {maxScore} points ({percentage}%)
              </div>
              <p className="text-gray-600 mt-2">{message}</p>
            </div>

            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3">Round-by-Round Results</h3>
              <div className="space-y-2">
                {roundResults.map((result) => (
                  <div 
                    key={result.round}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="font-medium">Round {result.round}</span>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        {result.precisionCorrect ? 
                          <CheckCircle className="w-4 h-4 text-green-600" /> : 
                          <XCircle className="w-4 h-4 text-red-600" />
                        }
                        <span className="text-sm">Precision</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {result.recallCorrect ? 
                          <CheckCircle className="w-4 h-4 text-green-600" /> : 
                          <XCircle className="w-4 h-4 text-red-600" />
                        }
                        <span className="text-sm">Recall</span>
                      </div>
                      <span className="font-semibold text-indigo-600">
                        +{(result.precisionCorrect ? 10 : 0) + (result.recallCorrect ? 10 : 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-indigo-50 rounded-lg p-4">
              <h3 className="font-semibold text-indigo-800 mb-2">Key Takeaways:</h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>
                  <strong>Precision</strong> answers: "Of everything the model predicted as positive, how many were actually positive?"
                </li>
                <li>
                  <strong>Recall</strong> answers: "Of all the actual positives, how many did the model find?"
                </li>
                <li>
                  In real ML applications, you often need to balance precision and recall based on the problem's needs.
                </li>
              </ul>
            </div>

            <div className="flex gap-4">
              <a href="/" className="flex-1">
                <Button 
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </a>
              <Button 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                size="lg"
                onClick={resetGame}
              >
                Play Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { usePrecisionRecall } from "@/lib/stores/usePrecisionRecall";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export function WelcomeScreen() {
  const { startGame } = usePrecisionRecall();

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
          
          <div className="text-center">
            <Button 
              size="lg" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 text-lg"
              onClick={startGame}
            >
              Start Game
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

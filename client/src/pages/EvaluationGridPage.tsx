import { ArrowLeft, Trophy, Zap, Lightbulb, Palette, Sparkles, Mic } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GradeLevel {
  points: number;
  description: string;
}

interface Category {
  id: number;
  title: string;
  maxPoints: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  levels: GradeLevel[];
}

const categories: Category[] = [
  {
    id: 1,
    title: "Does It Actually Work?",
    maxPoints: 25,
    icon: <Zap className="w-6 h-6" />,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    levels: [
      { points: 5, description: "Crashes immediately or nothing happens" },
      { points: 10, description: "Some parts work, lots of bugs" },
      { points: 15, description: "Works but has noticeable issues" },
      { points: 20, description: "Works well with minor glitches" },
      { points: 25, description: "Works smoothly, no major problems" },
    ],
  },
  {
    id: 2,
    title: "Is It Solving a Real Problem?",
    maxPoints: 25,
    icon: <Lightbulb className="w-6 h-6" />,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    levels: [
      { points: 5, description: "Just entertainment/another game with no real purpose" },
      { points: 10, description: "Slightly helpful but problem isn't that important" },
      { points: 15, description: "Addresses a real student, school, or community issue" },
      { points: 20, description: "Tackles a meaningful problem people actually have" },
      { points: 25, description: "Solves a serious problem AND helps society/charity/greater good" },
    ],
  },
  {
    id: 3,
    title: "Is It Cool/Useful/Fun?",
    maxPoints: 20,
    icon: <Sparkles className="w-6 h-6" />,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    levels: [
      { points: 5, description: "Not really sure what this is for" },
      { points: 10, description: "Okay idea but nothing special" },
      { points: 15, description: "Pretty cool, would use it once" },
      { points: 20, description: "Actually awesome, would want to keep using it" },
    ],
  },
  {
    id: 4,
    title: "Design & User Experience",
    maxPoints: 15,
    icon: <Palette className="w-6 h-6" />,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    levels: [
      { points: 5, description: "Confusing to use, messy layout, hard to navigate" },
      { points: 10, description: "Works but not intuitive, design is basic" },
      { points: 15, description: "Easy to use, looks good, well thought through" },
    ],
  },
  {
    id: 5,
    title: "Creativity & Originality",
    maxPoints: 10,
    icon: <Sparkles className="w-6 h-6" />,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    levels: [
      { points: 3, description: "Very basic or copied exactly from tutorial" },
      { points: 6, description: "Standard idea with small tweaks" },
      { points: 10, description: "Something we haven't seen before or super creative take" },
    ],
  },
  {
    id: 6,
    title: "Presentation Skills",
    maxPoints: 5,
    icon: <Mic className="w-6 h-6" />,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
    levels: [
      { points: 1, description: "Hard to understand what they built" },
      { points: 3, description: "Explained it okay" },
      { points: 5, description: "Clear, confident, showed it off well" },
    ],
  },
];

export default function EvaluationGridPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50">
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-8 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <a href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Home</span>
          </a>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Vibe Coding Competition</h1>
              <p className="text-white/80 text-lg mt-1">Evaluation Grid - 100 Points Total</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-indigo-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">How You'll Be Graded</h2>
          <p className="text-gray-600">
            Your project will be evaluated across 6 categories. Each category has different point levels based on quality.
            Aim for the highest level in each category to maximize your score!
          </p>
        </div>

        <div className="grid gap-6">
          {categories.map((category) => (
            <Card key={category.id} className={`border-2 ${category.borderColor} overflow-hidden`}>
              <CardHeader className={`${category.bgColor} pb-4`}>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`${category.color}`}>
                      {category.icon}
                    </div>
                    <span className="text-lg font-semibold text-gray-800">{category.title}</span>
                  </div>
                  <div className={`${category.color} font-bold text-xl`}>
                    {category.maxPoints} pts
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {category.levels.map((level, index) => {
                    const isMaxLevel = level.points === category.maxPoints;
                    const percentage = (level.points / category.maxPoints) * 100;
                    
                    return (
                      <div
                        key={index}
                        className={`flex items-start gap-4 p-3 rounded-lg transition-colors ${
                          isMaxLevel ? `${category.bgColor} border ${category.borderColor}` : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex-shrink-0 w-16">
                          <div
                            className={`text-center py-1.5 px-3 rounded-full font-bold text-sm ${
                              isMaxLevel
                                ? `${category.bgColor} ${category.color} border ${category.borderColor}`
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {level.points} pts
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className={`${isMaxLevel ? "font-medium text-gray-800" : "text-gray-600"}`}>
                            {level.description}
                          </p>
                        </div>
                        <div className="hidden md:block flex-shrink-0 w-24">
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isMaxLevel ? "bg-gradient-to-r from-green-400 to-green-500" : "bg-gray-300"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white text-center">
          <h3 className="text-2xl font-bold mb-2">Total: 100 Points</h3>
          <p className="text-white/80">
            Focus on building something that works well, solves a real problem, and showcases your creativity!
          </p>
        </div>

        <div className="mt-8 text-center">
          <a href="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </a>
        </div>
      </main>
    </div>
  );
}

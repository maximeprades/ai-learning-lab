import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  FileText, 
  ArrowLeft, 
  Copy, 
  Download, 
  RotateCcw, 
  Loader2, 
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Sparkles,
  Zap,
  Rocket
} from "lucide-react";

const MIN_CHARS = 100;
const MAX_CHARS = 2000;
const DAILY_LIMIT = 5;

const EXAMPLE_BAD = "A todo app";
const EXAMPLE_GOOD = "A todo app for college students that lets them add tasks by voice, set priorities, and get reminded before deadlines. It should work on mobile and sync across devices.";

const EXAMPLE_INPUT = "A recipe sharing app for home cooks who want to organize their favorite recipes, create shopping lists from selected meals, and plan their weekly dinners. Users should be able to save recipes from any website, add personal notes, and scale ingredient amounts for different serving sizes.";

const EXAMPLE_PRD_PREVIEW = `## PROJECT OVERVIEW
A recipe management web application that helps home cooks organize, plan, and shop for their meals.

## CORE FEATURES (Must Have)
1. Recipe saving with URL import
2. Shopping list generation
3. Weekly meal planning calendar
4. Ingredient scaling
...`;

interface OptionalRequirement {
  id: string;
  label: string;
  checked: boolean;
}

export default function PRDGenerator() {
  const [step, setStep] = useState<"input" | "loading" | "result">("input");
  const [idea, setIdea] = useState("");
  const [showExample, setShowExample] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [optionalReqs, setOptionalReqs] = useState<OptionalRequirement[]>([
    { id: "auth", label: "User accounts needed", checked: false },
    { id: "mobile", label: "Mobile-first design", checked: false },
    { id: "realtime", label: "Real-time features", checked: false },
    { id: "uploads", label: "File uploads", checked: false },
    { id: "darkmode", label: "Dark mode", checked: false },
  ]);
  const [generatedPRD, setGeneratedPRD] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [showExampleSection, setShowExampleSection] = useState(false);
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("prd_generation_data");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const today = new Date().toDateString();
        if (data.date === today) {
          setGenerationCount(data.count);
        } else {
          localStorage.setItem("prd_generation_data", JSON.stringify({ date: today, count: 0 }));
        }
      } catch {
        localStorage.setItem("prd_generation_data", JSON.stringify({ date: new Date().toDateString(), count: 0 }));
      }
    }
  }, []);

  const updateGenerationCount = (newCount: number) => {
    setGenerationCount(newCount);
    localStorage.setItem("prd_generation_data", JSON.stringify({
      date: new Date().toDateString(),
      count: newCount
    }));
  };

  const charCount = idea.length;
  const isValidLength = charCount >= MIN_CHARS && charCount <= MAX_CHARS;
  const isRateLimited = generationCount >= DAILY_LIMIT;

  const handleGenerate = async () => {
    if (!isValidLength || isRateLimited) return;

    setStep("loading");
    setError("");

    const selectedReqs = optionalReqs.filter(r => r.checked).map(r => r.label);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const response = await fetch("/api/generate-prd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userInput: idea,
          optionalRequirements: selectedReqs
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 429) {
          setError("You've generated 5 PRDs today. Try again tomorrow!");
        } else {
          setError(data.error || "Failed to generate PRD. Please try again.");
        }
        setStep("input");
        return;
      }

      const data = await response.json();
      setGeneratedPRD(data.prd);
      updateGenerationCount(generationCount + 1);
      setStep("result");
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("Request timed out. Please try again with a simpler idea.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setStep("input");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedPRD);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setError("Failed to copy. Please select and copy manually.");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedPRD], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-app-prd.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleStartOver = () => {
    setStep("input");
    setIdea("");
    setGeneratedPRD("");
    setError("");
    setCopied(false);
    setOptionalReqs(optionalReqs.map(r => ({ ...r, checked: false })));
  };

  const toggleOptionalReq = (id: string) => {
    setOptionalReqs(optionalReqs.map(r => 
      r.id === id ? { ...r, checked: !r.checked } : r
    ));
  };

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100">
        <header className="bg-white/80 backdrop-blur-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
            <a href="/" className="text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-5 h-5" />
            </a>
            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-orange-500" />
              <span className="font-bold text-gray-800">PRD Generator</span>
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center p-4" style={{ minHeight: 'calc(100vh - 60px)' }}>
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Generating Your PRD...</h2>
              <p className="text-gray-600">
                Claude AI is crafting a detailed plan for your app. This usually takes 15-30 seconds.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === "result") {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a href="/" className="text-gray-600 hover:text-gray-800">
                <ArrowLeft className="w-5 h-5" />
              </a>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Your PRD is Ready!</h1>
                <p className="text-gray-600 text-sm">Review your plan, then copy it to Replit</p>
              </div>
            </div>
            <div className="hidden md:flex gap-2">
              <Button onClick={handleCopy} className="bg-orange-500 hover:bg-orange-600">
                {copied ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "Copied!" : "Copy PRD"}
              </Button>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download .md
              </Button>
              <Button variant="ghost" onClick={handleStartOver}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Start Over
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-4 pb-32 md:pb-8">
          {copied && (
            <div className="mb-4 p-4 bg-green-100 border border-green-300 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">Copied! Now paste this into Replit Agent</span>
            </div>
          )}

          <Card className="mb-6">
            <CardContent className="p-6">
              <Collapsible open={showTips} onOpenChange={setShowTips}>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
                  <span className="font-semibold text-gray-700">How to use this PRD in Replit</span>
                  {showTips ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <ol className="space-y-2 text-gray-600">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold">1</span>
                      <span>Click "Copy PRD" above</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold">2</span>
                      <span>Go to Replit and create a new project</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold">3</span>
                      <span>Paste this PRD into the Replit Agent chat</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold">4</span>
                      <span>Let Replit build your app!</span>
                    </li>
                  </ol>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 md:p-8">
              <div className="prose prose-gray max-w-none">
                <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-6 rounded-lg border overflow-x-auto">
                  {generatedPRD}
                </pre>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-gray-500 text-sm mt-6">
            <button onClick={handleStartOver} className="underline hover:text-gray-700">
              PRD missing something? Start over
            </button>
          </p>
        </main>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 md:hidden">
          <div className="flex gap-2">
            <Button onClick={handleCopy} className="flex-1 bg-orange-500 hover:bg-orange-600">
              {copied ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Copied!" : "Copy PRD"}
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" onClick={handleStartOver}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100">
      <header className="bg-white/80 backdrop-blur-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <a href="/" className="text-gray-600 hover:text-gray-800">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-orange-500" />
            <span className="font-bold text-gray-800">PRD Generator</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <section className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Turn Your App Idea Into a Clear Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get a professional PRD in 60 seconds—ready for Replit to build
          </p>
        </section>

        <section className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">Step 1</h3>
            <p className="text-gray-600 text-sm">Describe your app idea</p>
          </div>
          <div className="bg-white rounded-xl p-6 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">Step 2</h3>
            <p className="text-gray-600 text-sm">AI creates your PRD</p>
          </div>
          <div className="bg-white rounded-xl p-6 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <Rocket className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">Step 3</h3>
            <p className="text-gray-600 text-sm">Build it in Replit</p>
          </div>
        </section>

        <Card className="mb-8">
          <CardContent className="p-6 md:p-8">
            <label className="block text-lg font-semibold text-gray-800 mb-2">
              What's your app idea?
            </label>
            <p className="text-gray-600 text-sm mb-4">
              Be specific! Include what your app does, who will use it, and why they need it.
            </p>

            <Textarea
              value={idea}
              onChange={(e) => {
                setIdea(e.target.value);
                setError("");
              }}
              placeholder="Describe your app idea. What does it do? Who is it for? What problem does it solve?"
              className="min-h-[150px] text-base mb-2"
              maxLength={MAX_CHARS + 100}
            />

            <div className="flex justify-between items-center mb-4">
              <span className={`text-sm ${
                charCount < MIN_CHARS ? "text-amber-600" :
                charCount > MAX_CHARS ? "text-red-600" : "text-gray-500"
              }`}>
                {charCount} / {MAX_CHARS} characters
                {charCount < MIN_CHARS && ` (${MIN_CHARS - charCount} more needed)`}
              </span>
            </div>

            {charCount < MIN_CHARS && charCount > 0 && (
              <p className="text-amber-600 text-sm mb-4">
                Tell us more! Add at least {MIN_CHARS} characters describing your idea.
              </p>
            )}

            {charCount > MAX_CHARS && (
              <p className="text-red-600 text-sm mb-4">
                Keep it under {MAX_CHARS} characters. Focus on the core idea.
              </p>
            )}

            <div className="flex items-center gap-2 mb-4">
              <Checkbox
                id="showExample"
                checked={showExample}
                onCheckedChange={(checked) => setShowExample(checked as boolean)}
              />
              <label htmlFor="showExample" className="text-sm text-gray-700 cursor-pointer">
                Show me an example
              </label>
            </div>

            {showExample && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
                <div>
                  <p className="text-red-600 font-medium text-sm mb-1">❌ Too vague:</p>
                  <p className="text-gray-600 text-sm italic">"{EXAMPLE_BAD}"</p>
                </div>
                <div>
                  <p className="text-green-600 font-medium text-sm mb-1">✅ Great detail:</p>
                  <p className="text-gray-600 text-sm italic">"{EXAMPLE_GOOD}"</p>
                </div>
              </div>
            )}

            <Collapsible open={showOptional} onOpenChange={setShowOptional}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-4">
                {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Want to add more details? (Optional)
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-gray-50 rounded-lg p-4 mb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {optionalReqs.map(req => (
                    <div key={req.id} className="flex items-center gap-2">
                      <Checkbox
                        id={req.id}
                        checked={req.checked}
                        onCheckedChange={() => toggleOptionalReq(req.id)}
                      />
                      <label htmlFor={req.id} className="text-sm text-gray-700 cursor-pointer">
                        {req.label}
                      </label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">
                {error}
              </div>
            )}

            {isRateLimited && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-4 mb-4">
                You've generated {DAILY_LIMIT} PRDs today. Try again tomorrow!
              </div>
            )}

            <Button 
              onClick={handleGenerate}
              disabled={!isValidLength || isRateLimited}
              className="w-full bg-orange-500 hover:bg-orange-600 text-lg py-6"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Generate My PRD
            </Button>

            <p className="text-center text-gray-500 text-xs mt-4">
              {DAILY_LIMIT - generationCount} generations remaining today
            </p>
          </CardContent>
        </Card>

        <Collapsible open={showExampleSection} onOpenChange={setShowExampleSection}>
          <Card>
            <CardContent className="p-6">
              <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
                <span className="font-semibold text-gray-700">See an Example</span>
                {showExampleSection ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Student's Input:</p>
                    <p className="text-gray-800 bg-gray-50 p-3 rounded-lg text-sm italic">
                      "{EXAMPLE_INPUT}"
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Generated PRD (preview):</p>
                    <pre className="text-gray-800 bg-gray-50 p-3 rounded-lg text-sm font-mono whitespace-pre-wrap">
                      {EXAMPLE_PRD_PREVIEW}
                    </pre>
                  </div>
                </div>
              </CollapsibleContent>
            </CardContent>
          </Card>
        </Collapsible>

        <section className="mt-8 text-center">
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Powered by Claude AI
            </span>
            <span className="flex items-center gap-2">
              <Rocket className="w-4 h-4" />
              Optimized for Replit
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}

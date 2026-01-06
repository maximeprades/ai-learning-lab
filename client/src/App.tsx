import { useState, useEffect, useRef, useCallback } from "react";
import Confetti from "react-confetti";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Loader2, PawPrint, Shield, AlertTriangle, ImageIcon, ChevronLeft, ChevronRight, Mail, History, Trophy, RefreshCw, Stethoscope, Clock } from "lucide-react";
import "@fontsource/inter";

interface TestResult {
  id: number;
  text: string;
  expected: string;
  aiLabel: string;
  normalizedLabel: string;
  isCorrect: boolean;
}

interface TestResponse {
  results: TestResult[];
  score: number;
  total: number;
}

interface PromptVersion {
  id: string;
  versionNumber: number;
  text: string;
  timestamp: string;
  score?: number | null;
}

interface Scenario {
  id: number;
  text: string;
  expected: string;
  image: string;
}

const STORAGE_KEY_EMAIL = "pawpatrol.currentEmail";

function getStoredEmail(): string | null {
  return localStorage.getItem(STORAGE_KEY_EMAIL);
}

function setStoredEmail(email: string): void {
  localStorage.setItem(STORAGE_KEY_EMAIL, email);
}

function App() {
  const [email, setEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  const [instructions, setInstructions] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [results, setResults] = useState<TestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalImage, setModalImage] = useState<{ id: number; image: string; text: string; expected: string } | null>(null);

  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>("draft");
  const [bypassMobile, setBypassMobile] = useState(false);
  
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<{ email: string; score: number | null; promptCount: number; hasAttempted: boolean }[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const [promptDoctorEnabled, setPromptDoctorEnabled] = useState(false);
  const [promptDoctorFeedback, setPromptDoctorFeedback] = useState<{ glow: string; grow: string; rank: string } | null>(null);
  const [showPromptDoctorModal, setShowPromptDoctorModal] = useState(false);
  const [promptDoctorLoading, setPromptDoctorLoading] = useState(false);
  
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [jobProgress, setJobProgress] = useState<{ current: number; total: number } | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const connectWebSocket = useCallback((userEmail: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "student_subscribe", email: userEmail }));
    };
    
    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "job_restored") {
          setIsLoading(true);
          setCurrentJobId(data.job?.id || null);
          if (data.status === "queued") {
            setQueuePosition(data.job?.queuePosition || 1);
            setJobProgress(null);
          } else if (data.status === "processing") {
            setQueuePosition(null);
            setJobProgress({ current: data.job?.current || 0, total: data.job?.total || 10 });
          }
        } else if (data.type === "job_queued") {
          setQueuePosition(data.job?.queuePosition || null);
        } else if (data.type === "job_started") {
          setQueuePosition(null);
          setJobProgress({ current: 0, total: data.job?.totalScenarios || 10 });
        } else if (data.type === "job_progress") {
          setJobProgress({ current: data.job?.current || 0, total: data.job?.total || 10 });
        } else if (data.type === "job_completed") {
          setQueuePosition(null);
          setJobProgress(null);
          setCurrentJobId(null);
          setIsLoading(false);
          
          if (data.results) {
            setResults({
              results: data.results,
              score: data.results.filter((r: TestResult) => r.isCorrect).length,
              total: data.results.length,
            });
            
            if (promptDoctorEnabled && email) {
              setPromptDoctorLoading(true);
              try {
                const doctorResponse = await fetch("/api/prompt-doctor", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ studentPrompt: instructions, model: selectedModel }),
                });
                if (doctorResponse.ok) {
                  const feedback = await doctorResponse.json();
                  setPromptDoctorFeedback(feedback);
                  setShowPromptDoctorModal(true);
                }
              } catch (e) {
                console.error("Prompt Doctor error:", e);
              } finally {
                setPromptDoctorLoading(false);
              }
            }
            
            if (email) {
              const loginResponse = await fetch("/api/student/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
              });
              if (loginResponse.ok) {
                const loginData = await loginResponse.json();
                setPromptVersions(loginData.versions || []);
                if (loginData.versions?.length > 0) {
                  const matchingVersion = loginData.versions.find((v: PromptVersion) => v.text === instructions.trim());
                  if (matchingVersion) {
                    setSelectedVersion(matchingVersion.id);
                  } else {
                    setSelectedVersion(loginData.versions[loginData.versions.length - 1].id);
                  }
                }
              }
              
              // Celebrate perfect 10/10 score with confetti!
              const score = data.results.filter((r: TestResult) => r.isCorrect).length;
              if (score === 10 && data.results.length === 10) {
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 10000);
              }
            }
          }
        } else if (data.type === "job_failed") {
          setQueuePosition(null);
          setJobProgress(null);
          setCurrentJobId(null);
          setIsLoading(false);
          setError(data.error || "Test failed. Please try again.");
        } else if (data.type === "job_cancelled") {
          setQueuePosition(null);
          setJobProgress(null);
          setCurrentJobId(null);
          setIsLoading(false);
          setError(data.message || "Your test was cancelled.");
        } else if (data.type === "student_deleted") {
          localStorage.removeItem(STORAGE_KEY_EMAIL);
          setEmail(null);
          setEmailInput("");
          setInstructions("");
          setResults(null);
          setPromptVersions([]);
          setSelectedVersion("draft");
          setQueuePosition(null);
          setJobProgress(null);
          setCurrentJobId(null);
          setIsLoading(false);
        }
      } catch (e) {
        console.error("WebSocket message error:", e);
      }
    };
    
    ws.onclose = () => {
      wsRef.current = null;
    };
    
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [promptDoctorEnabled, instructions, selectedModel, email]);

  useEffect(() => {
    if (email) {
      connectWebSocket(email);
    }
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [email, connectWebSocket]);

  useEffect(() => {
    fetch("/api/scenarios")
      .then(res => res.json())
      .then(data => setScenarios(data.map((s: any) => ({
        id: s.id,
        text: s.text,
        expected: s.expected,
        image: s.imageData || `/scenarios/${s.image}`
      }))))
      .catch(console.error);
  }, []);


  const fetchLeaderboard = async () => {
    setLeaderboardLoading(true);
    try {
      const response = await fetch("/api/leaderboard");
      const data = await response.json();
      setLeaderboardData(data);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const openLeaderboard = () => {
    setShowLeaderboard(true);
    fetchLeaderboard();
  };

  // Auto-refresh leaderboard every 5 seconds when dialog is open
  useEffect(() => {
    if (!showLeaderboard) return;
    
    const interval = setInterval(() => {
      fetch("/api/leaderboard")
        .then(res => res.json())
        .then(data => setLeaderboardData(data))
        .catch(console.error);
    }, 2500);
    
    return () => clearInterval(interval);
  }, [showLeaderboard]);

  useEffect(() => {
    const storedEmail = getStoredEmail();
    if (storedEmail) {
      loginStudent(storedEmail);
    } else {
      setShowEmailDialog(true);
    }
  }, []);

  const loginStudent = async (studentEmail: string) => {
    try {
      const response = await fetch("/api/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: studentEmail }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setStoredEmail(studentEmail);
        setEmail(studentEmail);
        setPromptVersions(data.versions || []);
        if (data.versions && data.versions.length > 0) {
          setSelectedVersion(data.versions[data.versions.length - 1].id);
        }
        setShowEmailDialog(false);
      } else {
        setEmailError("Failed to login. Please try again.");
      }
    } catch {
      setEmailError("Failed to connect to server.");
    }
  };

  const handleEmailSubmit = () => {
    const trimmedEmail = emailInput.trim();
    if (!trimmedEmail) {
      setEmailError("Please enter your email address");
      return;
    }
    if (!trimmedEmail.includes("@")) {
      setEmailError("Please enter a valid email address");
      return;
    }
    loginStudent(trimmedEmail);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY_EMAIL);
    setEmail(null);
    setInstructions("");
    setPromptVersions([]);
    setSelectedVersion("draft");
    setResults(null);
    setEmailInput("");
    setShowEmailDialog(true);
  };

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersion(versionId);
    if (versionId === "draft") {
      return;
    }
    const version = promptVersions.find(v => v.id === versionId);
    if (version) {
      setInstructions(version.text);
    }
  };

  const runTest = async () => {
    if (!instructions.trim()) {
      setError("Please write your moderation instructions first!");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);
    setQueuePosition(null);
    setJobProgress(null);

    try {
      const response = await fetch("/api/run-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          moderationInstructions: instructions,
          email: email,
          model: selectedModel
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.details || data.error || "Failed to run test";
        throw new Error(errorMsg);
      }

      if (data.queued) {
        setCurrentJobId(data.jobId);
        if (data.queuePosition > 1) {
          setQueuePosition(data.queuePosition);
        } else {
          setJobProgress({ current: 0, total: 10 });
        }
      } else {
        setResults(data);
        setIsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  const cancelQueuedTest = async () => {
    if (!email) return;
    
    try {
      const response = await fetch("/api/student/cancel-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      if (response.ok) {
        setIsLoading(false);
        setQueuePosition(null);
        setJobProgress(null);
        setCurrentJobId(null);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to cancel test");
      }
    } catch (err) {
      setError("Failed to cancel test");
    }
  };

  const getLabelEmoji = (label: string) => {
    if (label.includes("Allowed")) return "✅";
    if (label.includes("Prohibited")) return "🚫";
    if (label.includes("Disturbing")) return "⚠️";
    return "❓";
  };

  const findMatchingVersion = (): string | null => {
    const trimmedText = instructions.trim();
    for (const version of promptVersions) {
      if (version.text === trimmedText) {
        return version.id;
      }
    }
    return null;
  };

  const isDraft = () => {
    const trimmedText = instructions.trim();
    if (trimmedText.length === 0) return false;
    if (promptVersions.length === 0) return true;
    return findMatchingVersion() === null;
  };

  useEffect(() => {
    const trimmedText = instructions.trim();
    
    if (trimmedText.length === 0) {
      if (promptVersions.length > 0) {
        setSelectedVersion(promptVersions[promptVersions.length - 1].id);
      }
      return;
    }
    
    let matchingVersionId: string | null = null;
    for (const version of promptVersions) {
      if (version.text === trimmedText) {
        matchingVersionId = version.id;
        break;
      }
    }
    
    if (matchingVersionId) {
      if (selectedVersion !== matchingVersionId) {
        setSelectedVersion(matchingVersionId);
      }
    } else if (selectedVersion !== "draft") {
      setSelectedVersion("draft");
    }
  }, [instructions, promptVersions, selectedVersion]);

  return (
    <>
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={true}
          numberOfPieces={800}
          gravity={0.15}
          wind={0.01}
          colors={['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE']}
          tweenDuration={100}
        />
      )}
      {!bypassMobile && (
        <div className="md:hidden min-h-screen bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl p-8 text-center max-w-sm shadow-xl">
            <PawPrint className="w-16 h-16 mx-auto mb-4 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-800 mb-3">Desktop Recommended</h2>
            <p className="text-gray-600 mb-4">
              This app works best on a desktop or laptop computer.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setBypassMobile(true)}
              className="text-indigo-600 border-indigo-300 hover:bg-indigo-50"
            >
              Continue Anyway
            </Button>
          </div>
        </div>
      )}
      
      <div className={`${bypassMobile ? '' : 'hidden md:block'} min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50`}>
      <header className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-6 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-white/80 hover:text-white">
              <ChevronLeft className="w-6 h-6" />
            </a>
            <PawPrint className="w-10 h-10" />
            <h1 className="text-2xl md:text-3xl font-bold">
              Prompt 101: AI Safety Lab
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {email && (
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-sm">
                <Mail className="w-4 h-4" />
                <span className="hidden sm:inline">{email}</span>
                <button 
                  onClick={handleLogout}
                  className="ml-1 text-white/70 hover:text-white text-xs underline"
                >
                  Change
                </button>
              </div>
            )}
            <Button
              variant="outline"
              onClick={openLeaderboard}
              className="flex items-center gap-2 bg-white/20 text-white border-white/40 hover:bg-white/30"
            >
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Leaderboard</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <Card className="border-2 border-purple-200 bg-purple-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <ImageIcon className="w-5 h-5" />
              The 10 Test Scenarios - Can you write rules to classify them all correctly?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {scenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className="relative group cursor-pointer"
                  onClick={() => setModalImage({ id: scenario.id, image: scenario.image, text: scenario.text, expected: scenario.expected })}
                >
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm hover:shadow-lg hover:border-purple-400 transition-all">
                    <img
                      src={scenario.image}
                      alt={`Scenario ${scenario.id}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    #{scenario.id}
                  </div>
                  <div className={`absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium backdrop-blur-sm ${
                    scenario.expected.includes("Allowed") 
                      ? "bg-green-500/80 text-white" 
                      : scenario.expected.includes("Prohibited") 
                        ? "bg-red-500/80 text-white" 
                        : "bg-amber-500/80 text-white"
                  }`}>
                    {scenario.expected.includes("Allowed") ? "Allowed" : scenario.expected.includes("Prohibited") ? "Prohibited" : "Disturbing"}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-purple-600 mt-3 text-center">Click on any image to enlarge it</p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Shield className="w-5 h-5" />
                Official School Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-900">
              <p className="font-semibold mb-3">Platform Content Rules:</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✅</span>
                  <span><strong>Allowed:</strong> Real dogs or friendly dog-related content</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">🚫</span>
                  <span><strong>Prohibited:</strong> No selling dogs, no wild animals (wolves), no aggressive behavior, no dog-sounding food</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600 font-bold">⚠️</span>
                  <span><strong>Disturbing:</strong> Medical situations or injuries involving dogs (even at a vet)</span>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Your Mission:</strong> Write clear instructions that will help the AI correctly label all 10 test scenarios!
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-indigo-600" />
                Your Moderation Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Write your moderation prompt here and hit Run Test to see how it did on the sample set above"
                value={instructions}
                onChange={(e) => {
                  setInstructions(e.target.value);
                  if (selectedVersion !== "draft") {
                    const version = promptVersions.find(v => v.id === selectedVersion);
                    if (version && version.text !== e.target.value) {
                      setSelectedVersion("draft");
                    }
                  }
                }}
                className="min-h-[200px] text-base"
              />
              <div className="flex items-center justify-end gap-3 flex-wrap">
                {error && (
                  <p className="text-red-600 text-sm">{error}</p>
                )}
                {promptVersions.length > 0 && (
                  <Select value={selectedVersion} onValueChange={handleVersionSelect}>
                    <SelectTrigger className="w-[180px]">
                      <History className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {isDraft() && (
                        <SelectItem value="draft">
                          Draft (unsaved)
                        </SelectItem>
                      )}
                      {[...promptVersions].reverse().map((version) => (
                        <SelectItem key={version.id} value={version.id}>
                          {version.id.toUpperCase()} {version.score !== undefined && version.score !== null && `(${version.score}/10)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini (OpenAI)</SelectItem>
                    <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku (Anthropic)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 rounded-lg border border-violet-200">
                  <Stethoscope className="w-4 h-4 text-violet-600" />
                  <Label htmlFor="prompt-doctor" className="text-sm font-medium text-violet-700 cursor-pointer">
                    Prompt Doctor
                  </Label>
                  <Switch
                    id="prompt-doctor"
                    checked={promptDoctorEnabled}
                    onCheckedChange={setPromptDoctorEnabled}
                    className="data-[state=checked]:bg-violet-600"
                  />
                </div>
                {promptDoctorFeedback && !showPromptDoctorModal && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPromptDoctorModal(true)}
                    className="text-violet-600 border-violet-300 hover:bg-violet-50"
                  >
                    <Stethoscope className="w-4 h-4 mr-1" />
                    View Feedback
                  </Button>
                )}
                <Button 
                  onClick={runTest} 
                  disabled={isLoading || promptDoctorLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {queuePosition ? `Queued #${queuePosition}` : 
                       jobProgress ? `Testing ${jobProgress.current}/${jobProgress.total}` : "Starting..."}
                    </>
                  ) : promptDoctorLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "🧪 Run Test"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-2 border-indigo-200">
          <CardHeader className="bg-indigo-50 border-b">
            <CardTitle className="flex items-center justify-between">
              <span>{results ? "Test Results" : "Scenario Overview"}</span>
              {results && (
                <span className={`text-xl ${results.score === results.total ? 'text-green-600' : results.score >= 7 ? 'text-yellow-600' : 'text-red-600'}`}>
                  Score: {results.score}/{results.total} 
                  {results.score === results.total && " 🎉 Perfect!"}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative">
            {isLoading && (
              <div className="absolute inset-0 bg-gray-200/70 z-10 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  {queuePosition ? (
                    <>
                      <Clock className="w-10 h-10 text-amber-500" />
                      <span className="text-xl font-bold text-amber-700">Waiting in Queue</span>
                      <div className="bg-amber-100 px-4 py-2 rounded-full">
                        <span className="text-2xl font-bold text-amber-800">#{queuePosition}</span>
                      </div>
                      <span className="text-sm text-gray-600">Other students are testing ahead of you</span>
                      <span className="text-xs text-gray-500">Your test will start automatically...</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={cancelQueuedTest}
                        className="mt-2 text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Cancel Test
                      </Button>
                    </>
                  ) : jobProgress ? (
                    <>
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                      <span className="text-lg font-semibold text-gray-800">Testing Scenarios</span>
                      <div className="w-48 bg-gray-300 rounded-full h-2.5">
                        <div 
                          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
                          style={{ width: `${(jobProgress.current / jobProgress.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{jobProgress.current} of {jobProgress.total} complete</span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-gray-700">Starting test...</span>
                  )}
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">#</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Image</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Scenario</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Ground Truth</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Your Model</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {results ? (
                    results.results.map((result) => {
                      const scenario = scenarios.find(s => s.id === result.id);
                      return (
                        <tr key={result.id} className={result.isCorrect ? "bg-green-50" : "bg-red-50"}>
                          <td className="px-4 py-3 text-sm text-gray-600">{result.id}</td>
                          <td className="px-4 py-2">
                            {scenario && (
                              <img 
                                src={scenario.image} 
                                alt={result.text}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-800">{result.text}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
                              {getLabelEmoji(result.expected)} {result.expected}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors">
                                  {getLabelEmoji(result.normalizedLabel)} {result.normalizedLabel}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-3">
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-gray-500 uppercase">Full Model Response</p>
                                  <p className="text-sm text-gray-800">{result.aiLabel}</p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {result.isCorrect ? (
                              <CheckCircle className="w-6 h-6 text-green-600 mx-auto" />
                            ) : (
                              <XCircle className="w-6 h-6 text-red-600 mx-auto" />
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    scenarios.map((scenario) => (
                      <tr key={scenario.id} className="bg-white">
                        <td className="px-4 py-3 text-sm text-gray-600">{scenario.id}</td>
                        <td className="px-4 py-2">
                          <img 
                            src={scenario.image} 
                            alt={scenario.text}
                            className="w-12 h-12 object-cover rounded"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800">{scenario.text}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
                            {getLabelEmoji(scenario.expected)} {scenario.expected}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-gray-400 text-sm">—</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-gray-400 text-sm">—</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="mt-8 py-4 text-center text-sm text-gray-500">
        <p>Prompt 101 - Teaching AI Safety & Content Moderation</p>
      </footer>

      <Dialog open={modalImage !== null} onOpenChange={() => setModalImage(null)}>
        <DialogContent className="max-w-5xl w-[95vw] p-0 overflow-hidden">
          {modalImage && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = scenarios.findIndex(s => s.id === modalImage.id);
                  const prevIndex = currentIndex === 0 ? scenarios.length - 1 : currentIndex - 1;
                  const prev = scenarios[prevIndex];
                  setModalImage({ id: prev.id, image: prev.image, text: prev.text, expected: prev.expected });
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-colors"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = scenarios.findIndex(s => s.id === modalImage.id);
                  const nextIndex = currentIndex === scenarios.length - 1 ? 0 : currentIndex + 1;
                  const next = scenarios[nextIndex];
                  setModalImage({ id: next.id, image: next.image, text: next.text, expected: next.expected });
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-colors"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
              <img
                src={modalImage.image}
                alt={modalImage.text}
                className="w-full h-auto max-h-[80vh] object-contain bg-gray-100"
              />
              <div className="p-4 bg-white flex items-center justify-between">
                <p className="text-base font-medium text-gray-800">
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-bold">
                    #{modalImage.id}
                  </span>
                </p>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  modalImage.expected === "Allowed" ? "bg-green-100 text-green-800" :
                  modalImage.expected === "Prohibited" ? "bg-red-100 text-red-800" :
                  "bg-yellow-100 text-yellow-800"
                }`}>
                  Ground Truth: {modalImage.expected === "Allowed" ? "✅ Allowed" : modalImage.expected === "Prohibited" ? "🚫 Prohibited" : "⚠️ Disturbing"}
                </span>
              </div>
            </div>
          )}
          <DialogTitle className="sr-only">Scenario Image</DialogTitle>
        </DialogContent>
      </Dialog>

      <Dialog open={showLeaderboard} onOpenChange={setShowLeaderboard}>
        <DialogContent className="max-w-2xl w-[90vw]">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            Leaderboard
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLeaderboard}
              disabled={leaderboardLoading}
              className="ml-2 h-8 w-8 p-0"
            >
              {leaderboardLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </DialogTitle>
          <div className="space-y-3 pt-4 max-h-[60vh] overflow-y-auto">
            {leaderboardLoading && leaderboardData.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : leaderboardData.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No students yet</p>
            ) : (
              leaderboardData.map((student, index) => (
                <div
                  key={student.email}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    index === 0 ? 'bg-amber-100 border-2 border-amber-300' :
                    index === 1 ? 'bg-gray-100 border-2 border-gray-300' :
                    index === 2 ? 'bg-orange-100 border-2 border-orange-300' :
                    'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${
                      index === 0 ? 'text-amber-600' :
                      index === 1 ? 'text-gray-600' :
                      index === 2 ? 'text-orange-600' :
                      'text-gray-500'
                    }`}>
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-800">{student.email}</p>
                      <p className="text-xs text-gray-500">{student.promptCount || 0} prompts tried</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {student.hasAttempted ? (
                      <span className={`text-xl font-bold ${
                        student.score === 10 ? 'text-green-600' :
                        (student.score ?? 0) >= 7 ? 'text-amber-600' :
                        'text-gray-600'
                      }`}>
                        {student.score ?? 0}/10
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400 italic">No Score Yet</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEmailDialog} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <PawPrint className="w-5 h-5" />
            Welcome to Prompt 101!
          </DialogTitle>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-gray-600">
              Enter your email address to save your progress and prompt versions.
            </p>
            <Input
              type="email"
              placeholder="your.email@school.edu"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setEmailError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleEmailSubmit();
                }
              }}
            />
            {emailError && (
              <p className="text-red-600 text-sm">{emailError}</p>
            )}
            <Button onClick={handleEmailSubmit} className="w-full">
              Get Started
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPromptDoctorModal} onOpenChange={setShowPromptDoctorModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-violet-700">
              <Stethoscope className="w-5 h-5" />
              Prompt Doctor Feedback
            </DialogTitle>
            <DialogDescription>
              Here's what the Prompt Doctor thinks about your moderation prompt
            </DialogDescription>
          </DialogHeader>
          {promptDoctorFeedback && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">✨</span>
                  <h4 className="font-semibold text-green-800">Glow</h4>
                </div>
                <p className="text-green-700">{promptDoctorFeedback.glow}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🌱</span>
                  <h4 className="font-semibold text-amber-800">Grow</h4>
                </div>
                <p className="text-amber-700">{promptDoctorFeedback.grow}</p>
              </div>
              <div className="p-4 bg-violet-50 rounded-lg border border-violet-200 text-center">
                <p className="text-sm text-violet-600 mb-1">Your Prompt Engineering Rank</p>
                <p className="text-2xl font-bold text-violet-800">
                  {promptDoctorFeedback.rank === "Architect" && "🏆 "}
                  {promptDoctorFeedback.rank === "Specialist" && "⭐ "}
                  {promptDoctorFeedback.rank === "Novice" && "🌟 "}
                  {promptDoctorFeedback.rank}
                </p>
              </div>
              <Button 
                onClick={() => setShowPromptDoctorModal(false)} 
                className="w-full bg-violet-600 hover:bg-violet-700"
              >
                Got it!
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}

export default App;

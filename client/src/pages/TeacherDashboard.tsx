import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Lock, Unlock, Users, Trophy, Clock, Trash2, Edit3, Plus, RotateCcw, Save, ImageIcon, Loader2, ArrowLeft, Target, ScrollText, AlertCircle, CheckCircle2, Send, Pause, Play, ListOrdered, XCircle } from "lucide-react";

interface Student {
  id: number;
  email: string;
  isRunningTest: boolean | null;
  highestScore: number | null;
  promptCount: number | null;
  lastActive: string | null;
}

interface PRStudent {
  id: number;
  email: string;
  highestScore: number | null;
  gamesPlayed: number | null;
  lastActive: string | null;
}

interface Scenario {
  id: number;
  text: string;
  expected: string;
  image: string;
}

interface ApiLog {
  id: string;
  timestamp: string;
  type: "request" | "response" | "error";
  provider: "openai" | "anthropic" | "system";
  email?: string;
  model?: string;
  scenarioId?: number;
  message: string;
  details?: any;
}

function formatTime(dateString: string | null) {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

const TEACHER_AUTH_KEY = "ailab.teacher_auth";

export default function TeacherDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem(TEACHER_AUTH_KEY) === "true";
  });
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [prStudents, setPRStudents] = useState<PRStudent[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [promptTemplate, setPromptTemplate] = useState("");
  const [defaultTemplate, setDefaultTemplate] = useState("");
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateError, setTemplateError] = useState("");
  
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [newScenarioDialog, setNewScenarioDialog] = useState(false);
  const [scenarioForm, setScenarioForm] = useState({ text: "", expected: "Allowed" });
  const [scenarioImage, setScenarioImage] = useState<File | null>(null);
  const [scenarioSaving, setScenarioSaving] = useState(false);
  
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ id: number; email: string; type: "prompt101" | "pr" } | null>(null);
  
  const [apiLogs, setApiLogs] = useState<ApiLog[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const [queueStats, setQueueStats] = useState<{
    openai: { pending: number; processing: number; paused: boolean; concurrentLimit: number };
    anthropic: { pending: number; processing: number; paused: boolean; concurrentLimit: number };
    total: { pending: number; processing: number; completed: number; failed: number };
  } | null>(null);

  const transformQueueStats = (stats: any) => {
    if (!stats) return null;
    return {
      openai: {
        pending: stats.providers?.openai?.queued || 0,
        processing: stats.providers?.openai?.processing || 0,
        paused: stats.providers?.openai?.isPaused || false,
        concurrentLimit: stats.providers?.openai?.maxWorkers || 3,
      },
      anthropic: {
        pending: stats.providers?.anthropic?.queued || 0,
        processing: stats.providers?.anthropic?.processing || 0,
        paused: stats.providers?.anthropic?.isPaused || false,
        concurrentLimit: stats.providers?.anthropic?.maxWorkers || 3,
      },
      total: {
        pending: stats.totalQueued || 0,
        processing: stats.totalProcessing || 0,
        completed: stats.totalCompleted || 0,
        failed: stats.totalFailed || 0,
      },
    };
  };
  const [queueJobs, setQueueJobs] = useState<Array<{
    id: string;
    email: string;
    provider: string;
    model: string;
    status: string;
    queuePosition: number;
    currentScenario: number;
    totalScenarios: number;
    createdAt: string;
    startedAt?: string;
  }>>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const verifyPassword = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/verify-teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        localStorage.setItem(TEACHER_AUTH_KEY, "true");
        setIsAuthenticated(true);
        setPassword("");
        setPasswordError("");
      } else {
        setPasswordError("Incorrect password");
      }
    } catch {
      setPasswordError("Failed to verify password");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetch("/api/app-lock")
        .then(res => res.json())
        .then(data => setIsAppLocked(data.isLocked))
        .catch(console.error);
      
      fetch("/api/teacher/prompt-template")
        .then(res => res.json())
        .then(data => {
          setPromptTemplate(data.template);
          setDefaultTemplate(data.defaultTemplate);
        })
        .catch(console.error);
      
      fetch("/api/teacher/scenarios")
        .then(res => res.json())
        .then(data => setScenarios(data.map((s: any) => ({
          id: s.id,
          text: s.text,
          expected: s.expected,
          image: s.imageData || `/scenarios/${s.image}`
        }))))
        .catch(console.error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "teacher_subscribe" }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "students_update") {
            setStudents(data.students);
          } else if (data.type === "pr_students_update") {
            setPRStudents(data.prStudents);
          } else if (data.type === "api_logs_initial") {
            setApiLogs(data.logs);
          } else if (data.type === "api_log") {
            setApiLogs(prev => [data.log, ...prev].slice(0, 200));
          } else if (data.type === "queue_stats") {
            setQueueStats(transformQueueStats(data.stats));
          } else if (data.type === "queue_jobs") {
            setQueueJobs(data.jobs);
          }
        } catch (e) {
          console.error("WebSocket message error:", e);
        }
      };
      
      wsRef.current = ws;
      
      return () => {
        ws.close();
        wsRef.current = null;
      };
    }
  }, [isAuthenticated]);

  const toggleAppLock = async () => {
    try {
      const response = await fetch("/api/app-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLocked: !isAppLocked }),
      });
      
      if (response.ok) {
        setIsAppLocked(!isAppLocked);
      }
    } catch (error) {
      console.error("Failed to toggle app lock:", error);
    }
  };

  const pauseQueue = async (provider?: string) => {
    try {
      const response = await fetch("/api/queue/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (response.ok) {
        const data = await response.json();
        setQueueStats(transformQueueStats(data.stats));
      }
    } catch (error) {
      console.error("Failed to pause queue:", error);
    }
  };

  const resumeQueue = async (provider?: string) => {
    try {
      const response = await fetch("/api/queue/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (response.ok) {
        const data = await response.json();
        setQueueStats(transformQueueStats(data.stats));
      }
    } catch (error) {
      console.error("Failed to resume queue:", error);
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      await fetch(`/api/queue/cancel/${jobId}`, { method: "POST" });
    } catch (error) {
      console.error("Failed to cancel job:", error);
    }
  };

  const savePromptTemplate = async () => {
    setTemplateSaving(true);
    setTemplateError("");
    try {
      const response = await fetch("/api/teacher/prompt-template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: promptTemplate }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        setTemplateError(data.error || "Failed to save template");
      }
    } catch (error) {
      setTemplateError("Failed to save template");
    } finally {
      setTemplateSaving(false);
    }
  };

  const resetPromptTemplate = () => {
    setPromptTemplate(defaultTemplate);
  };

  const handleDeleteStudent = async (id: number, type: "prompt101" | "pr") => {
    try {
      const endpoint = type === "pr" 
        ? `/api/teacher/pr-students/${id}` 
        : `/api/teacher/students/${id}`;
      const response = await fetch(endpoint, {
        method: "DELETE",
      });
      
      if (response.ok) {
        setDeleteConfirmDialog(null);
      }
    } catch (error) {
      console.error("Failed to delete student:", error);
    }
  };

  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deleteAllPRConfirm, setDeleteAllPRConfirm] = useState(false);

  const handleDeleteAllStudents = async () => {
    try {
      const response = await fetch("/api/teacher/students", {
        method: "DELETE",
      });
      if (response.ok) {
        setDeleteAllConfirm(false);
      }
    } catch (error) {
      console.error("Failed to delete all students:", error);
    }
  };

  const handleDeleteAllPRStudents = async () => {
    try {
      const response = await fetch("/api/teacher/pr-students", {
        method: "DELETE",
      });
      if (response.ok) {
        setDeleteAllPRConfirm(false);
      }
    } catch (error) {
      console.error("Failed to delete all PR students:", error);
    }
  };

  const handleSaveScenario = async () => {
    if (!scenarioForm.text.trim()) return;
    
    setScenarioSaving(true);
    try {
      const formData = new FormData();
      formData.append("text", scenarioForm.text);
      formData.append("expected", scenarioForm.expected);
      if (scenarioImage) {
        formData.append("image", scenarioImage);
      }
      
      if (editingScenario) {
        const response = await fetch(`/api/teacher/scenarios/${editingScenario.id}`, {
          method: "PUT",
          body: formData,
        });
        
        if (response.ok) {
          const updated = await response.json();
          setScenarios(scenarios.map(s => 
            s.id === editingScenario.id 
              ? { ...s, text: updated.text, expected: updated.expected, image: updated.imageData || `/scenarios/${updated.image}` }
              : s
          ));
          setEditingScenario(null);
        }
      } else {
        if (!scenarioImage) {
          setScenarioSaving(false);
          return;
        }
        
        const response = await fetch("/api/teacher/scenarios", {
          method: "POST",
          body: formData,
        });
        
        if (response.ok) {
          const newScenario = await response.json();
          setScenarios([...scenarios, {
            id: newScenario.id,
            text: newScenario.text,
            expected: newScenario.expected,
            image: newScenario.imageData || `/scenarios/${newScenario.image}`
          }]);
          setNewScenarioDialog(false);
          setScenarioForm({ text: "", expected: "Allowed" });
          setScenarioImage(null);
        }
      }
    } catch (error) {
      console.error("Failed to save scenario:", error);
    } finally {
      setScenarioSaving(false);
    }
  };

  const handleDeleteScenario = async (id: number) => {
    try {
      const response = await fetch(`/api/teacher/scenarios/${id}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        setScenarios(scenarios.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete scenario:", error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-violet-900 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Teacher Login
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Enter teacher password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  verifyPassword();
                }
              }}
            />
            {passwordError && (
              <p className="text-red-600 text-sm">{passwordError}</p>
            )}
            <div className="flex gap-2">
              <a href="/">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </a>
              <Button onClick={verifyPassword} disabled={isLoading} className="flex-1">
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unlock className="w-4 h-4 mr-2" />}
                Unlock
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <header className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-6 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-10 h-10" />
            <h1 className="text-2xl md:text-3xl font-bold">
              Teacher Dashboard
            </h1>
          </div>
          <a href="/">
            <Button variant="outline" className="bg-white/20 text-white border-white/40 hover:bg-white/30">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <Card className="border-2 border-indigo-200 bg-indigo-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-700" />
                <span className="font-medium text-indigo-800">API Access Control</span>
              </div>
              <Button
                onClick={toggleAppLock}
                variant={isAppLocked ? "destructive" : "outline"}
                className={isAppLocked ? "bg-red-600 hover:bg-red-700" : "border-green-600 text-green-600 hover:bg-green-50"}
              >
                {isAppLocked ? (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    API Locked
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 mr-2" />
                    API Unlocked
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-indigo-600 mt-2">
              {isAppLocked 
                ? "Students cannot run tests using the AI API. Only 'test' mode works." 
                : "Students can run tests using the AI API."}
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Edit3 className="w-5 h-5" />
              AI Prompt Template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-amber-700">
              Edit the prompt sent to the AI. Use <code className="bg-amber-200 px-1 rounded">{"{{STUDENT_PROMPT}}"}</code> where student instructions should be inserted.
            </p>
            <Textarea
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              className="min-h-[150px] font-mono text-sm"
              placeholder="Enter prompt template..."
            />
            {templateError && (
              <p className="text-red-600 text-sm">{templateError}</p>
            )}
            <div className="flex gap-2">
              <Button onClick={savePromptTemplate} disabled={templateSaving}>
                {templateSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Template
              </Button>
              <Button variant="outline" onClick={resetPromptTemplate}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Default
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <ImageIcon className="w-5 h-5" />
                Test Scenarios ({scenarios.length})
              </CardTitle>
              <Button onClick={() => {
                setScenarioForm({ text: "", expected: "Allowed" });
                setScenarioImage(null);
                setNewScenarioDialog(true);
              }} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Scenario
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {scenarios.map((scenario) => (
                <div key={scenario.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                    <img
                      src={scenario.image}
                      alt={scenario.text}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    #{scenario.id}
                  </div>
                  <div className={`absolute top-1 right-1 text-xs px-2 py-0.5 rounded-full font-bold ${
                    scenario.expected === "Allowed" ? "bg-green-500 text-white" :
                    scenario.expected === "Prohibited" ? "bg-red-500 text-white" :
                    "bg-yellow-500 text-black"
                  }`}>
                    {scenario.expected === "Allowed" ? "✅" : scenario.expected === "Prohibited" ? "🚫" : "⚠️"}
                  </div>
                  <p className="mt-1 text-xs text-gray-600 line-clamp-2 leading-tight">{scenario.text}</p>
                  <div className="flex gap-1 mt-1">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 h-7 text-xs"
                      onClick={() => {
                        setEditingScenario(scenario);
                        setScenarioForm({ text: scenario.text, expected: scenario.expected });
                        setScenarioImage(null);
                      }}
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => handleDeleteScenario(scenario.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Users className="w-5 h-5" />
                Prompt 101 Leaderboard ({students.length} students)
              </CardTitle>
              {students.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => setDeleteAllConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No students have logged in yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-green-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-green-800">Rank</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-green-800">Email</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-green-800">Prompts</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-green-800">Best Score</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-green-800">Status</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-green-800">Last Active</th>
                      <th className="px-2 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-green-200">
                    {students.map((student, index) => (
                      <tr key={student.id} className={student.isRunningTest ? "bg-yellow-50" : ""}>
                        <td className="px-4 py-3 text-sm">
                          <span className="flex items-center gap-2">
                            {index === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                            {index === 1 && <Trophy className="w-4 h-4 text-gray-400" />}
                            {index === 2 && <Trophy className="w-4 h-4 text-amber-600" />}
                            <span className="font-medium">#{index + 1}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800">{student.email}</td>
                        <td className="px-4 py-3 text-center text-sm">{student.promptCount || 0}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold text-lg ${
                            (student.highestScore || 0) === 10 ? "text-green-600" :
                            (student.highestScore || 0) >= 7 ? "text-yellow-600" : "text-red-600"
                          }`}>
                            {student.highestScore ?? 0}/10
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {student.isRunningTest ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Testing...
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              Idle
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-500">
                          <span className="flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(student.lastActive)}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteConfirmDialog({ id: student.id, email: student.email, type: "prompt101" })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-indigo-200 bg-indigo-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-indigo-800">
                <Target className="w-5 h-5" />
                Precision & Recall Leaderboard ({prStudents.length} students)
              </CardTitle>
              {prStudents.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => setDeleteAllPRConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {prStudents.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No students have played the Precision & Recall game yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-indigo-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-800">Rank</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-800">Email</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-indigo-800">Games Played</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-indigo-800">Best Score</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-indigo-800">Last Active</th>
                      <th className="px-2 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-200">
                    {prStudents.map((student, index) => (
                      <tr key={student.id}>
                        <td className="px-4 py-3 text-sm">
                          <span className="flex items-center gap-2">
                            {index === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                            {index === 1 && <Trophy className="w-4 h-4 text-gray-400" />}
                            {index === 2 && <Trophy className="w-4 h-4 text-amber-600" />}
                            <span className="font-medium">#{index + 1}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800">{student.email}</td>
                        <td className="px-4 py-3 text-center text-sm">{student.gamesPlayed || 0}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold text-lg ${
                            (student.highestScore || 0) >= 90 ? "text-green-600" :
                            (student.highestScore || 0) >= 60 ? "text-yellow-600" : "text-red-600"
                          }`}>
                            {student.highestScore ?? 0}/100
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-500">
                          <span className="flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(student.lastActive)}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteConfirmDialog({ id: student.id, email: student.email, type: "pr" })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 bg-purple-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-800">
                <ListOrdered className="w-5 h-5" />
                Queue Manager
              </div>
              <div className="flex items-center gap-2">
                {queueStats?.openai?.paused && queueStats?.anthropic?.paused ? (
                  <Button size="sm" variant="outline" onClick={() => resumeQueue()} className="bg-green-100 text-green-700 hover:bg-green-200">
                    <Play className="w-4 h-4 mr-1" /> Resume All
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => pauseQueue()} className="bg-red-100 text-red-700 hover:bg-red-200">
                    <Pause className="w-4 h-4 mr-1" /> Pause All
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-emerald-700">OpenAI</span>
                  {queueStats?.openai?.paused ? (
                    <Button size="sm" variant="ghost" onClick={() => resumeQueue("openai")} className="h-7 text-xs text-green-600">
                      <Play className="w-3 h-3 mr-1" /> Resume
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => pauseQueue("openai")} className="h-7 text-xs text-red-600">
                      <Pause className="w-3 h-3 mr-1" /> Pause
                    </Button>
                  )}
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pending:</span>
                    <span className="font-medium">{queueStats?.openai?.pending || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Processing:</span>
                    <span className="font-medium">{queueStats?.openai?.processing || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${queueStats?.openai?.paused ? "text-red-600" : "text-green-600"}`}>
                      {queueStats?.openai?.paused ? "Paused" : "Active"}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-white rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-orange-700">Anthropic</span>
                  {queueStats?.anthropic?.paused ? (
                    <Button size="sm" variant="ghost" onClick={() => resumeQueue("anthropic")} className="h-7 text-xs text-green-600">
                      <Play className="w-3 h-3 mr-1" /> Resume
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => pauseQueue("anthropic")} className="h-7 text-xs text-red-600">
                      <Pause className="w-3 h-3 mr-1" /> Pause
                    </Button>
                  )}
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pending:</span>
                    <span className="font-medium">{queueStats?.anthropic?.pending || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Processing:</span>
                    <span className="font-medium">{queueStats?.anthropic?.processing || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${queueStats?.anthropic?.paused ? "text-red-600" : "text-green-600"}`}>
                      {queueStats?.anthropic?.paused ? "Paused" : "Active"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {queueJobs.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Active Jobs ({queueJobs.length})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {queueJobs.map((job) => (
                    <div key={job.id} className={`flex items-center justify-between p-2 rounded border text-sm ${
                      job.status === "processing" ? "bg-blue-50 border-blue-200" :
                      job.status === "queued" ? "bg-amber-50 border-amber-200" :
                      "bg-white"
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          job.status === "processing" ? "bg-blue-100 text-blue-700" :
                          job.status === "queued" ? "bg-amber-100 text-amber-700" :
                          job.status === "completed" ? "bg-green-100 text-green-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {job.status === "processing" 
                            ? `Testing ${job.currentScenario}/${job.totalScenarios}` 
                            : job.status === "queued" 
                              ? `Waiting #${job.queuePosition}` 
                              : job.status}
                        </span>
                        <span className="text-gray-700 truncate max-w-[150px]" title={job.email}>{job.email}</span>
                        <span className={`text-xs ${job.provider === "openai" ? "text-emerald-600" : "text-orange-600"}`}>
                          {job.model}
                        </span>
                      </div>
                      {job.status === "queued" && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => cancelJob(job.id)}>
                          <XCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {queueJobs.length === 0 && (
              <p className="text-center text-gray-500 text-sm py-4">No jobs in queue. Student tests will appear here when submitted.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-slate-200 bg-slate-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800">
                <ScrollText className="w-5 h-5" />
                API Logs ({apiLogs.length})
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setApiLogs([])}
                  className="text-xs"
                >
                  Clear Logs
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLogs(!showLogs)}
                  className="text-xs"
                >
                  {showLogs ? "Hide" : "Show"}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          {showLogs && (
            <CardContent>
              {apiLogs.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No API logs yet. Logs will appear when students run tests.</p>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2 font-mono text-xs">
                  {apiLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-2 rounded border ${
                        log.type === "error" 
                          ? "bg-red-50 border-red-200" 
                          : log.type === "response" 
                            ? "bg-green-50 border-green-200" 
                            : "bg-blue-50 border-blue-200"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {log.type === "error" && <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
                        {log.type === "response" && <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />}
                        {log.type === "request" && <Send className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-gray-500">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
                              log.provider === "openai" 
                                ? "bg-emerald-100 text-emerald-700" 
                                : log.provider === "anthropic" 
                                  ? "bg-orange-100 text-orange-700" 
                                  : "bg-gray-100 text-gray-700"
                            }`}>
                              {log.provider}
                            </span>
                            {log.email && (
                              <span className="text-gray-600 truncate max-w-[150px]" title={log.email}>
                                {log.email}
                              </span>
                            )}
                          </div>
                          <p className={`mt-1 ${log.type === "error" ? "text-red-700" : "text-gray-800"}`}>
                            {log.message}
                          </p>
                          {log.type === "error" && log.details && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-red-600 hover:text-red-800">
                                Error Details
                              </summary>
                              <pre className="mt-1 p-2 bg-red-100 rounded text-[10px] overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </main>

      <Dialog open={deleteConfirmDialog !== null} onOpenChange={(open) => !open && setDeleteConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteConfirmDialog?.email}</strong>? This will remove all their prompt versions and test history. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteConfirmDialog && handleDeleteStudent(deleteConfirmDialog.id, deleteConfirmDialog.type)}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteAllConfirm} onOpenChange={setDeleteAllConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete All Prompt 101 Students</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all {students.length} students? This will remove all their prompt versions and test history. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteAllConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAllStudents}>
              Delete All
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteAllPRConfirm} onOpenChange={setDeleteAllPRConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete All Precision & Recall Students</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all {prStudents.length} students from the Precision & Recall leaderboard? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteAllPRConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAllPRStudents}>
              Delete All
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editingScenario !== null} onOpenChange={(open) => !open && setEditingScenario(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Scenario #{editingScenario?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={scenarioForm.text}
                onChange={(e) => setScenarioForm({ ...scenarioForm, text: e.target.value })}
                placeholder="Describe this scenario..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Expected Label</label>
              <Select value={scenarioForm.expected} onValueChange={(value) => setScenarioForm({ ...scenarioForm, expected: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Allowed">Allowed</SelectItem>
                  <SelectItem value="Prohibited">Prohibited</SelectItem>
                  <SelectItem value="Disturbing">Disturbing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Replace Image (optional)</label>
              <Input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={(e) => setScenarioImage(e.target.files?.[0] || null)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingScenario(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveScenario} disabled={scenarioSaving}>
                {scenarioSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={newScenarioDialog} onOpenChange={setNewScenarioDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Scenario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={scenarioForm.text}
                onChange={(e) => setScenarioForm({ ...scenarioForm, text: e.target.value })}
                placeholder="Describe this scenario..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Expected Label</label>
              <Select value={scenarioForm.expected} onValueChange={(value) => setScenarioForm({ ...scenarioForm, expected: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Allowed">Allowed</SelectItem>
                  <SelectItem value="Prohibited">Prohibited</SelectItem>
                  <SelectItem value="Disturbing">Disturbing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Image (required)</label>
              <Input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={(e) => setScenarioImage(e.target.files?.[0] || null)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setNewScenarioDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveScenario} disabled={scenarioSaving || !scenarioImage}>
                {scenarioSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Scenario
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

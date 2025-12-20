import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Loader2, PawPrint, Shield, AlertTriangle, ImageIcon, ChevronLeft, ChevronRight, Lock, Unlock, Mail, History, Users, Trophy, Clock, Trash2, Edit3, Plus, RotateCcw, Upload, Save, RefreshCw, Stethoscope } from "lucide-react";
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

interface Student {
  id: number;
  email: string;
  isRunningTest: boolean | null;
  highestScore: number | null;
  promptCount: number | null;
  lastActive: string | null;
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

function TeacherDashboard({ students, onDeleteStudent }: { 
  students: Student[]; 
  onDeleteStudent: (id: number, email: string) => void;
}) {
  const formatTime = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="border-2 border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-green-800">
          <Users className="w-5 h-5" />
          Student Dashboard ({students.length} students)
        </CardTitle>
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
                        onClick={() => onDeleteStudent(student.id, student.email)}
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
  );
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
  const [modalImage, setModalImage] = useState<{ id: number; image: string; text: string } | null>(null);
  const [isTeacherMode, setIsTeacherMode] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>("draft");
  const [students, setStudents] = useState<Student[]>([]);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ id: number; email: string } | null>(null);
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [bypassMobile, setBypassMobile] = useState(false);
  
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
  
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<{ email: string; score: number | null; promptCount: number; hasAttempted: boolean }[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  
  const [promptDoctorEnabled, setPromptDoctorEnabled] = useState(false);
  const [promptDoctorFeedback, setPromptDoctorFeedback] = useState<{ glow: string; grow: string; rank: string } | null>(null);
  const [showPromptDoctorModal, setShowPromptDoctorModal] = useState(false);
  const [promptDoctorLoading, setPromptDoctorLoading] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/scenarios")
      .then(res => res.json())
      .then(data => setScenarios(data.map((s: any) => ({
        id: s.id,
        text: s.text,
        expected: s.expected,
        image: `/scenarios/${s.image}`
      }))))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (isTeacherMode) {
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
          image: `/scenarios/${s.image}`
        }))))
        .catch(console.error);
    }
  }, [isTeacherMode]);

  const toggleAppLock = async () => {
    try {
      const newLockState = !isAppLocked;
      const response = await fetch("/api/teacher/toggle-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: newLockState }),
      });
      if (response.ok) {
        setIsAppLocked(newLockState);
      }
    } catch (error) {
      console.error("Failed to toggle lock:", error);
    }
  };

  const savePromptTemplate = async () => {
    if (!promptTemplate.includes("{{STUDENT_PROMPT}}")) {
      setTemplateError("Template must include {{STUDENT_PROMPT}} placeholder");
      return;
    }
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

  const refreshScenarios = async () => {
    try {
      const response = await fetch("/api/teacher/scenarios");
      const data = await response.json();
      setScenarios(data.map((s: any) => ({
        id: s.id,
        text: s.text,
        expected: s.expected,
        image: `/scenarios/${s.image}`
      })));
    } catch (error) {
      console.error("Failed to refresh scenarios:", error);
    }
  };

  const handleAddScenario = async () => {
    if (!scenarioForm.text || !scenarioImage) return;
    setScenarioSaving(true);
    try {
      const formData = new FormData();
      formData.append("text", scenarioForm.text);
      formData.append("expected", scenarioForm.expected);
      formData.append("image", scenarioImage);
      
      const response = await fetch("/api/teacher/scenarios", {
        method: "POST",
        body: formData,
      });
      
      if (response.ok) {
        await refreshScenarios();
        setNewScenarioDialog(false);
        setScenarioForm({ text: "", expected: "Allowed" });
        setScenarioImage(null);
      }
    } catch (error) {
      console.error("Failed to add scenario:", error);
    } finally {
      setScenarioSaving(false);
    }
  };

  const handleUpdateScenario = async () => {
    if (!editingScenario) return;
    setScenarioSaving(true);
    try {
      const formData = new FormData();
      formData.append("text", scenarioForm.text);
      formData.append("expected", scenarioForm.expected);
      if (scenarioImage) {
        formData.append("image", scenarioImage);
      }
      
      const response = await fetch(`/api/teacher/scenarios/${editingScenario.id}`, {
        method: "PUT",
        body: formData,
      });
      
      if (response.ok) {
        await refreshScenarios();
        setEditingScenario(null);
        setScenarioForm({ text: "", expected: "Allowed" });
        setScenarioImage(null);
      }
    } catch (error) {
      console.error("Failed to update scenario:", error);
    } finally {
      setScenarioSaving(false);
    }
  };

  const handleDeleteScenario = async (id: number) => {
    if (!confirm("Are you sure you want to delete this scenario?")) return;
    try {
      const response = await fetch(`/api/teacher/scenarios/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await refreshScenarios();
      }
    } catch (error) {
      console.error("Failed to delete scenario:", error);
    }
  };

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

  useEffect(() => {
    const storedEmail = getStoredEmail();
    if (storedEmail) {
      loginStudent(storedEmail);
    } else {
      setShowEmailDialog(true);
    }
  }, []);

  useEffect(() => {
    if (isTeacherMode) {
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
  }, [isTeacherMode]);

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

  const verifyTeacherPassword = async () => {
    try {
      const response = await fetch("/api/verify-teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setIsTeacherMode(true);
        setShowPasswordDialog(false);
        setPassword("");
        setPasswordError("");
      } else {
        setPasswordError("Incorrect password");
      }
    } catch {
      setPasswordError("Failed to verify password");
    }
  };

  const toggleTeacherMode = () => {
    if (isTeacherMode) {
      setIsTeacherMode(false);
    } else {
      setShowPasswordDialog(true);
    }
  };

  const handleDeleteStudent = async (id: number) => {
    try {
      const response = await fetch(`/api/teacher/students/${id}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        setDeleteConfirmDialog(null);
      }
    } catch (error) {
      console.error("Failed to delete student:", error);
    }
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

      if (!response.ok) {
        const data = await response.json();
        const errorMsg = data.details || data.error || "Failed to run test";
        throw new Error(errorMsg);
      }

      const data: TestResponse = await response.json();
      setResults(data);

      if (promptDoctorEnabled) {
        setPromptDoctorLoading(true);
        try {
          const doctorResponse = await fetch("/api/prompt-doctor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              studentPrompt: instructions,
              model: selectedModel
            }),
          });
          
          if (doctorResponse.ok) {
            const feedback = await doctorResponse.json();
            setPromptDoctorFeedback(feedback);
            setShowPromptDoctorModal(true);
          }
        } catch (doctorErr) {
          console.error("Prompt Doctor error:", doctorErr);
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
          if (loginData.versions && loginData.versions.length > 0) {
            const matchingVersion = loginData.versions.find((v: PromptVersion) => v.text === instructions.trim());
            if (matchingVersion) {
              setSelectedVersion(matchingVersion.id);
            } else {
              setSelectedVersion(loginData.versions[loginData.versions.length - 1].id);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
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
            <PawPrint className="w-10 h-10" />
            <h1 className="text-2xl md:text-3xl font-bold">
              Prompt 101: AI Safety Lab
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {email && !isTeacherMode && (
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
            <Button
              variant="outline"
              onClick={toggleTeacherMode}
              className={`flex items-center gap-2 ${isTeacherMode ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200' : 'bg-white/20 text-white border-white/40 hover:bg-white/30'}`}
            >
              {isTeacherMode ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              {isTeacherMode ? "Student Mode" : "Teacher Mode"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {isTeacherMode && (
          <div className="space-y-4">
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

            <TeacherDashboard 
              students={students} 
              onDeleteStudent={(id, email) => setDeleteConfirmDialog({ id, email })}
            />
          </div>
        )}

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
                  onClick={() => setModalImage({ id: scenario.id, image: scenario.image, text: scenario.text })}
                >
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm hover:shadow-lg hover:border-purple-400 transition-all">
                    <img
                      src={scenario.image}
                      alt={isTeacherMode ? scenario.text : `Scenario ${scenario.id}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    #{scenario.id}
                  </div>
                  {isTeacherMode && (
                    <p className="mt-1 text-xs text-gray-600 line-clamp-2 leading-tight">{scenario.text}</p>
                  )}
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
                  <span><strong>Allowed:</strong> Only real dogs or friendly dog-related content</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">🚫</span>
                  <span><strong>Prohibited:</strong> No selling dogs, no wild animals (wolves), no aggressive behavior, no food that sounds like "dog"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600 font-bold">⚠️</span>
                  <span><strong>Disturbing:</strong> Medical situations or injuries (even at a vet)</span>
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
                      Testing...
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

        {results && (
          <Card className="border-2 border-indigo-200">
            <CardHeader className="bg-indigo-50 border-b">
              <CardTitle className="flex items-center justify-between">
                <span>Test Results</span>
                <span className={`text-xl ${results.score === results.total ? 'text-green-600' : results.score >= 7 ? 'text-yellow-600' : 'text-red-600'}`}>
                  Score: {results.score}/{results.total} 
                  {results.score === results.total && " 🎉 Perfect!"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
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
                    {results.results.map((result) => {
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
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {!results && !isLoading && (
          <Card className="bg-gray-50 border-dashed border-2">
            <CardContent className="py-12 text-center text-gray-500">
              <PawPrint className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Write your moderation instructions above and click "Run Test" to see how well your AI safety rules work!</p>
            </CardContent>
          </Card>
        )}
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
                  setModalImage({ id: prev.id, image: prev.image, text: prev.text });
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
                  setModalImage({ id: next.id, image: next.image, text: next.text });
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
              <div className="p-4 bg-white">
                <p className="text-base font-medium text-gray-800">
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-bold mr-3">
                    #{modalImage.id}
                  </span>
                  {isTeacherMode && modalImage.text}
                </p>
              </div>
            </div>
          )}
          <DialogTitle className="sr-only">Scenario Image</DialogTitle>
        </DialogContent>
      </Dialog>

      <Dialog open={showLeaderboard} onOpenChange={setShowLeaderboard}>
        <DialogContent className="max-w-md">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Leaderboard
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLeaderboard}
              disabled={leaderboardLoading}
              className="ml-2 h-7 w-7 p-0"
            >
              {leaderboardLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
            </Button>
          </DialogTitle>
          <div className="space-y-2 pt-4 max-h-[400px] overflow-y-auto">
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

      <Dialog open={newScenarioDialog} onOpenChange={setNewScenarioDialog}>
        <DialogContent className="max-w-md">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Scenario
          </DialogTitle>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Textarea
                placeholder="Describe what the image shows..."
                value={scenarioForm.text}
                onChange={(e) => setScenarioForm(prev => ({ ...prev, text: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Expected Label</label>
              <Select value={scenarioForm.expected} onValueChange={(v) => setScenarioForm(prev => ({ ...prev, expected: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Allowed">✅ Allowed</SelectItem>
                  <SelectItem value="Prohibited">🚫 Prohibited</SelectItem>
                  <SelectItem value="Disturbing">⚠️ Disturbing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Image</label>
              <div className="mt-1">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setScenarioImage(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
              {scenarioImage && (
                <p className="text-xs text-green-600 mt-1">Selected: {scenarioImage.name}</p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setNewScenarioDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddScenario} disabled={scenarioSaving || !scenarioForm.text || !scenarioImage}>
                {scenarioSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Scenario
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editingScenario !== null} onOpenChange={() => setEditingScenario(null)}>
        <DialogContent className="max-w-md">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            Edit Scenario
          </DialogTitle>
          <div className="space-y-4 pt-4">
            {editingScenario && (
              <div className="w-32 h-32 mx-auto rounded-lg overflow-hidden border-2 border-gray-200">
                <img
                  src={editingScenario.image}
                  alt={editingScenario.text}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Textarea
                placeholder="Describe what the image shows..."
                value={scenarioForm.text}
                onChange={(e) => setScenarioForm(prev => ({ ...prev, text: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Expected Label</label>
              <Select value={scenarioForm.expected} onValueChange={(v) => setScenarioForm(prev => ({ ...prev, expected: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Allowed">✅ Allowed</SelectItem>
                  <SelectItem value="Prohibited">🚫 Prohibited</SelectItem>
                  <SelectItem value="Disturbing">⚠️ Disturbing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Replace Image (optional)</label>
              <div className="mt-1">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setScenarioImage(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
              {scenarioImage && (
                <p className="text-xs text-green-600 mt-1">New image: {scenarioImage.name}</p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingScenario(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateScenario} disabled={scenarioSaving || !scenarioForm.text}>
                {scenarioSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Enter Teacher Password
          </DialogTitle>
          <div className="space-y-4 pt-4">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  verifyTeacherPassword();
                }
              }}
            />
            {passwordError && (
              <p className="text-red-600 text-sm">{passwordError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setShowPasswordDialog(false);
                setPassword("");
                setPasswordError("");
              }}>
                Cancel
              </Button>
              <Button onClick={verifyTeacherPassword}>
                Unlock
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmDialog !== null} onOpenChange={() => setDeleteConfirmDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" />
            Delete User
          </DialogTitle>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <strong>{deleteConfirmDialog?.email}</strong>? This will permanently remove all their prompts and data.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirmDialog(null)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => deleteConfirmDialog && handleDeleteStudent(deleteConfirmDialog.id)}
              >
                Delete User
              </Button>
            </div>
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
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or</span>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEmailDialog(false);
                setShowPasswordDialog(true);
              }}
              className="w-full"
            >
              <Lock className="w-4 h-4 mr-2" />
              Enter as Teacher
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

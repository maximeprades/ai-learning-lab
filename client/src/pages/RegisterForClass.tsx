import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ChevronLeft, UserPlus, CheckCircle, Pencil, Loader2 } from "lucide-react";

const STORAGE_KEY = "ailab.registration";

interface RegistrationData {
  name: string;
  email: string;
  teamName: string;
}

export default function RegisterForClass() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [teamName, setTeamName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data: RegistrationData = JSON.parse(stored);
        setName(data.name);
        setEmail(data.email);
        setTeamName(data.teamName);
        setIsSubmitted(true);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (!teamName.trim()) {
      setError("Please enter your team name");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/register-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: name.trim(), 
          email: email.trim().toLowerCase(), 
          teamName: teamName.trim() 
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Registration failed");
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        teamName: teamName.trim()
      }));

      setIsSubmitted(true);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data: RegistrationData = JSON.parse(stored);
      setName(data.name);
      setEmail(data.email);
      setTeamName(data.teamName);
    }
    setIsEditing(false);
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 p-8">
      <div className="max-w-md mx-auto">
        <a href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-8">
          <ChevronLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </a>

        <Card className="border-2 border-blue-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <UserPlus className="w-6 h-6" />
              Register for Class
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isSubmitted && !isEditing ? (
              <div className="text-center py-4">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">You're Registered!</h3>
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm text-gray-600 mb-1"><strong>Name:</strong> {name}</p>
                  <p className="text-sm text-gray-600 mb-1"><strong>Email:</strong> {email}</p>
                  <p className="text-sm text-gray-600"><strong>Team:</strong> {teamName}</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleEdit}
                  className="flex items-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Edit Registration
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Student Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Student Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@school.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-base"
                    disabled={isSubmitted && isEditing}
                  />
                  {isSubmitted && isEditing && (
                    <p className="text-xs text-gray-500">Email cannot be changed after registration</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teamName">Team Name</Label>
                  <Input
                    id="teamName"
                    type="text"
                    placeholder="Enter your team name"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="text-base"
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}

                <div className="flex gap-3">
                  {isEditing && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleCancel}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isEditing ? "Updating..." : "Registering..."}
                      </>
                    ) : (
                      isEditing ? "Update Registration" : "Register"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

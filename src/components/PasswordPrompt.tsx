import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkPassword, submitPassword, setPassword } from "../api";

interface PasswordPromptProps {
  onUnlocked: () => void;
}

export function PasswordPrompt({ onUnlocked }: PasswordPromptProps) {
  const [password, setPasswordValue] = useState("");
  const [error, setError] = useState("");
  const [isNew, setIsNew] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if a password exists on mount
  useState(() => {
    checkPassword().then(({ hasPassword }) => {
      setIsNew(!hasPassword);
      setLoading(false);
    });
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setError("");
    const result = await submitPassword(password);
    if (result.ok) {
      setPassword(password);
      onUnlocked();
    } else {
      setError(result.error || "Invalid password");
    }
  };

  if (loading) return null;

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div className="flex flex-col items-center gap-2 mb-6">
          <Lock className="size-8 text-muted-foreground" />
          <h1 className="text-lg font-semibold">
            {isNew ? "Create Password" : "Unlock WADM"}
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            {isNew
              ? "Set a password to encrypt your decision matrices."
              : "Enter your password to decrypt your data."}
          </p>
        </div>
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPasswordValue(e.target.value)}
          autoFocus
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" className="w-full">
          {isNew ? "Set Password" : "Unlock"}
        </Button>
      </form>
    </div>
  );
}

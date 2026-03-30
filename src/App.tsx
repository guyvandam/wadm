import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { WadmList } from "./components/WadmList";
import { WadmEditor } from "./components/WadmEditor";
import { PasswordPrompt } from "./components/PasswordPrompt";
import { useRoute } from "./hooks/useRoute";
import { isDemoMode, detectMode } from "./api-switch";
import "./index.css";

// Clear demo data on fresh page load (spec: data deleted on refresh)
localStorage.removeItem("wadm-demo-data");
// Reset to home so user doesn't land on a deleted WADM
if (window.location.hash && window.location.hash !== "#/") {
  window.location.hash = "#/";
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("theme") === "dark" ||
        (!localStorage.getItem("theme") &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
      );
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDark((d) => !d)}
          className="fixed top-4 right-4 z-50"
        >
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Toggle dark mode</TooltipContent>
    </Tooltip>
  );
}

export function App() {
  const { route, navigate } = useRoute();
  const [unlocked, setUnlocked] = useState(false);
  const [modeDetected, setModeDetected] = useState(false);

  // Detect if we're in demo mode (no server)
  useEffect(() => {
    detectMode().then(() => setModeDetected(true));
  }, []);

  // Warn before refresh — demo data is lost on reload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (localStorage.getItem("wadm-demo-data")) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  if (!modeDetected) return null;

  // Skip password prompt in demo mode (Vercel static deploy)
  const showPasswordPrompt = !unlocked && !isDemoMode();

  return (
    <TooltipProvider delayDuration={300}>
      <ThemeToggle />
      {showPasswordPrompt ? (
        <PasswordPrompt onUnlocked={() => setUnlocked(true)} />
      ) : route.page === "list" ? (
        <WadmList
          onNavigate={(id) => navigate({ page: "edit", id })}
        />
      ) : (
        <WadmEditor
          wadmId={route.id}
          onBack={() => navigate({ page: "list" })}
        />
      )}
    </TooltipProvider>
  );
}

export default App;

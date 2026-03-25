import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { WadmList } from "./components/WadmList";
import { WadmEditor } from "./components/WadmEditor";
import { useRoute } from "./hooks/useRoute";
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

  return (
    <TooltipProvider delayDuration={300}>
      <ThemeToggle />
      {route.page === "list" ? (
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

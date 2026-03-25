import { useState, useEffect, useCallback } from "react";

export type Route =
  | { page: "list" }
  | { page: "edit"; id: string };

function parseHash(): Route {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith("/edit/")) {
    return { page: "edit", id: hash.slice(6) };
  }
  return { page: "list" };
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((route: Route) => {
    if (route.page === "list") {
      window.location.hash = "#/";
    } else {
      window.location.hash = `#/edit/${route.id}`;
    }
  }, []);

  return { route, navigate };
}

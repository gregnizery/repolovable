import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * useFailsafeRedirect
 * Circuit-breaker to prevent infinite redirect loops (ERR-1965).
 * Tracks redirects in sessionStorage and returns shouldBlock if threshold is exceeded.
 */
export function useFailsafeRedirect() {
    const location = useLocation();
    const [shouldBlock, setShouldBlock] = useState(false);

    useEffect(() => {
        const now = Date.now();
        const storageKey = "planify_redirect_log";
        const threshold = 10; // Max 10 redirects...
        const windowMs = 5000; // ...in 5 seconds.

        try {
            const logString = sessionStorage.getItem(storageKey);
            let logs: number[] = logString ? JSON.parse(logString) : [];

            // Filter logs to only keep those within the window
            logs = logs.filter(timestamp => now - timestamp < windowMs);

            // Add current redirect
            logs.push(now);

            // Save back to session storage
            sessionStorage.setItem(storageKey, JSON.stringify(logs));

            if (logs.length >= threshold) {
                console.error("CRITICAL: Redirect loop detected (Circuit Breaker triggered)");
                setShouldBlock(true);
            }
        } catch (e) {
            console.error("Failsafe check failed", e);
        }
    }, [location.pathname]);

    const clearFailsafe = () => {
        sessionStorage.removeItem("planify_redirect_log");
        setShouldBlock(false);
    };

    return { shouldBlock, clearFailsafe };
}

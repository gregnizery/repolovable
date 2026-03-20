import { useState, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Calendar as BigCalendar, dateFnsLocalizer, View, Views } from "react-big-calendar";
import type { Event as CalendarEvent } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { fr } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useMissions } from "@/hooks/use-data";
import { useUserRole } from "@/hooks/use-user-role";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Info, Copy, ExternalLink } from "lucide-react";

const locales = { "fr": fr };

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

// Extend CalendarEvent to include our custom properties
interface MissionEvent extends CalendarEvent {
    id: string;
    status: string;
    location?: string;
    clientName?: string;
    assignments?: any[];
    resource?: any;
}

const calendarMessages = {
    next: "Suivant",
    previous: "Précédent",
    today: "Aujourd'hui",
    month: "Mois",
    week: "Semaine",
    day: "Jour",
    agenda: "Agenda",
    date: "Date",
    time: "Heure",
    event: "Événement",
    noEventsInRange: "Aucune mission sur cette période.",
};

const eventPropGetter = (event: MissionEvent) => {
    let backgroundColor = "#3b82f6"; // default blue
    let borderColor = "#2563eb";

    switch (event.status) {
        case "en_cours":
            backgroundColor = "#f59e0b"; // warning 
            borderColor = "#d97706";
            break;
        case "terminée":
            backgroundColor = "#10b981"; // success
            borderColor = "#059669";
            break;
        case "annulée":
            backgroundColor = "#9ca3af"; // muted
            borderColor = "#6b7280";
            break;
        case "planifiée":
        default:
            // Use primary color config if known, else default blue
            break;
    }

    return {
        style: {
            backgroundColor,
            borderColor,
            borderRadius: "8px",
            color: "#fff",
            border: "1px solid " + borderColor,
            opacity: 0.9,
            padding: "2px 4px",
        },
    };
};

const EventComponent = ({ event }: { event: MissionEvent }) => {
    return (
        <div className="flex flex-col h-full justify-center overflow-hidden text-xs">
            <div className="font-semibold truncate">{event.title}</div>
            {event.clientName && (
                <div className="text-[10px] truncate opacity-90">{event.clientName}</div>
            )}
        </div>
    );
};

const calendarComponents = {
    event: EventComponent,
};

export default function Calendrier() {
    const { data: missions = [], isLoading } = useMissions();
    const { data: roleData } = useUserRole();
    const { user } = useAuth();
    const navigate = useNavigate();

    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
            return data;
        },
        enabled: !!user,
    });

    const calendarFeedUrl = (profile as any)?.calendar_token
        ? `https://usixljyrqcaaapksjyff.functions.supabase.co/get-calendar-feed?token=${(profile as any).calendar_token}`
        : null;

    const [view, setView] = useState<View>(Views.MONTH);
    const [date, setDate] = useState(new Date());

    const events: MissionEvent[] = useMemo(() => {
        return missions
            .filter((m) => m.start_date && m.end_date)
            .map((m) => ({
                id: m.id,
                title: m.title,
                start: new Date(m.start_date!),
                end: new Date(m.end_date!),
                status: m.status,
                location: m.location,
                clientName: m.clients?.name,
                assignments: Array.isArray(m.mission_assignments) ? m.mission_assignments : [],
            }));
    }, [missions]);

    const handleSelectEvent = (event: MissionEvent) => {
        navigate(`/missions/${event.id}`);
    };

    return (
        <AppLayout>
            <div className="space-y-6 max-w-7xl h-full flex flex-col">
                <div>
                    <h1 className="text-2xl font-display font-bold">Calendrier</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Visualisez et gérez toutes vos missions dans le temps.
                    </p>
                </div>

                <Card className="shadow-card border-border/50 flex-1 min-h-[600px] overflow-hidden">
                    <CardContent className="p-4 sm:p-6 h-full flex flex-col">
                        <style>
                            {`
                .rbc-calendar { font-family: inherit; }
                .rbc-btn-group button { border-radius: 8px; font-weight: 500; font-size: 13px; color: hsl(var(--foreground)); border-color: hsl(var(--border)); }
                .rbc-btn-group button.rbc-active { background-color: hsl(var(--primary)); color: white; border-color: hsl(var(--primary)); }
                .rbc-month-view, .rbc-time-view { border-radius: 12px; overflow: hidden; border-color: hsl(var(--border)); }
                .rbc-header { padding: 10px; font-weight: 600; text-transform: capitalize; border-bottom: 2px solid hsl(var(--border)); }
                .rbc-today { background-color: hsl(var(--primary) / 0.05); }
                .rbc-event { box-shadow: 0 1px 2px rgba(0,0,0,0.1); transition: transform 0.1s; }
                .rbc-event:hover { transform: translateY(-1px); z-index: 10; opacity: 1 !important; }
                .rbc-off-range-bg { background-color: hsl(var(--muted)/0.3); }
              `}
                        </style>

                        <div className="h-full w-full min-h-[600px]">
                            {isLoading ? (
                                <div className="w-full h-full flex items-center justify-center min-h-[400px]">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : (
                                <BigCalendar
                                    localizer={localizer}
                                    events={events}
                                    startAccessor="start"
                                    endAccessor="end"
                                    style={{ height: "calc(100vh - 200px)", minHeight: "600px" }}
                                    messages={calendarMessages}
                                    culture="fr"
                                    views={["month", "week", "day"]}
                                    view={view}
                                    date={date}
                                    onView={(newView) => setView(newView)}
                                    onNavigate={(newDate) => setDate(newDate)}
                                    onSelectEvent={handleSelectEvent}
                                    eventPropGetter={eventPropGetter}
                                    components={calendarComponents}
                                    popup
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Calendar Sync Section */}
                <Card className="shadow-card border-border/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-display flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-primary" /> Synchronisation externe
                        </CardTitle>
                        <CardDescription>Abonnez-vous à vos missions depuis Google Calendar, Apple Calendar ou Outlook.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/50 flex flex-col gap-3">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Utilisez ce lien iCal pour synchroniser automatiquement vos missions.
                                <span className="text-warning font-medium"> Ne partagez pas ce lien.</span>
                            </p>
                            <div className="flex gap-2">
                                <Input
                                    readOnly
                                    value={calendarFeedUrl || "Chargement..."}
                                    className="font-mono text-[10px] bg-background"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!calendarFeedUrl}
                                    onClick={() => {
                                        if (calendarFeedUrl) {
                                            navigator.clipboard.writeText(calendarFeedUrl);
                                            toast.success("Lien copié !");
                                        }
                                    }}
                                    className="gap-1.5"
                                >
                                    <Copy className="h-3.5 w-3.5" /> Copier
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Button
                                variant="outline"
                                className="rounded-xl gap-2 justify-start text-sm h-11"
                                disabled={!calendarFeedUrl}
                                onClick={() => {
                                    if (calendarFeedUrl) {
                                        window.open(`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calendarFeedUrl.replace("https://", "webcal://"))}`, "_blank");
                                    }
                                }}
                            >
                                <ExternalLink className="h-4 w-4 text-primary" /> Google Calendar
                            </Button>
                            <Button
                                variant="outline"
                                className="rounded-xl gap-2 justify-start text-sm h-11"
                                disabled={!calendarFeedUrl}
                                onClick={() => {
                                    if (calendarFeedUrl) {
                                        window.open(calendarFeedUrl.replace("https://", "webcal://"), "_self");
                                    }
                                }}
                            >
                                <ExternalLink className="h-4 w-4 text-muted-foreground" /> Apple Calendar
                            </Button>
                            <Button
                                variant="outline"
                                className="rounded-xl gap-2 justify-start text-sm h-11"
                                disabled={!calendarFeedUrl}
                                onClick={() => {
                                    if (calendarFeedUrl) {
                                        window.open(`https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(calendarFeedUrl)}&name=Planify%20Missions`, "_blank");
                                    }
                                }}
                            >
                                <ExternalLink className="h-4 w-4 text-info" /> Outlook
                            </Button>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <Info className="h-3.5 w-3.5" /> Les missions annulées ne sont pas incluses dans le flux.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

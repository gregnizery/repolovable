import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        // You could also log the error to an external service like Sentry here
    }

    private generateErrorCode(error?: Error): string {
        if (!error) return "ERR-UNKNOWN";
        const hash = error.message.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return `ERR-${hash.toString(16).toUpperCase().slice(-4)}`;
    }

    private copyToClipboard = () => {
        const text = `Error Code: ${this.generateErrorCode(this.state.error)}\nMessage: ${this.state.error?.message}\nStack: ${this.state.error?.stack}`;
        navigator.clipboard.writeText(text);
        alert("Détails de l'erreur copiés dans le presse-papier.");
    };

    public render() {
        if (this.state.hasError) {
            const errorCode = this.generateErrorCode(this.state.error);
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-6 shadow-sm border border-destructive/20">
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    <h1 className="text-2xl font-display font-bold mb-2">Oups ! Quelque chose s'est mal passé.</h1>
                    <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                        Une erreur inattendue est survenue. Nous avons été notifiés et nous travaillons sur une résolution.
                    </p>

                    <div className="mb-8 p-3 bg-muted/50 rounded-lg border border-border inline-flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">Code d'erreur :</span>
                        <code className="text-xs font-mono font-bold bg-destructive/10 text-destructive px-2 py-0.5 rounded">{errorCode}</code>
                    </div>

                    <div className="flex flex-wrap gap-4 justify-center">
                        <Button
                            variant="outline"
                            onClick={() => this.setState({ hasError: false })}
                            className="rounded-xl border-border hover:bg-muted"
                        >
                            Réessayer
                        </Button>
                        <Button
                            onClick={() => window.location.reload()}
                            className="gradient-primary text-white rounded-xl gap-2 shadow-lg hover:shadow-primary/20 transition-all"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Recharger la page
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={this.copyToClipboard}
                            className="w-full sm:w-auto mt-4 sm:mt-0 text-xs text-muted-foreground hover:text-foreground"
                        >
                            Copier les détails techniques
                        </Button>
                    </div>

                    {(process.env.NODE_ENV === "development" || window.location.hostname === "localhost") && (
                        <div className="mt-12 p-5 bg-card rounded-2xl text-left overflow-auto max-w-full border border-border/60 shadow-card">
                            <p className="text-[10px] font-mono text-muted-foreground mb-2 uppercase tracking-widest border-b border-border/60 pb-2">Debug Console</p>
                            <p className="text-xs font-mono text-destructive/90 mb-2 font-bold">{this.state.error?.name}: {this.state.error?.message}</p>
                            <pre className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                                {this.state.error?.stack}
                            </pre>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Rocket, ArrowLeft, Loader2, ShieldCheck, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function VerifyEmail() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast } = useToast();
    const email = searchParams.get("email") || "";

    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [timer, setTimer] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (!email) {
            navigate("/login");
        }
    }, [email, navigate]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) {
            // Handle paste
            const pastedData = value.slice(0, 6).split("");
            const newOtp = [...otp];
            pastedData.forEach((char, i) => {
                if (i + index < 6) newOtp[i + index] = char;
            });
            setOtp(newOtp);
            // Focus last filled input or next empty
            const nextIndex = Math.min(index + pastedData.length, 5);
            const nextInput = document.getElementById(`otp-${nextIndex}`);
            nextInput?.focus();
            return;
        }

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = otp.join("");
        if (token.length < 6) {
            toast({
                title: "Code incomplet",
                description: "Veuillez saisir les 6 chiffres du code reçu par e-mail.",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.verifyOtp({
                email,
                token,
                type: "signup",
            });

            if (error) throw error;

            toast({
                title: "Compte vérifié !",
                description: "Bienvenue sur Planify. Votre compte est maintenant activé.",
            });

            // Clear any redirect loops failsafe just in case
            sessionStorage.removeItem("planify_redirect_log");

            setShowSuccess(true);
        } catch (error: any) {
            toast({
                title: "Erreur de vérification",
                description: error.message || "Le code saisi est incorrect ou a expiré.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (timer > 0) return;

        setResending(true);
        try {
            const { error } = await supabase.auth.resend({
                type: "signup",
                email,
            });
            if (error) throw error;

            toast({
                title: "Code renvoyé",
                description: "Un nouveau code de vérification a été envoyé à votre adresse.",
            });
            setTimer(60); // 60 seconds cooldown
        } catch (error: any) {
            toast({
                title: "Erreur",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6 forced-light text-foreground">
            <div className="w-full max-w-sm space-y-8 text-center">
                <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-xl font-display">P</div>
                    <span className="font-display font-bold text-2xl tracking-tight text-foreground">Planify</span>
                </div>

                <AnimatePresence mode="wait">
                    {!showSuccess ? (
                        <motion.div
                            key="verify-form"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            <div className="relative mx-auto w-24 h-24">
                                <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
                                <div className="relative w-full h-full bg-card rounded-3xl border-2 border-primary/20 flex items-center justify-center shadow-card rotate-3">
                                    <ShieldCheck className="h-10 w-10 text-primary" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Vérification de sécurité</h1>
                                <p className="text-muted-foreground text-sm leading-relaxed px-4">
                                    Saisissez le code à 6 chiffres envoyé à <br />
                                    <span className="font-bold text-foreground">{email}</span>
                                </p>
                            </div>

                            <form onSubmit={handleVerify} className="space-y-8">
                                <div className="flex justify-center gap-2">
                                    {otp.map((digit, index) => (
                                        <Input
                                            key={index}
                                            id={`otp-${index}`}
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            maxLength={6} // High for paste handling
                                            value={digit}
                                            onChange={(e) => handleOtpChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            className="w-11 h-14 text-center text-2xl font-bold rounded-xl border-border/80 focus:ring-primary/20 focus:border-primary transition-all p-0"
                                            autoFocus={index === 0}
                                        />
                                    ))}
                                </div>

                                <div className="space-y-4">
                                    <Button
                                        type="submit"
                                        disabled={loading || otp.join("").length < 6}
                                        className="w-full h-12 gradient-primary text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Vérifier le compte"}
                                    </Button>

                                    <div className="flex flex-col gap-2">
                                        <Button
                                            type="button"
                                            asChild
                                            variant="ghost"
                                            className="h-11 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all gap-2"
                                        >
                                            <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer">
                                                <Mail className="h-4 w-4" />
                                                Ouvrir ma boîte mail
                                                <Rocket className="h-3.5 w-3.5" />
                                            </a>
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            disabled={timer > 0 || resending}
                                            onClick={handleResend}
                                            className="text-xs text-muted-foreground hover:text-foreground h-8"
                                        >
                                            {resending ? (
                                                <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                            ) : timer > 0 ? (
                                                `Renvoyer le code (${timer}s)`
                                            ) : (
                                                <span className="flex items-center gap-1.5 font-medium text-primary">
                                                    <RefreshCw className="w-3 h-3" />
                                                    Renvoyer un nouveau code
                                                </span>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </form>

                            <div className="pt-4 mt-4 border-t border-border/70">
                                <Button
                                    variant="link"
                                    onClick={() => navigate("/login")}
                                    className="text-muted-foreground text-xs hover:text-foreground gap-2 no-underline"
                                >
                                    <ArrowLeft className="h-3 w-3" />
                                    Retour à la connexion
                                </Button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="success-screen"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-8"
                        >
                            <div className="relative mx-auto w-24 h-24">
                                <div className="absolute inset-0 bg-success/10 rounded-full animate-ping" />
                                <div className="relative w-full h-full gradient-success rounded-3xl flex items-center justify-center shadow-card">
                                    <ShieldCheck className="h-12 w-12 text-white" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Compte confirmé !</h1>
                                <p className="text-muted-foreground text-sm leading-relaxed px-4">
                                    Votre adresse e-mail a été vérifiée avec succès. Vous pouvez maintenant accéder à votre espace Planify.
                                </p>
                            </div>

                            <Button
                                onClick={() => navigate("/dashboard", { replace: true })}
                                className="w-full h-12 gradient-primary text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                            >
                                Accéder au tableau de bord
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

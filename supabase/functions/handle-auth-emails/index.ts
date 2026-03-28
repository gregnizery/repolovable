import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import nodemailer from "npm:nodemailer@6.9.16"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AuthEmailPayload {
  type: string;
  email: string;
  data: {
    confirmation_url?: string;
    token?: string;
    token_hash?: string;
    redirect_to?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GMAIL_USER = Deno.env.get("GMAIL_USER");
    const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      throw new Error("Gmail credentials not configured");
    }

    const payload: AuthEmailPayload = await req.json();
    console.log("Full Webhook Payload received:", JSON.stringify(payload, null, 2));

    // Supabase often sends `user` object in webhooks inside the root payload or data
    // Let's extract type, email, and the code/token
    // Note: The structure depends on if this is an Auth Custom Email webhook or a Database Webhook.
    // Assuming Custom Auth Email Webhook format which provides "token" directly
    const type = payload.type || payload.user?.email_action_type || "signup";
    const email = payload.email || payload.user?.email;
    const token = payload.data?.token || payload.user?.token || "000000";

    console.log(`Processing auth email type: ${type} for ${email} with token ${token}`);

    let subject = "";
    let title = "";
    let content = "";
    let explanation = "";

    switch (type) {
      case "signup":
      case "signup_confirmation":
        subject = "Votre code de sécurité Planify";
        title = "Vérification de sécurité";
        content = "Pour finaliser la création de votre compte Planify, veuillez saisir le code de sécurité à 6 chiffres ci-dessous.";
        explanation = "Ce code expirera dans 1 heure.";
        break;
      case "recovery":
        subject = "Votre code de récupération Planify";
        title = "Récupération de compte";
        content = "Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte Planify. Voici votre code de validation.";
        explanation = "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité. Votre mot de passe reste de toute façon protégé.";
        break;
      case "email_change":
      case "email_change_confirmation":
        subject = "Confirmez votre nouvel email Planify";
        title = "Changement d'email";
        content = "Veuillez confirmer votre nouvelle adresse email en saisissant le code ci-dessous sur l'application.";
        explanation = "Vous aviez demandé à modifier votre email principal sur Planify.";
        break;
      case "magiclink":
        subject = "Votre code de connexion Planify";
        title = "Connexion sécurisée";
        content = "Utilisez ce code d'accès unique pour vous connecter instantanément à votre espace.";
        explanation = "Ce code est à usage unique et n'est valable qu'une seule fois.";
        break;
      default:
        subject = "Sécurité de votre compte Planify";
        title = "Action requise";
        content = "Une action est requise sur votre compte Planify. Veuillez utiliser le code ci-dessous pour confirmer votre identité.";
        explanation = "Ne partagez jamais ce code de sécurité avec un tiers.";
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 40px 20px; color: #111827;">
  <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01);">
    
    <!-- Header with Shield -->
    <div style="padding: 40px 40px 24px 40px; text-align: center; border-bottom: 1px solid #f3f4f6;">
      <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
        <!-- Shield Icon Native SVG translated to basic shapes for email clients -->
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto; padding-top: 14px;">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <path d="M9 12l2 2 4-4"></path>
        </svg>
      </div>
      <h1 style="font-size: 22px; font-weight: 700; margin: 0; color: #111827; letter-spacing: -0.01em;">${title}</h1>
    </div>

    <!-- Body -->
    <div style="padding: 32px 40px;">
      <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 24px 0; text-align: center;">
        ${content}
      </p>
      
      <!-- OTP Code Box -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
        <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 0.15em; color: #0f172a;">
          ${token}
        </span>
      </div>
      
      <p style="font-size: 13px; line-height: 1.5; color: #6b7280; margin: 0; text-align: center;">
        ${explanation}
      </p>
    </div>
    
    <!-- Footer -->
    <div style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
      <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px; padding-top: 2px;">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
        <span style="font-size: 12px; font-weight: 600; color: #10b981; text-transform: uppercase; letter-spacing: 0.05em; vertical-align: middle;">Email sécurisé par Planify</span>
      </div>
      <p style="font-size: 11px; color: #9ca3af; margin: 0; line-height: 1.5;">
        Ceci est un message automatique sécurisé.<br>
        © ${new Date().getFullYear()} Planify. Tous droits réservés.
      </p>
    </div>
  </div>
</body>
</html>`;

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });

    await transporter.sendMail({
      from: `"PLANIFY SECURE SYSTEM" <${GMAIL_USER}>`,
      to: email,
      subject: subject,
      html: htmlContent,
    });

    console.log(`Email successfully sent via Gmail to ${email} (Type: ${type})`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error sending auth email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})

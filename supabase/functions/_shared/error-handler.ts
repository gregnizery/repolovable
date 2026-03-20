export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateErrorCode(error: any): string {
    if (!error) return "ERR-UNKNOWN";
    const message = error.message || String(error);
    const hash = message.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    return `ERR-EF-${hash.toString(16).toUpperCase().slice(-4)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function errorResponse(error: any, status = 500) {
    const code = generateErrorCode(error);
    console.error(`[${code}] Edge Function Error:`, error);

    return new Response(
        JSON.stringify({
            error: error.message || error,
            code: code,
            details: error.stack || null
        }),
        {
            status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
    );
}

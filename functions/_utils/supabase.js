// Minimal Supabase REST client for use inside Cloudflare Pages Functions
// (edge/server code — the supabase-js browser SDK isn't needed here, a
// plain fetch to PostgREST is enough and keeps the function small/fast).
//
// Same project + same public "anon"/publishable key already used in
// index.html on the client. That key is meant to be public (it only works
// through your Supabase Row Level Security policies), so reusing it here
// is safe and requires no new secret configuration.

export const SUPABASE_URL = "https://npgraykkxnjcbuufpzje.supabase.co";
export const SUPABASE_KEY = "sb_publishable_jTB-Gn6u6ufm8Y6lpa3RyA_h4co-X3c";

export async function supabaseRest(query) {

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${query}`,
        {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        }
    );

    if (!response.ok) {
        throw new Error(
            `Supabase REST request failed (${response.status}): ${query}`
        );
    }

    return response.json();

}

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
        const bodyText = await response.text().catch(function () { return ""; });
        throw new Error(
            `Supabase REST request failed (${response.status}): ${bodyText}`
        );
    }

    return response.json();

}

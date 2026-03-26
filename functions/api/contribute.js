export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { name, email, contributions, message, turnstileToken } = body;

    if (!name || !email || !turnstileToken) {
      return new Response(
        JSON.stringify({ message: "Missing required fields." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify Turnstile token
    const turnstileRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: (env.TURNSTILE_SECRET_KEY || "").trim(),
          response: turnstileToken,
        }),
      }
    );
    const turnstileData = await turnstileRes.json();

    if (!turnstileData.success) {
      console.log("Turnstile failed:", JSON.stringify(turnstileData));
      return new Response(
        JSON.stringify({ message: "Verification failed. Please try again." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Insert into Supabase
    const supabaseUrl = (env.SUPABASE_URL || "").trim();
    const supabaseKey = (env.SUPABASE_ANON_KEY || "").trim();
    console.log("env check:", {
      hasUrl: !!env.SUPABASE_URL,
      urlType: typeof env.SUPABASE_URL,
      urlPrefix: supabaseUrl.substring(0, 20),
      hasKey: !!env.SUPABASE_ANON_KEY,
      keyType: typeof env.SUPABASE_ANON_KEY,
      keyLen: supabaseKey.length,
    });

    const fetchUrl = `${supabaseUrl}/rest/v1/contributor_interest`;
    const authHeader = `Bearer ${supabaseKey}`;
    console.log("fetch debug:", {
      fetchUrl,
      apikeyLen: supabaseKey.length,
      authHeaderLen: authHeader.length,
      authHeaderStart: authHeader.substring(0, 20),
      authHeaderEnd: authHeader.substring(authHeader.length - 10),
    });
    const supabaseRes = await fetch(
      fetchUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          name,
          email,
          contributions: contributions || [],
          message: message || null,
        }),
      }
    );

    if (!supabaseRes.ok) {
      const errorText = await supabaseRes.text();
      console.log("Supabase error:", supabaseRes.status, errorText);
      return new Response(
        JSON.stringify({
          message: "Submission failed. Please try again.",
        }),
        {
          status: supabaseRes.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ message: "OK" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.log("Function error:", err.message, err.stack);
    return new Response(
      JSON.stringify({ message: "Internal error. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

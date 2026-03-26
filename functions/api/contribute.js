export async function onRequestPost(context) {
  const { request, env } = context;

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
        secret: env.TURNSTILE_SECRET_KEY,
        response: turnstileToken,
      }),
    }
  );
  const turnstileData = await turnstileRes.json();

  if (!turnstileData.success) {
    return new Response(
      JSON.stringify({ message: "Verification failed. Please try again." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // Insert into Supabase
  const supabaseRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/contributor_interest`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
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
    const data = await supabaseRes.json().catch(() => null);
    return new Response(
      JSON.stringify({
        message: data?.message || "Submission failed. Please try again.",
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
}

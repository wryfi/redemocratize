export async function onRequestPost(context) {
  const { request, env } = context;

  const body = await request.json();
  const { email, turnstileToken } = body;

  if (!email || !turnstileToken) {
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
        remoteip: request.headers.get("CF-Connecting-IP"),
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

  // Forward to Listmonk
  const listmonkRes = await fetch(
    `${env.LISTMONK_URL}/api/public/subscription`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        name: "",
        list_uuids: [env.LISTMONK_LIST_UUID],
      }),
    }
  );

  if (!listmonkRes.ok) {
    const data = await listmonkRes.json().catch(() => null);
    return new Response(
      JSON.stringify({
        message: data?.message || "Subscription failed. Please try again.",
      }),
      {
        status: listmonkRes.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(JSON.stringify({ message: "OK" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

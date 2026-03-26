export async function onRequestPost(context) {
  const { request, env } = context;

  try {
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
          secret: env.TURNSTILE_SECRET_KEY || "",
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

    // Forward to Listmonk
    const listmonkUrl = env.LISTMONK_URL || "";
    const listmonkRes = await fetch(
      `${listmonkUrl}/api/public/subscription`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: "",
          list_uuids: [env.LISTMONK_LIST_UUID || ""],
        }),
      }
    );

    if (!listmonkRes.ok) {
      const errorText = await listmonkRes.text();
      console.log("Listmonk error:", listmonkRes.status, errorText);
      return new Response(
        JSON.stringify({
          message: "Subscription failed. Please try again.",
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
  } catch (err) {
    console.log("Function error:", err.message, err.stack);
    return new Response(
      JSON.stringify({ message: "Internal error. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

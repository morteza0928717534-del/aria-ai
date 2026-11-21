/**
 * Netlify Serverless Function — Aria AI Chat
 * POST /api/chat
 */
export default async function handler(request) {
  // Accept POST only
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  // Read configuration from environment variables — never expose secrets
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

  if (!apiKey || !model) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const messages = body.messages;

  // Validate messages is an array
  if (!Array.isArray(messages)) {
    return new Response(
      JSON.stringify({ error: "messages must be an array" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // At most 20 entries
  if (messages.length > 20) {
    return new Response(
      JSON.stringify({ error: "messages must have at most 20 entries" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate each message
  for (const msg of messages) {
    if (!msg.role || (msg.role !== "user" && msg.role !== "assistant")) {
      return new Response(
        JSON.stringify({ error: "Each message must have role 'user' or 'assistant'" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (typeof msg.content !== "string" || msg.content.length > 12000) {
      return new Response(
        JSON.stringify({ error: "Each message content must be a string up to 12000 characters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Insert Persian Aria system message at the beginning
  const systemMessage = {
    role: "system",
    content: "تو Aria هستی، دستیار هوشمند فارسی‌زبان. با لحن محترمانه و مفید پاسخ بده."
  };
  const fullMessages = [systemMessage, ...messages];

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: fullMessages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to get response from AI service" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const reply = data.choices?.[0]?.message?.content || "No response received";

    return new Response(
      JSON.stringify({ reply }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

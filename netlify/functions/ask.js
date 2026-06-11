// Netlify Function: /.netlify/functions/ask
// Answers free-form questions about the uploaded dossier using the Anthropic API.
// The browser performs retrieval (selects the most relevant rows) and sends only
// those rows here, so the full dataset never leaves the user's machine.
//
// Setup: in Netlify, add an environment variable named ANTHROPIC_API_KEY.

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "POST only" }) };
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return { statusCode: 503, body: JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { question, headers = [], rows = [], meta = {} } = payload;
  if (!question || !headers.length) {
    return { statusCode: 400, body: JSON.stringify({ error: "question and headers are required" }) };
  }

  // Cap context size defensively.
  const safeRows = rows.slice(0, 80).map((r) => r.map((c) => String(c).slice(0, 120)));
  const table =
    headers.join(" | ") +
    "\n" +
    safeRows.map((r) => r.join(" | ")).join("\n");

  const system =
    "You are the analysis assistant inside the Montana COPP Analytic Tool, used by staff of the " +
    "Montana Commissioner of Political Practices to review campaign finance and lobbying dossiers. " +
    "Answer the user's question using ONLY the retrieved rows provided. The rows are a relevance-ranked " +
    "subset of a larger file; say so if the question likely needs rows you were not given. " +
    "Be factual and plan-oriented, note caveats (e.g., this is a screen, not a legal finding), and never " +
    "speculate about intent or violations. Respond ONLY with a JSON object, no markdown fences, in this shape: " +
    '{"answer":"2-6 sentence analysis","chart":{"type":"bar|line|doughnut","label":"...","labels":["..."],"data":[1,2]}} ' +
    "Omit the chart property if a chart does not add value.";

  const user =
    `Question: ${question}\n\n` +
    `Source file: ${meta.file || "unknown"} / ${meta.sheet || ""} ` +
    `(${meta.totalRows || "?"} total rows; ${safeRows.length} most-relevant rows retrieved; ` +
    `${meta.corrections || 0} Phase 1 corrections applied).\n\n` +
    `Retrieved rows:\n${table}`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      return { statusCode: 502, body: JSON.stringify({ error: "Upstream error", detail: t.slice(0, 300) }) };
    }
    const data = await resp.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .replace(/```json|```/g, "")
      .trim();

    let out;
    try {
      out = JSON.parse(text);
    } catch {
      out = { answer: text };
    }
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(out),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

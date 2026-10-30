// Plain-language explanations of flags. Uses Gemini when GEMINI_API_KEY is set, Claude if only
// ANTHROPIC_API_KEY is set, and a deterministic template otherwise.
function template(flag, detail) {
  switch (flag.type) {
    case 'OVER_INTAKE':
      return `Enrolment in this programme is ${detail.enrolled} against an approved intake of ${detail.intake} (${Math.round((detail.enrolled / detail.intake) * 100)}%). Verify admission records and check whether any seats were filled beyond the AICTE approval.`;
    case 'ANOMALY':
      return `This institution's enrolment pattern deviates from its peers (${(detail.reasons || []).join('; ') || 'unusual combination of indicators'}). Recommend a sample audit of recent admissions.`;
    case 'CROSS_DUP':
      return 'The same APAAR ID is active at two institutions in overlapping periods. One enrolment is probably stale; both institutions have been asked to confirm.';
    default:
      return flag.message;
  }
}

export async function explainFlag(flag, detail) {
  const prompt = `You are an assistant for AICTE reviewers. In 2 short sentences, explain this flagged item in plain English and suggest one concrete next step. Do not invent facts.\nType: ${flag.type}\nMessage: ${flag.message}\nDetail: ${JSON.stringify(detail)}`;
  try {
    if (process.env.GEMINI_API_KEY) {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }), signal: AbortSignal.timeout(8000) },
      );
      const j = await r.json();
      const t = j?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (t) return { text: t.trim(), source: 'gemini' };
    } else if (process.env.ANTHROPIC_API_KEY) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 200, messages: [{ role: 'user', content: prompt }] }),
        signal: AbortSignal.timeout(8000),
      });
      const j = await r.json();
      const t = j?.content?.[0]?.text;
      if (t) return { text: t.trim(), source: 'claude' };
    }
  } catch (e) {
    console.warn('AI explain failed:', e.message);
  }
  return { text: template(flag, detail), source: 'template' };
}

/**
 * ai-cleaner.ts
 *
 * AI-assisted content cleaning for scraped chapter Markdown.
 *
 * Responsibilities:
 *  1. Apply a list of dynamic regex rules (stored in the DB) to chapter content.
 *  2. Call the OpenAI API to detect noise patterns in cleaned content and
 *     return new regex rules that can be persisted without redeployment.
 *
 * All pure functions are Deno-compatible but have no Deno-specific imports
 * in the exported interface, so they can be tested with Vitest too.
 */

export interface CleaningRule {
  id?: string;          // present when loaded from DB; absent when freshly generated
  pattern: string;      // JS-compatible regex source string — no wrapping slashes
  flags: string;        // e.g. "gim"
  description: string;
  source_url?: string;
}

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Returns true if the rule has a compilable regex pattern with valid flags.
 * Always validate AI-generated rules before saving or applying them.
 */
export function validateRule(rule: CleaningRule): boolean {
  if (!rule.pattern || typeof rule.pattern !== 'string') return false;
  if (!rule.description || typeof rule.description !== 'string') return false;
  if (typeof rule.flags !== 'string') return false;
  if (!/^[gimsuy]*$/.test(rule.flags)) return false;
  try {
    new RegExp(rule.pattern, rule.flags);
    return true;
  } catch {
    return false;
  }
}

// ── Rule application ──────────────────────────────────────────────────────────

/**
 * Applies a list of dynamic cleaning rules to chapter content.
 * Invalid rules are silently skipped — this function never throws.
 */
export function applyDynamicRules(content: string, rules: CleaningRule[]): string {
  let result = content;
  for (const rule of rules) {
    try {
      // Ensure 'g' flag is always present so replace() processes all matches
      const flags = rule.flags.includes('g') ? rule.flags : rule.flags + 'g';
      const re = new RegExp(rule.pattern, flags);
      result = result.replace(re, '');
    } catch {
      // Silently skip — invalid rules must never crash the chapter pipeline
    }
  }
  return result;
}

// ── AI analysis ───────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a content-cleaning assistant for a novel reader application.
Your job is to identify noise in scraped web Markdown: advertisements, promotional text,
newsletter sign-ups, cookie banners, site navigation, comment-section boilerplate, and
any non-story UI text injected by the website.

When given content, identify each distinct noise pattern and produce a
JavaScript-compatible regular expression that would remove it. Prefer line-anchored
patterns (^...$) with the "m" flag so they match whole lines only, not partial prose.
Never produce patterns broad enough to match real story prose.

Respond ONLY with valid JSON matching this exact schema:
{"rules":[{"pattern":"<regex source, no slashes>","flags":"<e.g. gim>","description":"<one sentence>"}]}
If you find no noise patterns, respond with: {"rules":[]}`;

function buildUserPrompt(sample: string, url: string): string {
  return `Chapter URL: ${url}
Content (may be truncated to fit token limit):
--- BEGIN ---
${sample}
--- END ---
Identify regex rules to remove any remaining noise without touching story prose.`;
}

/**
 * Calls the OpenAI chat completions API to detect remaining noise patterns
 * in cleaned chapter content and returns validated CleaningRule objects.
 *
 * Content is capped at 6000 chars (first 3000 + last 3000) to bound token usage.
 * Temperature is 0 for deterministic output.
 * response_format: json_object ensures valid JSON is always returned.
 *
 * @param content  Already-cleaned chapter markdown to analyse
 * @param url      Source URL of the chapter (included in prompt for context)
 * @param apiKey   OpenAI API key
 * @param model    OpenAI model ID (default: gpt-4o-mini)
 */
export async function analyzeContentWithAI(
  content: string,
  url: string,
  apiKey: string,
  model = 'gpt-4o-mini',
): Promise<CleaningRule[]> {
  const MAX_CHARS = 6000;
  const sample = content.length > MAX_CHARS
    ? content.slice(0, 3000) + '\n...[truncated]...\n' + content.slice(-3000)
    : content;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(sample, url) },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`OpenAI API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const raw: string = data?.choices?.[0]?.message?.content ?? '{"rules":[]}';

  let parsed: { rules: Array<{ pattern: string; flags: string; description: string }> };
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error('AI cleaner: failed to parse OpenAI response as JSON');
    return [];
  }

  // Validate every rule — never trust LLM output blindly
  const rules: CleaningRule[] = (parsed.rules ?? [])
    .map((r) => ({
      pattern: String(r.pattern ?? ''),
      flags: String(r.flags ?? 'gim'),
      description: String(r.description ?? ''),
    }))
    .filter(validateRule);

  return rules;
}

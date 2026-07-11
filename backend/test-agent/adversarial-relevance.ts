import { AdversarialEvidenceRelevance } from "./types";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "be",
  "browser",
  "by",
  "can",
  "check",
  "for",
  "from",
  "get",
  "http",
  "https",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "post",
  "probe",
  "put",
  "test",
  "that",
  "the",
  "this",
  "to",
  "with",
  "功能",
  "完成",
  "测试",
  "验证",
]);

function text(value: any) {
  return String(value || "").trim();
}

function normalize(value: any) {
  return text(value)
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stem(token: string) {
  if (token.length > 5 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith("ed")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function tokens(value: any) {
  const normalized = normalize(value);
  const out = new Set<string>();
  for (const raw of normalized.match(/[a-z0-9./:#]+/g) || []) {
    if (raw.length < 2 || STOP_WORDS.has(raw)) continue;
    out.add(raw);
    const stemmed = stem(raw);
    if (!STOP_WORDS.has(stemmed)) out.add(stemmed);
  }
  for (const chunk of normalized.match(/[\u4e00-\u9fff]+/g) || []) {
    if (chunk.length >= 2 && !STOP_WORDS.has(chunk)) out.add(chunk);
    for (let index = 0; index < chunk.length - 1; index += 1) {
      const pair = chunk.slice(index, index + 2);
      if (!STOP_WORDS.has(pair)) out.add(pair);
    }
  }
  return [...out];
}

function rounded(value: number) {
  return Number(Math.max(0, Math.min(1, value)).toFixed(3));
}

function relevanceScore(subject: string, descriptor: string) {
  const normalizedSubject = normalize(subject);
  const normalizedDescriptor = normalize(descriptor);
  if (!normalizedSubject || !normalizedDescriptor) return 0;
  if (normalizedSubject.length >= 6 && normalizedDescriptor.includes(normalizedSubject)) return 1;
  const subjectTokens = tokens(subject);
  if (!subjectTokens.length) return 0;
  const descriptorTokens = new Set(tokens(descriptor));
  const hits = subjectTokens.filter(token => descriptorTokens.has(token));
  if (subjectTokens.length <= 2 && hits.length === subjectTokens.length) return 1;
  if (hits.length < 2) return 0;
  const score = hits.length / Math.min(subjectTokens.length, 6);
  return score >= 0.3 ? rounded(score) : 0;
}

function stringList(value: any) {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  const item = text(value);
  return item ? [item] : [];
}

export function adversarialContextCriteria(context: Record<string, any> | undefined) {
  if (!context) return [];
  return Array.from(new Set([
    ...stringList(context.acceptanceCriteria),
    ...stringList(context.acceptance_criteria),
    ...stringList(context.coversAcceptanceCriteria),
    ...stringList(context.covers_acceptance_criteria),
  ]));
}

export function buildAdversarialEvidenceRelevance(input: {
  name: string;
  target: string;
  probeType?: string;
  context?: Record<string, any>;
  originalUserGoal?: string;
  acceptanceCriteria?: string[];
}): {
  relevance: AdversarialEvidenceRelevance;
  linkedCriteria: string[];
  goalLinked: boolean;
  matchScore: number;
} {
  const acceptanceCriteria = input.acceptanceCriteria || [];
  const criteriaByNormalized = new Map(acceptanceCriteria.map(criterion => [normalize(criterion), criterion]));
  const declaredCriteria = adversarialContextCriteria(input.context);
  const explicit = declaredCriteria
    .map(criterion => criteriaByNormalized.get(normalize(criterion)) || "")
    .filter(Boolean);
  if (declaredCriteria.length) {
    return {
      relevance: explicit.length ? "explicit" : "none",
      linkedCriteria: Array.from(new Set(explicit)),
      goalLinked: false,
      matchScore: explicit.length ? 1 : 0,
    };
  }

  const descriptor = [
    input.name,
    input.probeType,
    input.target,
    input.context?.adversarialIntent,
    input.context?.adversarial_intent,
    input.context?.generatedBy,
    input.context?.generated_by,
  ].filter(Boolean).join(" ");
  const scoredCriteria = acceptanceCriteria
    .map(criterion => ({ criterion, score: relevanceScore(criterion, descriptor) }))
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score);
  const goalScore = relevanceScore(input.originalUserGoal || "", descriptor);
  const linkedCriteria = scoredCriteria.map(item => item.criterion);
  const goalLinked = goalScore > 0;
  const matchScore = Math.max(goalScore, ...scoredCriteria.map(item => item.score), 0);
  return {
    relevance: linkedCriteria.length || goalLinked ? "inferred" : "none",
    linkedCriteria,
    goalLinked,
    matchScore: rounded(matchScore),
  };
}

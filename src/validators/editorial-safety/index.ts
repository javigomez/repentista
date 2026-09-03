import type { VerseSlot } from "../../domain/quatrain-candidate/index.js";
import {
  normalizeEditorialSafetyTerm,
  type EditorialSafetyPolicy,
  type EditorialSafetyRule,
  type EditorialSafetyRuleSeverity,
} from "../../content/editorial-safety-policy/index.js";

export const EDITORIAL_SAFETY_VALIDATOR_NAME = "editorial-safety" as const;

export type EditorialSafetyVerdict = "VALIDO" | "DUDOSO" | "INVALIDO";

export type EditorialSafetySegmentKind = "context" | "verse" | "anchor";

export interface EditorialSafetyLocation {
  readonly kind: EditorialSafetySegmentKind;
  readonly slot?: VerseSlot;
}

export interface EditorialSafetySegment {
  readonly location: EditorialSafetyLocation;
  readonly text: string;
}

export interface EditorialSafetyRequest {
  readonly segments: readonly EditorialSafetySegment[];
}

export interface EditorialSafetyMatch {
  readonly ruleId: string;
  readonly category: string;
  readonly severity: EditorialSafetyRuleSeverity;
  readonly location: EditorialSafetyLocation;
  readonly fragment: string;
}

export interface EditorialSafetyDiagnostic {
  readonly verdict: EditorialSafetyVerdict;
  readonly policyVersion: string;
  readonly matches: readonly EditorialSafetyMatch[];
}

export interface EditorialSafetyValidator {
  validate(request: EditorialSafetyRequest): EditorialSafetyDiagnostic;
}

const normalizeText = (value: string): string => normalizeEditorialSafetyTerm(value);

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

const containsPhrase = (text: string, phrase: string): boolean => {
  if (phrase.length === 0) {
    return false;
  }

  const pattern = new RegExp(`(^|[^a-z0-9ñ])${escapeRegExp(phrase)}($|[^a-z0-9ñ])`, "iu");

  return pattern.test(text);
};

const ruleMatches = (rule: EditorialSafetyRule, normalizedText: string): readonly string[] => {
  const termsWithNormalized = rule.terms.map((term) => ({
    term,
    normalized: normalizeEditorialSafetyTerm(term),
  }));
  const matched = termsWithNormalized.filter(({ normalized }) => containsPhrase(normalizedText, normalized));

  if (rule.mode === "ALL") {
    return matched.length === termsWithNormalized.length ? matched.map(({ term }) => term) : [];
  }

  return matched.map(({ term }) => term);
};

const freezeLocation = (location: EditorialSafetyLocation): EditorialSafetyLocation =>
  Object.freeze({
    kind: location.kind,
    ...(location.slot === undefined ? {} : { slot: location.slot }),
  });

const freezeMatch = (match: EditorialSafetyMatch): EditorialSafetyMatch =>
  Object.freeze({
    ruleId: match.ruleId,
    category: match.category,
    severity: match.severity,
    location: freezeLocation(match.location),
    fragment: match.fragment,
  });

const verdictForMatches = (matches: readonly EditorialSafetyMatch[]): EditorialSafetyVerdict => {
  const blocking = matches.some((match) => match.severity === "BLOQUEANTE");

  if (blocking) {
    return "INVALIDO";
  }

  return matches.length > 0 ? "DUDOSO" : "VALIDO";
};

export function createEditorialSafetyValidator(
  policy: EditorialSafetyPolicy,
): EditorialSafetyValidator {
  const rules = policy.rules;
  const policyVersion = policy.version;

  return Object.freeze({
    validate(request: EditorialSafetyRequest): EditorialSafetyDiagnostic {
      const matches: EditorialSafetyMatch[] = [];

      for (const segment of request.segments) {
        const normalizedText = normalizeText(segment.text);

        if (normalizedText.length === 0) {
          continue;
        }

        for (const rule of rules) {
          const matchedTerms = ruleMatches(rule, normalizedText);

          for (const fragment of matchedTerms) {
            matches.push(
              freezeMatch({
                ruleId: rule.id,
                category: rule.category,
                severity: rule.severity,
                location: segment.location,
                fragment,
              }),
            );
          }
        }
      }

      return Object.freeze({
        verdict: verdictForMatches(matches),
        policyVersion,
        matches: Object.freeze(matches),
      });
    },
  });
}

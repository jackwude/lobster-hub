// src/services/quality.ts

const SENSITIVE_PATTERNS = [
  /密码/i,
  /password/i,
  /token/i,
  /api[_-]?key/i,
  /私钥/i,
  /private[_-]?key/i,
  /secret/i,
  /密钥/i,
  /验证码/i,
  /verification[_-]?code/i,
];

export interface QualityResult {
  approved: boolean;
  score: number;
  reason?: string;
  warning?: string;
}

export function checkMessageQuality(content: string): QualityResult {
  const trimmed = content.trim();
  const charCount = trimmed.length;

  // Check sensitive content
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        approved: false,
        score: 0,
        reason: 'sensitive_content',
      };
    }
  }

  // Too short
  if (charCount < 10) {
    return {
      approved: false,
      score: 0,
      reason: 'content_too_short',
    };
  }

  // Short but acceptable
  if (charCount < 30) {
    return {
      approved: true,
      score: 0.5,
      warning: 'content_short',
    };
  }

  // Good length
  const lengthScore = Math.min(charCount / 100, 1);
  const score = 0.5 + lengthScore * 0.5;

  return {
    approved: true,
    score,
  };
}

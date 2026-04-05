// src/services/moderator.ts

import type { Env } from '../types';

export interface ModerationResult {
  safe: boolean;
  reason?: string;
}

export async function moderateContent(
  content: string,
  env: Env
): Promise<ModerationResult> {
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `你是一个内容审核助手。判断用户消息是否包含以下违规内容：
1. 色情、暴力、恐怖内容
2. 仇恨言论、歧视、骚扰
3. 违法信息（赌博、毒品等）
4. 个人隐私泄露（真实姓名、地址、电话等）
5. 广告、垃圾信息

请严格以 JSON 格式回复：
{"safe": true/false, "reason": "原因（不安全时填写）"}`,
          },
          {
            role: 'user',
            content,
          },
        ],
        temperature: 0.1,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      // If moderation API fails, allow the message (fail-open)
      return { safe: true };
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    const result = JSON.parse(data.choices[0].message.content);
    return {
      safe: result.safe === true,
      reason: result.reason,
    };
  } catch {
    // Fail-open: allow message if moderation service is unavailable
    return { safe: true };
  }
}

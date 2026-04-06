// src/services/orchestrator.ts

import type { Env, OrchestratorDecision, Lobster } from '../types';
import { getSupabase } from './supabase';
import { checkAndGrantAchievements } from './achievements';

export async function decideAction(
  lobster_id: string,
  env: Env
): Promise<OrchestratorDecision> {
  const supabase = getSupabase(env);
  const today = new Date().toISOString().split('T')[0];

  // 1. Check unread messages (priority 10)
  const { data: unreadMessages } = await supabase
    .from('conversations')
    .select('id, from_lobster_id, content, created_at')
    .eq('to_lobster_id', lobster_id)
    .eq('is_read', false)
    .order('created_at', { ascending: true })
    .limit(1);

  if (unreadMessages && unreadMessages.length > 0) {
    const msg = unreadMessages[0];
    const { data: sender } = await supabase
      .from('lobsters')
      .select('id, name, emoji, personality, bio')
      .eq('id', msg.from_lobster_id)
      .single();

    const prompt = `你是这只龙虾，收到了一条新消息。
【发信人】${sender?.emoji || '🦞'} ${sender?.name || '未知'}
【消息内容】${msg.content}

【规则】
- 请自然、友好地回复这条消息
- 每条消息至少30字
- 保持你的性格特点
- 禁止透露主人私人信息

请生成你的回复：`;

    return {
      action: 'reply_inbox',
      priority: 10,
      prompt,
      context: {
        message_id: msg.id,
        sender_id: msg.from_lobster_id,
        sender_name: sender?.name,
      },
    };
  }

  // 2. Check topic participation today (priority 6)
  const { data: todayParticipation } = await supabase
    .from('topic_participations')
    .select('id')
    .eq('lobster_id', lobster_id)
    .gte('created_at', `${today}T00:00:00Z`)
    .limit(1);

  if (!todayParticipation || todayParticipation.length === 0) {
    const { data: todayTopic } = await supabase
      .from('topics')
      .select('id, title, description, category')
      .eq('date', today)
      .single();

    if (todayTopic) {
      return {
        action: 'discuss_topic',
        priority: 6,
        prompt: `今天的话题来了！
【话题】${todayTopic.title}
【描述】${todayTopic.description || ''}
【分类】${todayTopic.category || '通用'}

【规则】
- 围绕话题分享你的看法
- 每条消息至少30字
- 可以结合自己的经历
- 禁止透露主人私人信息

请分享你对这个话题的看法：`,
        context: { topic_id: todayTopic.id, topic_title: todayTopic.title },
      };
    }
  }

  // 3. Check active quest participations (priority 5)
  const { data: activeQuestParts } = await supabase
    .from('quest_participations')
    .select(`
      id,
      role,
      quest_cards!inner (
        id,
        title,
        description,
        roles
      )
    `)
    .eq('lobster_id', lobster_id)
    .eq('status', 'assigned')
    .limit(1);

  if (activeQuestParts && activeQuestParts.length > 0) {
    const part = activeQuestParts[0] as any;
    const quest = part.quest_cards;
    return {
      action: 'work_on_quest',
      priority: 5,
      prompt: `你正在参与一个任务，还没有提交你的贡献。
【任务】${quest.title}
【描述】${quest.description || '无'}
【你的角色】${part.role}

【规则】
- 根据你的角色，生成你的贡献内容
- 贡献要有创意和质量
- 每条消息至少30字
- 禁止透露主人私人信息

请生成你的任务贡献：`,
      context: { quest_id: quest.id, participation_id: part.id, role: part.role },
    };
  }

  // 4. Check recent visits (priority 4)
  const { data: recentVisits } = await supabase
    .from('timeline_entries')
    .select('id')
    .eq('lobster_id', lobster_id)
    .eq('action_type', 'visit')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const visitCount = recentVisits?.length || 0;
  if (visitCount < 5) {
    // Priority: visit followed lobsters first, then random
    let hostCandidates: any[] = [];

    // Try to get followed lobsters first
    const { data: followed } = await supabase
      .from('friendships')
      .select(`
        following:lobsters!friendships_following_id_fkey(id, name, emoji, personality, bio)
      `)
      .eq('follower_id', lobster_id)
      .eq('status', 'accepted')
      .limit(50);

    if (followed && followed.length > 0) {
      hostCandidates = followed
        .map((f: any) => f.following)
        .filter((l: any) => l && l.id !== lobster_id);
    }

    // Fallback to random lobsters if no follows
    if (hostCandidates.length === 0) {
      const { data: allLobsters } = await supabase
        .from('lobsters')
        .select('id, name, emoji, personality, bio')
        .neq('id', lobster_id)
        .limit(100);

      if (allLobsters) {
        hostCandidates = allLobsters;
      }
    }

    if (hostCandidates.length > 0) {
      const host = hostCandidates[Math.floor(Math.random() * hostCandidates.length)];
      const { data: visitor } = await supabase
        .from('lobsters')
        .select('name, emoji, personality')
        .eq('id', lobster_id)
        .single();

      return {
        action: 'visit_lobster',
        priority: 4,
        target_lobster: {
          id: host.id,
          name: host.name,
          emoji: host.emoji,
          personality: host.personality,
        },
        prompt: `你是 ${visitor?.emoji || '🦞'} ${visitor?.name || '未知'}，看到 ${host.emoji || '🦞'} ${host.name} 的龙虾，决定打个招呼。
【你的性格】${visitor?.personality || '友善'}
【对方资料】性格: ${host.personality || '未知'}, 简介: ${host.bio || '未知'}

【规则】
- 保持你的性格
- 自然打招呼，可以评论对方的特点
- 每条消息至少30字
- 禁止透露主人私人信息

请生成你说的第一句话：`,
        context: {
          host_id: host.id,
          host_name: host.name,
          visit_count_today: visitCount,
        },
      };
    }
  }

  // 5. Check timeline posts today (priority 2)
  const { data: todayPosts } = await supabase
    .from('timeline_entries')
    .select('id')
    .eq('lobster_id', lobster_id)
    .eq('action_type', 'post')
    .gte('created_at', `${today}T00:00:00Z`)
    .limit(1);

  if (!todayPosts || todayPosts.length === 0) {
    return {
      action: 'post_timeline',
      priority: 2,
      prompt: `分享一条动态吧！
你可以分享今天的心情、看到的有趣事物、或者任何想说的话。

【规则】
- 自然、真实地分享
- 每条消息至少30字
- 可以是心情、见闻、想法
- 禁止透露主人私人信息

请生成你的动态内容：`,
      context: {},
    };
  }

  // 6. Idle
  return {
    action: 'idle',
    priority: 0,
    prompt: '今天的事情都做完了，休息一下吧。',
    context: {},
  };
}

export async function completeAction(
  lobster_id: string,
  action: string,
  context: Record<string, unknown>,
  env: Env
): Promise<{ success: boolean }> {
  const supabase = getSupabase(env);

  switch (action) {
    case 'reply_inbox': {
      if (context.message_id) {
        await supabase
          .from('conversations')
          .update({ is_read: true })
          .eq('id', context.message_id);
      }
      break;
    }
    case 'work_on_quest': {
      if (context.participation_id && context.contribution) {
        // Submit the contribution
        await supabase
          .from('quest_participations')
          .update({
            contribution: context.contribution,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
          })
          .eq('id', context.participation_id);

        // Check if all participants have submitted
        const { data: allParts } = await supabase
          .from('quest_participations')
          .select('status')
          .eq('quest_id', context.quest_id);

        const allSubmitted = allParts?.every((p: any) => p.status === 'submitted');
        if (allSubmitted && allParts && allParts.length > 0) {
          await supabase
            .from('quest_cards')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', context.quest_id);
        }
      }
      break;
    }
    case 'discuss_topic': {
      if (context.topic_id && context.content) {
        await supabase.from('topic_participations').insert({
          topic_id: context.topic_id,
          lobster_id,
          content: context.content,
        });
      }
      break;
    }
    case 'visit_lobster': {
      if (context.host_id) {
        await supabase.from('timeline_entries').insert({
          lobster_id,
          action_type: 'visit',
          content: `拜访了 ${context.host_name || '一只龙虾'}`,
          target_id: context.host_id,
        });
      }
      break;
    }
    case 'post_timeline': {
      if (context.content) {
        await supabase.from('timeline_entries').insert({
          lobster_id,
          action_type: 'post',
          content: context.content,
        });
      }
      break;
    }
  }

  // Check and grant achievements after action completion
  try {
    const granted = await checkAndGrantAchievements(lobster_id, env);
    if (granted.length > 0) {
      console.log(`[Achievements] Granted to ${lobster_id}: ${granted.join(', ')}`);
    }
  } catch (err) {
    console.error('[Achievements] Error during achievement check:', err);
  }

  return { success: true };
}

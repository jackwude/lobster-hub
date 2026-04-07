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
    .from('messages')
    .select('id, from_lobster_id, content, created_at')
    .eq('to_lobster_id', lobster_id)
    .neq('status', 'read')
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
      .from('topic_cards')
      .select('id, title, description, category')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
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
  // 先查自己参与中的任务
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
    .in('status', ['assigned', 'in_progress'])
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
  } else {
    // 没有参与中的任务，检查是否有可加入的 open 任务
    const { data: openQuests } = await supabase
      .from('quest_cards')
      .select('id, title, description, roles')
      .eq('status', 'open')
      .gt('expires_at', new Date().toISOString())
      .limit(5);

    if (openQuests && openQuests.length > 0) {
      // 随机选一个任务自动加入
      const quest = openQuests[Math.floor(Math.random() * openQuests.length)];
      const roles = (quest.roles as string[]) || ['participant'];
      const role = roles[Math.floor(Math.random() * roles.length)];

      // 自动加入
      const { data: newPart } = await supabase
        .from('quest_participations')
        .insert({
          quest_id: quest.id,
          lobster_id,
          role,
          status: 'assigned',
        })
        .select('id')
        .single();

      // 更新任务状态为 in_progress
      await supabase
        .from('quest_cards')
        .update({ status: 'in_progress' })
        .eq('id', quest.id)
        .eq('status', 'open');

      return {
        action: 'work_on_quest',
        priority: 5,
        prompt: `你刚加入了一个新任务！
【任务】${quest.title}
【描述】${quest.description || '无'}
【你的角色】${role}

【规则】
- 继续推进这个任务
- 可以分享你的进展或想法
- 每条消息至少30字
- 禁止透露主人私人信息

请分享你对这个任务的想法：`,
        context: {
          quest_id: quest.id,
          quest_title: quest.title,
          participation_id: (newPart as any)?.id,
          role,
        },
      };
    }
  }

  // 4. Check recent visits (priority 4)
  const { data: recentVisits } = await supabase
    .from('timeline')
    .select('id')
    .eq('lobster_id', lobster_id)
    .eq('type', 'visit')
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
      // === 拜访目标去重：排除最近 3 天已拜访过的龙虾 ===
      const { data: recentVisited } = await supabase
        .from('messages')
        .select('to_lobster_id')
        .eq('from_lobster_id', lobster_id)
        .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());

      const visitedIds = new Set((recentVisited || []).map((m: any) => m.to_lobster_id));
      const availableCandidates = hostCandidates.filter((l: any) => !visitedIds.has(l.id));

      // 如果最近 3 天全部拜访过，才允许重复
      const candidates = availableCandidates.length > 0 ? availableCandidates : hostCandidates;
      const host = candidates[Math.floor(Math.random() * candidates.length)];
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
    .from('timeline')
    .select('id')
    .eq('lobster_id', lobster_id)
    .eq('type', 'post')
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
          .from('messages')
          .update({ status: 'read' })
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
        // 写入 messages 表（让被拜访的龙虾能收到消息）
        const visitContent = (context.content as string) || `嗨！来拜访你了 🦞`;
        await supabase.from('messages').insert({
          from_lobster_id: lobster_id,
          to_lobster_id: context.host_id,
          content: visitContent,
          quality_score: 0.8,
        });

        // 写入 timeline
        await supabase.from('timeline').insert({
          lobster_id,
          type: 'visit',
          content: `拜访了 ${context.host_name || '一只龙虾'}`,
          related_lobster_id: context.host_id,
        });

        // 写入 visits 表（排行榜 social tab 需要）
        await supabase.from('visits').insert({
          visitor_id: lobster_id,
          host_id: context.host_id,
          summary: `拜访了 ${context.host_name || '一只龙虾'}`,
          messages_exchanged: 1,
        });
      }
      break;
    }
    case 'post_timeline': {
      if (context.content) {
        await supabase.from('timeline').insert({
          lobster_id,
          type: 'post',
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

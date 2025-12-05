import { supabase } from "@/integrations/supabase/client";
import type { Quiz, QuizAnswerPayload } from "@/lib/quizTypes";
import { SHOULD_USE_DEMO_API } from "@/lib/demoApi";

const LS_RESPONSES_KEY = "smartline-quiz-responses";
const LS_XP_KEY = "smartline-quiz-xp";

const readLocal = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeLocal = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // armazenamento local é apenas best-effort em modo demo
  }
};

export const shuffleSeeded = <T,>(arr: T[], seed: string): T[] => {
  // simple LCG seeded shuffle (deterministic)
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    s = (1664525 * s + 1013904223) >>> 0; // LCG
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const computeTotalPoints = (quiz: Quiz, answers: { questionId: string; correct: boolean }[]) => {
  const per = quiz.pointsPerQuestion ?? 10;
  const correctCount = answers.filter((a) => a.correct).length;
  return correctCount * per;
};

export const saveResponse = async (payload: QuizAnswerPayload, awardPoints: boolean) => {
  // Local persistence
  const all = readLocal<QuizAnswerPayload[]>(LS_RESPONSES_KEY, []);
  all.push(payload);
  writeLocal(LS_RESPONSES_KEY, all);

  if (awardPoints && payload.userId) {
    const xp = readLocal<Record<string, number>>(LS_XP_KEY, {});
    xp[payload.userId] = (xp[payload.userId] || 0) + payload.totalPoints;
    writeLocal(LS_XP_KEY, xp);
  }

  // Remote (Supabase) best-effort
  if (supabase && !SHOULD_USE_DEMO_API) {
    try {
      await supabase.from("quiz_responses").insert({
        quiz_id: payload.quizId,
        user_id: payload.userId,
        user_name: payload.userName,
        team_id: payload.teamId,
        is_leader: payload.isLeader ?? false,
        answers: payload.answers,
        total_points: payload.totalPoints,
        submitted_at: payload.submittedAt,
      });
    } catch (e) {
      // ignore in demo
    }
    if (awardPoints) {
      try {
        await supabase.from("quiz_points").upsert({
          user_id: payload.userId,
          points_delta: payload.totalPoints,
          last_quiz_id: payload.quizId,
          awarded_at: payload.submittedAt,
        });
      } catch (e) {
        // ignore in demo
      }
    }
  }
};

export const readLocalXpLeaderboard = (): Array<{ userId: string; points: number }> => {
  const xp = readLocal<Record<string, number>>(LS_XP_KEY, {});
  return Object.entries(xp)
    .map(([userId, points]) => ({ userId, points }))
    .sort((a, b) => b.points - a.points);
};

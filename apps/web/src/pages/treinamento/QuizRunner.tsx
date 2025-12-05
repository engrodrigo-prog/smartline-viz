import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useParams, useNavigate } from "react-router-dom";
import { useDatasetData } from "@/context/DatasetContext";
import type { Quiz } from "@/lib/quizTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { computeTotalPoints, saveResponse, shuffleSeeded } from "@/lib/quizStore";

type DemoUser = { id: string; display_name: string } | null;
const STORAGE_KEY = "smartline-demo-user";
const loadUser = (): DemoUser => {
  if (typeof window === "undefined") return null;
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
};

export default function QuizRunner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const quizzes = useDatasetData((d) => d.quizzes);
  const membros = useDatasetData((d) => d.membrosEquipe);
  const equipes = useDatasetData((d) => d.equipes);
  const [user, setUser] = useState<DemoUser>(null);

  useEffect(() => { setUser(loadUser()); }, []);

  const quiz = useMemo(() => quizzes.find((q) => q.id === id) as Quiz | undefined, [quizzes, id]);
  const seedBase = `${id}:${user?.id || 'guest'}`;

  const shuffledQuestions = useMemo(() => {
    if (!quiz) return [] as Quiz["questions"];
    const base = quiz.questions.map((q) => ({
      ...q,
      choices: quiz.randomized ? shuffleSeeded(q.choices, seedBase + ':' + q.id) : q.choices,
    }));
    return quiz.randomized ? shuffleSeeded(base, seedBase) : base;
  }, [quiz, seedBase]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const allAnswered = shuffledQuestions.length > 0 && shuffledQuestions.every((q) => !!answers[q.id]);

  const myEquipeId = useMemo(() => {
    if (!user) return null;
    const membro = membros.find((m) => m.nome.toLowerCase().includes((user.display_name || '').split(' ')[0]?.toLowerCase() || ''));
    const equipe = membro ? equipes.find((e) => e.membros.includes(membro.id)) : null;
    return equipe?.id || null;
  }, [user, membros, equipes]);

  const isLeader = useMemo(() => {
    if (!user) return false;
    const membro = membros.find((m) => m.nome.toLowerCase().includes((user.display_name || '').split(' ')[0]?.toLowerCase() || ''));
    if (!membro) return false;
    if (membro.cargo === 'Supervisor') return true;
    const equipe = equipes.find((e) => e.membros.includes(membro.id));
    return equipe ? equipe.lider === membro.id : false;
  }, [user, membros, equipes]);

  const handleSubmit = async () => {
    if (!quiz) return;
    if (!allAnswered) {
      toast({ title: 'Responda todas as questões', variant: 'destructive' });
      return;
    }
    // grade
    const graded = shuffledQuestions.map((q) => {
      const chosen = q.choices.find((c) => c.id === answers[q.id]);
      const correctChoice = q.choices.find((c) => c.correct);
      const correct = !!chosen && !!correctChoice && chosen.id === correctChoice.id;
      return { questionId: q.id, choiceId: chosen?.id || '', correct };
    });
    const totalPoints = computeTotalPoints(quiz, graded);
    const payload = {
      quizId: quiz.id,
      userId: user?.id || 'guest',
      userName: user?.display_name || 'Convidado',
      teamId: myEquipeId,
      isLeader,
      answers: graded,
      totalPoints,
      submittedAt: new Date().toISOString(),
    };

    const award = !isLeader; // líderes não somam pontos
    await saveResponse(payload, award);

    toast({ title: award ? `Pontuação: ${totalPoints} pts` : 'Resposta registrada (sem pontos para líderes)' });
    navigate('/treinamento/quizzes');
  };

  if (!quiz) {
    return (
      <AppLayout title="Quiz" subtitle="Não encontrado">
        <div className="tech-card p-6">Quiz inexistente.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={quiz.title} subtitle={quiz.description}>
      <div className="space-y-6">
        {shuffledQuestions.map((q, idx) => (
          <Card key={q.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{idx + 1}. {q.text}</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={answers[q.id]} onValueChange={(val) => setAnswers((p) => ({ ...p, [q.id]: val }))}>
                {q.choices.map((c) => (
                  <div key={c.id} className="flex items-center space-x-2 py-1.5">
                    <RadioGroupItem id={`${q.id}-${c.id}`} value={c.id} />
                    <Label htmlFor={`${q.id}-${c.id}`} className="text-sm">{c.text}</Label>
                  </div>
                ))}
              </RadioGroup>
              {q.explanation && (
                <div className="mt-2 text-xs text-muted-foreground">Dica: {q.explanation}</div>
              )}
            </CardContent>
          </Card>
        ))}

        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={() => navigate('/treinamento/quizzes')}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!allAnswered}>Enviar</Button>
        </div>
      </div>
    </AppLayout>
  );
}


import { useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { useDatasetData } from "@/context/DatasetContext";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readLocalXpLeaderboard } from "@/lib/quizStore";

export default function Quizzes() {
  const quizzes = useDatasetData((d) => d.quizzes);
  const leaderboard = readLocalXpLeaderboard();

  const tags = useMemo(() => Array.from(new Set(quizzes.flatMap((q) => q.tags || []))), [quizzes]);

  return (
    <AppLayout title="Quizzes" subtitle="Capacitação e avaliação contínua da equipe">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-3">
                  <span>{quiz.title}</span>
                  <div className="flex flex-wrap gap-2">
                    {(quiz.tags || []).map((t) => (
                      <Badge key={t} variant="secondary">{t}</Badge>
                    ))}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">{quiz.description}</p>
                <Link to={`/treinamento/quiz/${encodeURIComponent(quiz.id)}`} className="btn-primary">
                  Iniciar
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle>Leaderboard (Local)</CardTitle></CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <div className="text-sm text-muted-foreground">Sem pontos ainda. Responda a um quiz para começar.</div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.slice(0, 10).map((item, idx) => (
                    <div key={item.userId} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center">{idx + 1}</div>
                        <span className="font-mono">{item.userId}</span>
                      </div>
                      <div className="font-semibold">{item.points} pts</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle>Tags</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <Badge key={t} variant="outline">{t}</Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}


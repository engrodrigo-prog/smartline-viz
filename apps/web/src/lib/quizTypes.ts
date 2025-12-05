export type QuizChoice = {
  id: string;
  text: string;
  correct?: boolean; // exactly one true per question
};

export type QuizQuestion = {
  id: string;
  text: string;
  choices: QuizChoice[];
  explanation?: string; // optional feedback
};

export type Quiz = {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  pointsPerQuestion?: number; // default 10
  randomized?: boolean; // randomize order of questions and choices
  questions: QuizQuestion[];
};

export type QuizAnswerPayload = {
  quizId: string;
  userId: string;
  userName?: string;
  teamId?: string | null;
  isLeader?: boolean;
  answers: {
    questionId: string;
    choiceId: string;
    correct: boolean;
  }[];
  totalPoints: number;
  submittedAt: string; // ISO
};


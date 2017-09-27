//Database types

export const enum PrendusApproved {
  YES,
  NO,
  TBD,
}

export const enum ContextType {
  QUESTION,
  ASSIGNMENT,
  QUIZ,
  COURSE,
}

export const enum UserRole {
  INSTRUCTOR,
  STUDENT,
  ADMIN,
}

export const enum QuestionType {
  MULTIPLE_CHOICE,
  ESSAY,
}

export interface User {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly ownedCourses: Course[];
  readonly assignments: Assignment[];
  readonly quizzes: Quiz[];
  readonly questions: Question[];
  readonly role: string;
}

export interface LTIUser {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly ltiUserId: string;
  readonly user: User;
}

export interface Question {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly text: string;
  readonly code: string;
  readonly quiz: Quiz | null;
  readonly author: User;
  readonly license: string;
  readonly discipline: Discipline;
  readonly subject: Subject;
  readonly concept: Concept
  readonly resource: string;
  readonly explanation: string;
  readonly answerComments: {};
  readonly ratings: QuestionRating[];
}

export interface QuestionRating {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly question: Question;
  readonly user: User;
  readonly scores: CategoryScore[];
}

export interface QuestionRatingStats {
  readonly question: Question;
  readonly rawScores: CategoryScore[];
  readonly sortStats: {[category: string]: number};
}

export interface CategoryScore {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly category: string;
  readonly score: number;
}

export interface QuestionResponse {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly author: User;
  readonly userVariables: UserVariable[];
  readonly userInputs: UserInput[];
  readonly userEssays: UserEssay[];
  readonly userChecks: UserCheck[];
  readonly userRadios: UserRadio[];
  readonly ratings: QuestionResponseRating[];
  readonly question: Question;
}

export interface UserVariable {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly varName: string;
  readonly value: string;
  readonly questionResponse: QuestionResponse;
}

export interface UserCheck {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly varName: string;
  readonly checked: boolean;
  readonly questionResponse: QuestionResponse;
}

export interface UserRadio {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly varName: string;
  readonly checked: boolean;
  readonly questionResponse: QuestionResponse;
}

export interface UserInput {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly varName: string;
  readonly value: string;
  readonly questionResponse: QuestionResponse;
}

export interface UserEssay {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly varName: string;
  readonly value: string;
  readonly questionResponse: QuestionResponse;
}

export interface QuestionResponseRating {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  scores: CategoryScore[];
  rater: User;
  questionResponse: QuestionResponse;
}

export interface Course {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  assignments: Assignment[];
  author: User;
  description: string;
  dueDate: Date;
  subject: Subject;
  title: string;
  discipline: Discipline;
  enrolledStudents: User[];
  price: number;
  purchases: Purchase[];
}

export interface Assignment {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly author: User;
  readonly concepts: Concept[];
  readonly course: Course;
  readonly questions: Question[];
  readonly quiz: Quiz;
  readonly students: User[];
  readonly title: string;
  readonly questionType: QuestionType;
  readonly numCreateQuestions: number;
  readonly numReviewQuestions: number;
  readonly numGradeResponses: number;
  readonly numResponseQuestions: number;
}

export interface Quiz {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly assignment: Assignment;
  readonly author: User;
  readonly questions: Question[];
  readonly title: string;
}

export interface Subject {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly approved: PrendusApproved;
  readonly concepts: Concept[];
  readonly courses: Course[];
  readonly discipline: Discipline;
  readonly title: string;
}

export interface Concept {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly assignments: Assignment[];
  readonly questions: Question[];
  readonly subject: Subject;
  readonly title: string;
}

export interface Discipline {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly approved: PrendusApproved;
  readonly subjects: Subject[];
  readonly courses: Course[];
  readonly title: string;
}

export interface PrendusAnalytic {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly user: User;
  readonly contextId: string;
  readonly contextType: ContextType;
  readonly verb: string;
  readonly object: string;
}

export interface Purchase {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly user: User;
  readonly amount: Float;
  readonly course: Course;
  readonly isPaid: boolean;
  readonly stripeTokenId: string;
}

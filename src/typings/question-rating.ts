import {User} from './user';


export interface QuestionRating {
  readonly quality: number;
  readonly difficulty: number;
  readonly accuracy: number;
  readonly questionId: string;
  readonly user: User;
  readonly timestamp?: number;
  readonly id: string;
}

export interface QuestionRatingStats {
  readonly assignmentId: string;
  readonly conceptId: string;
  readonly text: string;
  readonly quality: number;
  readonly difficulty: number;
  readonly accuracy: number;
  readonly overall: string;
}


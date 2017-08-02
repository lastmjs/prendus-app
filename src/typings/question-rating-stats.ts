import {User} from './user';

export interface QuestionRatingStats {
  readonly assignmentId: string;
  readonly conceptId: string;
  readonly text: string;
  readonly quality: number;
  readonly difficulty: number;
  readonly accuracy: number;
  readonly overall: string;
}

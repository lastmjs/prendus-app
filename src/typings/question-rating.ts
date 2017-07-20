import {User} from './user.js';


export interface QuestionRating {
  readonly quality: number;
  readonly difficulty: number;
  readonly accuracy: number;
  readonly questionId: string;
  readonly user: User;
  readonly timestamp?: number;
  readonly id: string;
}

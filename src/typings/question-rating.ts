import {User} from './user';


export interface QuestionRating {
  readonly quality: number;
  readonly difficulty: number;
  readonly accuracy: number;
  readonly ratingJson: string;
  readonly questionId: string;
  readonly user: User;
  readonly timestamp?: number;
  readonly id: string;
}


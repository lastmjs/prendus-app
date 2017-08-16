import {User} from './user';

export interface QuestionRatingStats {
  readonly assignmentId: string;
  readonly conceptId: string;
  readonly text: string;
  readonly stats: Object;
}

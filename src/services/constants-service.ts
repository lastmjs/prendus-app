
export const MAX_NUM_ATTEMPTS_REACHED = 'Maximum number of attempts reached';
export const NO_ANSWER_FEEDBACK_ALLOWED = 'No answer feedback allowed';
export const EMAIL_REGEX = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/;
export const ASSIGNMENT = 'ASSIGNMENT';
export const QUESTION = 'QUESTION';
export enum ContextType {
  QUESTION,
  ASSIGNMENT,
  QUIZ,
  COURSE
};

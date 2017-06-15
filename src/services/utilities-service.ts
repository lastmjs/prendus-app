import {QuestionScaffold} from '../typings/question-scaffold';
import {QuestionScaffoldAnswer} from '../typings/question-scaffold-answer';

export const isDefinedAndNotEmpty = (objects: string | string[]): boolean => {
  if(!objects) {
    return false;
  }

  if(typeof objects === 'string') {
    return objects && objects.trim().length !== 0;
  } else if(Array.isArray(objects) && objects.length > 0) {
    const newObjs: string[] = objects.filter( (obj) => {
      return obj && obj.trim().length > 0;
    });
    // all are defined and not empty
    return newObjs.length === objects.length;
  } else {
    return false;
  }

};

export const getQuestionScaffoldAnswers = (questionScaffold: QuestionScaffold): QuestionScaffoldAnswer[] => {
  return Object.keys(questionScaffold.answers || {}).map((key) => {
      return {
        ...questionScaffold.answers[key],
        id: key
      };
  });
};

export function shuffleArray(array: any[]): any[] {
    const newArray = [...array];
    return newArray.sort((element) => {
        return .5 - Math.random();
    });
}

import {GQLQuery} from '../services/graphql-service';
import {SetPropertyAction, DefaultAction} from '../typings/actions';
import {State} from '../typings/state';
import {Question} from '../typings/question';
import {QuestionScaffold} from '../typings/question-scaffold';
import {QuestionScaffoldAnswer} from '../typings/question-scaffold-answer';
import {Concept} from '../typings/concept';
import {Quiz} from '../typings/quiz';

export function checkForUserToken(): SetPropertyAction | DefaultAction {
    const userToken = window.localStorage.getItem('userToken');

    if (userToken) {
        return {
            type: 'SET_PROPERTY',
            key: 'userToken',
            value: userToken
        };
    }
    else {
        return {
            type: 'DEFAULT_ACTION'
        };
    }
}

export function removeUser(): SetPropertyAction {
    return {
        type: 'SET_PROPERTY',
        key: 'user',
        value: null
    };
}

export function removeUserToken(): SetPropertyAction {
    window.localStorage.setItem('userToken', '');
    return {
        type: 'SET_PROPERTY',
        key: 'userToken',
        value: null
    };
}

export async function getAndSetUser(): Promise<SetPropertyAction | DefaultAction> {
    const originalUserToken = window.localStorage.getItem('userToken');

    if (originalUserToken) {
        const data = await GQLQuery(`
            query {
                user {
                    id
                    email
                }
            }
        `, originalUserToken, (key: string, value: any) => {}, (error: any) => {
            throw error;
        });

        // The user token might be set to null while the request is off...if it is, we do not want to set the user because we are expecting the user to stay null
        const currentUserToken = window.localStorage.getItem('userToken');
        if (currentUserToken) {
            return {
                type: 'SET_PROPERTY',
                key: 'user',
                value: data.user
            };
        }
    }

    return {
        type: 'DEFAULT_ACTION'
    };
}

export function persistUserToken(userToken: string): SetPropertyAction {
    window.localStorage.setItem('userToken', userToken);
    return {
        type: 'SET_PROPERTY',
        key: 'userToken',
        value: userToken
    };
}

// Question Creation Actions
export function setDisabledNext(disableNext: boolean): SetPropertyAction {
  return {
      type: 'SET_PROPERTY',
      key: 'setDisabledNext',
      value: disableNext
  };
};
export function setNotification(message: string, type: string): SetPropertyAction {
  return {
      type: 'SET_PROPERTY',
      key: 'notification',
      value: {
        message,
        type
      }
  };
};
export function updateCurrentQuestionScaffold (currentQuestionScaffold: QuestionScaffold, concept: Concept, resource: string, questionStem: string | null, comments: string[], answers: string[], explanation: string | null): SetPropertyAction {
  const answersObj: { [questionScaffoldAnswerId: string]: QuestionScaffoldAnswer } = getAnswers(currentQuestionScaffold, answers, comments);
  return {
      type: 'SET_PROPERTY',
      key: 'currentQuestionScaffold',
      value: {
        ...currentQuestionScaffold,
        concept: concept,
        resource: resource,
        answers: answersObj,
        // only take new explanation if given
        explanation: explanation || currentQuestionScaffold.explanation,
        // only take new question if given
        question: questionStem || currentQuestionScaffold.question
      }
  };

  function getAnswers(questionScaffold: QuestionScaffold, answers: string[], comments: string[]): { [questionScaffoldAnswerId: string]: QuestionScaffoldAnswer } {
    return Object.keys(questionScaffold.answers || {})
    .map((key: string, index: number) => {
      return {
        ...questionScaffold.answers[key],
        // only take new answers or comments if passed in
        text: answers ? answers[index] : questionScaffold.answers[key].text,
        comment: comments ? comments[index] : questionScaffold.answers[key].comment
      };
    })
    // convert back to object
    .reduce((result: { [questionScaffoldAnswerId: string]: QuestionScaffoldAnswer }, current: QuestionScaffoldAnswer, index: number) => {
      result[`question${index}`] = current;
      return result;
    }, {});
  };
}

export const initCurrentQuestionScaffold = (numberOfAnswers: number): SetPropertyAction => {
  // Define answersArr with empty strings because Array.map won't work
  // on an array with only undefineds
  const answersArr: string[] = initArray([], Array(numberOfAnswers));
  const answers: { [currentQuestionScaffoldId: string]: QuestionScaffoldAnswer} = answersArr
  .map( (currentValue: string, index: number): QuestionScaffoldAnswer => {
    return {
      text: '',
      comment: '',
      correct: index === 0,
      id: `question${index}`
    };
  })
  .reduce((result: { [currentQuestionScaffoldId: string]: QuestionScaffoldAnswer}, current: QuestionScaffoldAnswer, index: number) => {
    result[`question${index}`] = current;
    return result;
  }, {});

  const currentQuestionScaffold: QuestionScaffold = {
    answers,
    explanation: '',
    question: ''
  };
  return {
      type: 'SET_PROPERTY',
      key: 'currentQuestionScaffold',
      value: currentQuestionScaffold
  };

  function initArray(arr: string[], arr2: string[]): string[] {
    if (arr2.length === 0) {
        return arr;
    }
    return initArray([...arr, ''], arr2.slice(1));
  }

}

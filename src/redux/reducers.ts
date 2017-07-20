import {State} from '../typings/state.js';
import {InitialState} from './initial-state.js';
import {Action, SetPropertyAction, SetComponentPropertyAction} from '../typings/actions.js';
import {Reducer} from '../typings/reducer.js';

export const RootReducer: Reducer = (state: State = InitialState, action: Action): State => {
    switch(action.type) {
        case 'SET_PROPERTY': {
            const _action = <SetPropertyAction> action;
            return {
                ...state,
                [_action.key]: _action.value
            };
        }
        case 'SET_COMPONENT_PROPERTY': {
            const _action = <SetComponentPropertyAction> action;
            return {
                ...state,
                components: {
                    ...state.components,
                    [_action.componentId]: {
                        ...state.components[_action.componentId],
                        [_action.key]: _action.value
                    }
                }
            };
        }
        case 'CONVERT_QUESTION_SCAFFOLD_TO_QUESTION': {
            const convertedTextAndCode: {
                text: string,
                code: string
            } = QuestionToCodeService.generateMultipleChoice({
                stem: state.currentQuestionScaffold.question,
                answers: UtilitiesService.shuffleArray(Object.values(state.currentQuestionScaffold.answers).map((answer: QuestionScaffoldAnswer) => {
                    return {
                        text: answer.text,
                        correct: answer.correct,
                        type: AnswerTypes.MultipleChoice
                    };
                }))
            });

            const convertedQuestion: Question = {
                ...state.currentQuestionScaffold.convertedQuestion,
                id: action.questionId,
                uid: action.uid,
                text: convertedTextAndCode.text,
                code: convertedTextAndCode.code,
                visibility: 'public',
                license: 'attribution',
                discipline: 'NOT_IMPLEMENTED',
                subject: 'NOT_IMPLEMENTED',
                concept: 'NOT_IMPLEMENTED',
                explanation: state.currentQuestionScaffold.explanation,
                answerComments: {
                    question0: state.currentQuestionScaffold.answers.question0.comment,
                    question1: state.currentQuestionScaffold.answers.question1.comment,
                    question2: state.currentQuestionScaffold.answers.question2.comment,
                    question3: state.currentQuestionScaffold.answers.question3.comment
                }
            };

            return {
                ...state,
                currentQuestionScaffold: {
                    ...state.currentQuestionScaffold,
                    convertedQuestion
                }
            };
        }
        default: {
            return state;
        }
    }
};

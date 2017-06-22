import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {checkForUserToken, setDisabledNext, initCurrentQuestionScaffold, updateCurrentQuestionScaffold} from '../../redux/actions';
import {User} from '../../typings/user';
import {QuestionScaffold} from '../../typings/question-scaffold';
import {QuestionScaffoldAnswer} from '../../typings/question-scaffold-answer';
import {shuffleArray} from '../../services/utilities-service';
import {generateMultipleChoice} from '../../services/question-to-code-service';
import {ContainerElement} from '../../typings/container-element';
import {Question} from '../../typings/question';
import {AnswerTypes} from '../../typings/answer-types';
import {createUUID, getPrendusLTIServerOrigin} from '../../services/utilities-service';

class PrendusScaffoldFinalQuestion extends Polymer.Element {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    selectedIndex: number;
    numberOfAnswers: number;
    myIndex: number;
    currentQuestionScaffold: QuestionScaffold;
    answers: QuestionScaffoldAnswer[];
    assignmentId: string;
    question: Question;
    questionScaffold: QuestionScaffold;
    questionId: string;
    userToken: string;
    user: User;

    static get is() { return 'prendus-scaffold-final-question'; }
    static get properties() {
        return {
          assignmentId: {
            type: String
          },
          myIndex: {
            type: Number
          },
          selectedIndex: {
            type: Number,
            observer: 'disableNext'
          }
        };
    }
    constructor() {
        super();
        this.componentId = createUUID();
    }
    connectedCallback() {
        super.connectedCallback();
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };
    }

    disableNext(e: any): Promise<void> {
      if(this.myIndex !== undefined && this.selectedIndex !== undefined && this.myIndex === this.selectedIndex) {
        this.action = setDisabledNext(false);
        // checkForUserToken();
        const convertedQuestion = this.convertScaffoldToQuestion()
        const questionId = this.saveQuestion(convertedQuestion)
      }
      //Go through this next and implement the functionality with quizzes
      // async function addQuestionToQuiz(quizId: string, question: Question): Promise<string> {
      //   const questionId: string = await QuestionModel.save(question.id, question);
      //   const questionIds: string[] = await QuizModel.getQuestionIds(quizId);
      //
      //   await QuizModel.associateQuestion(quizId, questionId, questionIds.length);
      //
      //   return questionId;
      // }
    }

    convertScaffoldToQuestion(): Question {
      //Need to pull this out because the answer comments go to a different place than the rest of the answers
        const shuffledAnswers = shuffleArray(Object.values(this.questionScaffold.answers).map((answer: QuestionScaffoldAnswer) => {
            return {
                text: answer.text,
                correct: answer.correct,
                comment: answer.comment,
                type: AnswerTypes.MultipleChoice
            };
        }))
        const convertedTextAndCode: {
            text: string,
            code: string
        } = generateMultipleChoice({
            stem: this.questionScaffold.question,
            answers: shuffledAnswers
        });
        const convertedQuestion: Question = {
            ...this.questionScaffold.convertedQuestion,
            author: this.user,
            text: convertedTextAndCode.text,
            code: convertedTextAndCode.code,
            // This will be implemented soon
            // concept: 'NOT_IMPLEMENTED',
            explanation: this.questionScaffold.explanation,
            concept: this.questionScaffold.concept,
            resource: this.questionScaffold.resource,
            answerComments: {
                question0: shuffledAnswers[0].comment,
                question1: shuffledAnswers[0].comment,
                question2: shuffledAnswers[0].comment,
                question3: shuffledAnswers[0].comment
            }
        };
        return convertedQuestion;
    }

    async saveQuestion(question: Question) {
      //have to do this because the code is a multi-line string. We need to parse it down to a single line so that Graph.cool will accept it.
      const code: string = question.code.replace(/\n/g, "");
      const data = await GQLMutate(`
        mutation {
          createQuestion(
            authorId: "${this.user.id}"
            assignmentId: "${this.assignmentId}"
            text: "${question.text}"
            conceptId: "${question.concept}"
            explanation: "${question.explanation}"
            resource: "${question.resource}"
            code: "${code}"
          ) {
            id
          }
        }
      `, this.userToken, (error: any) => {
          console.log(error);
      });
      Object.keys(question.answerComments).forEach((key) => {
          GQLMutate(`
            mutation {
              createAnswerComment(
                text: "${question.answerComments[key]}"
                questionId: "${data.createQuestion.id}"
              ) {
                id
              }
            }
          `, this.userToken, (error: any) => {
              console.log(error);
          });
      });
      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key: 'questionId',
          value: data.createQuestion.id
      };

      window.fetch(`${getPrendusLTIServerOrigin()}/api/lti/grade-passback`, {
          method: 'post',
          mode: 'no-cors',
          credentials: 'include'
      });

      return data.createQuestion.id
    }
    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        this.userToken = state.userToken;
        this.user = state.user;
        this.questionScaffold = state.currentQuestionScaffold;
    }
}

window.customElements.define(PrendusScaffoldFinalQuestion.is, PrendusScaffoldFinalQuestion);

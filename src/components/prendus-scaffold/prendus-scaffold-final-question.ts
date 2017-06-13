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

class PrendusScaffoldFinalQuestion extends Polymer.Element {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    selectedIndex: number;
    numberOfAnswers: number;
    myIndex: number;
    currentQuestionScaffold: QuestionScaffold;
    answers: QuestionScaffoldAnswer[];
    quizId: string;
    question: Question;
    questionScaffold: QuestionScaffold;
    userToken: string;
    user: User;

    static get is() { return 'prendus-scaffold-final-question'; }
    static get properties() {
        return {
          myIndex: {
            type: Number
          },
          selectedIndex: {
            type: Number,
            observer: 'disableNext'
          }
        };
    }
    connectedCallback() {
        super.connectedCallback();
        this.componentId = this.shadowRoot.querySelector('#reduxStoreElement').elementId;
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
        // this.action = {
        //     type: 'CONVERT_QUESTION_SCAFFOLD_TO_QUESTION',
        //     userToken: this.userToken,
        //     questionId: this.questionScaffold.convertedQuestion ? this.questionScaffold.convertedQuestion.id : null
        // };

        // const questionId: string = await addQuestionToQuiz(this.quizId, this.questionScaffold.convertedQuestion);
        // this.action = {
        //     type: 'SET_QUESTION_SCAFFOLD_QUESTION_ID',
        //     questionId
        // };
      }

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
        const convertedTextAndCode: {
            text: string,
            code: string
        } = generateMultipleChoice({
            stem: this.questionScaffold.question,
            answers: shuffleArray(Object.values(this.questionScaffold.answers).map((answer: QuestionScaffoldAnswer) => {
                return {
                    text: answer.text,
                    correct: answer.correct,
                    type: AnswerTypes.MultipleChoice
                };
            }))
        });
        const convertedQuestion: Question = {
            ...this.questionScaffold.convertedQuestion,
            author: this.userToken,
            text: convertedTextAndCode.text,
            code: convertedTextAndCode.code,
            license: 'attribution',
            // discipline: 'NOT_IMPLEMENTED',
            // subject: 'NOT_IMPLEMENTED',
            // concept: 'NOT_IMPLEMENTED',
            explanation: this.questionScaffold.explanation,
            answerComments: {
                question0: this.questionScaffold.answers.question0.comment,
                question1: this.questionScaffold.answers.question1.comment,
                question2: this.questionScaffold.answers.question2.comment,
                question3: this.questionScaffold.answers.question3.comment
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
              text: "${question.text}"
              code: "${code}"
            ) {
              id
            }
          }
        `, this.userToken, (error: any) => {
            console.log(error);
        });
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'questionId',
            value: data.createQuestion.id
        };
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        this.userToken = state.userToken;
        this.user = state.user;
        this.questionScaffold = state.currentQuestionScaffold;
    }
}

window.customElements.define(PrendusScaffoldFinalQuestion.is, PrendusScaffoldFinalQuestion);

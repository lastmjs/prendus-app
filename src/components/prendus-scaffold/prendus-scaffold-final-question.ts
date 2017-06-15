import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {checkForUserToken, setDisabledNext, initCurrentQuestionScaffold, updateCurrentQuestionScaffold} from '../../redux/actions';
import {QuestionScaffold} from '../../typings/question-scaffold';
import {QuestionScaffoldAnswer} from '../../typings/question-scaffold-answer';
import {isDefinedAndNotEmpty} from '../../services/utilities-service';
import {ContainerElement} from '../../typings/container-element';
import {Question} from '../../typings/question';

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
    uid: string;

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

    async disableNext(e: any): Promise<void> {
      try {
        if(this.myIndex !== undefined && this.selectedIndex !== undefined && this.myIndex === this.selectedIndex) {
          this.action = setDisabledNext(false);
          checkForUserToken();
          this.action = {
              type: 'CONVERT_QUESTION_SCAFFOLD_TO_QUESTION',
              uid: this.uid,
              questionId: this.questionScaffold.convertedQuestion ? this.questionScaffold.convertedQuestion.id : null
          };
          const questionId: string = await addQuestionToQuiz(this.quizId, this.questionScaffold.convertedQuestion);
          this.action = {
              type: 'SET_QUESTION_SCAFFOLD_QUESTION_ID',
              questionId
          };
        }
      } catch(error) {
        console.error(error);
      }

      async function addQuestionToQuiz(quizId: string, question: Question): Promise<string> {
        const questionId: string = await QuestionModel.save(question.id, question);
        const questionIds: string[] = await QuizModel.getQuestionIds(quizId);

        await QuizModel.associateQuestion(quizId, questionId, questionIds.length);

        return questionId;
      }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        this.questionScaffold = state.currentQuestionScaffold;
    }
}

window.customElements.define(PrendusScaffoldFinalQuestion.is, PrendusScaffoldFinalQuestion);

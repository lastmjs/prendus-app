import {SetPropertyAction, SetComponentPropertyAction, initializeQuestionScaffoldsToRate } from '../../typings/actions';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {setDisabledNext} from '../../redux/actions'
import {User} from '../../typings/user';
import {Question} from '../../typings/question';
import {GuiQuestion} from '../../typings/gui-question';
import {GuiAnswer} from '../../typings/gui-answer';
import {QuestionScaffold} from '../../typings/question-scaffold';
import {QuestionScaffoldAnswer} from '../../typings/question-scaffold-answer';
import {generateGuiData} from '../../services/code-to-question-service'

class PrendusQuestionReview extends Polymer.Element {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    userToken: string | null;
    user: User | null;
    selectedIndex: number;
    myIndex: number;
    disableNext: boolean;
    numberOfAnswers: number;
    exampleQuestionScaffold: QuestionScaffold;
    exampleQuestionScaffoldAnswers: QuestionScaffoldAnswer[];
    questionScaffold: QuestionScaffold;
    questionScaffoldAnswers: QuestionScaffoldAnswer[];
    questionScaffoldsToRate: QuestionScaffold[];
    questionScaffoldQuizId: string;
    assignmentId: string;
    questions: Question[];

    maxSliderValue: number;
    minSliderValue: number;
    quality: number;
    difficulty: number;
    accuracy: number;
    querySelector: any;

    static get is() { return 'prendus-question-review'; }

    static get properties() {
        return {
            assignmentId: {
            },
        };
    }

    async connectedCallback() {
        super.connectedCallback();
        this.componentId = this.shadowRoot.querySelector('#reduxStoreElement').elementId;
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };
        this.maxSliderValue = 10;
        this.minSliderValue = 1;
        this.quality = 0;
        this.difficulty = 0;
        this.accuracy = 0;
        this.numberOfAnswers = 4;
        this.selectedIndex = 0;
        // this.action = await Actions.initializeQuestionScaffoldQuiz(this.quizId, 5);
        // this.action = await Actions.initializeQuestionScaffoldsToRate(this.quizId, 3);
        await this.loadAssignmentQuestions();
        this.generateQuestionScaffolds()
    }
    back(): void {
      --this.selectedIndex;
      // this.action = Actions.setDisabledNext(false);
      this.action = setDisabledNext(false);
    }
    next(): void {
      ++this.selectedIndex;
      if(this.selectedIndex === this.querySelector('#iron-pages').items.length - 1) {
        // Reached the limit.
        this.action = setDisabledNext(true);
      }
    }

    async loadAssignmentQuestions() {
      console.log('this.assignmentId', this.assignmentId)
        await GQLQuery(`
            query {
                questionsInAssignment: Assignment(id: "${this.assignmentId}") {
                    questions{
                      id
                      code
                      text
                      explanation
                      answerComments{
                        text
                      }
                    },
                }
            }
        `, this.userToken, (key: string, value: Question[]) => {
            this.action = {
                type: 'SET_PROPERTY',
                key,
                value
            };
            return value;
        }, (error: any) => {
            console.log(error);
        });
    }
    generateQuestionScaffolds(){
      const questionComments = this.questions.questions;
      this.questionScaffoldsToRate = this.questions.questions.map(function(question: Question){
        const guiQuestion: GuiQuestion = generateGuiData({
            text: question.text,
            code: question.code
        });
        const questionScaffoldAnswers = guiQuestion.answers.reduce((result, guiAnswer: GuiAnswer, index: number) => {
            return {
                ...result,
                [`question${index}`]: {
                    text: guiAnswer.text,
                    correct: guiAnswer.correct,
                    comment: question.answerComments[`${index}`].text,
                    id: `question${index}`
                }
            };
        }, {});
        return {
            answers: questionScaffoldAnswers,
            question: guiQuestion.stem,
            explanation: question.explanation,
            convertedQuestion: question
        };
      })
      console.log('questionScaffolds', this.questionScaffoldsToRate)
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        this.questions = state[`questionsInAssignment`];
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusQuestionReview.is, PrendusQuestionReview);

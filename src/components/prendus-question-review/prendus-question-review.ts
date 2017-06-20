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
import {QuestionRating} from '../../typings/question-rating';
import {createUUID} from '../../services/utilities-service';

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
    questionReviewNumber: number;

    static get is() { return 'prendus-question-review'; }

    static get properties() {
        return {
            assignmentId: {
              observers: "loadReview"
            },
        };
    }
    constructor() {
        super();
        this.componentId = createUUID();
    }
    async connectedCallback() {
        super.connectedCallback();
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'maxSliderValue',
            value: 10
        };
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'minSliderValue',
            value: 1
        };
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'quality',
            value: 0
        };
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'accuracy',
            value: 0
        };
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'difficulty',
            value: 0
        };
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'numberOfAnswers',
            value: 4
        };
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'selectedIndex',
            value: 0
        };
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'questionReviewNumber',
            value: 1
        };
        // this.action = await Actions.initializeQuestionScaffoldQuiz(this.quizId, 5);
    }
    async loadReview(){
      await this.loadAssignmentQuestions();
      this.generateQuestionScaffolds()
    }
    back(): void {
      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key: 'selectedIndex',
          value: --this.selectedIndex
      };
      this.action = setDisabledNext(false);
    }
    next(): void {
      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key: 'selectedIndex',
          value: ++this.selectedIndex
      };
      if(this.selectedIndex === this.querySelector('#iron-pages').items.length - 1) {
        // Reached the limit.
        this.action = setDisabledNext(true);
      }
    }

    async loadAssignmentQuestions() {
        await GQLQuery(`
            query {
                questionsInAssignment: Assignment(id: "${this.assignmentId}") {
                    questions(first: 9){
                      id
                      code
                      text
                      explanation
                      resource
                      concept{
                        title
                      }
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
      // const questionComments = this.questions.questions;
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
            id: question.id,
            answers: questionScaffoldAnswers,
            question: guiQuestion.stem,
            explanation: question.explanation,
            convertedQuestion: question
        };
      })
    }

    async submit(e: any): Promise<void> {
      try {
        const questionId: string = e.target.id;
        const quality: number = this.shadowRoot.querySelector('#quality').value;
        const difficulty: number = this.shadowRoot.querySelector('#difficulty').value;
        const accuracy: number = this.shadowRoot.querySelector('#accuracy').value;
        const data = await GQLMutate(`
          mutation {
            createQuestionRating(
              quality: ${quality}
              difficulty: ${difficulty}
              alignment: ${accuracy}
              raterId: "${this.user.id}"
              questionId: "${questionId}"
            ) {
              id
            }
          }
        `, this.userToken, (error: any) => {
            console.log(error);
        });
        this.action = setDisabledNext(false);
        // Actions.showNotification(this, 'success', 'Ratings submitted');
      } catch(error) {
        console.error(error);
      }
      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key: 'selectedIndex',
          value: ++this.selectedIndex
      };
      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key: 'questionReviewNumber',
          value: ++this.questionReviewNumber
      };

      if(this.selectedIndex == this.questionScaffoldsToRate.length){
        alert('Congratulations, you are done rating questions')
      }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        if (Object.keys(state.components[this.componentId] || {}).includes('selectedIndex')) this.selectedIndex = state.components[this.componentId].selectedIndex;
        if (Object.keys(state.components[this.componentId] || {}).includes('selectedIndex')) this.selectedIndex = state.components[this.componentId].selectedIndex;
        if (Object.keys(state.components[this.componentId] || {}).includes('questionReviewNumber')) this.questionReviewNumber = state.components[this.componentId].questionReviewNumber;
        if (Object.keys(state.components[this.componentId] || {}).includes('minSliderValue')) this.minSliderValue = state.components[this.componentId].minSliderValue;
        if (Object.keys(state.components[this.componentId] || {}).includes('maxSliderValue')) this.maxSliderValue = state.components[this.componentId].maxSliderValue;
        if (Object.keys(state.components[this.componentId] || {}).includes('quality')) this.quality = state.components[this.componentId].quality;
        if (Object.keys(state.components[this.componentId] || {}).includes('difficulty')) this.difficulty = state.components[this.componentId].difficulty;
        if (Object.keys(state.components[this.componentId] || {}).includes('accuracy')) this.accuracy = state.components[this.componentId].accuracy;
        // if (Object.keys(state.components[this.componentId] || {}).includes('questions')) this.questions = state[`questionsInAssignment`];
        this.questions = state[`questionsInAssignment`];
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusQuestionReview.is, PrendusQuestionReview);

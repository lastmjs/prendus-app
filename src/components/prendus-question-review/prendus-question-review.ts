import {SetPropertyAction, SetComponentPropertyAction, initializeQuestionScaffoldsToRate } from '../../typings/actions.js';
import {GQLQuery, GQLMutate} from '../../services/graphql-service.js';
import {ContainerElement} from '../../typings/container-element.js';
import {setDisabledNext} from '../../redux/actions.js'
import {User} from '../../typings/user.js';
import {Question} from '../../typings/question.js';
import {GuiQuestion} from '../../typings/gui-question.js';
import {GuiAnswer} from '../../typings/gui-answer.js';
import {QuestionScaffold} from '../../typings/question-scaffold.js';
import {QuestionScaffoldAnswer} from '../../typings/question-scaffold-answer.js';
import {compileToGuiQuestion} from '../../services/code-to-question-service.js'
import {QuestionRating} from '../../typings/question-rating.js';
import {createUUID, shuffleArray} from '../../services/utilities-service.js';

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
    quizQuestions: Question[];
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
              observer: "getInfoForQuestionScaffolds"
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
            key: 'loaded',
            value: true
        };
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

    }
    async getInfoForQuestionScaffolds(){
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
                Assignment(id: "${this.assignmentId}") {
                    questions{
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
            if(value){
              const questionsToReview = shuffleArray(value.questions).slice(0,3);
              const quizQuestions = shuffleArray(value.questions).slice(0,5);
              this.action = {
                  type: 'SET_COMPONENT_PROPERTY',
                  componentId: this.componentId,
                  key: 'questions',
                  value: questionsToReview
              };
              this.action = {
                  type: 'SET_COMPONENT_PROPERTY',
                  componentId: this.componentId,
                  key: 'quizQuestions',
                  value: quizQuestions
              };
            }else{
              this.action = {
                  type: 'SET_COMPONENT_PROPERTY',
                  componentId: this.componentId,
                  key: 'questions',
                  value: null
              };
            }

        }, (error: any) => {
            console.log(error);
        });
    }
    generateQuestionScaffolds(){
      // const questionComments = this.questions.questions;
      const qScaffolds = this.questions.map(function(question: Question){
        const guiQuestion: GuiQuestion = compileToGuiQuestion(question.text, question.code);
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
            concept: question.concept,
            resource: question.resource,
            explanation: question.explanation,
            convertedQuestion: question
        };
      })
      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key: 'questionScaffoldsToRate',
          value: qScaffolds
      };
    }
    //Checks if questions exist. If not, notifies the user.
    hasQuestions(item: any) {
      return item;
    }
    async submit(e: any): Promise<void> {
      try {
        const questionId: string = e.target.id;
        const quality: number = this.shadowRoot.querySelector(`#quality${questionId}`).value;
        const difficulty: number = this.shadowRoot.querySelector(`#difficulty${questionId}`).value;
        const accuracy: number = this.shadowRoot.querySelector(`#accuracy${questionId}`).value;
        const authenticity: number = this.shadowRoot.querySelector(`#authenticity${questionId}`).value;
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
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'selectedIndex',
            value: ++this.selectedIndex
        };
      }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        if (Object.keys(state.components[this.componentId] || {}).includes('selectedIndex')) this.selectedIndex = state.components[this.componentId].selectedIndex;
        if (Object.keys(state.components[this.componentId] || {}).includes('questionReviewNumber')) this.questionReviewNumber = state.components[this.componentId].questionReviewNumber;
        if (Object.keys(state.components[this.componentId] || {}).includes('minSliderValue')) this.minSliderValue = state.components[this.componentId].minSliderValue;
        if (Object.keys(state.components[this.componentId] || {}).includes('maxSliderValue')) this.maxSliderValue = state.components[this.componentId].maxSliderValue;
        if (Object.keys(state.components[this.componentId] || {}).includes('quality')) this.quality = state.components[this.componentId].quality;
        if (Object.keys(state.components[this.componentId] || {}).includes('difficulty')) this.difficulty = state.components[this.componentId].difficulty;
        if (Object.keys(state.components[this.componentId] || {}).includes('accuracy')) this.accuracy = state.components[this.componentId].accuracy;
        if (Object.keys(state.components[this.componentId] || {}).includes('questions')) this.questions = state.components[this.componentId].questions;
        if (Object.keys(state.components[this.componentId] || {}).includes('quizQuestions')) this.quizQuestions = state.components[this.componentId].quizQuestions;
        if (Object.keys(state.components[this.componentId] || {}).includes('questionScaffoldsToRate')) this.questionScaffoldsToRate = state.components[this.componentId].questionScaffoldsToRate;
        // this.questions = state[`questionsInAssignment`];
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusQuestionReview.is, PrendusQuestionReview);

import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {GQLQuery, GQLMutate, GQLrequest} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {setDisabledNext} from '../../redux/actions'
import {User} from '../../typings/user';
import {Question} from '../../typings/question';
import {GuiQuestion} from '../../typings/gui-question';
import {GuiAnswer} from '../../typings/gui-answer';
import {QuestionScaffold} from '../../typings/question-scaffold';
import {QuestionScaffoldAnswer} from '../../typings/question-scaffold-answer';
import {compileToGuiQuestion} from '../../services/code-to-question-service'
import {QuestionRating} from '../../typings/question-rating';
import {rubric} from '../../typings/evaluation-rubric';
import {createUUID, shuffleArray} from '../../services/utilities-service';

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
    rubricCategories: string[];
    rubricScores: { [key: string]: number };

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
    _fireLocalAction(key: string, value: any) {
      this.action = {
        type: 'SET_COMPONENT_PROPERTY',
        componentId: this.componentId,
        key,
        value
      };
    }
    async connectedCallback() {
        super.connectedCallback();
        this._fireLocalAction('loaded', true);
        this._fireLocalAction('rubricCategories', this._makeRubricCategories(rubric));
        this._fireLocalAction('numberOfAnswers', 4);
        this._fireLocalAction('selectedIndex', 0);
        this._fireLocalAction('questionReviewNumber', 1);
    }
    async getInfoForQuestionScaffolds(){
      await this.loadAssignmentQuestions();
      this.generateQuestionScaffolds()
    }
    back(): void {
      this._fireLocalAction('selectedIndex', --this.selectedIndex);
      this.action = setDisabledNext(false);
    }
    next(): void {
      this._fireLocalAction('selectedIndex', ++this.selectedIndex)
      if(this.selectedIndex === this.querySelector('#iron-pages').items.length - 1) {
        // Reached the limit.
        this.action = setDisabledNext(true);
      }
    }

    _makeRubricCategories(rubric: Object): Object[] {
      const categories = Object.keys(rubric);
      return categories.map(category => {
        return {
          label: category,
          options: this._makeRubricOptions(rubric[category])
        };
      };
    }

    _makeRubricOptions(options: Object): Object[] {
      const labels = Object.keys(options);
      return labels.map(label => {
        return {
          label,
          ...options[label]
        }
      });
    }

    _paperItemId(category: Object, option: Object) {
      return category.label.replace(/\s/, '') + '-' + option.label;
    }

    _rubricScoreChanged(e) {
      const changed = { [e.model.category.label]: e.detail.item.value };
      this.rubricScores || this.rubricScores = {};
      const newRubricScores = {...this.rubricScores, ...changed};
      this._fireLocalAction('rubricScores', newRubricScores);
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
              this._fireLocalAction('questions', questionsToReview);
              this._fireLocalAction('quizQuestions', quizQuestions);
            }else{
              this._fireLocalAction('questions', null);
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
      this._fireLocalAction('questionScaffoldsToRate', qScaffolds);
    }
    //Checks if questions exist. If not, notifies the user.
    hasQuestions(item: any) {
      return item;
    }
    async submit(e: any): Promise<void> {
      try {
        const variables = {
          json: JSON.stringify(this.rubricScores),
          rater: this.user.id,
          question: e.target.id
        };
        const mutation = `mutation submitRating($json: Json!, $rater: ID!, $question: ID!) {
            createQuestionRating(
              ratingJson: $json
              raterId: $rater
              questionId: $question
            ) {
              id
              ratingJson
            }
          }`;
        GQLrequest(mutation, variables, this.userToken);
      } catch(error) {
        console.error(error);
      }
      this._fireLocalAction('selectedIndex', ++this.selectedIndex);
      this._fireLocalAction('questionReviewNumber', ++this.questionReviewNumber);

      if(this.selectedIndex == this.questionScaffoldsToRate.length){
        this._fireLocalAction('selectedIndex', ++this.selectedIndex);
      }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        const componentState = state.components[this.componentId];
        const keys = Object.keys(componentState || {});
        if (keys.includes('loaded')) this.loaded = componentState.loaded;
        if (keys.includes('selectedIndex')) this.selectedIndex = componentState.selectedIndex;
        if (keys.includes('questionReviewNumber')) this.questionReviewNumber = componentState.questionReviewNumber;
        if (keys.includes('minSliderValue')) this.minSliderValue = componentState.minSliderValue;
        if (keys.includes('maxSliderValue')) this.maxSliderValue = componentState.maxSliderValue;
        if (keys.includes('quality')) this.quality = componentState.quality;
        if (keys.includes('difficulty')) this.difficulty = componentState.difficulty;
        if (keys.includes('accuracy')) this.accuracy = componentState.accuracy;
        if (keys.includes('questions')) this.questions = componentState.questions;
        if (keys.includes('quizQuestions')) this.quizQuestions = componentState.quizQuestions;
        if (keys.includes('questionScaffoldsToRate')) this.questionScaffoldsToRate = componentState.questionScaffoldsToRate;
        if (keys.includes('rubricCategories')) this.rubricCategories = componentState.rubricCategories;
        if (keys.includes('rubricScores')) this.rubricScores = componentState.rubricScores;
        // this.questions = state[`questionsInAssignment`];
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusQuestionReview.is, PrendusQuestionReview);

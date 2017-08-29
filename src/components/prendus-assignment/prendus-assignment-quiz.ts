import {SetPropertyAction, SetComponentPropertyAction } from '../../typings/actions';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {setDisabledNext, checkForUserToken, setNotification} from '../../redux/actions'
import {User} from '../../typings/user';
import {Assignment} from '../../typings/assignment';
import {Question} from '../../typings/question';
import {GuiQuestion} from '../../typings/gui-question';
import {GuiAnswer} from '../../typings/gui-answer';
import {QuestionScaffold} from '../../typings/question-scaffold';
import {QuestionScaffoldAnswer} from '../../typings/question-scaffold-answer';
import {QuestionRating} from '../../typings/question-rating';
import {QuestionRatingStats} from '../../typings/question-rating-stats';
import {rubric} from '../../typings/evaluation-rubric';
import {createUUID, getPrendusLTIServerOrigin, shuffleArray} from '../../services/utilities-service';
import {sendStatement} from '../../services/analytics-service';
import {ContextType, NotificationType} from '../../services/constants-service';

class PrendusAssignmentQuiz extends Polymer.Element {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    userToken: string;
    user: User;
    selectedIndex: number;
    questions: Question[];
    quizQuestions: Question[];
    assignmentId: string;
    quizId: string;
    categories: string[];

    static get is() { return 'prendus-assignment-quiz'; }

    static get properties() {
        return {
            assignmentId: {
              observer: "loadQuiz"
            }
        };
    }
    constructor() {
        super();
        this.componentId = createUUID();
    }
    async connectedCallback() {
        super.connectedCallback();
    }
    _fireLocalAction(key: string, value: any) {
      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
        componentId: this.componentId,
        key,
        value
      };
    }
    async loadQuiz(){
      this._fireLocalAction('loaded', false)
      await this.loadAssignmentQuestions();
      await this.generateQuiz();
      this._fireLocalAction('loaded', true)
    }
    async loadAssignmentQuestions() {
        const questionData = await GQLQuery(`
            query {
                Assignment(id: "${this.assignmentId}") {
                    questions{
                      id
                      code
                      text
                      explanation
                      resource
                      concept{
                        id
                        title
                      }
                      ratings {
                        ratingJson
                      }
                      answerComments{
                        text
                      }
                    },
                }
            }
        `, this.userToken, (key: string, value: Assignment) => {
        }, (error: any) => {
            console.log('error', error)
            this.action = setNotification(error.message, NotificationType.ERROR)
        });
        if(questionData.Assignment){
          const scores = this._computeQuestionStats(questionData.Assignment.questions);
          const qualityQuestions = this._filterQuestions(scores)
          const quizQuestions = shuffleArray(questionData.Assignment.questions).slice(0,10);
          this._fireLocalAction('quizQuestions', quizQuestions)
        }else{
          this._fireLocalAction('questions', null)
        }
    }
    _filterQuestions(scores: QuestionRatingStats[]): Object {
      return scores.filter((score)=> {
        //TODO Needs to be changed to > 1 in production. Also figure out how to get Inclusion on the questionratingstats
        return score.stats.Inclusion > .9;
      })
    }
    _categoryScores(ratings: Object[]): Object {
      this._fireLocalAction('categories', Object.keys(rubric));
      return this.categories.reduce((scores, category) => {
        const score = sumProp(ratings, category) / ratings.length;
        return Object.assign(scores, {[category]: score});
      }, {});
    }
    _computeRatingStats(ratings: Object[]): Object {
      return this._categoryScores(ratings);
    }

    _computeQuestionStats(questions: Question[]): QuestionRatingStats[] {
      return questions.map(question => {
        const ratings = question.ratings.map(rating => JSON.parse(rating.ratingJson)).filter(rating => rating != null);
        const stats = this._computeRatingStats(ratings);
        return {
          assignmentId: this.assignmentId,
          conceptId: question.concept.id,
          student: '', //question.author.email,
          text: question.text,
          ratings,
          stats
        }
      });
    }
    async generateQuiz(){
      const questionIds = this.quizQuestions.map(function(a) {return a.id;});
      const questionIdsString = `["${questionIds.join('","')}"]`;
      const data = await GQLMutate(`
          mutation {
              createQuiz(
                  authorId: "${this.user.id}"
                  title: "Assignment Quiz"
                  questionsIds: ${questionIdsString}
              ) {
                  id
              }
          }
      `, this.userToken, (error: any) => {
          this.action = setNotification(error.message, NotificationType.ERROR)
      });
      this._fireLocalAction('quizId', data.createQuiz.id)
    }

    async submitQuiz(){
      const LTIResponse = await window.fetch(`${getPrendusLTIServerOrigin()}/lti/grade-passback`, {
          method: 'post',
          mode: 'no-cors',
          credentials: 'include'
      });
      if(LTIResponse.ok === true){
        sendStatement(this.userToken, this.user.id, this.assignmentId, ContextType.ASSIGNMENT, "SUBMITTED", "QUIZ")
      }else{
        //TODO input a notication error message here once the notifications are merged.
      }

      alert('Congratulations! You have successfully completed the Quiz')
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        const componentState = state.components[this.componentId] || {};
        const keys = Object.keys(componentState);        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        if (keys.includes('selectedIndex')) this.selectedIndex = componentState.selectedIndex;
        if (keys.includes('questions')) this.questions = componentState.questions;
        if (keys.includes('quizQuestions')) this.quizQuestions = componentState.quizQuestions;
        if (keys.includes('quizId')) this.quizId = componentState.quizId;
        if (keys.includes('categories')) this.categories = componentState.categories;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}
  function sumProp (arr: Object[], prop): number {
    return arr.reduce((sum: number, obj: Object) => sum + (Number(obj[prop]) || 0), 0)
  }
window.customElements.define(PrendusAssignmentQuiz.is, PrendusAssignmentQuiz);

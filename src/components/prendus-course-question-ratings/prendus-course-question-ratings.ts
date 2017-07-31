import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {User} from '../../typings/user';
import {Assignment} from '../../typings/assignment';
import {QuestionRating} from '../../typings/question-rating';
import {createUUID} from '../../services/utilities-service';
import {parse} from '../../node_modules/assessml/assessml';

class PrendusCourseQuestionRatings extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  userToken: string | null;
  user: User;
  courseId: string;
  assignments: Assignment[];
  filter: { [key: string]: string };

  static get is() { return 'prendus-course-question-ratings'; }

  static get properties() {
    return {
      courseId: {
        observer: '_courseIdChanged'
      }
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
    this.filter = { assignmentId: 'ALL', conceptId: 'ALL' };
  }

  async connectedCallback() {
    super.connectedCallback();
    this.action = {
        type: 'SET_COMPONENT_PROPERTY',
        componentId: this.componentId,
        key: 'loaded',
        value: true
    };
  }

  _handleError(error: any) {
    console.log('error', error);
  }

  async loadQuestions() {
    const data = GQLQuery(`
        query {
          assignments: allAssignments(
            filter:{
              course: {
                id: "${this.courseId}"
              }
          }) {
            id
            title
            concepts {
              subject {
                title
              }
              id
              title
            }
            questions {
              id
              text
              ratings {
                alignment
                difficulty
                quality
              }
            }
          }
        }
    `, this.userToken,
      (key: string, value: any) => {
        this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key,
          value
        };
      },
      this._handleError);
  }

  async _courseIdChanged() {
      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key: 'courseId',
          value: this.courseId
      };

      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key: 'loaded',
          value: false
      };

      await this.loadQuestions();

      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key: 'loaded',
          value: true
      };
  }

  _applyFilter(assignments: Assignment[], filter: { [key: string]: string }): Question[] {
    if (!assignments) return;
    let filtered = flatten(assignments.map(assignment => assignment.questions));
    return filtered;
  }

  _questionOnly(text: string): string {
    return parse(text).ast[0].content.replace('<p>', '').replace('</p><p>', '');
  }

  _questionAlignment(ratings: QuestionRating[]): number {
    return averageProp(ratings, 'alignment');
  }

  _questionQuality(ratings: QuestionRating[]): number {
    return averageProp(ratings, 'quality');
  }

  _questionDifficulty(ratings: QuestionRating[]): number {
    return averageProp(ratings, 'difficulty');
  }

  _questionScore(ratings: QuestionRating[]): number {
    return (this._questionAlignment(ratings) + this._questionQuality(ratings) + this._questionDifficulty(ratings)) / 3;
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('assignments')) this.assignments = componentState.assignments;
    if (keys.includes('courseId')) this.courseId = componentState.courseId;
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    this.userToken = state.userToken;
    this.user = state.user;
    console.log('state changed', state);
  }
}

function flatten(arr: any[]): any[] {
  return arr.reduce((acc, elem) => {
    return acc.concat(Array.isArray(elem) ? flatten(elem) : elem);
  },[]);
}

function averageProp(arr: Object[], prop: string): number {
  if (!arr.length) return 0;
  return arr.reduce((sum, obj) => sum + obj[prop], 0) / arr.length;
}


window.customElements.define(PrendusCourseQuestionRatings.is, PrendusCourseQuestionRatings);


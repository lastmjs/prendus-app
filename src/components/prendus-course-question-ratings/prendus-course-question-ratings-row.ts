import {parse} from '../../node_modules/assessml/assessml';
import {categoryScores} from '../../services/question-stats';

class PrendusCourseQuestionRatingsRow extends Polymer.Element {

  static get is() { return 'prendus-course-question-ratings-row' }

  static get properties() {
    return {
      question: Object,
      categories: Array,
      _categories: {
        type: Array,
        computed: '_computeCategories(categories)'
      },
      _rawScores: {
        type: Object,
        computed: '_computeRawScores(question)'
      }
    }
  }

  _computeRawScores(question: Question): {[category: string]: CategoryScore[]} {
    return categoryScores(question);
  }

  _computeCategories(categories: string[]): string[] {
    return categories.filter(category => category !== 'Student' && category !== 'Overall');
  }

  _scores(scores: object, category: string) {
    return scores ? scores[category] : null;
  }

  _viewQuestion(e: CustomEvent) {
    this.shadowRoot.querySelector('#question-modal').open();
  }

  _closeQuestionModal(e: CustomEvent) {
    this.shadowRoot.querySelector('#question-modal').close();
  }

  _questionOnly(text: string): string {
    return truncate(parse(text, null).ast[0].content.replace(/<p>|<p style=".*">|<\/p>|<img.*\/>/g, ''));
  }

  _precision(num: number): string {
    return num.toPrecision(2);
  }

}

function truncate(str: string): string {
  if (str.length < 100) return str;
  return str.substr(0, 100) + '...';
}

window.customElements.define(PrendusCourseQuestionRatingsRow.is, PrendusCourseQuestionRatingsRow);

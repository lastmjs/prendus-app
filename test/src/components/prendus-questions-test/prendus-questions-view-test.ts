import {User, Question} from '../../../../src/prendus.d'
import {saveArbitrary, deleteArbitrary, createTestUser, deleteTestUsers, createTestQuestions} from '../../services/mock-data-service';
import {QuestionArb} from '../../services/arbitraries-service'
import {RootReducer} from '../../../../src/redux/reducers';
import {asyncMap, asyncForEach} from '../../../../src/node_modules/prendus-shared/services/utilities-service';
import {GQLRequest} from '../../../../src/node_modules/prendus-shared/services/graphql-service';
// import {arbAST, verifyHTML, resetNums} from '../../../../src/node_modules/assessml/test-utilities';
// import {generateVarValue, getASTObjectPayload} from '../node_modules/assessml/assessml';
// import {generateArbQuestion} from '../../../../src/node_modules/prendus-question-elements/test-utilities';
// import {UserCheck, UserRadio, UserInput, UserEssay, Question} from '../prendus-question-elements.d';
// import {PrendusQuestionsView} from '../../../../src/components/prendus-questions/prendus-questions-view';
const jsc = require('jsverify');
// const deepEqual = require('deep-equal');

class PrendusQuestionsViewTest extends HTMLElement {
    shadowRoot: ShadowRoot;
    constructor(){
        super();
        this.attachShadow({mode: 'open'});
        const reduxStoreElement = document.createElement('redux-store');
        this.shadowRoot.appendChild(reduxStoreElement);
        reduxStoreElement.rootReducer = RootReducer;
        const appLocationElement = document.createElement('app-location');
        this.shadowRoot.appendChild(appLocationElement);
    }

    prepareTests(test: any) {
      test("click create question fab", [jsc.string], (arbString: string)=>{
        const prendusQuestionsView = document.createElement('prendus-questions-view');
        this.shadowRoot.appendChild(prendusQuestionsView);
        prendusQuestionsView.loaded = true;
        return new Promise((resolve, reject)=>{
          setTimeout(()=>{
            prendusQuestionsView.shadowRoot.querySelector('#addQuestionButton').click();
            if(window.location.pathname === '/question/create'){
              cleanup(this, prendusQuestionsView);
              resolve(true);
            }else{
              cleanup(this, prendusQuestionsView);
              resolve(false);
            }
          });
        });
        function cleanup(context: any, element: any){
          context.shadowRoot.removeChild(element);
          window.history.pushState({}, null, '/');
          window.dispatchEvent(new CustomEvent('location-changed'));
        }
      });
      test("Set userId", [jsc.array(QuestionArb)], async (questions: Question[])=>{
        const prendusQuestionsView = document.createElement('prendus-questions-view');
        this.shadowRoot.appendChild(prendusQuestionsView);
        prendusQuestionsView.loaded = true;
        const user = await createTestUser('STUDENT');
        const questionsWithIds = questions.map(question => ({
          ...question,
          authorId: user.id,
          ratings: question.ratings.map(
            rating => ({
              raterId: user.id,
              ...rating
            })
          ),
        })
        )
        const testQuestions = await createTestQuestions(user, questions);
        prendusQuestionsView.userId = user.id;
        return new Promise((resolve, reject)=>{
          setTimeout(()=>{
            const questionsHTML = prendusQuestionsView.shadowRoot.querySelector('#questions-block');
            console.log(questionsHTML);
            //Cleanup everything we have made
            cleanup(user, testQuestions);
          });
        });

        async function cleanup(user: User, questions: Question[]){
          //Questions need to be deleted first so that the users can properly be deleted
          await deleteQuestions(questions, user.token);
          await deleteTestUsers(user);
        }
        return true;
      });
    }
}

window.customElements.define('prendus-questions-view-test', PrendusQuestionsViewTest);

async function deleteQuestions(questions: Question[], userToken: string){
  await asyncForEach(questions, async (question) => {
    const data = await GQLRequest(`
        mutation deleteQuestion(
            $questionId: ID!
        ) {
            deleteQuestion(
                id: $questionId
            ) {
              id
            }
        }
    `, {
        questionId: question.id
    }, userToken, (error: any) => {
        console.log(error);
    });
  });
}

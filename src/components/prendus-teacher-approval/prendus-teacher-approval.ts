import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {User} from '../../typings/user';
import {createUUID} from '../../services/utilities-service';

class PrendusTeacherApproval extends Polymer.Element {
  action: SetPropertyAction | SetComponentPropertyAction;
  unverifiedTeachers: User[];
  verifiedTeachers: User[];
  componentId: string;
  userToken: string | null;

  static get is() { return 'prendus-teacher-approval'; }

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
    await this.loadTeachers();
  }
  _fireLocalAction(key: string, value: any) {
    this.action = {
        type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }
  async loadTeachers(){
    //TODO this needs to be paginated eventually. Or we need to put in a search to find specific users
    const teacherData = await GQLQuery(`
        query {
          allUsers(
            first: 10
            orderBy:
            createdAt_DESC
          ) {
            id
            role
            email
          }
        }
    `, this.userToken, (key: string, value: any) => {},
      (error: any) => {
        alert(error);
    });
    const unverifiedTeachers = teacherData.allUsers.filter((teacher: User)=>{
      return teacher.role === "STUDENT"
    })
    const verifiedTeachers = teacherData.allUsers.filter((teacher: User)=>{
      return teacher.role === "INSTRUCTOR"
    })
    this._fireLocalAction('unverifiedTeachers', unverifiedTeachers)
    this._fireLocalAction('verifiedTeachers', verifiedTeachers)
  }
	showUnverifiedTeachers(unverifiedTeachers: User[]): boolean {
		return !!unverifiedTeachers.length;
	}

	showVerifiedTeachers(verifiedTeachers: User[]): boolean {
		return !!verifiedTeachers.length;
	}

	async approveTeacher(e: any): Promise<void> {
    const teacherData = await GQLMutate(`
        mutation {
          updateUser(
            id:"${e.model.item.id}"
            role: INSTRUCTOR
          ){
            id
            role
            email
          }
        }
        `, this.userToken, (error: any) => {
            console.log(error);
        });
        const newUnverifiedTeachers = this.unverifiedTeachers.filter((teacher) => {
          if(teacher.id !== teacherData.updateUser.id){ return teacher }
        });
        const newVerifiedTeachers = [...this.verifiedTeachers, teacherData.updateUser]
        this._fireLocalAction('unverifiedTeachers', newUnverifiedTeachers)
        this._fireLocalAction('verifiedTeachers', newVerifiedTeachers)
	}

	async revokeTeacher(e: any): Promise<void> {
    //TODO make this functional again if we need it
		// await Actions.setUserType(e.model.verifiedTeacher.id, 'unverifiedTeacher');
		// Actions.loadTeachers(this);
	}

  stateChange(e: CustomEvent) {
      const state = e.detail.state;
      if (Object.keys(state.components[this.componentId] || {}).includes('unverifiedTeachers')) this.unverifiedTeachers = state.components[this.componentId].unverifiedTeachers;
      if (Object.keys(state.components[this.componentId] || {}).includes('verifiedTeachers')) this.verifiedTeachers = state.components[this.componentId].verifiedTeachers;
      this.userToken = state.userToken;
  }

}

window.customElements.define(PrendusTeacherApproval.is, PrendusTeacherApproval);

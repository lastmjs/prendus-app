import {
  Course,
} from '../../../src/typings/index.d';
import {asyncForEach} from '../../../src/node_modules/prendus-shared/services/utilities-service';
import {getAnalytics} from './dataGen-service';

export const getListener = (eventName: string, element: HTMLElment): Promise => {
  let _resolve, listener;
  const promise = new Promise((resolve, reject) => {
    _resolve = resolve;
  });
  listener = (e: Event) => {
    element.removeEventListener(eventName, listener);
    _resolve();
  }
  element.addEventListener(eventName, listener);
  return promise;
};

export const randomIndex = (l: number): number => l ? (Math.round((l - 1) * Math.random())) : -1;

export const randomItem = (arr: any[]): any | null => arr.length ? arr[randomIndex(arr.length)] : null;

export const assignCourseUserIds = (course: Course, instructorId: string, studentId: string): Course => ({
  authorId: instructorId,
  enrolledStudentsIds: [studentId],
  ...course,
  assignments: course.assignments.map(
    assignment => ({
    authorId: instructorId,
    ...assignment,
    questions: assignment.questions.map(
      question => ({
        authorId: studentId,
        ...question,
        ratings: question.ratings.map(
          rating => ({
            raterId: studentId,
            ...rating
          })
        )
      })
    )
    })
  )
});

export async function checkAnalytics(assignmentId: string, verbs: string[]): Promise<boolean> {
  const analytics = await getAnalytics({ assignment: { id: assignmentId } });
  console.log(verbs, analytics);
  return verbs.length === analytics.length && analytics.every(
    (analytic, i) => analytic.verb === verbs[i]
  );
}

export async function scoreDropdowns(dropdowns): Promise {
  const SCORES_CHANGED = 'scores-changed';
  const rubric = dropdowns.rubric;
  const menus = Array.from(dropdowns.shadowRoot.querySelectorAll('paper-dropdown-menu'));
  await asyncForEach(
    menus,
    async menu => {
      const category = rubric[menu.category];
      const option = Object.keys(category)[0]; //Arbitrary for now.
      const event = getListener(SCORES_CHANGED, dropdowns);
      menu.querySelector('paper-listbox').selected = option;
      await event;
    }
  );
}


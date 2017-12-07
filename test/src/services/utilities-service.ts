import {
  Course,
  Question
} from '../../../src/typings/index.d';
import {
  VerbType,
} from '../../../src/services/constants-service';
import {asyncForEach} from '../../../src/node_modules/prendus-shared/services/utilities-service';
import {getAnalytics} from './mock-data-service';

export const getListener = (eventName: string, element: HTMLElment, timeout: number = 10000): Promise => {
  let _resolve, listener;
  const timer = timeout
    ? new Promise((resolve, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject('Test timed out waiting for event ' + eventName);
      }, timeout);
    })
    : null;
  const promise = new Promise((resolve, reject) => {
    _resolve = resolve;
  });
  listener = (e: Event) => {
    element.removeEventListener(eventName, listener);
    _resolve(e);
  }
  element.addEventListener(eventName, listener);
  return timeout ? Promise.race([ promise, timer ]) : promise;
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
        ),
        responses: question.responses.map(
          response => ({
            authorId: studentId,
            ...response
          })
        )
      })
    )
    })
  )
});

export async function checkAnalytics(assignmentId: string, expected: object[]): Promise<boolean> {
  const analytics = await getAnalytics({ assignment: { id: assignmentId } });
  console.log(analytics, expected);
  return expected.length === analytics.length && analytics.every(
    (analytic, i) =>
      analytic.verb === expected[i].verb &&
      analytic.course.id === expected[i].course.id &&
      analytic.assignment.id === expected[i].assignment.id &&
    (
      analytic.verb === VerbType.STARTED ||
      analytic.verb === VerbType.SUBMITTED ||
      analytic.question.id === expected[i].question.id
    )
  );
}

export async function scoreDropdowns(dropdowns): Promise {
  const SCORES_CHANGED = 'scores-changed';
  const rubric = dropdowns.rubric;
  const menus = Array.from(dropdowns.shadowRoot.querySelectorAll('paper-dropdown-menu'));
  await asyncForEach(
    menus,
    async menu => {
      const event = getListener(SCORES_CHANGED, dropdowns);
      menu.querySelectorAll('paper-item').item(0).click();
      await event;
    }
  );
}

export const analyticBuilder = (courseId, assignmentId) => (verb, question) => ({
  verb,
  question,
  course: { id: courseId },
  assignment: { id: assignmentId }
});


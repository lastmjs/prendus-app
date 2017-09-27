import {
  Question,
  CategoryScore,
  QuestionRating,
  QuestionRatingStats,
} from '../typings/index.d';

/*
 * Reducer to sum the numbers in an array
 */
function sum(sum: number, num: number): number {
  return sum + num;
}

/*
 * Reducer to flatten any array to one level
 */
function flatten(acc: any[], elem: any): any[] {
  return acc.concat(Array.isArray(elem) ? flatten(elem) : elem);
}

/*
 * Averages an array of numbers
 */
function average(nums: number[]): number {
  return nums.reduce(sum, 0) / (nums.length || 1);
}

/*
 * Averages an array of CategoryScores
 */
function averageScore(scores: CategoryScore[]): number {
  return average(scores.map(node => node.score));
}

/*
 * Returns a callback that averages an array of CategoryScores and scales them to a value 0-10
 */
function scaledAverageScore(max: number): (scores: CategoryScores) => number {
  return (scores: CategoryScore[]): number {
    return average(scores.map(node => node.score)) / max * 10;
  }
}

/*
 * Maps an object with a callback
 */
function mapObject(obj: object, cb: (prop: any) => any): object {
  return Object.keys(obj).reduce((result, k) => {
    return {
      ...result,
      [k]: cb(obj[k])
    }
  }, {});
}

/*
 * Returns a reducer to group an array of objects by a property.
 * The reducer returns an object with the property value assigned to the grouped elements
 */
function groupBy(prop: string): (object, object) => object {
  return (result, obj) => {
    const k = obj[prop];
    if (!k) return result;
    return {
      ...result,
      [k]: (result[k] || []).concat(obj)
    }
  }
}

/*
 * Constructs an object with category name keys assigned to arrays of corresponding category scores
 */
export function categoryScores(question: Question): number {
  return question
    .ratings
    .map(rating => rating.scores)
    .reduce(flatten, [])
    .filter(score => Boolean(score))
    .reduce(groupBy('category'), {})
}

/*
 * Constructs an object with category name keys and average score values
 */
export function averageCategoryScores(question: Question): object {
  return mapObject(
    categoryScores(question),
    averageScore
  )
}

export function scaledAverageCategoryScores(question: Question, max: number): object {
  return mapObject(
    categoryScores(question),
    scaledAverageScore(max)
  )
}

/*
 * Compute the overall rating of a question 0-10
 */
export function overallRating(question: Question, max: number): number {
  return average(
    Object.values(
      scaledAverageCategoryScores(question, max)
    )
  );
}


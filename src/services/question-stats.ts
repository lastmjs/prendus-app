//TODO: TS types

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
  return nums.reduce(sum) / nums.length;
}

/*
 * Averages an array of CategoryScores
 */
function averageScore(scores: CategoryScore[]): number {
  return average(scores.map(node => node.score));
}

/*
 * Maps an object with a callback
 */
function mapObject(obj: object, cb: (any) => any): object {
  return Object.keys(obj).reduce((result, val, k) => {
    return {
      ...result,
      [k]: cb(val)
    }
  }, {});
}

/*
 * Returns a reducer to group an array of objects by a property.
 * The reducer returns an object with the property value assigned to the grouped elements
 */
function groupBy(prop: string): ({[key: string]: any[]}, object) => {[key: string]: any[]} {
  return (result, obj) => {
    const k = obj[prop];
    if (!k) return result;
    return {
      ...result,
      [k]: (result[k] || []).concat(obj[prop])
    }
  }
}

/*
 * Constructs an object with category name keys assigned to arrays of corresponding category scores
 */
function categoryScores(question: Question): number {
  return question
    .ratings
    .map(rating => rating.scores)
    .reduce(flatten)
    .reduce(groupBy('category'), {})
}

/*
 * Constructs an object with category name keys and average score values
 */
function averageCategoryScores(question: Question) {
  return mapObject(
    categoryScores(question),
    averageScore
  )
}

/*
 * Compute the overall rating of a question 0-10
 */
function overallRating(question: Question): number {
  return average(
    Object.values(
      averageCategoryScores(question)
    )
  );
}


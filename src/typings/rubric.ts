export type Rubric = {
  [key: string]: {
    [key: string]: {
      readonly description: string,
      readonly points: string
    }
  }
}

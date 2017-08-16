export const rubric = JSON.parse(`{
  "Language": {
    "Professional": {
      "points": 2,
      "description": "The wording resembles something you might see on an exam"
    },
    "Casual": {
      "points": 1,
      "description": "The wording is casual or somewhat less professional"
    },
    "Inappropriate": {
      "points": 0,
      "description": "The wording includes text unrelated to the question or concept or includes degrading language"
    }
  },
  "Learning Category": {
    "Application": {
      "points": 2,
      "description": "Analytical questions; solve, interpret, apply, calculate, compute"
    },
    "Understanding": {
      "points": 1,
      "description": "Conceptual question; associate, distinguish, give examples, infer, explain"
    },
    "Remembering": {
      "points": 0,
      "description": "Fact question; name, match, list, outline, recognize, repeat, label"
    }
  },
  "Difficulty": {
    "Hard": {
      "points": 2,
      "description": "A very difficult question for students in your class"
    },
    "Medium": {
      "points": 1,
      "description": "A moderately difficult question for students in your class"
    },
    "Easy": {
      "points": 0,
      "description": "A very easy question for students in your class"
    }
  },
  "Concept Alignment": {
    "Complete": {
      "points": 2,
      "description": "All parts of the question align with the concept"
    },
    "Partial": {
      "points": 1,
      "description": "One aspect of the question doesn’t align with the concept"
    },
    "Poor": {
      "points": 0,
      "description": "Multiple aspects of the question don’t align with the concept"
    }
  },
  "Plagiarism": {
    "No": {
      "points": 2,
      "description": "You do not think this question was plagiarized"
    },
    "Maybe": {
      "points": 1,
      "description": "You think this question may have been plagiarized, but you couldn’t find evidence"
    },
    "Yes": {
      "points": 0,
      "description": "You have evidence to support that this question was plagiarized"
    }
  },
  "Inclusion": {
    "Yes": {
      "points": 2,
      "description": "The question is accurate and would be good exam practice for all students"
    },
    "Maybe": {
      "points": 1,
      "description": "The question is accurate and might be good exam practice for some students"
    },
    "No": {
      "points": 0,
      "description": "The question is inaccurate or would not be good exam practice for any students"
    }
  }
}
`);

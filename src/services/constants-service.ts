
export const MAX_NUM_ATTEMPTS_REACHED = 'Maximum number of attempts reached';
export const NO_ANSWER_FEEDBACK_ALLOWED = 'No answer feedback allowed';
export const EMAIL_REGEX = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/;
export const GQL_SORT_DESC = '_DESC';
export const GQL_SORT_ASC = '_ASC';
export const ARIA_SORT_ASC = 'ascending';
export const ARIA_SORT_DESC = 'descending';
export const ARIA_SORT_NONE = 'none';
export const STUDENT = 'Student';
export const OVERALL = 'Overall';
export const ALL = 'ALL';
//Event names mostly used for testing
export const ASSIGNMENT_LOADED = 'assignment-loaded';
export const ASSIGNMENT_SUBMITTED = 'assignment-submitted';
export const ASSIGNMENT_VALIDATION_ERROR = 'assignment-validation-error';
export const STATEMENT_SENT = 'statement-sent';
export const SCORES_CHANGED = 'scores-changed';
export const CATEGORIES_CHANGED = 'categories-changed';
export const ITEM_CHANGED = 'item-changed';
export const ITEMS_CHANGED = 'items-changed';
export const RUBRIC_CHANGED = 'rubric-changed';
export const FINISHED_CHANGED = 'finished-changed';
export const Role = {
  INSTRUCTOR: 'INSTRUCTOR',
  STUDENT: 'STUDENT',
  ADMIN: 'ADMIN'
};
export const QuestionType = {
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  ESSAY: 'ESSAY'
};
export const ContextType = {
  QUESTION: "QUESTION",
  ASSIGNMENT: "ASSIGNMENT",
  QUIZ: "QUIZ",
  COURSE: "COURSE"
};
export const NotificationType = {
  ERROR: "error",
  SUCCESS: "success",
  WARNING: "warning"
};
export const VerbType = {
  STARTED: "STARTED",
  REVIEWED: "REVIEWED",
  RESPONDED: "RESPONDED",
  GRADED: "GRADED",
  CREATED: "CREATED",
  SUBMITTED: "SUBMITTED"
};
export const ObjectType = {
  CREATE: "CREATE",
  REVIEW: "REVIEW",
  RESPOND: "RESPOND",
  GRADE: "GRADE",
  QUIZ: "QUIZ"
};
export const KeyCode = {
  ENTER: 13,
  SPACE: 32
};
export const DEFAULT_EVALUATION_RUBRIC = {
  Language: {
    Professional: {
      points: 2,
      description: "The wording resembles something you might see on an exam"
    },
    Casual: {
      points: 1,
      description: "The wording is casual or somewhat less professional"
    },
    Inappropriate: {
      points: 0,
      description: "The wording includes text unrelated to the question or concept or includes degrading language"
    }
  },
  'Learning Category': {
    Application: {
      points: 2,
      description: "Analytical questions; solve, interpret, apply, calculate, compute"
    },
    Understanding: {
      points: 1,
      description: "Conceptual question; associate, distinguish, give examples, infer, explain"
    },
    Remembering: {
      points: 0,
      description: "Fact question; name, match, list, outline, recognize, repeat, label"
    }
  },
  Difficulty: {
    Hard: {
      points: 2,
      description: "A very difficult question for students in your class"
    },
    Medium: {
      points: 1,
      description: "A moderately difficult question for students in your class"
    },
    Easy: {
      points: 0,
      description: "A very easy question for students in your class"
    }
  },
  'Concept Alignment': {
    Complete: {
      points: 2,
      description: "All parts of the question align with the concept"
    },
    Partial: {
      points: 1,
      description: "One aspect of the question doesn’t align with the concept"
    },
    Poor: {
      points: 0,
      description: "Multiple aspects of the question don’t align with the concept"
    }
  },
  Plagiarism: {
    No: {
      points: 2,
      description: "You do not think this question was plagiarized"
    },
    Maybe: {
      points: 1,
      description: "You think this question may have been plagiarized, but you couldn’t find evidence"
    },
    Yes: {
      points: 0,
      description: "You have evidence to support that this question was plagiarized"
    }
  },
  'Use in Test': {
    Yes: {
      points: 2,
      description: "The question is accurate and would be good exam practice for all students"
    },
    Maybe: {
      points: 1,
      description: "The question is accurate and might be good exam practice for some students"
    },
    No: {
      points: 0,
      description: "The question is inaccurate or would not be good exam practice for any students"
    }
  }
};
export const EXAMPLE_GRADING_RUBRIC = {
  Language: {
    Professional: {
        description: 'The language is of good academic quality in vocabulary and grammar',
        points: 2
    },
    Casual: {
      description: 'The answer has a more conversational tone',
      points: 1
    },
    Poor: {
      description: 'The answer contains grammar and spelling errors',
      points: 0
    }
}
};

export const DEFAULT_QUESTION_LICENSE_ID = window.process.env.NODE_ENV === 'production' ? 'cje7p5cg051940189kq9gy6to' : 'cje4ugv8u4fjx0189dmif4moc';
export const DEFAULT_QUESTION_VISIBILITY_ID = window.process.env.NODE_ENV === 'production' ? 'cjeeq78rc6h6h0189oq3yrbgv' : 'cjebyzjku5yiq018991vwbbyo';

module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: ['eslint:recommended', 'prettier'],
  plugins: ['jest', 'jsdoc'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script' // Google Apps Script uses script mode, not module
  },
  globals: {
    // Google Apps Script globals
    Calendar: 'readonly',
    DriveApp: 'readonly',
    Logger: 'readonly',
    LockService: 'readonly',
    PropertiesService: 'readonly',
    ScriptApp: 'readonly',
    Session: 'readonly',
    Utilities: 'readonly',
    console: 'readonly',

    // Node.js globals for testing
    global: 'readonly',
    process: 'readonly',
    Buffer: 'readonly',
    __dirname: 'readonly',
    __filename: 'readonly',
    module: 'readonly',
    require: 'readonly',
    exports: 'readonly',

    // Project-specific globals
    SOURCE_CALENDAR_IDS: 'readonly',
    TARGET_CALENDAR_ID: 'readonly',
    SYNC_CONFIG: 'readonly',
    calendarApiManager: 'readonly',
    getApiUsageStats: 'readonly',
    getSyncStateManager: 'readonly',
    getAllEventsIncludingDeletedSafe: 'readonly',
    createEventMapForSource: 'readonly',
    generateSyncKey: 'readonly',
    deleteEventSafe: 'readonly',
    createOrUpdateSyncedEvent: 'readonly',
    updateSyncedEventSafe: 'readonly',
    updateSourceEventSafe: 'readonly',
    resetSyncStateManager: 'readonly'
  },
  rules: {
    // Code Quality Rules
    'no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }
    ],
    'no-console': 'off', // Allow console for logging in Apps Script
    'prefer-const': 'error',
    'no-var': 'error',
    eqeqeq: ['error', 'always'],
    curly: ['error', 'all'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-with': 'error',
    'no-undef': 'error',
    'no-redeclare': 'error',
    'no-shadow': 'error',
    'no-use-before-define': [
      'error',
      {
        functions: false,
        classes: true,
        variables: true
      }
    ],
    'no-unused-expressions': [
      'error',
      {
        allowShortCircuit: true,
        allowTernary: true
      }
    ],
    'no-unreachable': 'error',
    'no-duplicate-case': 'error',
    'no-empty': 'error',
    'no-extra-semi': 'error',
    'no-func-assign': 'error',
    'no-irregular-whitespace': 'error',
    'no-sparse-arrays': 'error',
    'use-isnan': 'error',
    'valid-typeof': 'error',

    // Style Rules (complementing Prettier)
    indent: [
      'error',
      2,
      {
        SwitchCase: 1,
        VariableDeclarator: 1,
        outerIIFEBody: 1,
        FunctionDeclaration: { parameters: 1, body: 1 },
        FunctionExpression: { parameters: 1, body: 1 },
        CallExpression: { arguments: 1 },
        ArrayExpression: 1,
        ObjectExpression: 1,
        ImportDeclaration: 1,
        flatTernaryExpressions: false,
        ignoredNodes: [
          'JSXElement',
          'JSXElement > *',
          'JSXAttribute',
          'JSXIdentifier',
          'JSXNamespacedName',
          'JSXMemberExpression',
          'JSXSpreadAttribute',
          'JSXExpressionContainer',
          'JSXOpeningElement',
          'JSXClosingElement',
          'JSXText',
          'JSXEmptyExpression',
          'JSXSpreadChild'
        ]
      }
    ],
    quotes: [
      'error',
      'single',
      {
        avoidEscape: true,
        allowTemplateLiterals: true
      }
    ],
    semi: ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'brace-style': ['error', '1tbs', { allowSingleLine: true }],
    'space-before-blocks': 'error',
    'keyword-spacing': ['error', { before: true, after: true }],
    'space-infix-ops': 'error',
    'space-unary-ops': ['error', { words: true, nonwords: false }],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'computed-property-spacing': ['error', 'never'],
    'space-in-parens': ['error', 'never'],
    'no-trailing-spaces': 'error',
    'eol-last': 'error',
    'no-multiple-empty-lines': [
      'error',
      {
        max: 2,
        maxEOF: 1,
        maxBOF: 0
      }
    ],
    'comma-spacing': ['error', { before: false, after: true }],
    'key-spacing': ['error', { beforeColon: false, afterColon: true }],
    'semi-spacing': ['error', { before: false, after: true }],

    // Function Rules
    'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
    'max-params': ['warn', 6],
    'max-len': [
      'warn',
      {
        code: 120,
        ignoreComments: true,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true
      }
    ],
    complexity: ['warn', 12],
    'max-depth': ['warn', 4],
    'max-nested-callbacks': ['warn', 3],
    'max-statements': ['warn', 50],
    'max-lines-per-function': [
      'warn',
      {
        max: 100,
        skipBlankLines: true,
        skipComments: true
      }
    ],

    // Best Practices
    'consistent-return': 'error',
    'default-case': 'error',
    'dot-notation': 'error',
    'no-alert': 'warn',
    'no-caller': 'error',
    'no-case-declarations': 'error',
    'no-else-return': 'error',
    'no-empty-function': ['error', { allow: ['constructors'] }],
    'no-empty-pattern': 'error',
    'no-fallthrough': 'error',
    'no-floating-decimal': 'error',
    'no-global-assign': 'error',
    'no-implicit-coercion': 'error',
    'no-implicit-globals': 'error',
    'no-loop-func': 'error',
    'no-magic-numbers': [
      'warn',
      {
        ignore: [-1, 0, 1, 2, 3, 4, 5, 10, 24, 60, 100, 1000],
        ignoreArrayIndexes: true,
        enforceConst: true,
        detectObjects: false
      }
    ],
    'no-multi-spaces': 'error',
    'no-new': 'error',
    'no-new-func': 'error',
    'no-new-wrappers': 'error',
    'no-octal-escape': 'error',
    'no-param-reassign': ['error', { props: false }],
    'no-return-assign': 'error',
    'no-return-await': 'error',
    'no-self-assign': 'error',
    'no-self-compare': 'error',
    'no-sequences': 'error',
    'no-throw-literal': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-unused-labels': 'error',
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'no-useless-escape': 'error',
    'no-useless-return': 'error',
    'no-void': 'error',
    'prefer-promise-reject-errors': 'error',
    radix: 'error',
    'require-await': 'error',
    yoda: 'error',

    // JSDoc Rules
    'jsdoc/check-alignment': 'error',
    'jsdoc/check-param-names': 'error',
    'jsdoc/check-syntax': 'error',
    'jsdoc/check-tag-names': 'error',
    'jsdoc/check-types': 'error',
    'jsdoc/require-description': 'warn',
    'jsdoc/require-param': 'warn',
    'jsdoc/require-param-description': 'warn',
    'jsdoc/require-returns': 'warn',
    'jsdoc/require-returns-description': 'warn',
    'jsdoc/valid-types': 'error',
    'jsdoc/no-undefined-types': 'error',
    'jsdoc/require-jsdoc': [
      'warn',
      {
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ClassDeclaration: true,
          ArrowFunctionExpression: false,
          FunctionExpression: false
        }
      }
    ],

    // Jest Rules (for test files)
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error',
    'jest/expect-expect': 'error',
    'jest/no-commented-out-tests': 'warn',
    'jest/no-duplicate-hooks': 'error',
    'jest/no-test-return-statement': 'error',
    'jest/prefer-to-be': 'warn',
    'jest/prefer-to-contain': 'warn'
  },
  overrides: [
    {
      files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true,
        node: true
      },
      rules: {
        'max-len': 'off', // Allow longer lines in tests
        'no-console': 'off', // Allow console in tests
        'no-magic-numbers': 'off', // Allow magic numbers in tests
        'max-lines-per-function': 'off', // Allow longer test functions
        'max-statements': 'off', // Allow more statements in tests
        'jsdoc/require-jsdoc': 'off', // Don't require JSDoc in tests
        'jsdoc/require-description': 'off',
        'jsdoc/require-param': 'off',
        'jsdoc/require-returns': 'off',
        'no-unused-vars': 'off' // Allow unused variables in tests
      }
    },
    {
      files: ['src/**/*.js'],
      env: {
        browser: true,
        es2021: true
      },
      rules: {
        'no-undef': 'error',
        'jsdoc/require-jsdoc': [
          'warn',
          {
            require: {
              FunctionDeclaration: true,
              MethodDefinition: true,
              ClassDeclaration: true
            }
          }
        ]
      }
    }
  ]
};

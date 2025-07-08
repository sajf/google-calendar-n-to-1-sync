const js = require('@eslint/js');
const jsdoc = require('eslint-plugin-jsdoc');
const prettier = require('eslint-config-prettier');
// eslint-disable-next-line no-undef
module.exports = [
  // Ignore configuration files
  {
    ignores: ['.prettierrc.js', 'eslint.config.js', 'jest.config.js', 'node_modules/**', 'dist/**', 'build/**']
  },

  // Base configuration for Google Apps Script files
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2020, // Google Apps Script supports ES2020
      sourceType: 'script', // Google Apps Script uses script mode, not modules
      globals: {
        // Google Apps Script specific globals
        Browser: 'readonly',
        Calendar: 'readonly',
        CalendarApp: 'readonly',
        CardService: 'readonly',
        Charts: 'readonly',
        ContactsApp: 'readonly',
        ContentService: 'readonly',
        DocumentApp: 'readonly',
        Drive: 'readonly',
        DriveApp: 'readonly',
        FormApp: 'readonly',
        GmailApp: 'readonly',
        GroupsApp: 'readonly',
        HtmlService: 'readonly',
        LanguageApp: 'readonly',
        LockService: 'readonly',
        Logger: 'readonly',
        MailApp: 'readonly',
        Maps: 'readonly',
        PropertiesService: 'readonly',
        ScriptApp: 'readonly',
        Session: 'readonly',
        SheetsApp: 'readonly',
        SitesApp: 'readonly',
        SpreadsheetApp: 'readonly',
        Tasks: 'readonly',
        Translate: 'readonly',
        UrlFetchApp: 'readonly',
        Utilities: 'readonly',
        XmlService: 'readonly',
        global: 'readonly',

        // Google Apps Script console
        console: 'readonly',

        // Project-specific globals (functions and managers)
        // Note: Removed SOURCE_CALENDAR_IDS, TARGET_CALENDAR_ID, SYNC_CONFIG
        // as they're defined in config.js
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
      }
    },
    plugins: {
      jsdoc
    },
    rules: {
      ...js.configs.recommended.rules,

      // Code Quality Rules
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      'no-console': 'off', // Allow console.log in Apps Script
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-with': 'error',
      'no-undef': 'warn',
      'no-redeclare': 'off',
      'no-shadow': 'error',
      'no-use-before-define': [
        'error',
        {
          functions: false, // Allow function hoisting in Apps Script
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
          ObjectExpression: 1
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
      complexity: ['warn', 13],
      'max-depth': ['warn', 4],
      'max-nested-callbacks': ['warn', 4],
      'max-statements': ['warn', 100],
      'max-lines-per-function': [
        'warn',
        {
          max: 100,
          skipBlankLines: true,
          skipComments: true
        }
      ],

      // Best Practices for Apps Script
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
      // 'no-implicit-globals': 'error',
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

      // JSDoc Rules (important for Apps Script documentation)
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
      ]
    }
  },

  // Special configuration for config.js to allow unused configuration variables
  {
    files: ['config.js'],
    rules: {
      'no-unused-vars': 'off' // Configuration variables may not be directly used in config.js
    }
  },

  // Configuration for test files
  {
    files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'script', // Keep as script for CommonJS require
      globals: {
        // Node.js globals
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        global: 'writable',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        process: 'readonly',

        // Jest globals
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',

        // Console (for both Node.js and browser environments)
        console: 'readonly',

        // Mock Google Apps Script globals (these will be mocked in tests)
        Calendar: 'writable',
        LockService: 'writable',
        Utilities: 'writable'
      }
    },
    rules: {
      // Relaxed rules for tests
      'max-len': 'off',
      'no-console': 'off',
      'no-magic-numbers': 'off',
      'max-lines-per-function': 'off',
      'max-statements': 'off',
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-description': 'off',
      'jsdoc/require-param': 'off',
      'jsdoc/require-returns': 'off',
      'no-unused-vars': 'off',
      'no-redeclare': 'off', // Allow redeclaring imported functions for testing
      'no-undef': 'off', // Keep this to catch actual undefined variables
      complexity: 'off'
    }
  },

  // Apply Prettier config (must be last)
  prettier
];

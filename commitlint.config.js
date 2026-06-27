/** @type {import('next').NextConfig} */
// commitlint.config.js — ES module (required Node 24+)
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'chore', 'docs', 'ci', 'refactor', 'perf', 'test', 'style']],
    'scope-case': [2, 'always', ['camel-case', 'kebab-case']],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
  },
};

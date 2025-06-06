export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    setupFiles: ['./test/setup.js'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            useESM: true,
            isolatedModules: true
        }]
    },
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },
    testMatch: ['**/test/**/*.test.ts'],
    verbose: true
};
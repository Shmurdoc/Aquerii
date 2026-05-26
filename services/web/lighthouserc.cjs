module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run dev',
      url: [
        'http://localhost:3000/login',
        'http://localhost:3000/boards',
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.6 }],
        'categories:accessibility': ['error', { minScore: 0.8 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};

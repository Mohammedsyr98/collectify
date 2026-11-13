const businessFeatureGraph = {
  customers: ['receivables'],
  debts: ['customers', 'receivables'],
  payments: ['customers', 'debts', 'receivables'],
  receivables: [],
};

const businessFeatures = Object.keys(businessFeatureGraph);
const businessFeaturePath = `^src/(${businessFeatures.join('|')})/`;

const featureEdgeRules = Object.entries(businessFeatureGraph).map(([source, allowedTargets]) => ({
  name: `${source}-only-uses-approved-business-features`,
  comment: `Keep ${source} on its documented, acyclic business-feature edges.`,
  severity: 'error',
  from: { path: `^src/${source}/` },
  to: {
    path: businessFeaturePath,
    pathNot: [source, ...allowedTargets].map((target) => `^src/${target}/`),
  },
}));

const publicInterfaceRules = businessFeatures.map((feature) => ({
  name: `${feature}-through-public-interface`,
  comment: `Code outside ${feature} must stop at src/${feature}/index.ts.`,
  severity: 'error',
  from: {
    path: '^src/',
    pathNot: `^src/${feature}/`,
  },
  to: {
    path: `^src/${feature}/`,
    pathNot: `^src/${feature}/index\\.ts$`,
  },
}));

export default {
  forbidden: [
    {
      name: 'no-circular-dependencies',
      comment: 'Cycles obscure ownership and are never an approved architecture.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    ...featureEdgeRules,
    ...publicInterfaceRules,
    {
      name: 'production-does-not-use-test-support',
      comment: 'Test support is available to specs, never to production modules.',
      severity: 'error',
      from: {
        path: '^src/',
        pathNot: ['^src/test-support/', '\\.spec\\.ts$'],
      },
      to: { path: '^src/test-support/' },
    },
  ],
  options: {
    includeOnly: '^src/',
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
  },
};

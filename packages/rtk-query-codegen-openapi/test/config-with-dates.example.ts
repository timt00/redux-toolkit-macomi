import type { ConfigFile } from '@rtk-query/codegen-openapi';

const config: ConfigFile = {
  schemaFile: './fixtures/petstore-with-nested-dates.yaml',
  apiFile: './fixtures/emptyApi.ts',
  outputFile: './tmp/example-with-dates.ts',
  requireAllProperties: false,
  uuidHandling: null,
  transformDates: true,
};

export default config;

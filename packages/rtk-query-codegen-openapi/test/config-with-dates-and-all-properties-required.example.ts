import type { ConfigFile } from '@rtk-query/codegen-openapi';

const config: ConfigFile = {
  schemaFile: './fixtures/petstore-with-nested-dates.yaml',
  apiFile: './fixtures/emptyApi.ts',
  outputFile: './tmp/example-with-dates-and-all-properties-required.ts',
  requireAllProperties: true,
  uuidHandling: null,
  transformDates: true,
};

export default config;

import type { ConfigFile } from '@rtk-query/codegen-openapi';

const config: ConfigFile = {
  schemaFile: './fixtures/petstore.yaml',
  apiFile: './fixtures/emptyApi.ts',
  outputFile: './tmp/example.ts',
  useEnumType: true,
  requireAllProperties: false,
  uuidHandling: null,
  transformDates: false,
};

export default config;

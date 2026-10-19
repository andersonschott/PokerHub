import fs from 'node:fs/promises';
import openapiTS, { astToString } from 'openapi-typescript';
import ts from 'typescript';

// ASP.NET permits reading numeric strings in requests. Responses use JSON numbers;
// generate the response shapes used by the app without duplicating C# DTO fields.
const ast = await openapiTS(new URL(process.env.POKERHUB_OPENAPI_URL ?? 'http://127.0.0.1:5100/openapi/v1.json'), {
  propertiesRequiredByDefault: true,
  transform(schema) {
    if (!['double','float','int32','int64'].includes(schema.format)) return;
    const number = ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    return Array.isArray(schema.type) && schema.type.includes('null')
      ? ts.factory.createUnionTypeNode([number, ts.factory.createLiteralTypeNode(ts.factory.createNull())])
      : number;
  },
});
await fs.writeFile(new URL('../src/lib/api/schema.d.ts', import.meta.url), astToString(ast));

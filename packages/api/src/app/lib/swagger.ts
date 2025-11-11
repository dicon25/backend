import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { OperationObject, PathItemObject, SecurityRequirementObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import packageJson from '@/../package.json';

const HTTP_METHODS: ReadonlyArray<
  'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace'
> = [
  'get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace',
];

function hasPublicMarker(op: OperationObject): boolean {
  const rec = op as unknown as Record<string, unknown>;

  return rec['x-public'] === true;
}

function removeAuthForOperation(op: OperationObject): void {
  const empty: SecurityRequirementObject[] = [];

  op.security = empty;
}

function stripPublicMarker(op: OperationObject): void {
  const rec = op as unknown as Record<string, unknown>;

  if ('x-public' in rec) {
    delete rec['x-public'];
  }
}

export function applySwagger(app: INestApplication): void {
  const logger = new Logger('Swagger');

  const config = (new DocumentBuilder)
    .setTitle('API')
    .setDescription('API documentation')
    .setVersion(`${packageJson.version}-${Date.now()}`)
    .addBearerAuth({
      type:         'http',
      scheme:       'bearer',
      bearerFormat: 'JWT',
      description:  'Enter your JWT token',
      name:         'Authorization',
      in:           'header',
    },
    'bearer')
    .addSecurityRequirements('bearer')
    .build();

  const document = SwaggerModule.createDocument(app, config) as OpenAPIObject;
  const paths = document.paths;

  if (paths) {
    for (const route of Object.keys(paths)) {
      const pathItem: PathItemObject | undefined = paths[route];

      if (!pathItem) continue;

      for (const method of HTTP_METHODS) {
        const op = pathItem[method];

        if (!op) continue;

        if (hasPublicMarker(op)) {
          removeAuthForOperation(op);

          stripPublicMarker(op);
        }
      }
    }
  }

  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
    swaggerOptions:  {
      persistAuthorization:     true,
      displayRequestDuration:   true,
      docExpansion:             'none',
      filter:                   true,
      showRequestHeaders:       true,
      defaultModelsExpandDepth: -1,
      defaultModelExpandDepth:  1,
    },
    customSiteTitle: `API Docs - ${(new Date).toISOString()}`,
  });

  logger.log('Swagger documentation generated');
}

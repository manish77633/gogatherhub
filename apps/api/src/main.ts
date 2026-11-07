import "reflect-metadata";
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { securityBoundary } from "./security/security-boundary";
import { SafeErrorFilter } from "./security/safe-error.filter";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.use(securityBoundary(process.env.WEB_ORIGIN ?? "http://localhost:3000"));
  app.useGlobalFilters(new SafeErrorFilter());
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000", credentials: true });
  app.setGlobalPrefix("v1");
  await app.listen(Number(process.env.API_PORT ?? 4000));
}
void bootstrap();

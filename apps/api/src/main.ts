import "reflect-metadata";
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000", credentials: true });
  app.setGlobalPrefix("v1");
  await app.listen(Number(process.env.API_PORT ?? 4000));
}
void bootstrap();

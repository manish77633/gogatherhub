import { randomUUID } from "node:crypto";
import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Response } from "express";
@Catch()
export class SafeErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response=host.switchToHttp().getResponse<Response>();
    const parserError=error as { type?: string };
    if(parserError?.type === "entity.too.large")return response.status(413).json({message:"Request exceeds the allowed size"});
    if(parserError?.type === "entity.parse.failed")return response.status(400).json({message:"Malformed JSON request"});
    if(error instanceof HttpException) {
      const status=error.getStatus(), body=error.getResponse();
      return response.status(status).json(typeof body==="string"?{statusCode:status,message:body}:body);
    }
    if(error instanceof Prisma.PrismaClientKnownRequestError) {
      const known: Record<string,[number,string]> = { P2002:[409,"A record with these details already exists"], P2003:[409,"This record is linked to other records and cannot be changed"], P2025:[404,"Record not found"], P2034:[409,"Data changed during this request. Retry with the same request reference."], P2024:[503,"The database is busy. Please retry shortly."], P2037:[503,"The database is busy. Please retry shortly."] };
      const [status,message]=known[error.code]??[500,"The operation could not be completed"];
      return response.status(status).json({statusCode:status,message});
    }
    if(error instanceof Prisma.PrismaClientValidationError)return response.status(400).json({statusCode:400,message:"Invalid record identifier or fields"});
    const requestId=randomUUID();
    console.error(`[ggh-api] ${requestId}: unexpected request failure`);
    return response.status(500).json({statusCode:500,message:"The operation could not be completed. Please retry or contact support.",requestId});
  }
}

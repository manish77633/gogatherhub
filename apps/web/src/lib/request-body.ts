/** Read a bounded stream before decoding/parsing; Content-Length is only an early rejection. */
export async function boundedBody(request: Request, maximum: number): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; response: Response }> {
  const fail=(status:number,message:string)=>({ok:false as const,response:Response.json({error:{message}},{status})});
  const declared=request.headers.get("content-length");
  if(declared && (!/^\d+$/.test(declared)||Number(declared)>maximum))return fail(413,"Request exceeds the allowed size");
  const reader=request.body?.getReader();if(!reader)return {ok:true,bytes:new Uint8Array()};
  const chunks:Uint8Array[]=[];let size=0;
  try { while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maximum){await reader.cancel();return fail(413,"Request exceeds the allowed size");}chunks.push(value);} }
  catch {return fail(400,"Request body could not be read");}
  finally {reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return {ok:true,bytes};
}
export async function boundedText(request: Request, maximum: number): Promise<{ok:true;text:string}|{ok:false;response:Response}> {
  const result=await boundedBody(request,maximum);if(!result.ok)return result;
  try{return {ok:true,text:new TextDecoder("utf-8",{fatal:true}).decode(result.bytes)};}
  catch{return {ok:false,response:Response.json({error:{message:"Invalid request encoding"}},{status:400})};}
}
export async function boundedForm(request:Request,maximum:number):Promise<{ok:true;form:FormData}|{ok:false;response:Response}>{
  const result=await boundedBody(request,maximum);if(!result.ok)return result;
  try {const bytes=new Uint8Array(result.bytes);const form=await new Response(bytes,{headers:{"content-type":request.headers.get("content-type")??""}}).formData();return {ok:true,form};}
  catch{return {ok:false,response:Response.json({error:{message:"Invalid multipart upload"}},{status:400})};}
}
export async function imageSignatureMatches(file:File):Promise<boolean>{
  const b=new Uint8Array(await file.slice(0,40).arrayBuffer());if(b.length<24)return false;
  const ascii=(start:number,end:number)=>String.fromCharCode(...b.slice(start,end));
  if(file.type==="image/jpeg")return b[0]===255&&b[1]===216&&b[2]===255;
  if(file.type==="image/png")return [137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v)&&ascii(12,16)==="IHDR";
  if(file.type==="image/webp")return ascii(0,4)==="RIFF"&&ascii(8,12)==="WEBP";
  if(file.type==="image/avif")return ascii(4,8)==="ftyp"&&/avif|avis/.test(ascii(8,40));
  return false;
}

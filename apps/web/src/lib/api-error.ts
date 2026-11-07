/** Convert validated API field errors into readable, plain-text form feedback. */
export function apiErrorMessage(result: unknown, fallback: string): string {
  if(!result||typeof result!=="object")return fallback;
  const body=result as Record<string,unknown>;
  const nested=body.error&&typeof body.error==="object"?body.error as Record<string,unknown>:{};
  const details=nested.details&&typeof nested.details==="object"?nested.details as Record<string,unknown>:{};
  const fields=body.fields??nested.fields??body.errors??details.fieldErrors;
  const messages:string[]=[];
  if(fields&&typeof fields==="object")for(const [field,value]of Object.entries(fields)){
    const list=Array.isArray(value)?value:[value];
    const text=list.filter((item):item is string=>typeof item==="string").join(", ");
    if(text)messages.push(`${field}: ${text}`);
  }
  const message=typeof body.message==="string"?body.message:typeof nested.message==="string"?nested.message:fallback;
  return messages.length?`${message}. ${messages.join("; ")}`:message;
}

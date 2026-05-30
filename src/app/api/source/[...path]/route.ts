import { proxySource } from "../proxy";

interface SourcePathContext {
  params: Promise<{ path?: string[] }>;
}

export async function GET(request: Request, context: SourcePathContext) {
  const params = await context.params;
  return proxySource(request, params.path || []);
}

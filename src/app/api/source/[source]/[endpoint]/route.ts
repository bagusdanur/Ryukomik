import { proxySource } from "../../proxy";

interface SourceEndpointContext {
  params: Promise<{ source: string; endpoint: string }>;
}

export async function GET(request: Request, context: SourceEndpointContext) {
  const params = await context.params;
  return proxySource(request, [params.source, params.endpoint]);
}

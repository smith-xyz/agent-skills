import { createServer as createHttpServer, type Server } from 'node:http';

interface JsonResponse {
  [key: string]: unknown;
}

export function createServer(): Server {
  return createHttpServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

    res.setHeader('Content-Type', 'application/json');

    if (url.pathname === '/health') {
      return json(res, { status: 'ok' });
    }

    if (url.pathname === '/api/v1') {
      return json(res, { message: 'PROJECTNAME API' });
    }

    res.statusCode = 404;
    return json(res, { error: 'Not found' });
  });
}

function json(res: import('node:http').ServerResponse, data: JsonResponse): void {
  res.end(JSON.stringify(data));
}

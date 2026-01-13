export interface Config {
  port: number;
  env: string;
}

export const Config = {
  load(): Config {
    return {
      port: parseInt(process.env.PORT ?? '3000', 10),
      env: process.env.NODE_ENV ?? 'development',
    };
  },
};

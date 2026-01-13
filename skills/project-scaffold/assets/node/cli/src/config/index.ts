export interface Config {
  env: string;
}

export const Config = {
  load(): Config {
    return {
      env: process.env.NODE_ENV ?? 'development',
    };
  },
};

process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters-long';
Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });

import { CustomerSession } from '../types.js';

const sessions = new Map<string, CustomerSession>();

export const sessionStore = {
  getSession(from: string): CustomerSession {
    if (!sessions.has(from)) {
      sessions.set(from, {
        from,
        history: [],
        lastUpdated: new Date().toISOString(),
      });
    }
    return sessions.get(from)!;
  },

  saveSession(session: CustomerSession): CustomerSession {
    session.lastUpdated = new Date().toISOString();
    sessions.set(session.from, session);
    return session;
  },
};

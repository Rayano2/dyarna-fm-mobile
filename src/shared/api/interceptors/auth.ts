import type { BeforeRequestHook } from 'ky';
import { apiRegistry } from '../registry';

export const authInterceptor: BeforeRequestHook = ({ request }) => {
  if (request.headers.get('x-skip-auth')) {
    request.headers.delete('x-skip-auth');
    return;
  }
  const token = apiRegistry.getActiveToken();
  if (token) {
    request.headers.set('Authorization', `Bearer ${token}`);
  }
};

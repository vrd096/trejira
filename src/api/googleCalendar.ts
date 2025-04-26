import { jwtDecode } from 'jwt-decode'; // Добавляем библиотеку для декодирования JWT

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: any) => void }) => void;
          renderButton: (element: HTMLElement, options: { theme: string; size: string }) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
        };
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: any) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

export const googleCalendar = {
  async initClient(navigate: (path: string) => void): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!window.google) {
        reject(new Error('Google Identity Services library is not loaded.'));
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response: any) => {
            // Исправление 1: Передаем navigate через замыкание
            this.handleGoogleLoginSuccess(response, () => navigate('/trejira'));
            resolve();
          },
        });

        // ... остальной код инициализации
      } catch (error) {
        reject(new Error(`Failed to initialize Google client: ${(error as Error).message}`));
      }
    });
  },

  handleGoogleLoginSuccess(response: any, navigateCallback: () => void): void {
    console.log('Google login successful:', response);
    localStorage.setItem('token', response.credential);

    // Исправленный вызов
    const decodedToken = jwtDecode<{
      sub: string;
      name: string;
      email: string;
      picture: string;
    }>(response.credential);

    localStorage.setItem(
      'user',
      JSON.stringify({
        id: decodedToken.sub,
        name: decodedToken.name,
        email: decodedToken.email,
        avatar: decodedToken.picture,
      }),
    );

    navigateCallback();
  },

  async signOut(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!window.google?.accounts?.id) {
        reject(new Error('Google Identity Services library is not fully loaded.'));
        return;
      }

      try {
        window.google.accounts.id.disableAutoSelect();

        // Очищаем localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        resolve();
      } catch (error) {
        reject(new Error(`Failed to sign out: ${(error as Error).message}`));
      }
    });
  },
};

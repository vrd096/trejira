import React from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { loginSuccess, logout, setAuthLoading, setAuthError } from '../../features/auth/authSlice';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode'; // Для декодирования токена на клиенте
// Удалили импорт apiClient, так как он не нужен здесь для отправки запроса аутентификации

// Интерфейс для декодированного Google токена
interface DecodedGoogleToken {
  sub: string; // Google User ID
  name: string;
  email: string;
  picture: string; // URL аватара
  exp: number; // Expiration time
  // другие поля...
}

const CalendarIntegration: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, loading, error } = useAppSelector((state) => state.auth);
  // --- Handler for successful Google Sign-In ---
  const handleGoogleLoginSuccess = (credentialResponse: CredentialResponse) => {
    dispatch(setAuthLoading(true));
    dispatch(setAuthError(null));

    if (!credentialResponse.credential) {
      console.error('Google login failed: No credential received.');
      dispatch(setAuthError('Google login failed: No credential received.'));
      dispatch(setAuthLoading(false));
      return;
    }

    // console.log('Google credential received:', credentialResponse.credential);
    // console.log('Google credential received:', credentialResponse);

    try {
      // 1. Декодируем Google ID токен на клиенте
      const decodedToken = jwtDecode<DecodedGoogleToken>(credentialResponse.credential);
      // console.log('Decoded Google token:', decodedToken);

      if (!decodedToken.sub || !decodedToken.email || !decodedToken.name) {
        throw new Error('Invalid Google token payload');
      }

      // 2. Формируем данные пользователя для Redux/localStorage
      const userData = {
        id: decodedToken.sub, // Используем Google ID (sub) как ID пользователя на клиенте
        name: decodedToken.name,
        email: decodedToken.email,
        avatar: decodedToken.picture,
      };

      // 3. Сохраняем сам Google ID токен в localStorage для отправки с запросами
      localStorage.setItem('googleToken', credentialResponse.credential);
      // Сохраняем данные пользователя для отображения UI
      localStorage.setItem('user', JSON.stringify(userData));

      // 4. Диспатчим успешный вход в Redux
      dispatch(loginSuccess(userData));

      // 5. Установка заголовка Authorization теперь будет делаться интерсептором в tasksApi.ts

      console.log('User logged in successfully on client-side.');
    } catch (err: any) {
      console.error('Client-side Google token processing failed:', err);
      const errorMessage = err.message || 'Failed to process Google token.';
      dispatch(setAuthError(errorMessage));
      // Очистка в случае ошибки
      localStorage.removeItem('googleToken');
      localStorage.removeItem('user');
      dispatch(logout()); // Сбросить состояние Redux
    } finally {
      dispatch(setAuthLoading(false));
    }
  };

  // --- Handler for Google Sign-In errors ---
  const handleGoogleLoginError = () => {
    console.error('Google Sign-In failed on the client side.');
    dispatch(setAuthError('Google Sign-In failed. Please try again.'));
  };

  // --- Handler for user sign-out ---
  const handleLogout = () => {
    // Очищаем Google токен и данные пользователя
    localStorage.removeItem('googleToken');
    localStorage.removeItem('user');
    // Диспатчим logout (который должен сбросить Redux state)
    dispatch(logout());
    // Можно добавить Google Sign Out, если нужно завершить сессию и на стороне Google
    // google?.accounts?.id?.disableAutoSelect();
    console.log('User logged out.');
  };

  return (
    <div className="calendar-integration bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Пользователь</h3>

      {isAuthenticated && user ? (
        <div className="integration-status bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="font-medium text-gray-800">{user.name}</span>
            </div>
            <br />
            <button onClick={handleLogout} className="create-task-btn ml-4">
              Выйти
            </button>
          </div>
        </div>
      ) : (
        <div className="integration-setup bg-white p-4 rounded-lg shadow border border-gray-200">
          <p className="text-gray-600 mb-3 text-sm">Пожалуйста, войдите в свой аккаунт Google.</p>
          <div className="flex flex-col items-start space-y-3">
            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={handleGoogleLoginError}
              size="medium"
              theme="outline"
              shape="rectangular"
            />
            {loading && (
              <div className="flex items-center text-blue-600 text-sm">
                <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                  {' '}
                  {/* SVG Spinner */}
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Processing...</span>
              </div>
            )}
            {error && <p className="text-red-600 text-sm mt-1">Error: {error}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarIntegration;

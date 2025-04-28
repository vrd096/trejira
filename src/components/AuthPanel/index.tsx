// src/components/AuthPanel/index.tsx (или как ты его назвал)
import React from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
// Импортируем новые thunks
import { loginWithGoogleToken, logoutUser } from '../../features/auth/authThunks';
// Импортируем RootState
import { RootState } from '../../app/store';
// Убираем setAuthLoading, setAuthError - они вызываются внутри thunks

const AuthPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  // Получаем user и isAuthenticated для отображения UI
  const { user, isAuthenticated, loading, error } = useAppSelector(
    (state: RootState) => state.auth,
  );

  // --- Обработчик УСПЕШНОГО входа через Google ---
  const handleGoogleLoginSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      console.error('Google login failed: No credential received.');
      // Можно показать ошибку через dispatch(setAuthError(...)) или alert
      alert('Google Sign-In failed: No credential received.');
      return;
    }
    console.log('Google credential received, dispatching loginWithGoogleToken...');
    // Диспатчим thunk для обмена токена
    dispatch(loginWithGoogleToken(credentialResponse.credential));
    // Состояние loading/error будет управляться внутри thunk'а и authSlice
  };

  // --- Обработчик НЕУДАЧНОГО входа через Google ---
  const handleGoogleLoginError = () => {
    console.error('Google Sign-In failed on the client side.');
    alert('Google Sign-In failed. Please try again.');
    // Можно диспатчить setAuthError, если нужно
  };

  // --- Обработчик ВЫХОДА из системы ---
  const handleLogout = () => {
    console.log('Logout button clicked, dispatching logoutUser...');
    dispatch(logoutUser()); // Вызываем thunk для выхода
  };
  console.log(
    'AuthPanel rendering. isAuthenticated:',
    isAuthenticated,
    'User:',
    user,
    'Loading:',
    loading,
  );
  return (
    <div className="auth-panel bg-gray-50 p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
      {' '}
      {/* Изменил имя класса */}
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Авторизация</h3>
      {/* --- Отображение информации о пользователе или кнопки входа --- */}
      {isAuthenticated && user ? (
        <div className="status-display bg-white p-4 rounded-md shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Можно вернуть аватар, если сервер его возвращает */}
              {/* user.avatar && <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-gray-300"/> */}
              <span className="font-medium text-gray-800">{user.name}</span>
            </div>
            <button
              onClick={handleLogout}
              disabled={loading === 'pending'} // Блокируем кнопку при загрузке/выходе
              className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50 disabled:opacity-50">
              Sign Out
            </button>
          </div>
        </div>
      ) : (
        <div className="login-section bg-white p-4 rounded-md shadow-sm border border-gray-200">
          <p className="text-gray-600 mb-3 text-sm">
            Чтобы продолжить, войдите в свой аккаунт Google.
          </p>
          <div className="flex flex-col items-start space-y-3">
            {/* Показываем кнопку входа, только если не идет процесс загрузки/логина */}
            {loading !== 'pending' && (
              <GoogleLogin
                onSuccess={handleGoogleLoginSuccess}
                onError={handleGoogleLoginError}
                size="medium"
                theme="outline"
              />
            )}
            {/* Индикатор загрузки */}
            {loading === 'pending' && (
              <div className="flex items-center text-blue-600 text-sm">
                <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                  {' '}
                  {/* Spinner */}
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
            {/* Сообщение об ошибке */}
            {error && loading !== 'pending' && (
              <p className="text-red-600 text-sm mt-1">Error: {error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthPanel;

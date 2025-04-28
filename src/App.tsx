import React, { useEffect, useRef, useState } from 'react';
import { useAppSelector, useAppDispatch } from './app/hooks';
import TaskBoard from './components/TaskBoard';
import TaskForm from './components/TaskForm';
import AuthPanel from './components/AuthPanel'; // <<< Используем новое имя
import { DeadlineNotifier } from './utils/deadlineNotifications';
// Убираем loginSuccess, logout отсюда, используем thunks
import { fetchTasks } from './features/tasks/tasksThunks';
import { refreshAccessToken } from './features/auth/authThunks'; // <<< Импорт рефреша
import { RootState } from './app/store'; // Импорт RootState
import { setViewMode } from './features/tasks/tasksSlice';

const App: React.FC = () => {
  const { tasks, viewMode } = useAppSelector((state: RootState) => state.tasks);
  const { isAuthenticated, user, loading: authLoading } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  // const navigate = useNavigate(); // Не используется
  const notifierRef = useRef<DeadlineNotifier | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [isInitialAuthCheckDone, setIsInitialAuthCheckDone] = useState(false); // Флаг для предотвращения мигания
  useEffect(() => {
    if (user) dispatch(fetchTasks());
  }, [user]);
  // Инициализация приложения и проверка аутентификации
  useEffect(() => {
    console.log('App.tsx: Attempting initial token refresh...');
    dispatch(refreshAccessToken())
      .unwrap() // unwrap нужен, чтобы catch сработал при rejectWithValue
      .then(() => {
        console.log('App.tsx: Initial refresh successful.');
        // Загрузка задач теперь произойдет в другом useEffect
      })
      .catch((error) => {
        // Ошибки (истекший refresh token, невалидный и т.д.) уже обработаны в thunk'е (вызван logout)
        console.log('App.tsx: Initial refresh failed or no token.', error);
      })
      .finally(() => {
        // Помечаем, что попытка входа/рефреша завершена
        setIsInitialAuthCheckDone(true);
        console.log('App.tsx: Initial auth attempt finished.');
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    // Загружаем задачи только ПОСЛЕ попытки рефреша И если пользователь вошел
    if (isInitialAuthCheckDone && isAuthenticated) {
      console.log('App.tsx: User is authenticated, fetching tasks...');
      dispatch(fetchTasks());
    } else if (isInitialAuthCheckDone && !isAuthenticated) {
      console.log('App.tsx: User is not authenticated, skipping task fetch.');
      // Можно очистить стейт задач, если нужно
      // dispatch(setTasks([]));
    }
  }, [isAuthenticated, isInitialAuthCheckDone, dispatch]);

  // Обновление уведомлений (остается без изменений)
  useEffect(() => {
    if (notifierRef.current) {
      notifierRef.current.updateTasks(tasks);
    } else if (isAuthenticated) {
      // Создаем только если вошел
      notifierRef.current = new DeadlineNotifier(dispatch, tasks);
    }
    // Очистка при размонтировании или выходе пользователя
    return () => {
      if (!isAuthenticated && notifierRef.current) {
        notifierRef.current.clearAll();
        notifierRef.current = null;
      }
    };
  }, [tasks, isAuthenticated, dispatch]); // Зависит от tasks и isAuthenticated
  console.log(
    'App rendering final UI. isInitialAuthAttemptDone:',
    isInitialAuthCheckDone,
    'isAuthenticated:',
    isAuthenticated,
    'user:',
    user ? `User(id=${user.id}, name=${user.name})` : user, // Логируем user кратко или null
    'authLoading:',
    authLoading,
  );
  // Не показываем основной контент, пока не завершится проверка аутентификации
  if (!isInitialAuthCheckDone) {
    return <div className="loading">Initializing...</div>; // Или спиннер на весь экран
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Real-Time Задачи</h1>
        {isAuthenticated && user ? (
          <div className="user-panel">
            <button onClick={() => setShowTaskForm(true)} className="create-task-btn ml-4">
              Создать задачу
            </button>
          </div>
        ) : (
          <div style={{ marginLeft: 'auto' }}>{/* Пусто, т.к. кнопка входа в AuthPanel  */}</div>
        )}
      </header>

      <main className="app-main">
        <div className="app-sidebar">
          {/* AuthPanel  показывает либо инфо пользователя, либо кнопку входа */}
          <AuthPanel />

          {isAuthenticated && ( // Показываем только авторизованным
            <div className="mt-6 p-4 bg-white rounded shadow border border-gray-200">
              <h4 className="font-semibold mb-3 text-gray-700">Просмотр задач</h4>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => dispatch(setViewMode('active'))}
                  className={`text-left px-3 py-1 rounded ${
                    viewMode === 'active'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}>
                  Активные задачи
                </button>
                <button
                  onClick={() => dispatch(setViewMode('hidden'))}
                  className={`text-left px-3 py-1 rounded ${
                    viewMode === 'hidden'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}>
                  Скрытые задачи
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="app-content">
          {isAuthenticated ? (
            <TaskBoard />
          ) : (
            <p className="text-center mt-10 text-gray-500">
              Пожалуйста, войдите в систему, чтобы просматривать задачи и управлять ими.
            </p>
          )}
        </div>
      </main>

      {/* Форма создания задачи доступна только авторизованным */}
      {isAuthenticated && showTaskForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <TaskForm onClose={() => setShowTaskForm(false)} />
            {/* Убедись, что TaskForm НЕ пытается сама получить ID пользователя, */}
            {/* а сервер берет его из проверенного токена */}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

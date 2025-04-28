import React, { useEffect, useRef, useState } from 'react';
import { useAppSelector, useAppDispatch } from './app/hooks';
import TaskBoard from './components/TaskBoard';
import TaskForm from './components/TaskForm';
import CalendarIntegration from './components/CalendarIntegration';
import { DeadlineNotifier } from './utils/deadlineNotifications';
import { loginSuccess, logout } from './features/auth/authSlice'; // Удалили fetchUserProfile
// import { useNavigate } from 'react-router-dom'; // useNavigate не используется в этой логике
import { jwtDecode } from 'jwt-decode'; // Для проверки срока токена
import { fetchTasks } from './features/tasks/tasksThunks';
import { setViewMode } from './features/tasks/tasksSlice';
import { RootState } from './app/store';

// Интерфейс для данных пользователя из localStorage
interface StoredUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

// Интерфейс для декодированного Google токена (только для проверки exp)
interface DecodedGoogleTokenExp {
  exp: number;
}

const App: React.FC = () => {
  const { tasks, viewMode } = useAppSelector((state: RootState) => state.tasks);
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
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
    console.log('App.tsx: Initial auth check effect running.');
    const googleToken = localStorage.getItem('googleToken');
    const storedUserJson = localStorage.getItem('user');
    let userIsAuthenticatedOnLoad = false;

    if (googleToken && storedUserJson) {
      console.log('Found Google token and user data in localStorage.');
      try {
        // Проверяем срок действия Google токена
        const decodedToken = jwtDecode<DecodedGoogleTokenExp>(googleToken);
        const isExpired = decodedToken.exp * 1000 < Date.now();

        if (isExpired) {
          console.log('Google token is expired. Clearing storage.');
          localStorage.removeItem('googleToken');
          localStorage.removeItem('user');
          dispatch(logout()); // Убедимся, что стейт Redux тоже сброшен
        } else {
          // Токен валиден (не истек), парсим данные пользователя
          const storedUser: StoredUser = JSON.parse(storedUserJson);
          console.log('Google token is valid. Dispatching loginSuccess.');
          // Восстанавливаем сессию в Redux
          dispatch(loginSuccess(storedUser));
          userIsAuthenticatedOnLoad = true; // Пользователь аутентифицирован

          console.log('User authenticated on load, fetching tasks...');
          dispatch(fetchTasks()); // <<< ВЫЗЫВАЕМ ЗАГРУЗКУ ЗАДАЧ
        }
      } catch (error) {
        console.error('Error decoding token or parsing user data:', error);
        // Ошибка декодирования или парсинга - считаем невалидным
        localStorage.removeItem('googleToken');
        localStorage.removeItem('user');
        dispatch(logout());
      }
    } else {
      console.log('No Google token or user data found. Ensuring logged out state.');
      // Если чего-то нет, убедимся, что пользователь разлогинен
      dispatch(logout());
    }

    setIsInitialAuthCheckDone(true); // Помечаем, что проверка завершена

    // Инициализация DeadlineNotifier (можно оставить здесь или перенести)
    // Важно: Notifier может получить пустой список tasks при первом запуске,
    // он должен корректно обновиться при изменении tasks.
    notifierRef.current = new DeadlineNotifier(dispatch, tasks); // tasks здесь будут начальные (пустые)
    return () => {
      notifierRef.current?.clearAll();
    };
    // Зависимости: dispatch. Не добавляем tasks, чтобы не перезапускать проверку при их изменении.
  }, [dispatch]); // Запускаем только один раз при монтировании

  // Обновление уведомлений (остается без изменений)
  useEffect(() => {
    // Обновляем задачи в уведомителе только если он уже создан
    if (notifierRef.current) {
      notifierRef.current.updateTasks(tasks);
    }
  }, [tasks]); // Зависит только от tasks

  // Обработчик выхода (вызывается из CalendarIntegration)
  // Мы его не вызываем напрямую из App.tsx, но логика остается здесь для справки
  // const handleLogout = () => {
  //   localStorage.removeItem('googleToken');
  //   localStorage.removeItem('user');
  //   dispatch(logout());
  //   console.log('App.tsx: handleLogout called.');
  // };

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
              Create Task
            </button>
          </div>
        ) : (
          <div style={{ marginLeft: 'auto' }}>
            {/* Пусто, т.к. кнопка входа в CalendarIntegration */}
          </div>
        )}
      </header>

      <main className="app-main">
        <div className="app-sidebar">
          {/* CalendarIntegration показывает либо инфо пользователя, либо кнопку входа */}
          <CalendarIntegration />

          {isAuthenticated && ( // Показываем только авторизованным
            <div className="mt-6 p-4 bg-white rounded shadow border border-gray-200">
              <h4 className="font-semibold mb-3 text-gray-700">Task View</h4>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => dispatch(setViewMode('active'))}
                  className={`text-left px-3 py-1 rounded ${
                    viewMode === 'active'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}>
                  Active Tasks
                </button>
                <button
                  onClick={() => dispatch(setViewMode('hidden'))}
                  className={`text-left px-3 py-1 rounded ${
                    viewMode === 'hidden'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}>
                  Hidden Tasks
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
              Please sign in to view and manage tasks.
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

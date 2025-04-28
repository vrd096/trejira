import { io, Socket } from 'socket.io-client';
import { ITask } from '../types/taskTypes';

const socketUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

export class TaskWebSocket {
  private socket!: Socket;
  private currentToken: string | null; // Храним текущий токен

  constructor(
    // --- Добавляем accessToken как ПЕРВЫЙ аргумент ---
    accessToken: string | null, // Принимаем Access Token
    // ---------------------------------------------
    private onTaskUpdated: (task: ITask) => void,
    private onTaskDeleted: (taskId: string) => void,
    private onError?: (error: Error) => void,
  ) {
    console.log('TaskWebSocket: Constructor called.');
    // Сохраняем токен, чтобы использовать его при реконнекте
    this.currentToken = accessToken;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (this.socket) {
      console.log('WebSocket: Disconnecting existing socket.');
      this.socket.disconnect();
    }

    // Используем токен, сохраненный в this.currentToken
    const token = this.currentToken;
    console.log(
      'WebSocket: Attempting to connect with Access Token:',
      token ? 'Present' : 'Absent',
    );

    if (!token) {
      console.warn('WebSocket: Cannot connect without an access token.');
      // Не создаем сокет, если нет токена
      return;
    }

    this.socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnectionAttempts: 5,
      timeout: 10000,
      auth: {
        token: token, // <<< Используем переданный Access Token
      },
    });

    // --- Обработчики событий (остаются прежними) ---
    this.socket.on('connect', () => {
      /* ... */
    });
    this.socket.on('disconnect', (reason) => {
      this.onError?.(new Error(`Disconnected: ${reason}`));
    });
    this.socket.on('connect_error', (err) => {
      this.onError?.(err);
    });
    this.socket.on('TASK_UPDATED', (task: ITask) => {
      this.onTaskUpdated(task);
    });
    this.socket.on('TASK_DELETED', (taskId: string) => {
      this.onTaskDeleted(taskId);
    });
    this.socket.on('error', (error: any) => {
      this.onError?.(new Error(error?.message || 'WS Error'));
    });
    // ---------------------------------------------
  }

  public close(): void {
    if (this.socket) {
      console.log('WebSocket: Closing connection manually.');
      this.socket.disconnect();
    }
  }

  // Метод для обновления токена и переподключения
  public updateTokenAndReconnect(newAccessToken: string | null): void {
    console.log('WebSocket: Updating token and reconnecting...');
    this.currentToken = newAccessToken;
    // setupEventListeners закроет старый сокет и откроет новый с this.currentToken
    this.setupEventListeners();
  }

  // public reconnectWithToken(): void {
  //   console.log('WebSocket: Reconnecting with updated token...');
  //   this.setupEventListeners();
  // }
}

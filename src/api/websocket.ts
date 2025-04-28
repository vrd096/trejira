import { io, Socket } from 'socket.io-client';
import { ITask } from '../types/taskTypes'; // Импортируем ITask

const socketUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'; // Лучше ws://

export class TaskWebSocket {
  private socket!: Socket;

  // Конструктор принимает колбэки и сохраняет их в свойствах класса
  constructor(
    private onTaskUpdated: (task: ITask) => void,
    private onTaskDeleted: (taskId: string) => void,
    private onError?: (error: Error) => void,
  ) {
    console.log('TaskWebSocket: Constructor called.');
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (this.socket) {
      console.log('WebSocket: Disconnecting existing socket before reconnecting.');
      this.socket.disconnect();
    }

    const token = localStorage.getItem('googleToken'); // Используем googleToken
    console.log('WebSocket: Attempting to connect with token:', token ? 'present' : 'absent');

    this.socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnectionAttempts: 5,
      timeout: 10000,
      auth: { token: token },
    });

    // --- Обработчики стандартных событий Socket.IO ---
    this.socket.on('connect', () => {
      console.log(`WebSocket: Connected successfully with socket ID: ${this.socket.id}`);
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`WebSocket: Disconnected. Reason: ${reason}`);
      if (reason === 'io server disconnect') {
        console.warn('WebSocket: Disconnected by server.');
        // Используем сохраненный onError
        this.onError?.(new Error('Disconnected by server')); // <<< ИСПОЛЬЗОВАНИЕ this.onError
      }
    });

    this.socket.on('connect_error', (err) => {
      console.error(`WebSocket: Connection Error: ${err.message}`);
      // Используем сохраненный onError
      this.onError?.(err); // <<< ИСПОЛЬЗОВАНИЕ this.onError
      if (err.message.includes('Authentication error') || err.message.includes('Invalid token')) {
        console.error('WebSocket: Authentication failed.');
      }
    });

    // --- Обработчики пользовательских событий от сервера ---
    // Используем сохраненные колбэки

    this.socket.on('TASK_UPDATED', (task: ITask) => {
      console.log('WebSocket: Received TASK_UPDATED event:', task);
      // Вызываем колбэк, сохраненный в свойстве класса
      this.onTaskUpdated(task); // <<< ИСПОЛЬЗОВАНИЕ this.onTaskUpdated
    });

    this.socket.on('TASK_DELETED', (taskId: string) => {
      console.log('WebSocket: Received TASK_DELETED event for task ID:', taskId);
      // Вызываем колбэк, сохраненный в свойстве класса
      this.onTaskDeleted(taskId); // <<< ИСПОЛЬЗОВАНИЕ this.onTaskDeleted
    });

    // Обработчик общих ошибок
    this.socket.on('error', (error: any) => {
      console.error('WebSocket: Received general error event:', error);
      // Используем сохраненный onError
      this.onError?.(new Error(error?.message || 'Unknown WebSocket error')); // <<< ИСПОЛЬЗОВАНИЕ this.onError
    });
  }

  // --- Остальные методы ---
  public close(): void {
    if (this.socket) {
      console.log('WebSocket: Closing connection manually.');
      this.socket.disconnect();
    }
  }

  public reconnectWithToken(): void {
    console.log('WebSocket: Reconnecting with updated token...');
    this.setupEventListeners();
  }
}

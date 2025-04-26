import { io, Socket } from 'socket.io-client';
import { ITask } from '../types/taskTypes';

const socketUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

export class TaskWebSocket {
  private socket: Socket;

  constructor(
    private onTaskUpdated: (task: ITask) => void,
    private onTaskDeleted: (taskId: string) => void,
  ) {
    this.socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket'],
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.socket = io(socketUrl, {
      auth: {
        token: localStorage.getItem('token'),
      },
    });
    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    this.socket.on('TASK_UPDATED', (task: ITask) => {
      this.onTaskUpdated(task);
    });

    this.socket.on('TASK_DELETED', (taskId: string) => {
      this.onTaskDeleted(taskId);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });
  }

  public close(): void {
    this.socket.disconnect();
  }
}

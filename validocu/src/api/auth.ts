import { baseURL } from '../utils/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: number;
    name: string;
    email: string;
  };
  token: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  roles?: any[];
  permissions?: any[];
}

class AuthService {
  private static instance: AuthService;
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    // Cargar token del localStorage al inicializar
    this.token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('auth_user');
    if (userData) {
      this.user = JSON.parse(userData);
    }
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${baseURL}/api/v1/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al iniciar sesión');
    }

    const data: LoginResponse = await response.json();
    
    // Guardar token y usuario
    this.token = data.token;
    this.user = data.user;
    
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));

    return data;
  }

  async logout(): Promise<void> {
    if (this.token) {
      try {
        await fetch(`${baseURL}/api/v1/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
      }
    }

    // Limpiar datos locales
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  async getMe(): Promise<User> {
    if (!this.token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(`${baseURL}/api/v1/me`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener información del usuario');
    }

    const data = await response.json();
    this.user = { ...data.user, roles: data.roles, permissions: data.permissions };
    localStorage.setItem('auth_user', JSON.stringify(this.user));
    
    return this.user;
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  // Método para hacer peticiones autenticadas
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.token) {
      throw new Error('No hay token de autenticación');
    }

    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    return fetch(`${baseURL}${url}`, {
      ...options,
      headers,
    });
  }
}

export const authService = AuthService.getInstance();
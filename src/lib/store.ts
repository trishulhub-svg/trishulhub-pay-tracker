import { create } from 'zustand';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

type AuthView = 'login' | 'forgot';
type CurrentView = 'dashboard' | 'records' | 'add-record' | 'edit-record' | 'users' | 'settings';

interface AppState {
  // Auth
  authView: AuthView;
  user: SessionUser | null;
  isLoading: boolean;
  
  // Navigation
  currentView: CurrentView;
  sidebarOpen: boolean;
  
  // Selections
  selectedRecordId: string | null;
  selectedUserId: string | null;
  
  // Actions
  setAuthView: (view: AuthView) => void;
  setUser: (user: SessionUser | null) => void;
  setIsLoading: (loading: boolean) => void;
  setCurrentView: (view: CurrentView) => void;
  setSidebarOpen: (open: boolean) => void;
  setSelectedRecordId: (id: string | null) => void;
  setSelectedUserId: (id: string | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  authView: 'login',
  user: null,
  isLoading: false,
  currentView: 'dashboard',
  sidebarOpen: true,
  selectedRecordId: null,
  selectedUserId: null,
  
  setAuthView: (view) => set({ authView: view }),
  setUser: (user) => set({ user }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setCurrentView: (view) => set({ currentView: view, selectedRecordId: null, selectedUserId: null }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSelectedRecordId: (id) => set({ selectedRecordId: id }),
  setSelectedUserId: (id) => set({ selectedUserId: id }),
  logout: () => set({ 
    user: null, 
    authView: 'login', 
    currentView: 'dashboard',
    selectedRecordId: null,
    selectedUserId: null,
  }),
}));

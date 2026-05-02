import { create } from 'zustand';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  isPremium: boolean;
  referralCode: string;
  role: string;
}

type AuthView = 'login' | 'signup';
type CurrentView = 'dashboard' | 'records' | 'add-record' | 'edit-record' | 'companies' | 'add-company' | 'shifts' | 'add-shift' | 'edit-shift' | 'referrals' | 'settings' | 'admin';

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
  selectedCompanyId: string | null;
  selectedShiftId: string | null;

  // Actions
  setAuthView: (view: AuthView) => void;
  setUser: (user: SessionUser | null) => void;
  setIsLoading: (loading: boolean) => void;
  setCurrentView: (view: CurrentView) => void;
  setSidebarOpen: (open: boolean) => void;
  setSelectedRecordId: (id: string | null) => void;
  setSelectedCompanyId: (id: string | null) => void;
  setSelectedShiftId: (id: string | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  authView: 'login',
  user: null,
  isLoading: false,
  currentView: 'dashboard',
  sidebarOpen: true,
  selectedRecordId: null,
  selectedCompanyId: null,
  selectedShiftId: null,

  setAuthView: (view) => set({ authView: view }),
  setUser: (user) => set({ user }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setCurrentView: (view) => set({ currentView: view, selectedRecordId: null, selectedShiftId: null }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSelectedRecordId: (id) => set({ selectedRecordId: id }),
  setSelectedCompanyId: (id) => set({ selectedCompanyId: id }),
  setSelectedShiftId: (id) => set({ selectedShiftId: id }),
  logout: () => set({
    user: null,
    authView: 'login',
    currentView: 'dashboard',
    selectedRecordId: null,
    selectedCompanyId: null,
    selectedShiftId: null,
  }),
}));

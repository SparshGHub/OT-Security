'use client';

import React, {
  useState,
  ReactNode,
  useCallback,
  useEffect,
  useContext,
} from 'react';
import { fetchFromApi } from '../api';
import {
  User,
  PlantTopology,
  Rule,
  Mitigation,
  SimulationEvent,
  SimulationParams,
  SimulationResult,
  Component,
  Connectivity,
} from '../types';

// ---------------------------------------------------------------------
// Helper – token from localStorage (SSR-safe)
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken');
};

// ---------------------------------------------------------------------
// Context shape
interface AppState {
  user: User | null;
  token: string | null;
  topology: PlantTopology | null;
  rules: Rule[];
  mitigations: Mitigation[];
  events: SimulationEvent[];
  mitigatedEventIds: Set<string>;
  selectedProcessId: string | null;
  selectedComponentId: string | null;
  selectedComponent: Component | null;
  isMitigationModalOpen: boolean;
  activeMitigationId: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadInitialData: () => Promise<void>;
  selectProcess: (processId: string) => void;
  selectComponent: (componentId: string | null) => void;
  runSimulation: (params: SimulationParams) => Promise<void>;
  openMitigationModal: (mitigationId: string) => void;
  closeMitigationModal: () => void;
  getMitigationById: (ruleId: string) => Mitigation | undefined;
  mitigateEvent: (eventId: string) => void;
  mitigateAllEvents: () => void;
  setEvents: React.Dispatch<React.SetStateAction<SimulationEvent[]>>;

  // ----- CRUD -----
  addComponent: (data: Omit<Component, 'id'>) => Promise<Component>;
  removeComponent: (componentId: string) => Promise<void>;
  addConnectivity: (data: Omit<Connectivity, 'id'>) => Promise<Connectivity>;
  removeConnectivity: (edgeId: string) => Promise<void>;
}

// ---------------------------------------------------------------------
// Context
const AppStateContext = React.createContext<AppState | undefined>(undefined);

// ---------------------------------------------------------------------
// Provider
export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  // ---------- state ----------
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => getToken());
  const [topology, setTopology] = useState<PlantTopology | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [mitigations, setMitigations] = useState<Mitigation[]>([]);
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const [mitigatedEventIds, setMitigatedEventIds] = useState<Set<string>>(new Set());
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [isMitigationModalOpen, setMitigationModalOpen] = useState(false);
  const [activeMitigationId, setActiveMitigationId] = useState<string | null>(null);

  // derived
  const selectedComponent =
    topology?.components.find((c) => c.id === selectedComponentId) ?? null;

  // ---------- auth ----------
  const login = async (email: string, password: string) => {
    const response = await fetchFromApi('/auth/login', null, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!response?.token) throw new Error('Login failed: No token received.');

    localStorage.setItem('authToken', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    setToken(response.token);
    setUser(response.user);
    await loadInitialData();
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setTopology(null);
    setRules([]);
    setMitigations([]);
    setEvents([]);
    setMitigatedEventIds(new Set());
    setSelectedProcessId(null);
    setSelectedComponentId(null);
  };

  // ---------- data loading ----------
  const loadInitialData = useCallback(async () => {
    const currentToken = getToken();
    if (!currentToken) {
      logout();
      return;
    }

    try {
      const [topologyData, rulesData, mitigationsData] = await Promise.all([
        fetchFromApi('/plant', currentToken),
        fetchFromApi('/library/rules', currentToken),
        fetchFromApi('/library/mitigations', currentToken),
      ]);

      if (topologyData) {
        setTopology(topologyData);
        if (topologyData.processes?.length) {
          setSelectedProcessId(topologyData.processes[0].id);
        }
      }
      if (rulesData) setRules(rulesData);
      if (mitigationsData) setMitigations(mitigationsData);
    } catch (err) {
      console.error('Failed to load initial data:', err);
      logout();
    }
  }, []);

  // ---------- UI helpers ----------
  const selectProcess = (processId: string) => {
    setSelectedProcessId(processId);
    setSelectedComponentId(null);
  };

  const selectComponent = (componentId: string | null) => {
    setSelectedComponentId(componentId);
  };

  const runSimulation = async (params: SimulationParams) => {
  if (!token) {
    throw new Error("Not authenticated");
  }

  // Debug: log outgoing simulation params
  try {
    console.debug('runSimulation - sending', params);
  } catch {}

  const result: SimulationResult = await fetchFromApi('/simulate', token, {
    method: 'POST',
    body: JSON.stringify(params),
  });

  // Debug: log incoming result from API
  try {
    console.debug('runSimulation - response', result);
  } catch {}

  if (result?.events) {
    setEvents((prev) => [...result.events, ...prev]);
    setSelectedComponentId(params.component_id);
  }
};


  const openMitigationModal = (mitigationId: string) => {
    setActiveMitigationId(mitigationId);
    setMitigationModalOpen(true);
  };

  const closeMitigationModal = () => {
    setMitigationModalOpen(false);
    setActiveMitigationId(null);
  };

  const getMitigationById = (ruleId: string) =>
    mitigations.find((m) => m.applies_to.rule_ids.includes(ruleId));

  const mitigateEvent = useCallback(async (eventId: string) => {
    // Optimistic UI update
    setMitigatedEventIds((prev) => new Set([...prev, eventId]));

    if (token) {
      try {
        await fetchFromApi(`/events/${eventId}/mitigate`, token, { method: 'POST' });
      } catch (err) {
        console.error('Failed to mitigate event on backend:', err);
      }
    }
  }, [token]);

  const mitigateAllEvents = useCallback(async () => {
    // Optimistically mark all current active events as mitigated
    setMitigatedEventIds((prev) => {
      const allIds = events.map(e => e.id);
      return new Set([...prev, ...allIds]);
    });
    
    if (token) {
      try {
        await fetchFromApi('/events/mitigate-all', token, { method: 'POST' });
        // After bulk mitigation, reloading initial data or running next 5-second poll will clear them
      } catch (err) {
        console.error('Failed to mitigate all events:', err);
      }
    }
  }, [token, events]);

  // ---------- CRUD ----------
  const addComponent = async (data: Omit<Component, 'id'>): Promise<Component> => {
    if (!token) throw new Error('Not authenticated');

    const created: Component = await fetchFromApi('/plant/components', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // optimistic UI
    setTopology((prev) => {
      if (!prev) return prev;
      return { ...prev, components: [created, ...prev.components] };
    });

    return created; // <-- crucial for AddComponentDialog
  };

  const removeComponent = async (componentId: string) => {
    if (!token) throw new Error('Not authenticated');
    await fetchFromApi(`/plant/components/${componentId}`, token, { method: 'DELETE' });

    setTopology((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        components: prev.components.filter((c) => c.id !== componentId),
        setpoints: prev.setpoints.filter((s) => s.component_id !== componentId),
        connectivity: prev.connectivity.filter(
          (e) => e.from_component_id !== componentId && e.to_component_id !== componentId
        ),
      };
    });

    setSelectedComponentId((prev) => (prev === componentId ? null : prev));
  };

  const addConnectivity = async (
    data: Omit<Connectivity, 'id'>
  ): Promise<Connectivity> => {
    if (!token) throw new Error('Not authenticated');

    const created: Connectivity = await fetchFromApi('/plant/connectivity', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    setTopology((prev) => {
      if (!prev) return prev;
      return { ...prev, connectivity: [created, ...prev.connectivity] };
    });

    return created;
  };

  const removeConnectivity = async (edgeId: string) => {
    if (!token) throw new Error('Not authenticated');
    await fetchFromApi(`/plant/connectivity/${edgeId}`, token, { method: 'DELETE' });

    setTopology((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        connectivity: prev.connectivity.filter((e) => e.id !== edgeId),
      };
    });
  };

  // ---------- session restore ----------
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = getToken();

    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedToken) setToken(storedToken);
  }, []);

  // ---------- context value ----------
  const value: AppState = {
    user,
    token,
    topology,
    rules,
    mitigations,
    events,
    mitigatedEventIds,
    selectedProcessId,
    selectedComponentId,
    selectedComponent,
    isMitigationModalOpen,
    activeMitigationId,
    login,
    logout,
    loadInitialData,
    selectProcess,
    selectComponent,
    runSimulation,
    openMitigationModal,
    closeMitigationModal,
    getMitigationById,
    mitigateEvent,
    mitigateAllEvents,
    setEvents,
    addComponent,
    removeComponent,
    addConnectivity,
    removeConnectivity,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

// ---------------------------------------------------------------------
// Hook
export const useAppState = (): AppState => {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
};

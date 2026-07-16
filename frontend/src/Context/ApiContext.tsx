import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../api";
import { upsertEntity } from "../Functions/upsertEntity";
import type { CreateTicketInput, DashboardData, SoldOrder, SupportDashboard, SupportFilters, SupportTicket, SupportTopic, SystemUser, TicketInputOptions, TicketItem, UpdateMeInput, UpdateTicketInput, User } from "../types";

type ApiContextValue = {
  user: User | null; initializing: boolean;
  dashboard: DashboardData | null; tickets: TicketItem[] | null; soldOrders: SoldOrder[] | null; ticketOptions: TicketInputOptions | null;
  supportTopics: SupportTopic[] | null; supportTickets: SupportTicket[] | null;
  systemUsers: SystemUser[] | null; systemTickets: SupportTicket[] | null; systemTopics: SupportTopic[] | null; supportDashboard: SupportDashboard | null;
  login: (email: string, password: string) => Promise<User>; logout: () => Promise<void>; refreshUser: () => Promise<User>; updateMe: (payload: UpdateMeInput) => Promise<User>;
  loadDashboard: (force?: boolean) => Promise<void>; loadTickets: (force?: boolean) => Promise<void>; loadSoldOrders: (force?: boolean) => Promise<void>; loadTicketOptions: (force?: boolean) => Promise<void>;
  createTicket: (payload: CreateTicketInput) => Promise<TicketItem>; updateTicket: (id: string | number, payload: UpdateTicketInput) => Promise<TicketItem>; deleteTicket: (id: string | number) => Promise<void>;
  completeSale: (id: number, dispatchStatusId: number) => Promise<void>;
  loadSupport: (force?: boolean) => Promise<void>; loadSupportTicket: (id: string | number, admin?: boolean) => Promise<SupportTicket>; createSupportTicket: (topicId: number, text: string) => Promise<SupportTicket>; replyToTicket: (id: string | number, text: string) => Promise<SupportTicket>;
  loadSystemUsers: (force?: boolean) => Promise<void>; loadSystemTickets: (filters: SupportFilters) => Promise<void>; loadSystemTopics: (force?: boolean) => Promise<void>; loadSupportDashboard: (filters: SupportFilters) => Promise<void>;
  replyAsSystemAdmin: (id: string | number, text: string) => Promise<SupportTicket>; updateSupportStatus: (id: string | number, status: SupportTicket["status"]) => Promise<SupportTicket>;
  createSupportTopic: (name: string) => Promise<SupportTopic>; deleteSupportTopic: (id: number) => Promise<SupportTopic>;
};

const ApiContext = createContext<ApiContextValue | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [initializing, setInitializing] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null); const [tickets, setTickets] = useState<TicketItem[] | null>(null); const [soldOrders, setSoldOrders] = useState<SoldOrder[] | null>(null); const [ticketOptions, setTicketOptions] = useState<TicketInputOptions | null>(null);
  const [supportTopics, setSupportTopics] = useState<SupportTopic[] | null>(null); const [supportTickets, setSupportTickets] = useState<SupportTicket[] | null>(null);
  const [systemUsers, setSystemUsers] = useState<SystemUser[] | null>(null); const [systemTickets, setSystemTickets] = useState<SupportTicket[] | null>(null); const [systemTopics, setSystemTopics] = useState<SupportTopic[] | null>(null); const [supportDashboard, setSupportDashboard] = useState<SupportDashboard | null>(null);

  useEffect(() => { api.me().then((result) => setUser(result.user)).catch(() => setUser(null)).finally(() => setInitializing(false)); }, []);
  const clearCaches = () => { setDashboard(null); setTickets(null); setSoldOrders(null); setTicketOptions(null); setSupportTopics(null); setSupportTickets(null); setSystemUsers(null); setSystemTickets(null); setSystemTopics(null); setSupportDashboard(null); };
  const login = async (email: string, password: string) => { const result = await api.login(email, password); clearCaches(); setUser(result.user); return result.user; };
  const logout = async () => { await api.logout().catch(() => undefined); clearCaches(); setUser(null); };
  const refreshUser = async () => { const result = await api.me(); setUser(result.user); return result.user; };
  const updateMe = async (payload: UpdateMeInput) => { const result = await api.updateMe(payload); setUser(result.user); return result.user; };
  const loadDashboard = useCallback(async (force = false) => { if (dashboard && !force) return; setDashboard(await api.dashboard()); }, [dashboard]);
  const loadTickets = useCallback(async (force = false) => { if (tickets && !force) return; setTickets((await api.tickets()).items); }, [tickets]);
  const loadSoldOrders = useCallback(async (force = false) => { if (soldOrders && !force) return; setSoldOrders((await api.soldOrders()).items); }, [soldOrders]);
  const loadTicketOptions = useCallback(async (force = false) => { if (ticketOptions && !force) return; setTicketOptions(await api.ticketInputOptions()); }, [ticketOptions]);
  const createTicket = async (payload: CreateTicketInput) => { const result = await api.createTicket(payload); setTickets((items) => upsertEntity(items ?? [], result.item)); return result.item; };
  const updateTicket = async (id: string | number, payload: UpdateTicketInput) => { const result = await api.updateTicket(id, payload); setTickets((items) => upsertEntity(items ?? [], result.item)); return result.item; };
  const deleteTicket = async (id: string | number) => { await api.deleteTicket(id); setTickets((items) => items?.filter((item) => item.databaseId !== Number(id)) ?? null); };
  const completeSale = async (id: number, dispatchStatusId: number) => { const result = await api.updateSoldOrder(id, { dispatchStatusId }); setSoldOrders((items) => upsertEntity(items ?? [], result.item)); };
  const loadSupport = useCallback(async (force = false) => { if (supportTopics && supportTickets && !force) return; const [topics, items] = await Promise.all([api.supportTopics(), api.mySupportTickets()]); setSupportTopics(topics.items); setSupportTickets(items.items); }, [supportTickets, supportTopics]);
  const loadSupportTicket = async (id: string | number, admin = false) => { const result = admin ? await api.systemSupportTicket(id) : await api.supportTicket(id); (admin ? setSystemTickets : setSupportTickets)((items) => upsertEntity(items ?? [], result.item)); return result.item; };
  const createSupportTicket = async (topicId: number, text: string) => { const result = await api.createSupportTicket(topicId, text); setSupportTickets((items) => upsertEntity(items ?? [], result.item)); return result.item; };
  const replyToTicket = async (id: string | number, text: string) => { const result = await api.replyToSupportTicket(id, text); setSupportTickets((items) => upsertEntity(items ?? [], result.item)); return result.item; };
  const loadSystemUsers = useCallback(async (force = false) => { if (systemUsers && !force) return; setSystemUsers((await api.systemUsers()).items); }, [systemUsers]);
  const loadSystemTickets = async (filters: SupportFilters) => setSystemTickets((await api.systemSupportTickets(filters)).items);
  const loadSystemTopics = useCallback(async (force = false) => { if (systemTopics && !force) return; setSystemTopics((await api.systemSupportTopics()).items); }, [systemTopics]);
  const loadSupportDashboard = async (filters: SupportFilters) => setSupportDashboard(await api.supportDashboard(filters));
  const replyAsSystemAdmin = async (id: string | number, text: string) => { const result = await api.replyAsSystemAdmin(id, text); setSystemTickets((items) => upsertEntity(items ?? [], result.item)); return result.item; };
  const updateSupportStatus = async (id: string | number, status: SupportTicket["status"]) => { const result = await api.updateSupportStatus(id, status); setSystemTickets((items) => upsertEntity(items ?? [], result.item)); setSystemUsers(null); return result.item; };
  const createSupportTopic = async (name: string) => { const result = await api.createSupportTopic(name); setSystemTopics((items) => upsertEntity(items ?? [], result.item)); return result.item; };
  const deleteSupportTopic = async (id: number) => { const result = await api.deleteSupportTopic(id); setSystemTopics((items) => upsertEntity(items ?? [], result.item)); return result.item; };

  const value = useMemo<ApiContextValue>(() => ({ user, initializing, dashboard, tickets, soldOrders, ticketOptions, supportTopics, supportTickets, systemUsers, systemTickets, systemTopics, supportDashboard, login, logout, refreshUser, updateMe, loadDashboard, loadTickets, loadSoldOrders, loadTicketOptions, createTicket, updateTicket, deleteTicket, completeSale, loadSupport, loadSupportTicket, createSupportTicket, replyToTicket, loadSystemUsers, loadSystemTickets, loadSystemTopics, loadSupportDashboard, replyAsSystemAdmin, updateSupportStatus, createSupportTopic, deleteSupportTopic }), [user, initializing, dashboard, tickets, soldOrders, ticketOptions, supportTopics, supportTickets, systemUsers, systemTickets, systemTopics, supportDashboard, loadDashboard, loadTickets, loadSoldOrders, loadTicketOptions, loadSupport, loadSystemUsers, loadSystemTopics]);
  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export const useApi = () => { const context = useContext(ApiContext); if (!context) throw new Error("useApi must be used inside ApiProvider."); return context; };

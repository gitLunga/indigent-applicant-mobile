import React, {
  createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import api from './api';
import { useAuth } from './auth';

/**
 * The applicant's current application, shared across the signed-in shell.
 *
 * A port of the web client's `ApplicationContext` in `AppLayout.jsx`, and it
 * exists for the same reason: the drawer's status block, the dashboard and the
 * documents screen all answer "where has my application got to", and if each
 * fetched separately they would disagree with each other for as long as the
 * slowest request took. One fetch, one answer.
 *
 * `/applications/mine` is the same endpoint the dashboard already used, so this
 * removes a request rather than adding one.
 */

export type Application = {
  id: string;
  reference: string | null;
  status: string;
  currentStep?: number | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  expiresAt?: string | null;
  approvalStage?: string | null;
  documents?: { status: string; importance: string }[];
};

type ApplicationValue = {
  /** What the applicant is working on: the draft, else the most recent. */
  application: Application | null;
  applications: Application[];
  unread: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const ApplicationContext = createContext<ApplicationValue | null>(null);

export function ApplicationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setApplications([]);
      setUnread(0);
      setLoading(false);
      return;
    }

    setError(null);
    try {
      /**
       * The count endpoint rather than the whole inbox.
       *
       * This runs on every return to a screen, and counting unread rows on the
       * client means downloading every message somebody has ever had in order to
       * render one number.
       */
      const [mine, count] = await Promise.all([
        api.get('/applications/mine'),
        api.get('/notifications/unread-count').catch(() => null),
      ]);
      setApplications(mine.data.data ?? []);
      // The API returns { data: { unreadCount } }. Named exactly, because a
      // wrong key here fails silently as a permanent zero rather than an error.
      setUnread(Number(count?.data?.data?.unreadCount ?? 0));
    } catch {
      /**
       * Deliberately quiet.
       *
       * This feeds the drawer, which is chrome present on every screen. A failed
       * background refresh must not put an error banner over a screen the person
       * is in the middle of reading — the screens that actually need the data
       * report their own failures.
       */
      setError('We could not refresh your application just now.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const application = useMemo(
    () => applications.find((a) => a.status === 'DRAFT') ?? applications[0] ?? null,
    [applications],
  );

  const value = useMemo<ApplicationValue>(
    () => ({ application, applications, unread, loading, error, refresh }),
    [application, applications, unread, loading, error, refresh],
  );

  return <ApplicationContext.Provider value={value}>{children}</ApplicationContext.Provider>;
}

export function useApplication(): ApplicationValue {
  const value = useContext(ApplicationContext);
  if (!value) throw new Error('useApplication was called outside ApplicationProvider');
  return value;
}

/**
 * The status block's wording, matching `AppSidebar.jsx` exactly.
 *
 * Returned as data rather than JSX so the drawer and the dashboard cannot drift
 * into describing the same state two different ways.
 */
export function statusSummary(application: Application | null): {
  label: string;
  progress: number;
  showBar: boolean;
} {
  const status = application?.status;
  const step = application?.currentStep || 1;
  const capped = Math.min(step, 5);

  const label = {
    DRAFT: `In progress — step ${capped} of 5`,
    PENDING: 'Submitted, awaiting review',
    APPROVED: 'Approved',
    DECLINED: 'Not approved',
  }[status ?? ''] || 'No application yet';

  return {
    label,
    progress: status === 'DRAFT' ? Math.round((capped / 5) * 100) : status ? 100 : 0,
    showBar: status === 'DRAFT',
  };
}

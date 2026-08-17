import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { friendlyError } from './api';
import {
  ApplicationForm, buildPayload, completedSteps, emptyForm, formFromApplication, sexFromIdNumber,
  WizardStepKey,
} from '../lib/application';

/**
 * The draft application, held for the whole wizard.
 *
 * One load, one copy of the answers, one save path. Each screen reads the fields
 * it owns and calls `save()` on the way out, exactly as the web wizard does —
 * which is what keeps a half-finished application recoverable when somebody
 * closes the app at a taxi rank and comes back to it that evening.
 */

export type DocumentRow = {
  id: string;
  name: string;
  type: string;
  status: string;
  importance: 'REQUIRED' | 'OPTIONAL';
  requirementGroup: string | null;
  fileName?: string | null;
  uploadedAt?: string | null;
};

export type HouseholdMember = {
  id: string;
  fullName: string;
  relationship?: string | null;
  age?: number | null;
  income?: string | number | null;
};

type DraftValue = {
  loading: boolean;
  error: string | null;
  applicationId: string | null;
  status: string | null;
  reference: string | null;
  form: ApplicationForm;
  documents: DocumentRow[];
  household: HouseholdMember[];
  set: <K extends keyof ApplicationForm>(field: K, value: ApplicationForm[K]) => void;
  /** Persist the current answers. Returns false and sets `error` on failure. */
  save: (nextStep: number) => Promise<boolean>;
  reload: () => Promise<void>;
  refreshDocuments: () => Promise<void>;
  refreshHousehold: () => Promise<void>;
  submit: () => Promise<{ ok: boolean; message: string }>;
  /** Wizard steps whose answers are actually complete, for the stepper. */
  completed: WizardStepKey[];
};

const DraftContext = createContext<DraftValue | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [form, setForm] = useState<ApplicationForm>(emptyForm);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [household, setHousehold] = useState<HouseholdMember[]>([]);

  /** Take an application from any response and make it the current draft. */
  const adopt = useCallback((application: Record<string, any>) => {
    setApplicationId(application.id);
    setStatus(application.status ?? null);
    setReference(application.reference ?? null);
    setForm(formFromApplication(application));
    if (Array.isArray(application.documents)) setDocuments(application.documents);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/applications/mine');
      const mine: Record<string, any>[] = res.data.data ?? [];
      const draft = mine.find((a) => a.status === 'DRAFT');

      if (draft) {
        adopt(draft);
        return;
      }

      /**
       * No draft, so start one.
       *
       * POST answers 400 with the existing draft in `data` when one is already
       * open — a race two screens could otherwise both lose. Treat that as
       * "resume", never as an error.
       */
      try {
        const created = await api.post('/applications', {});
        adopt(created.data.data);
      } catch (err: any) {
        const existing = err?.response?.data?.data;
        if (existing?.id) adopt(existing);
        else throw err;
      }
    } catch (err) {
      setError(friendlyError(err, 'We could not open your application. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [adopt]);

  useEffect(() => { reload(); }, [reload]);

  const refreshDocuments = useCallback(async () => {
    if (!applicationId) return;
    try {
      const res = await api.get(`/documents/${applicationId}`);
      // Returned already ordered — what blocks submission first. Never re-sort.
      setDocuments(res.data.data ?? []);
    } catch {
      // A failed refresh leaves the previous list on screen, which is better
      // than emptying it and implying nothing has been supplied.
    }
  }, [applicationId]);

  const refreshHousehold = useCallback(async () => {
    if (!applicationId) return;
    try {
      const res = await api.get(`/applications/${applicationId}/household`);
      setHousehold(res.data.data ?? []);
    } catch {
      /* keep what is on screen */
    }
  }, [applicationId]);

  const set = useCallback(<K extends keyof ApplicationForm>(field: K, value: ApplicationForm[K]) => {
    setForm((current) => {
      const next = { ...current, [field]: value } as ApplicationForm;

      /**
       * Fill in sex from the ID number as it is typed.
       *
       * Only while the applicant has not answered it themselves, and only once
       * the thirteenth digit arrives. Overwriting a deliberate choice on every
       * keystroke would make the field impossible to correct — which is the
       * whole reason it is editable.
       */
      if (field === 'idNumber' && !current.sexTouched) {
        const derived = sexFromIdNumber(String(value));
        if (derived) next.sex = derived;
      }
      if (field === 'sex') next.sexTouched = true;

      return next;
    });
  }, []);

  const save = useCallback(async (nextStep: number) => {
    if (!applicationId) return false;
    setError(null);
    try {
      const res = await api.patch(`/applications/${applicationId}`, buildPayload(form, nextStep));
      // The response carries the server's own derivations — the composed postal
      // address, the recomputed age, the cleared employer fields. Adopting it
      // means the screen shows what was actually stored rather than what was sent.
      if (res.data?.data) {
        const saved = res.data.data;
        setStatus(saved.status ?? null);
        setReference(saved.reference ?? null);
        setForm((current) => ({
          ...formFromApplication(saved),
          // Local-only flags the server knows nothing about.
          sexTouched: current.sexTouched,
        }));
      }
      return true;
    } catch (err) {
      setError(friendlyError(err, 'We could not save your answers. Please try again.'));
      return false;
    }
  }, [applicationId, form]);

  const submit = useCallback(async () => {
    if (!applicationId) return { ok: false, message: 'There is no application to submit.' };
    try {
      const res = await api.post(`/applications/${applicationId}/submit`);
      const application = res.data?.data;
      if (application) {
        setStatus(application.status ?? 'PENDING');
        setReference(application.reference ?? null);
      }
      return { ok: true, message: res.data?.message ?? 'Your application has been submitted.' };
    } catch (err) {
      // The server's message names exactly what is still outstanding, which is
      // more useful than anything that could be composed here.
      return { ok: false, message: friendlyError(err, 'We could not submit your application.') };
    }
  }, [applicationId]);

  /** Recomputed whenever the answers or the checklist change. */
  const completed = useMemo(() => completedSteps(form, documents), [form, documents]);

  const value = useMemo<DraftValue>(() => ({
    loading, error, applicationId, status, reference, form, documents, household, completed,
    set, save, reload, refreshDocuments, refreshHousehold, submit,
  }), [loading, error, applicationId, status, reference, form, documents, household, completed,
    set, save, reload, refreshDocuments, refreshHousehold, submit]);

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft(): DraftValue {
  const value = useContext(DraftContext);
  if (!value) throw new Error('useDraft was called outside DraftProvider');
  return value;
}
